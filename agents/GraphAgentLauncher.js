/**
 * GraphAgent Launcher — PM2-safe wrapper
 * Prevents PM2 restart loops by handling errors gracefully.
 */
import { start, stop } from './GraphAgent.js';

process.on('unhandledRejection', (err) => {
  console.error('[GraphAgent] Unhandled rejection:', err?.message || err);
  // Don't exit — keep running
});

process.on('uncaughtException', (err) => {
  console.error('[GraphAgent] Uncaught exception:', err?.message || err);
  // Don't exit — keep running
});

process.on('SIGINT', async () => {
  console.log('[GraphAgent] SIGINT received');
  await stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[GraphAgent] SIGTERM received');
  await stop();
  process.exit(0);
});

// Start the agent
start().then(() => {
  console.log('[GraphAgent] Agent started successfully, keeping process alive...');
  // Keep process alive — PM2 needs this
  setInterval(() => {
    // Heartbeat — prevents PM2 from thinking process is dead
  }, 30000);
}).catch(err => {
  console.error('[GraphAgent] Start error:', err?.message || err);
  // Keep process alive even if start fails
  setInterval(() => {}, 60000);
});
