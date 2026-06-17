/**
 * lib/cli_tool_finder.js — JIT CLI Tooling (Tier 2)
 *
 * Parses the-book-of-secret-knowledge README to find CLI commands.
 * Uses BM25-like keyword search + regex code block extraction.
 * Returns exact commands (no hallucination) from the source.
 *
 * @module lib/cli_tool_finder
 */
import { getLogger } from './logger.js';
import { scrapeUrl } from './web_scraper.js';
import { searchPointers, fetchPointerContent } from './lazy_knowledge.js';

const logger = getLogger('CliToolFinder');

const REPO_URL = 'https://raw.githubusercontent.com/trimstray/the-book-of-secret-knowledge/master/README.md';

/**
 * Find CLI commands for a specific task.
 * @param {string} query — e.g. "docker", "nginx", "ssh", "grep", "systemd"
 * @param {number} [maxResults=5]
 * @returns {Promise<{commands: Array<{command: string, description: string, section: string}>, source: string}>}
 */
export async function findCliCommands(query, maxResults = 5) {
  try {
    // Step 1: Find relevant section in TOC
    const pointers = await searchPointers(query, 10);
    const bookPointers = pointers.filter(p => p.repo === 'the-book-of-secret-knowledge');

    if (bookPointers.length === 0) {
      // Fallback: search in full README
      return await searchFullReadme(query, maxResults);
    }

    // Step 2: JIT fetch the relevant section
    const commands = [];
    for (const pointer of bookPointers.slice(0, 3)) {
      const content = await fetchPointerContent(pointer);
      if (!content) continue;

      // Extract code blocks with context
      const extracted = extractCodeBlocks(content, query, maxResults);
      commands.push(...extracted.map(e => ({
        ...e,
        section: pointer.topic || pointer.parent || 'General',
      })));

      if (commands.length >= maxResults) break;
    }

    if (commands.length === 0) {
      return await searchFullReadme(query, maxResults);
    }

    return {
      commands: commands.slice(0, maxResults),
      source: 'the-book-of-secret-knowledge',
    };
  } catch (err) {
    logger.warn(`[CliToolFinder] findCliCommands failed: ${err.message}`);
    return { commands: [], source: 'error' };
  }
}

/**
 * Search full README when TOC pointers don't match.
 */
async function searchFullReadme(query, maxResults) {
  const content = await scrapeUrl(REPO_URL, { useCache: true, timeout: 15000 });
  if (!content) return { commands: [], source: 'unavailable' };

  const extracted = extractCodeBlocks(content, query, maxResults);
  return {
    commands: extracted,
    source: 'the-book-of-secret-knowledge (full scan)',
  };
}

/**
 * Extract code blocks from markdown content that match the query.
 * Uses regex to find ```bash/shell/code blocks near query keywords.
 */
function extractCodeBlocks(markdown, query, maxResults) {
  const lines = markdown.split('\n');
  const results = [];
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);

  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockLines = [];
  let codeBlockStartLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Code block start
    if (trimmed.match(/^```(\w*)/)) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockLang = trimmed.match(/^```(\w*)/)[1] || '';
        codeBlockLines = [];
        codeBlockStartLine = i;
      } else {
        // Code block end
        inCodeBlock = false;
        const code = codeBlockLines.join('\n').trim();
        if (code.length > 0 && code.length < 2000) {
          // Check if code or surrounding context matches query
          const context = lines.slice(Math.max(0, codeBlockStartLine - 3), codeBlockStartLine + codeBlockLines.length + 3).join('\n').toLowerCase();
          const codeLower = code.toLowerCase();
          const matchScore = queryTerms.reduce((score, term) => {
            if (codeLower.includes(term)) return score + 2;
            if (context.includes(term)) return score + 1;
            return score;
          }, 0);

          if (matchScore > 0) {
            // Get description from preceding line
            const descLine = lines[codeBlockStartLine - 1] || '';
            const description = descLine.replace(/^[-*#\s]+/, '').trim().slice(0, 100);

            results.push({
              command: code,
              description: description || `CLI command (${codeBlockLang || 'shell'})`,
              score: matchScore,
            });
          }
        }
        if (results.length >= maxResults * 2) break; // Collect extra for sorting
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
    }
  }

  // Sort by relevance and return top results
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(r => ({ command: r.command, description: r.description }));
}

export default { findCliCommands };
