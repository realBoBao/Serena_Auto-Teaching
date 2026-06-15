/**
 * lib/repo_analyzer.js — Repository analysis utilities
 * Analyzes code repos, READMEs, file contents for knowledge extraction.
 * @module lib/repo_analyzer
 */

import { getLogger } from './logger.js';
import fs from 'fs';
import path from 'path';
const logger = getLogger('RepoAnalyzer');

/**
 * Analyze a README file.
 */
export async function analyzeReadme(readmePath) {
  try {
    const content = fs.readFileSync(readmePath, 'utf8');
    return {
      path: readmeName,
      title: content.match(/^#\s+(.+)/m)?.[1] || '',
      description: content.match(/^#\s+.+\n\n(.+)/s)?.[1]?.slice(0, 300) || '',
      sections: content.match(/^#{1,3}\s+.+/gm)?.map(s => s.replace(/^#+\s+/, '')) || [],
      length: content.length,
    };
  } catch (err) {
    logger.debug('[RepoAnalyzer] analyzeReadme failed:', err.message);
    return null;
  }
}

/**
 * Fetch file content from a path.
 */
export async function fetchFileContent(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return { path: filePath, content, size: content.length };
  } catch (err) {
    logger.debug('[RepoAnalyzer] fetchFileContent failed:', err.message);
    return null;
  }
}

/**
 * Analyze text content (extract key topics, summary).
 */
export async function analyzeText(text, maxLen = 2000) {
  if (!text) return { summary: '', topics: [], length: 0 };
  const truncated = text.slice(0, maxLen);
  const sentences = truncated.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const topics = [];
  const topicPatterns = /(?:^|\n)#+\s+(.+)|(?:topic|subject|about|về)\s*:\s*(.+)/gi;
  let match;
  while ((match = topicPatterns.exec(truncated)) !== null) {
    topics.push((match[1] || match[2]).trim());
  }
  return {
    summary: sentences.slice(0, 3).join('. ').slice(0, 500),
    topics: topics.slice(0, 10),
    length: text.length,
  };
}

export default { analyzeReadme, fetchFileContent, analyzeText };
