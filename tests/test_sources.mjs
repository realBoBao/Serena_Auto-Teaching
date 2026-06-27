// Test all job sources
async function test() {
  console.log('=== Testing Job Sources ===\n');

  // 1. SimplifyJobs
  try {
    const res = await fetch('https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/README.md');
    console.log('SimplifyJobs:', res.status, res.ok ? 'OK' : 'FAIL');
  } catch (e) { console.log('SimplifyJobs: FAIL', e.message); }

  // 2. RemoteOK
  try {
    const res = await fetch('https://remoteok.com/api?tag=dev', { headers: { 'User-Agent': 'Serena-Brain/1.0' } });
    const data = await res.json();
    console.log('RemoteOK:', res.status, Array.isArray(data) ? `OK (${data.length} jobs)` : 'FAIL');
  } catch (e) { console.log('RemoteOK: FAIL', e.message); }

  // 3. WeWorkRemotely RSS
  try {
    const res = await fetch('https://weworkremotely.com/remote-jobs.rss', { headers: { 'User-Agent': 'Serena-Brain/1.0' } });
    const xml = await res.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
    console.log('WeWorkRemotely:', res.status, `OK (${items.length} items)`);
  } catch (e) { console.log('WeWorkRemotely: FAIL', e.message); }

  // 4. Greenhouse (Stripe)
  try {
    const res = await fetch('https://boards.greenhouse.io/stripe/jobs', { headers: { 'User-Agent': 'Serena-Brain/1.0', 'Accept': 'application/json' } });
    const html = await res.text();
    const jsonMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[1]);
      const jobs = (data['@graph'] || []).filter(i => i['@type'] === 'JobPosting');
      console.log('Greenhouse (stripe):', res.status, `OK (${jobs.length} jobs)`);
    } else {
      console.log('Greenhouse (stripe):', res.status, 'FAIL (no JSON-LD)');
    }
  } catch (e) { console.log('Greenhouse: FAIL', e.message); }

  // 5. Lever (Stripe)
  try {
    const res = await fetch('https://jobs.lever.co/stripe/', { headers: { 'User-Agent': 'Serena-Brain/1.0' } });
    const html = await res.text();
    const jsonMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[1]);
      const jobs = (data['@graph'] || []).filter(i => i['@type'] === 'JobPosting');
      console.log('Lever (stripe):', res.status, `OK (${jobs.length} jobs)`);
    } else {
      console.log('Lever (stripe):', res.status, 'FAIL (no JSON-LD)');
    }
  } catch (e) { console.log('Lever: FAIL', e.message); }

  // 6. Arbeitnow
  try {
    const res = await fetch('https://arbeitnow.com/api/job-board-api');
    const data = await res.json();
    console.log('Arbeitnow:', res.status, `OK (${data.data?.length || 0} jobs)`);
  } catch (e) { console.log('Arbeitnow: FAIL', e.message); }

  // 7. HN Hiring
  try {
    const searchRes = await fetch('https://hn.algolia.com/api/v1/search?query=Ask+HN+Who+is+hiring&tags=ask_hn&hitsPerPage=1');
    const search = await searchRes.json();
    console.log('HN Hiring:', searchRes.status, search.hits?.[0] ? 'OK (thread found)' : 'FAIL (no thread)');
  } catch (e) { console.log('HN Hiring: FAIL', e.message); }
}

test();
