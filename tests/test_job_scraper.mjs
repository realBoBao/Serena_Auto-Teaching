// Quick test to find the crash line
process.env.DOTENV_CONFIG_PATH = '../.env';

async function test() {
  console.log('=== Job Scraper Debug ===\n');

  // Test each source individually
  const sources = [
    { name: 'SimplifyJobs', fn: async () => {
      const res = await fetch('https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/README.md');
      const text = await res.text();
      const tbodyMatch = text.match(/<tbody>([\s\S]*?)<\/tbody>/);
      if (!tbodyMatch) return [];
      const rows = tbodyMatch[1].split(/<tr>/).filter(r => r.includes('<td>'));
      return rows.length;
    }},
    { name: 'NewGrad', fn: async () => {
      const res = await fetch('https://raw.githubusercontent.com/SimplifyJobs/New-Grad-Positions/dev/README.md');
      const text = await res.text();
      const tbodyMatch = text.match(/<tbody>([\s\S]*?)<\/tbody>/);
      if (!tbodyMatch) return [];
      const rows = tbodyMatch[1].split(/<tr>/).filter(r => r.includes('<td>'));
      return rows.length;
    }},
    { name: 'RemoteOK', fn: async () => {
      const res = await fetch('https://remoteok.com/api?tag=dev', { headers: { 'User-Agent': 'Serena-Brain/1.0' } });
      const data = await res.json();
      return Array.isArray(data) ? data.length : 0;
    }},
    { name: 'WeWorkRemotely', fn: async () => {
      const res = await fetch('https://weworkremotely.com/remote-jobs.rss', { headers: { 'User-Agent': 'Serena-Brain/1.0' } });
      const xml = await res.text();
      const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
      return items.length;
    }},
    { name: 'Arbeitnow', fn: async () => {
      const res = await fetch('https://arbeitnow.com/api/job-board-api');
      const data = await res.json();
      return data.data?.length || 0;
    }},
    { name: 'HN', fn: async () => {
      const searchRes = await fetch('https://hn.algolia.com/api/v1/search?query=Ask+HN+Who+is+hiring&tags=ask_hn&hitsPerPage=1');
      const search = await searchRes.json();
      return search.hits?.[0] ? 1 : 0;
    }},
  ];

  for (const s of sources) {
    try {
      const result = await s.fn();
      console.log(`${s.name}: OK (${result})`);
    } catch (e) {
      console.log(`${s.name}: FAIL - ${e.message}`);
    }
  }

  // Test mapJobs
  console.log('\n--- mapJobs test ---');
  try {
    const { mapJobs } = await import('../lib/job_mapper.js');
    const rawJobs = [
      { title: 'Backend Dev', company: 'Acme', url: 'https://acme.com/jobs/1', tags: ['node', 'python'] },
      { title: 'Frontend Dev', company: 'Beta', url: 'https://beta.com/jobs/2', tags: 'react,javascript' },
    ];
    const mapped = mapJobs(rawJobs, 'FreeAPI');
    console.log('mapJobs: OK', mapped.length, 'jobs');
    console.log('  Job 1 tags:', mapped[0].tags);
    console.log('  Job 2 tags:', mapped[1].tags);
  } catch (e) {
    console.log('mapJobs: FAIL -', e.message);
    console.log('  Stack:', e.stack);
  }

  // Test scoreContent
  console.log('\n--- scoreContent test ---');
  try {
    const { scoreContent, formatQualityBar } = await import('../lib/content_quality.js');
    const q = scoreContent({ title: 'Senior Backend Engineer', url: 'https://example.com', source: 'RemoteOK', points: 100 });
    console.log('scoreContent: OK', q.score, q.level, q.tag, formatQualityBar(q.score));
  } catch (e) {
    console.log('scoreContent: FAIL -', e.message);
  }

  // Test db
  console.log('\n--- DB test ---');
  try {
    const { runQuery, getAll } = await import('../lib/db.js');
    await runQuery(`CREATE TABLE IF NOT EXISTS sent_jobs (url TEXT PRIMARY KEY, sent_at TEXT DEFAULT (datetime('now')))`);
    const rows = await getAll("SELECT url FROM sent_jobs WHERE sent_at >= datetime('now', '-7 days')");
    console.log('DB: OK', rows.length, 'URLs in dedup');
  } catch (e) {
    console.log('DB: FAIL -', e.message);
  }
}

test();
