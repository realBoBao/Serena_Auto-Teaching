/**
 * lib/grounding_verifier.js — Verify answer grounding in source context
 * Checks whether LLM claims are supported by retrieved sources.
 * @module lib/grounding_verifier
 */

import { getLogger } from './logger.js';
const logger = getLogger('Grounding');

/**
 * Verify that answer claims are grounded in the source results.
 */
export async function verifyWithCitation(query, answer, results, askFn) {
  if (!answer || answer.length < 50 || !results?.length) {
    return { verified: true, unsupportedClaims: [] };
  }

  // Extract key claims from answer (sentences with factual statements)
  const sentences = answer.split(/[.!?]+/).filter(s => s.trim().length > 20);
  const unsupportedClaims = [];

  // Check a sample of sentences against top results
  const topResults = results.slice(0, 3);
  const sourceText = topResults.map(r => `${r.title || ''} ${r.snippet || r.content || ''}`).join('\n');

  for (const sentence of sentences.slice(0, 5)) {
    // Simple n-gram overlap check
    const words = sentence.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    if (words.length < 3) continue;

    const bigrams = [];
    for (let i = 0; i < words.length - 1; i++) {
      bigrams.push(words[i] + ' ' + words[i + 1]);
    }

    const sourceLower = sourceText.toLowerCase();
    const matchCount = bigrams.filter(bg => sourceLower.includes(bg)).length;
    const coverage = bigrams.length > 0 ? matchCount / bigrams.length : 0;

    if (coverage < 0.15) {
      unsupportedClaims.push(sentence.trim().slice(0, 100));
    }
  }

  return {
    verified: unsupportedClaims.length === 0,
    unsupportedClaims,
    coverage: sentences.length > 0 ? 1 - (unsupportedClaims.length / sentences.length) : 1,
  };
}

/**
 * Format a disclaimer for ungrounded claims.
 */
export function formatDisclaimer(grounding) {
  if (grounding.verified) return '';
  return '\n\n⚠️ **Lưu ý:** Một số thông tin trong câu trả lời có thể không được hỗ trợ bởi nguồn dữ liệu. Nên kiểm tra lại từ nguồn chính thống.';
}

export default { verifyWithCitation, formatDisclaimer };
