// Full integration test - run the actual main() with debug
import 'dotenv/config';

// Mock process.exit to prevent crash
const origExit = process.exit;
process.exit = (code) => { console.log(`[MOCK] process.exit(${code})`); };

// Capture all logs
const logs = [];
const origLog = console.log;
const origError = console.error;
console.log = (...args) => { logs.push(args.join(' ')); origLog(...args); };
console.error = (...args) => { logs.push('ERR: ' + args.join(' ')); origError(...args); };

try {
  // Import and run main
  const mod = await import('../cron/job_scraper.js');
  // If main is exported, call it
  if (mod.main) {
    await mod.main();
  } else {
    // Module runs main() on import - it already ran
    console.log('[TEST] Module executed');
  }
} catch (e) {
  console.error('[TEST] Fatal:', e.message);
  console.error('[TEST] Stack:', e.stack);
}

// Print summary
console.log('\n=== LOG SUMMARY ===');
for (const l of logs) {
  console.log(l);
}
