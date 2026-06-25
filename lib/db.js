/**
 * lib/db.js — Unified Database Singleton for entire Serena project
 *
 * TIER 1: Simplify — gộp tất cả SQLite connections vào 1 singleton.
 * Thay vì mỗi file tự mở connection riêng → dẫn đến "database is locked",
 * tất cả đều dùng connection pool duy nhất từ file này.
 *
 * Usage:
 *   import { getDb, runQuery, getOne, getAll } from './lib/db.js';
 *
 *   const db = await getDb();
 *   await runQuery('INSERT INTO ...', params);
 *   const row = await getOne('SELECT ... WHERE id = ?', [id]);
 *
 * @module lib/db
 */

import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { getLogger } from './logger.js';

const logger = getLogger('DB');

// ── Singleton state ──
let _db = null;
let _dbPath = null;

// ── Default DB path (single file for all data) ──
const DEFAULT_DB_PATH = process.env.DB_PATH || join(process.cwd(), 'data', 'app.db');

/**
 * Get or create singleton DB connection.
 * @param {string} [dbPath] — Optional custom path (default: env DB_PATH or ./data/app.db)
 * @returns {Promise<DatabaseSync>}
 */
export async function getDb(dbPath) {
  const targetPath = dbPath || DEFAULT_DB_PATH;

  if (_db && _dbPath === targetPath) {
    return _db;
  }

  // Ensure directory exists
  const dir = dirname(targetPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  try {
    _db = new DatabaseSync(targetPath);
    _dbPath = targetPath;

    // Performance + concurrency optimizations
    _db.exec('PRAGMA journal_mode = WAL');
    _db.exec('PRAGMA busy_timeout = 5000');
    _db.exec('PRAGMA synchronous = NORMAL');
    _db.exec('PRAGMA cache_size = -64000'); // 64MB cache
    _db.exec('PRAGMA foreign_keys = ON');

    logger.info(`[DB] Connected to ${targetPath} (WAL mode)`);
    return _db;
  } catch (err) {
    logger.error(`[DB] Failed to connect to ${targetPath}:`, err.message);
    throw err;
  }
}

/**
 * Run a query (INSERT/UPDATE/DELETE/CREATE).
 * @param {string} sql
 * @param {Array} [params]
 * @returns {Promise<{changes: number, lastInsertRowid: number}>}
 */
export async function runQuery(sql, params = []) {
  const db = await getDb();
  try {
    const stmt = db.prepare(sql);
    const result = stmt.run(...params);
    return { changes: result.changes, lastInsertRowid: result.lastInsertRowid };
  } catch (err) {
    logger.error(`[DB] Query failed: ${sql.slice(0, 80)}...`, err.message);
    throw err;
  }
}

/**
 * Get single row.
 * @param {string} sql
 * @param {Array} [params]
 * @returns {Promise<Object|null>}
 */
export async function getOne(sql, params = []) {
  const db = await getDb();
  try {
    const stmt = db.prepare(sql);
    return stmt.get(...params) || null;
  } catch (err) {
    logger.error(`[DB] getOne failed: ${sql.slice(0, 80)}...`, err.message);
    throw err;
  }
}

/**
 * Get all rows.
 * @param {string} sql
 * @param {Array} [params]
 * @returns {Promise<Array>}
 */
export async function getAll(sql, params = []) {
  const db = await getDb();
  try {
    const stmt = db.prepare(sql);
    return stmt.all(...params);
  } catch (err) {
    logger.error(`[DB] getAll failed: ${sql.slice(0, 80)}...`, err.message);
    throw err;
  }
}

/**
 * Execute multiple statements in a transaction.
 * @param {Function} fn — Function that receives db and runs queries
 * @returns {Promise<any>}
 */
export async function transaction(fn) {
  const db = await getDb();
  db.exec('BEGIN TRANSACTION');
  try {
    const result = await fn(db);
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    logger.error('[DB] Transaction failed, rolled back:', err.message);
    throw err;
  }
}

/**
 * Close the singleton connection (for graceful shutdown).
 */
export function closeDb() {
  if (_db) {
    try {
      _db.close();
      logger.info(`[DB] Connection closed (${_dbPath})`);
    } catch (err) {
      logger.error('[DB] Error closing connection:', err.message);
    }
    _db = null;
    _dbPath = null;
  }
}

/**
 * Get current DB path (for debugging).
 * @returns {string|null}
 */
export function getDbPath() {
  return _dbPath;
}

export default { getDb, runQuery, getOne, getAll, transaction, closeDb, getDbPath };
