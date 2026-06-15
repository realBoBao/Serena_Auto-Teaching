/**
 * scripts/test_google.mjs — Test Google Custom Search
 * Usage: node scripts/test_google.mjs "your search query"
 */
import 'dotenv/config';

const query = process.argv[2] || 'rust async programming';
const apiKey = process.env.GOOGLE_API_KEY;
const cx = process.env.GOOGLE_CSE_ID || process.env.GOOGLE_CX;

console.log('═'.repeat(50));
console.log('Google Custom Search Test');
console.log('═'.repeat(50));
console.log(`Query: ${query}`);
console.log(`API Key: ${apiKey ? '✅ Set (' + apiKey.slice(0, 8) + '...)' : '❌ NOT SET'}`);
console.log(`CSE ID:  ${cx ? '✅ Set' : '❌ NOT SET'}`);
console.log('');

if (!apiKey || !cx) {
  console.error('❌ Missing GOOGLE_API_KEY or GOOGLE_CSE_ID in .env');
  console.error('Get them at:');
  console.error('  API Key: https://console.cloud.google.com/apis/credentials');
  console.error('  CSE ID:  https://programmablesearchengine.google.com/controlpanel/all');
  process.exit(1);
}

try {
  const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(query)}&num=10`;
  const res = await fetch(url);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    console.error(`❌ Google API error ${res.status}:`, errData.error?.message || 'Unknown');
    process.exit(1);
  }
  const data = await res.json();

  if (!res.ok) {
    console.error(`❌ Google API error ${res.status}:`, data.error?.message || 'Unknown');
    process.exit(1);
  }

  const items = data.items || [];
  console.log(`✅ Found ${items.length} results:\n`);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    console.log(`${i + 1}. ${item.title}`);
    console.log(`   ${item.link}`);
    console.log(`   ${item.snippet?.slice(0, 100) || ''}`);
    console.log('');
  }

  console.log(`Search info: ${data.searchInformation?.totalResults || 0} total results`);
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
