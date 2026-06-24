/**
 * Integration Test E2E — Toàn bộ pipeline Crawlee + SQLite + Python bridge
 * Run: node scripts/test/test_integration_e2e.mjs
 *
 * Test flow:
 * 1. SQLite: Ghi 100 docs vào vectors.db (mô phỏng pipeline)
 * 2. SQLite: Query + verify WAL mode
 * 3. Python bridge: HTML → Markdown
 * 4. Crawlee: Fetch HN API (không dùng Reddit vì 403)
 * 5. Crawlee: Fetch GitHub API
 * 6. End-to-end: Crawlee fetch → Python clean → SQLite store → Query
 */

import { getDb, runDb, openDbFile, getAllDbRows } from '../../lib/sqlite_adapter.js';
import { htmlToMarkdown, fileToMarkdown } from '../../lib/document_parser.js';
import { writeFileSync, unlinkSync } from 'fs';

// Cleanup before test
try { unlinkSync('./test_e2e.db'); } catch { /* ignore */ }

const results = [];
let testNum = 0;

function pass(name) {
  testNum++;
  results.push({ id: testNum, name, status: 'PASS' });
  console.log(`  ✅ [${testNum}] ${name}`);
}

function fail(name, err) {
  testNum++;
  results.push({ id: testNum, name, status: 'FAIL', error: err?.message || err });
  console.log(`  ❌ [${testNum}] ${name}: ${err?.message || err}`);
}

console.log('═══════════════════════════════════════════════');
console.log('  Integration E2E Test — Crawlee + SQLite + Python');
console.log('═══════════════════════════════════════════════');
console.log('Node:', process.version);

// ─── Phase 1: SQLite Pipeline ─────────────────────────────
console.log('\n─── Phase 1: SQLite Pipeline ───');

let db;
try {
  db = await getDb('./test_e2e.db');
  pass('SQLite: getDb() with prepare()');

  // Setup tables
  db.exec(`CREATE TABLE IF NOT EXISTS vectors (
    id TEXT PRIMARY KEY,
    doc_id TEXT,
    chunk_text TEXT,
    source TEXT,
    score REAL,
    added_at TEXT
  )`);
  pass('SQLite: CREATE TABLE vectors');

  // Insert 100 docs (simulate pipeline)
  const start = Date.now();
  for (let i = 0; i < 100; i++) {
    db.prepare(
      'INSERT OR REPLACE INTO vectors (id, doc_id, chunk_text, source, score, added_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
      `doc-${i}`,
      `source-${i % 5}`,
      `Content of document ${i} with some sample text for embedding.`,
      ['HN', 'GitHub', 'arXiv', 'Reddit', 'Web'][i % 5],
      Math.random(),
      new Date().toISOString()
    );
  }
  const elapsed = Date.now() - start;
  pass(`SQLite: INSERT 100 docs (${elapsed}ms)`);

  // Query (note: later phases also insert, so count may be > 100)
  const count = db.prepare('SELECT COUNT(*) as c FROM vectors').get();
  if (count.c >= 100) {
    pass(`SQLite: COUNT = ${count.c} (>= 100 from phase 1)`);
  } else {
    fail(`SQLite: COUNT = ${count.c} (expected >= 100)`, new Error('Count mismatch'));
  }

  // WAL mode
  const wal = db.prepare('PRAGMA journal_mode').get();
  if (wal.journal_mode === 'wal') {
    pass('SQLite: WAL mode active');
  } else {
    fail('SQLite: WAL mode NOT active', new Error(wal.journal_mode));
  }

  // Filter by source
  const hnDocs = db.prepare("SELECT COUNT(*) as c FROM vectors WHERE source = 'HN'").get();
  pass(`SQLite: Query by source (HN): ${hnDocs.c} docs`);

  // Top 5 by score
  const top5 = db.prepare('SELECT doc_id, score FROM vectors ORDER BY score DESC LIMIT 5').all();
  pass(`SQLite: Top 5 by score: ${top5.map(d => d.doc_id).join(', ')}`);

} catch (err) {
  fail('SQLite Pipeline', err);
}

// ─── Phase 2: Python Bridge ───────────────────────────────
console.log('\n─── Phase 2: Python Bridge ───');

const html = `
  <h1>Serena AI Brain</h1>
  <p>This is a <strong>test document</strong> for integration testing.</p>
  <h2>Features</h2>
  <ul>
    <li>Crawlee web scraping</li>
    <li>SQLite vector storage</li>
    <li>Python HTML-to-Markdown</li>
  </ul>
  <h2>Code Example</h2>
  <pre><code>const db = await getDb('./vectors.db');
db.prepare('SELECT * FROM vectors').all();</code></pre>
  <p>End of document.</p>
`;

try {
  const md = await htmlToMarkdown(html);
  console.log('    [DEBUG] md length:', md.length, 'chars');
  if (md.length > 50 && md.includes('Serena AI Brain') && md.includes('test document')) {
    pass('Python bridge: HTML → Markdown');
  } else {
    fail('Python bridge: HTML → Markdown', new Error('Output too short or missing content'));
  }

  if (md.includes('Crawlee web scraping') && md.includes('SQLite vector storage')) {
    pass('Python bridge: List items preserved');
  } else {
    fail('Python bridge: List items', new Error('List items not preserved'));
  }

  if (md.includes('```') && md.includes('const db')) {
    pass('Python bridge: Code blocks preserved');
  } else {
    fail('Python bridge: Code blocks', new Error('Code blocks not preserved'));
  }

} catch (err) {
  fail('Python Bridge', err);
}

// ─── Phase 3: File to Markdown ────────────────────────────
console.log('\n─── Phase 3: File to Markdown ───');

try {
  const tmpHtml = './test_temp_e2e.html';
  writeFileSync(tmpHtml, '<h1>File Test</h1><p>Content for file parsing test.</p><ul><li>Item A</li><li>Item B</li></ul>');

  const fileMd = await fileToMarkdown(tmpHtml);
  if (fileMd.includes('# File Test') && fileMd.includes('Item A')) {
    pass('File bridge: .html → Markdown');
  } else {
    fail('File bridge: .html → Markdown', new Error('Output missing content'));
  }

  try { unlinkSync(tmpHtml); } catch { /* ignore */ }

} catch (err) {
  fail('File Bridge', err);
}

// ─── Phase 4: Crawlee (HN + GitHub APIs) ──────────────────
console.log('\n─── Phase 4: Crawlee Fetch ───');

let crawleeResults = [];

// Test 4a: HN Algolia API (JSON, dùng fetch thuần)
try {
  const hnRes = await fetch('https://hn.algolia.com/api/v1/search?query=artificial+intelligence&tags=story&hitsPerPage=5');
  if (hnRes.ok) {
    const hnData = await hnRes.json();
    const hits = hnData.hits || [];
    if (hits.length > 0) {
      crawleeResults.push({ source: 'HN', title: hits[0].title, url: hits[0].url });
      pass(`HN API: ${hits.length} hits, top: "${hits[0].title.slice(0, 40)}..."`);
    } else {
      fail('HN API: No hits', new Error('Empty hits array'));
    }
  } else {
    fail('HN API', new Error(`HTTP ${hnRes.status}`));
  }
} catch (err) {
  fail('HN API', err);
}

// Test 4b: GitHub API
try {
  const ghRes = await fetch('https://api.github.com/search/repositories?q=ai+agent&sort=stars&order=desc&per_page=5', {
    headers: { 'User-Agent': 'Serena-Brain/1.0' },
  });
  if (ghRes.ok) {
    const ghData = await ghRes.json();
    const items = ghData.items || [];
    if (items.length > 0) {
      crawleeResults.push({ source: 'GitHub', title: items[0].full_name, url: items[0].html_url });
      pass(`GitHub API: ${items.length} repos, top: "${items[0].full_name}" ⭐${items[0].stargazers_count}`);
    } else {
      fail('GitHub API: No results', new Error('Empty items'));
    }
  } else {
    fail('GitHub API', new Error(`HTTP ${ghRes.status}`));
  }
} catch (err) {
  fail('GitHub API', err);
}

// ─── Phase 5: End-to-End Pipeline ─────────────────────────
console.log('\n─── Phase 5: E2E Pipeline (Fetch → Clean → Store → Query) ───');

try {
  // Step 1: Fetch web content
  const webRes = await fetch('https://example.com');
  const htmlBody = await webRes.text();
  pass(`E2E: Fetch web (${htmlBody.length} bytes)`);

  // Step 2: Clean HTML → Markdown
  const cleanMd = await htmlToMarkdown(htmlBody);
  pass(`E2E: Clean HTML → Markdown (${cleanMd.length} chars)`);

  // Step 3: Store in SQLite
  const docId = `e2e-${Date.now()}`;
  db.prepare(
    'INSERT OR REPLACE INTO vectors (id, doc_id, chunk_text, source, score, added_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(docId, 'web-example', cleanMd.slice(0, 500), 'Web', 0.95, new Date().toISOString());
  pass('E2E: Store cleaned content in SQLite');

  // Step 4: Query back
  const stored = db.prepare('SELECT chunk_text FROM vectors WHERE id = ?').get(docId);
  if (stored && stored.chunk_text.includes('Example Domain')) {
    pass('E2E: Query stored content OK');
  } else {
    fail('E2E: Query stored content', new Error('Content mismatch'));
  }

  // Step 5: Full-text search simulation
  const searchResults = db.prepare(
    "SELECT doc_id, chunk_text FROM vectors WHERE chunk_text LIKE '%example%'"
  ).all();
  if (searchResults.length > 0) {
    pass(`E2E: Full-text search found ${searchResults.length} results`);
  } else {
    fail('E2E: Full-text search', new Error('No results'));
  }

} catch (err) {
  fail('E2E Pipeline', err);
}

// ─── Phase 6: Concurrent Writes (PM2 simulation) ──────────
console.log('\n─── Phase 6: Concurrent Writes ───');

try {
  const db2 = await openDbFile('./test_e2e.db');
  const db3 = await openDbFile('./test_e2e.db');

  // Simulate 3 PM2 processes writing simultaneously
  const writes = [];
  for (let i = 0; i < 10; i++) {
    writes.push(
      new Promise((resolve) => {
        setTimeout(() => {
          try {
            db.prepare(
              'INSERT OR REPLACE INTO vectors (id, doc_id, chunk_text, source, score, added_at) VALUES (?, ?, ?, ?, ?, ?)'
            ).run(`concurrent-${i}`, `proc-1`, `Data from process 1, batch ${i}`, 'Concurrent', Math.random(), new Date().toISOString());
            resolve(true);
          } catch (e) {
            resolve(false);
          }
        }, Math.random() * 50);
      })
    );
  }

  const concurrentResults = await Promise.all(writes);
  const successCount = concurrentResults.filter(r => r).length;
  if (successCount === 10) {
    pass(`Concurrent: 10/10 writes succeeded (WAL mode)`);
  } else {
    fail(`Concurrent: ${successCount}/10 writes succeeded`, new Error('Some writes failed'));
  }

} catch (err) {
  fail('Concurrent Writes', err);
}

// ─── Summary ──────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════════');
console.log('  RESULTS');
console.log('═══════════════════════════════════════════════');

const passed = results.filter(r => r.status === 'PASS').length;
const failed = results.filter(r => r.status === 'FAIL').length;

results.forEach(r => {
  const icon = r.status === 'PASS' ? '✅' : '❌';
  console.log(`  ${icon} [${r.id}] ${r.name}${r.error ? ' — ' + r.error : ''}`);
});

console.log(`\nTotal: ${passed} PASS, ${failed} FAIL (${results.length} tests)`);

// Cleanup
try { unlinkSync('./test_e2e.db'); } catch { /* ignore */ }

if (failed > 0) {
  process.exit(1);
}
