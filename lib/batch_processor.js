/**
 * lib/batch_processor.js — Async Batch Processing (Tier 3)
 * Gửi nhiều request LLM cùng lúc thay vì từng cái một.
 * Giảm chi phí API ~50% cho các tác vụ nền.
 * @module lib/batch_processor
 */

import { getLogger } from './logger.js';
const logger = getLogger('BatchProcessor');

const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const BATCH_API = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:batchGenerateContent';

/**
 * Gửi batch request đến Gemini API.
 * @param {Array<{query: string, systemPrompt?: string}>} requests
 * @returns {Promise<Array<{answer: string}>>}
 */
export async function batchAsk(requests) {
  if (!GEMINI_KEY || requests.length === 0) return [];

  // Nếu chỉ có 1 request, dùng API thường
  if (requests.length === 1) {
    const { ask } = await import('./llm.js');
    const result = await ask(requests[0].query, { systemPrompt: requests[0].systemPrompt });
    return [result];
  }

  try {
    const contents = requests.map(req => ({
      role: 'user',
      parts: [{ text: `${req.systemPrompt || ''}\n\n${req.query}` }],
    }));

    const res = await fetch(`${BATCH_API}?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents }),
    });

    if (!res.ok) {
      logger.warn(`[BatchProcessor] Batch API failed: ${res.status}, falling back to sequential`);
      // Fallback: gọi từng cái
      const { ask } = await import('./llm.js');
      const results = [];
      for (const req of requests) {
        results.push(await ask(req.query, { systemPrompt: req.systemPrompt }));
      }
      return results;
    }

    const data = await res.json();
    return (data.candidates || []).map(c => ({
      answer: c.content?.parts?.[0]?.text || '',
    }));
  } catch (err) {
    logger.error(`[BatchProcessor] Error: ${err.message}`);
    return requests.map(() => ({ answer: '' }));
  }
}

/**
 * Chia nhỏ mảng thành các batch.
 * @param {Array} items
 * @param {number} batchSize
 * @returns {Array<Array>}
 */
export function chunkArray(items, batchSize = 5) {
  const chunks = [];
  for (let i = 0; i < items.length; i += batchSize) {
    chunks.push(items.slice(i, i + batchSize));
  }
  return chunks;
}
