/**
 * lib/mem0_client.js — Memory search & storage for conversation context
 * Stores and retrieves user conversation memories for personalized responses.
 * Falls back gracefully if mem0 is not configured.
 * @module lib/mem0_client
 */

import { getLogger } from './logger.js';
const logger = getLogger('Mem0');

const MEM0_URL = process.env.MEM0_URL || 'http://localhost:8000';
const MEM0_API_KEY = process.env.MEM0_API_KEY || '';
const ENABLED = !!process.env.MEM0_API_KEY;

/**
 * Search memories for a user.
 */
export async function searchMemory(userId, query, limit = 3) {
  if (!ENABLED) return [];
  try {
    const res = await fetch(`${MEM0_URL}/api/v1/memories/search/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${MEM0_API_KEY}`,
      },
      body: JSON.stringify({ query, user_id: userId, limit }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map(m => m.memory || m.text || '');
  } catch (err) {
    logger.debug('[Mem0] searchMemory failed:', err.message);
    return [];
  }
}

/**
 * Add a memory for a user.
 */
export async function addMemory(userId, content) {
  if (!ENABLED) return;
  try {
    await fetch(`${MEM0_URL}/api/v1/memories/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${MEM0_API_KEY}`,
      },
      body: JSON.stringify({ messages: [{ role: 'user', content }], user_id: userId }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (err) {
    logger.debug('[Mem0] addMemory failed:', err.message);
  }
}

export default { searchMemory, addMemory };
