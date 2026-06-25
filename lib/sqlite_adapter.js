/**
 * lib/sqlite_adapter.js - SQLite adapter (backward compatibility)
 *
 * TIER 1: Now delegates to lib/db.js singleton.
 * This file kept for backward compatibility - new code should import from db.js.
 *
 * @module lib/sqlite_adapter
 */

import { getDb, runQuery, getOne, getAll, closeDb, getDbPath, transaction } from './db.js';

// Re-export everything from db.js singleton
export { getDb, closeDb, getDbPath, transaction };

// Aliases with different names
export { runQuery as runDb, getOne as getDbRow, getAll as getAllDbRows };

// Legacy aliases for backward compatibility (need local binding)
export const openDb = getDb;
export const initDb = async () => { await getDb(); };
export const openDbFile = getDb;
export const open = getDb;

export default { getDb, runDb: runQuery, getDbRow: getOne, getAllDbRows: getAll, closeDb, getDbPath, transaction, openDb, initDb, openDbFile, open };
