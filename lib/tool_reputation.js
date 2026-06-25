/**
 * lib/tool_reputation.js - Skill-Conditional Trust Score Registry (SQLite)
 *
 * TIER 1: Uses singleton DB from lib/db.js for unified connection management.
 */
import { runQuery, getOne, getAll } from './db.js';
import { getLogger } from './logger.js';

const logger = getLogger('ToolReputation');
const REWARD = 0.05;
const PENALTY = 0.15;
let _tableReady = false;

async function ensureTable() {
  if (_tableReady) return;
  try {
    await runQuery(`CREATE TABLE IF NOT EXISTS tool_reputation (
      source TEXT NOT NULL,
      topic TEXT NOT NULL DEFAULT 'general',
      score REAL NOT NULL DEFAULT 0.5,
      verified INTEGER NOT NULL DEFAULT 0,
      contradicted INTEGER NOT NULL DEFAULT 0,
      last_seen INTEGER NOT NULL,
      PRIMARY KEY (source, topic)
    )`);
    _tableReady = true;
  } catch (err) {
    logger.warn('[ToolReputation] Failed to create table:', err.message);
  }
}

export async function getTrustScore(source, topic = 'general') {
  await ensureTable();
  try {
    const row = await getOne('SELECT score, last_seen FROM tool_reputation WHERE source = ? AND topic = ?', [source, topic.toLowerCase()]);
    if (!row) return 0.5;
    const now = Date.now();
    const daysSince = (now - row.last_seen) / 86400000;
    if (daysSince > 0) {
      const decayed = 0.5 + (row.score - 0.5) * Math.pow(0.95, daysSince);
      const clamped = Math.max(0.1, Math.min(1.0, decayed));
      await runQuery('UPDATE tool_reputation SET score = ?, last_seen = ? WHERE source = ? AND topic = ?', [Math.round(clamped * 100) / 100, now, source, topic.toLowerCase()]);
      return Math.round(clamped * 100) / 100;
    }
    return row.score;
  } catch (err) {
    logger.debug('[ToolReputation] getTrustScore error:', err.message);
    return 0.5;
  }
}

export async function recordVerified(source, topic = 'general') {
  await ensureTable();
  try {
    const existing = await getOne('SELECT score FROM tool_reputation WHERE source = ? AND topic = ?', [source, topic.toLowerCase()]);
    const newScore = Math.min(1.0, (existing?.score || 0.5) + REWARD);
    await runQuery('INSERT INTO tool_reputation (source, topic, score, verified, contradicted, last_seen) VALUES (?, ?, ?, 1, 0, ?) ON CONFLICT(source, topic) DO UPDATE SET score = ?, verified = verified + 1, last_seen = ?', [source, topic.toLowerCase(), newScore, Date.now(), newScore, Date.now()]);
  } catch (err) {
    logger.debug('[ToolReputation] recordVerified error:', err.message);
  }
}

export async function recordContradiction(source, topic = 'general') {
  await ensureTable();
  try {
    const existing = await getOne('SELECT score FROM tool_reputation WHERE source = ? AND topic = ?', [source, topic.toLowerCase()]);
    const newScore = Math.max(0.1, (existing?.score || 0.5) - PENALTY);
    await runQuery('INSERT INTO tool_reputation (source, topic, score, verified, contradicted, last_seen) VALUES (?, ?, ?, 0, 1, ?) ON CONFLICT(source, topic) DO UPDATE SET score = ?, contradicted = contradicted + 1, last_seen = ?', [source, topic.toLowerCase(), newScore, Date.now(), newScore, Date.now()]);
  } catch (err) {
    logger.debug('[ToolReputation] recordContradiction error:', err.message);
  }
}

export async function getAllScores() {
  await ensureTable();
  try {
    return await getAll('SELECT source, topic, score, verified, contradicted FROM tool_reputation ORDER BY score ASC');
  } catch {
    return [];
  }
}

export async function resetAll() {
  await ensureTable();
  try { await runQuery('DELETE FROM tool_reputation'); } catch {}
}

export default { getTrustScore, recordVerified, recordContradiction, getAllScores, resetAll };
