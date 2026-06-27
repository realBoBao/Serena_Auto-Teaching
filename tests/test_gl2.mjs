// Test Greenhouse + Lever with correct URL format
async function test() {
  // Greenhouse: boards.greenhouse.io/{board}/jobs
  // Lever: jobs.lever.co/{board}

  // Try with known working boards
  const tests = [
    { source: 'Greenhouse', url: 'https://boards.greenhouse.io/stripe' },
    { source: 'Greenhouse', url: 'https://boards.greenhouse.io/airbnb' },
    { source: 'Greenhouse', url: 'https://boards.greenhouse.io/shopify' },
    { source: 'Greenhouse', url: 'https://boards.greenhouse.io/notion' },
    { source: 'Greenhouse', url: 'https://boards.greenhouse.io/figma' },
    { source: 'Greenhouse', url: 'https://boards.greenhouse.io/discord' },
    { source: 'Greenhouse', url: 'https://boards.greenhouse.io/slack' },
    { source: 'Greenhouse', url: 'https://boards.greenhouse.io/netflix' },
    { source: 'Greenhouse', url: 'https://boards.greenhouse.io/uber' },
    { source: 'Greenhouse', url: 'https://boards.greenhouse.io/lyft' },
    { source: 'Lever', url: 'https://jobs.lever.co/stripe' },
    { source: 'Lever', url: 'https://jobs.lever.co/airbnb' },
    { source: 'Lever', url: 'https://jobs.lever.co/notion' },
    { source: 'Lever', url: 'https://jobs.lever.co/figma' },
    { source: 'Lever', url: 'https://jobs.lever.co/netflix' },
    { source: 'Lever', url: 'https://jobs.lever.co/uber' },
  ];

  for (const t of tests) {
    try {
      const res = await fetch(t.url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
      const html = await res.text();
      const jsonMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
      if (jsonMatch) {
        try {
          const data = JSON.parse(jsonMatch[1]);
          const jobs = (data['@graph'] || []).filter(i => i['@type'] === 'JobPosting');
          console.log(`${t.source} ${t.url.split('/').pop()}: ${res.status} - ${jobs.length} jobs`);
        } catch {
          console.log(`${t.source} ${t.url.split('/').pop()}: ${res.status} - JSON parse error`);
        }
      } else {
        // Check if blocked
        const captcha = html.toLowerCase().includes('captcha') || html.toLowerCase().includes('cloudflare');
        console.log(`${t.source} ${t.url.split('/').pop()}: ${res.status} - no JSON-LD ${captcha ? '(BLOCKED)' : ''}`);
      }
    } catch (e) {
      console.log(`${t.source} ${t.url.split('/').pop()}: FAIL - ${e.message}`);
    }
  }
}

test();
