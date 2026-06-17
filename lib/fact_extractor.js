/**
 * lib/fact_extractor.js — Extract structured facts from text using LLM
 *
 * Converts natural language into Datalog-style facts:
 *   { predicate: 'is_a', args: ['raft', 'consensus_algorithm'] }
 *   { predicate: 'deprecated', args: ['paxos'] }
 *   { predicate: 'requires', args: ['raft', 'leader_election'] }
 *
 * Predicate vocabulary (extensible):
 *   is_a(X, Y)         — X is a type of Y
 *   requires(X, Y)     — X requires Y
 *   part_of(X, Y)      — X is part of Y
 *   deprecated(X)      — X is deprecated
 *   recommended(X)     — X is recommended
 *
 * Usage:
 *   import { FactExtractor } from './fact_extractor.js';
 *   const facts = await FactExtractor.extractFromAnswer(answerText);
 *   const groundTruth = await FactExtractor.extractFromContext(contextChunks);
 */

import { ask as llmAsk } from './llm.js';
import { getLogger } from './logger.js';

const logger = getLogger('FactExtractor');

const EXTRACTION_PROMPT = `Trích xuất TẤT CẢ fact logic từ văn bản sau.

Predicate được phép dùng:
- is_a(X, Y): X là một loại Y
- requires(X, Y): X cần Y
- part_of(X, Y): X là một phần của Y
- deprecated(X): X đã bị deprecated/không còn dùng
- recommended(X): X được khuyến nghị dùng

Văn bản:
{text}

Trả về JSON array, mỗi phần tử: {"predicate": "...", "args": ["...", "..."]}
Chỉ trả về JSON thuần, không giải thích.
Nếu không extract được fact nào, trả về [].`;

export class FactExtractor {

  /**
   * Extract facts from an LLM-generated answer.
   * @param {string} answer — the generated answer text
   * @returns {Array<{predicate: string, args: string[]}>}
   */
  static async extractFromAnswer(answer) {
    // Only extract from substantive answers (> 50 chars)
    if (!answer || answer.length < 50) return [];

    const text = answer.slice(0, 800); // limit to first 800 chars for cost
    return this._extract(text, 'answer');
  }

  /**
   * Extract ground-truth facts from RAG context chunks.
   * @param {Array} contextChunks — search results with .payload.text or .text
   * @returns {Array<{predicate: string, args: string[]}>}
   */
  static async extractFromContext(contextChunks) {
    if (!contextChunks || contextChunks.length === 0) return [];

    const contextText = contextChunks
      .slice(0, 3)
      .map(c => (c.payload?.text ?? c.text ?? '').slice(0, 400))
      .join('\n---\n');

    if (!contextText.trim()) return [];

    return this._extract(contextText, 'context');
  }

  /**
   * Core extraction: send text to LLM, parse JSON response.
   * @param {string} text
   * @param {string} source — 'answer' or 'context' (for logging)
   * @returns {Array<{predicate: string, args: string[]}>}
   */
  static async _extract(text, source = 'unknown') {
    const prompt = EXTRACTION_PROMPT.replace('{text}', text);

    try {
      const raw = await llmAsk(prompt, {
        maxTokens: 400,
        temperature: 0.1, // low temperature for deterministic extraction
      });

      // Clean up common LLM output issues
      const clean = raw
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .replace(/^[^[{]*/, '') // strip leading non-JSON
        .replace(/[^}\]]*$/, '') // strip trailing non-JSON
        .trim();

      if (!clean) {
        logger.debug(`[FactExtractor] Empty response from ${source}`);
        return [];
      }

      const parsed = JSON.parse(clean);

      if (!Array.isArray(parsed)) {
        logger.warn(`[FactExtractor] Non-array response from ${source}:`, typeof parsed);
        return [];
      }

      // Normalize and validate
      const facts = parsed
        .filter(f => f && typeof f.predicate === 'string' && Array.isArray(f.args))
        .map(f => ({
          predicate: f.predicate.toLowerCase().trim(),
          args: f.args.map(a => String(a).toLowerCase().trim()).filter(Boolean),
        }))
        .filter(f => f.predicate.length > 0 && f.args.length > 0);

      logger.info(`[FactExtractor] Extracted ${facts.length} facts from ${source}`);
      return facts;

    } catch (err) {
      logger.warn(`[FactExtractor] Extraction failed for ${source}:`, err.message);
      return [];
    }
  }
}
