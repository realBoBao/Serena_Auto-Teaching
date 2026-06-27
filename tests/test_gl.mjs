// Test Greenhouse + Lever with real board names
async function test() {
  // Greenhouse boards
  const ghBoards = ['airbnb', 'shopify', 'notion', 'linear', 'vercel', 'supabase', 'railway', 'figma', 'discord', 'slack'];
  console.log('=== Greenhouse Boards ===');
  for (const board of ghBoards) {
    try {
      const res = await fetch(`https://boards.greenhouse.io/${board}/jobs`, { headers: { 'User-Agent': 'Serena-Brain/1.0' } });
      const html = await res.text();
      const jsonMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
      if (jsonMatch) {
        try {
          const data = JSON.parse(jsonMatch[1]);
          const jobs = (data['@graph'] || []).filter(i => i['@type'] === 'JobPosting');
          console.log(`  ${board}: ${res.status} - ${jobs.length} jobs`);
        } catch {
          console.log(`  ${board}: ${res.status} - JSON parse error`);
        }
      } else {
        console.log(`  ${board}: ${res.status} - no JSON-LD`);
      }
    } catch (e) {
      console.log(`  ${board}: FAIL - ${e.message}`);
    }
  }

  // Lever boards
  const leverBoards = ['airbnb', 'notion', 'linear', 'vercel', 'supabase', 'railway', 'figma', 'discord', 'slack', 'stripe'];
  console.log('\n=== Lever Boards ===');
  for (const board of leverBoards) {
    try {
      const res = await fetch(`https://jobs.lever.co/${board}/`, { headers: { 'User-Agent': 'Serena-Brain/1.0' } });
      const html = await res.text();
      const jsonMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
      if (jsonMatch) {
        try {
          const data = JSON.parse(jsonMatch[1]);
          const jobs = (data['@graph'] || []).filter(i => i['@type'] === 'JobPosting');
          console.log(`  ${board}: ${res.status} - ${jobs.length} jobs`);
        } catch {
          console.log(`  ${board}: ${res.status} - JSON parse error`);
        }
      } else {
        console.log(`  ${board}: ${res.status} - no JSON-LD`);
      }
    } catch (e) {
      console.log(`  ${board}: FAIL - ${e.message}`);
    }
  }
}

test();
