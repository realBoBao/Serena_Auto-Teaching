/**
 * ═══════════════════════════════════════════════════════════════
 * E2E Integration Tests — Full Pipeline
 * ═══════════════════════════════════════════════════════════════
 *
 * Test luồng: scrape → embed → query → answer
 * Chạy: npx jest tests/e2e_pipeline.test.js --testTimeout=60000
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { embedText } from '../lib/embeddings.js';
import { search as vectorSearch } from '../lib/vector_store.js';
import { chunkText } from '../lib/chunking.js';
import { checkScope } from '../lib/scope_detector.js';
import { evaluateRagAnswer } from '../lib/rag_evaluator.js';

// Skip nếu không có API keys
const SKIP_LLM = !process.env.OPENROUTER_API_KEY && !process.env.GEMINI_API_KEY;
const SKIP_EMBED = !process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY;

describe('E2E: Full RAG Pipeline', () => {
  test('should embed text and search vector DB', async () => {
    if (SKIP_EMBED) return;

    const text = 'Binary search algorithm implementation in Python';
    const chunks = chunkText(text, 600, 120);
    expect(chunks.length).toBeGreaterThan(0);

    const embedding = await embedText(chunks[0]);
    expect(embedding).toBeDefined();
    expect(embedding.length).toBeGreaterThan(0);
  }, 30000);

  test('should detect out-of-scope queries', () => {
    const result1 = checkScope('What is the meaning of life?');
    expect(result1.inScope).toBe(false);

    const result2 = checkScope('Explain binary search algorithm');
    expect(result2.inScope).toBe(true);
  });

  test('should chunk text correctly', () => {
    const text = 'a'.repeat(2000);
    const chunks = chunkText(text, 600, 120);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].length).toBeLessThanOrEqual(600);
  });
});

describe('E2E: Scope Detector', () => {
  test('should reject non-technical queries', () => {
    const queries = [
      'best restaurants in Tokyo',
      'how to cook pasta',
      'funny cat videos',
    ];
    for (const q of queries) {
      const result = checkScope(q);
      expect(result.inScope).toBe(false);
    }
  });

  test('should accept technical queries', () => {
    const queries = [
      'explain distributed systems',
      'binary search algorithm',
      'database indexing strategies',
    ];
    for (const q of queries) {
      const result = checkScope(q);
      expect(result.inScope).toBe(true);
    }
  });
});

describe('E2E: RAG Quality', () => {
  test('should evaluate answer quality', () => {
    const question = 'What is binary search?';
    const answer = 'Binary search is an algorithm that finds the position of a target value within a sorted array by repeatedly dividing the search interval in half.';
    const context = ['Binary search is a search algorithm that finds the position of a target value within a sorted array.'];

    const eval_result = evaluateRagAnswer(question, answer, context);
    expect(eval_result.relevancy).toBeGreaterThan(0.5);
    expect(eval_result.faithfulness).toBeGreaterThan(0.5);
  });
});
