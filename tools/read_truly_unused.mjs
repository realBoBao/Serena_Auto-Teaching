import fs from 'fs';
const files = ['adaptive_model','aho_corasick','alerts','bigquery_store','context_cache','event_bus','fact_extractor','fsrs','hnsw','knowledge_gap_ingest','plugin_api','promise_coalescer','quality_tracker','sandbox_patterns','search_engine','smart_fetcher','tool_reputation'];
for (const f of files) {
  console.log(`\n=== ${f}.js ===`);
  try {
    const content = fs.readFileSync(`./lib/${f}.js`, 'utf8');
    const lines = content.split('\n').slice(0, 12);
    for (const line of lines) {
      const t = line.trim();
      if (t.startsWith('*') || t.startsWith('/**') || t.startsWith('//')) console.log('  ' + t);
    }
  } catch (e) { console.log('  ERROR: ' + e.message); }
}
