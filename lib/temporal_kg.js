/**
 * lib/temporal_kg.js — Temporal Knowledge Graph
 * Tracks entities and relationships with timestamps for time-aware reasoning.
 * @module lib/temporal_kg
 */

import { getLogger } from './logger.js';
import { loadDb, saveDb } from './db.js';
const logger = getLogger('TemporalKG');

// In-memory temporal facts (persisted via db.js key-value store)
const TEMPORAL_KEY = '__temporal_facts__';

function loadFacts() {
  const db = loadDb();
  return db[TEMPORAL_KEY] || [];
}

function saveFacts(facts) {
  const db = loadDb();
  db[TEMPORAL_KEY] = facts;
  saveDb(db);
}

/**
 * Add a temporal fact to the knowledge graph.
 */
export function addTemporalFact(subject, predicate, object, timestamp = new Date(), source = '') {
  try {
    const facts = loadFacts();
    facts.push({ subject, predicate, object, timestamp: timestamp.toISOString(), source });
    saveFacts(facts);
  } catch (err) {
    logger.debug('[TemporalKG] addTemporalFact failed:', err.message);
  }
}

/**
 * Query temporal facts.
 */
export function queryTemporal(subject, predicate = null, since = null) {
  try {
    let facts = loadFacts();
    if (subject) facts = facts.filter(f => f.subject === subject);
    if (predicate) facts = facts.filter(f => f.predicate === predicate);
    if (since) {
      const sinceStr = since.toISOString ? since.toISOString() : since;
      facts = facts.filter(f => f.timestamp >= sinceStr);
    }
    return facts.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 20);
  } catch (err) {
    logger.debug('[TemporalKG] queryTemporal failed:', err.message);
    return [];
  }
}

export class TemporalKG {
  async add(subject, predicate, object, ts, source) {
    return addTemporalFact(subject, predicate, object, ts, source);
  }
  async query(subject, predicate, since) {
    return queryTemporal(subject, predicate, since);
  }
}

export default { addTemporalFact, queryTemporal, TemporalKG };
