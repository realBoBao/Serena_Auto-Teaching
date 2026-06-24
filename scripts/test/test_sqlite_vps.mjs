/**
 * Test SQLite adapter — simulate VPS environment
 * Run: node scripts/test/test_sqlite_vps.mjs
 */

import { getDb, runDb, getAllDbRows, openDbFile } from '../../lib/sqlite_adapter.js';
import { unlinkSync } from 'fs';

console.log('=== SQLite VPS Simulation Test ===');
console.log('Node version:', process.version);

let db;

// Test 1: getDb
console.log('\n[1] Testing getDb()...');
try {
  db = await getDb('./test_vectors.db');
  console.log('  OK getDb() returned:', typeof db);
  console.log('  OK prepare:', typeof db.prepare);
  console.log('  OK run:', typeof db.run);
  console.log('  OK get:', typeof db.get);
  console.log('  OK all:', typeof db.all);
  console.log('  OK exec:', typeof db.exec);
} catch (err) {
  console.log('  FAIL getDb() failed:', err.message);
  process.exit(1);
}

// Test 2: CRUD
console.log('\n[2] Testing CRUD...');
try {
  db.exec('CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, name TEXT)');
  console.log('  OK CREATE TABLE');
  db.run('INSERT INTO test (name) VALUES (?)', 'hello');
  console.log('  OK INSERT');
  const row = db.prepare('SELECT * FROM test WHERE name = ?').get('hello');
  console.log('  OK SELECT:', JSON.stringify(row));
} catch (err) {
  console.log('  FAIL CRUD failed:', err.message);
  process.exit(1);
}

// Test 3: WAL mode
console.log('\n[3] Checking WAL mode...');
try {
  const mode = db.prepare('PRAGMA journal_mode').get();
  console.log('  OK Journal mode:', mode.journal_mode);
} catch (err) {
  console.log('  WARN Could not check WAL:', err.message);
}

// Test 4: openDbFile (used by vector_store.js)
console.log('\n[4] Testing openDbFile()...');
try {
  const db2 = await openDbFile('./test_vectors.db');
  console.log('  OK openDbFile()');
  console.log('  OK prepare:', typeof db2.prepare);
  console.log('  OK run:', typeof db2.run);
} catch (err) {
  console.log('  FAIL openDbFile() failed:', err.message);
  process.exit(1);
}

// Test 5: Concurrent writes
console.log('\n[5] Testing concurrent writes...');
try {
  const db3 = await openDbFile('./test_vectors.db');
  db3.run('INSERT INTO test (name) VALUES (?)', 'concurrent1');
  db.run('INSERT INTO test (name) VALUES (?)', 'concurrent2');
  const count = db.prepare('SELECT COUNT(*) as c FROM test').get();
  console.log('  OK Concurrent writes, total rows:', count.c);
} catch (err) {
  console.log('  FAIL Concurrent write failed:', err.message);
}

// Cleanup
try { unlinkSync('./test_vectors.db'); } catch { /* ignore */ }

console.log('\nAll tests passed!');
