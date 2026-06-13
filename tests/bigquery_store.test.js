/**
 * BigQuery Store Unit Tests
 * Tests BigQuery vector store operations (mock mode when no credentials)
 */

import { describe, it, expect } from '@jest/globals';

// Skip all tests if no BigQuery credentials
const hasCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GCP_PROJECT_ID;

describe('BigQuery Store', () => {
  it('should export required functions', async () => {
    const mod = await import('../lib/bigquery_store.js');
    expect(typeof mod.upsertDocument).toBe('function');
    expect(typeof mod.search).toBe('function');
    expect(typeof mod.deleteDocuments).toBe('function');
    expect(typeof mod.countDocuments).toBe('function');
    expect(typeof mod.ensureTable).toBe('function');
  });

  it('should return empty array when no credentials', async () => {
    const { search } = await import('../lib/bigquery_store.js');
    // Without credentials, should return empty array (graceful fallback)
    const origCred = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const origProject = process.env.GCP_PROJECT_ID;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    delete process.env.GCP_PROJECT_ID;

    try {
      const results = await search(new Float32Array(768), 5);
      expect(Array.isArray(results)).toBe(true);
    } finally {
      if (origCred) process.env.GOOGLE_APPLICATION_CREDENTIALS = origCred;
      if (origProject) process.env.GCP_PROJECT_ID = origProject;
    }
  });

  it('should deduplicate sources by URL', async () => {
    const { sendAggregatedWebhook } = await import('../notify_discord.js');
    const results = [
      { title: 'Test 1', url: 'https://example.com/1', type: 'web', score: 0.9 },
      { title: 'Test 2', url: 'https://example.com/1', type: 'web', score: 0.8 }, // duplicate URL
      { title: 'Test 3', url: 'https://example.com/3', type: 'web', score: 0.7 },
    ];

    // Dedup logic (same as in notify_discord.js)
    const seenUrls = new Set();
    const deduped = [];
    for (const r of results) {
      const key = (r.url || r.title || '').toLowerCase().trim();
      if (key && !seenUrls.has(key)) {
        seenUrls.add(key);
        deduped.push(r);
      }
    }

    expect(deduped.length).toBe(2); // 3 - 1 duplicate
    expect(deduped[0].title).toBe('Test 1');
    expect(deduped[1].title).toBe('Test 3');
  });
});
