/**
 * lib/performance_profiler.js — System performance profiling
 * Monitors CPU, memory, event loop latency.
 * @module lib/performance_profiler
 */

import { getLogger } from './logger.js';
import os from 'os';
const logger = getLogger('PerfProfiler');

/**
 * Get current system metrics.
 */
export function getSystemMetrics() {
  const mem = process.memoryUsage();
  return {
    cpuUsage: process.cpuUsage(),
    memory: {
      rss: Math.round(mem.rss / 1024 / 1024) + ' MB',
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024) + ' MB',
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024) + ' MB',
      external: Math.round(mem.external / 1024 / 1024) + ' MB',
    },
    system: {
      freeMem: Math.round(os.freemem() / 1024 / 1024) + ' MB',
      totalMem: Math.round(os.totalmem() / 1024 / 1024) + ' MB',
      loadAvg: os.loadavg(),
      uptime: Math.round(os.uptime() / 3600) + 'h',
    },
    node: {
      uptime: Math.round(process.uptime() / 3600) + 'h',
      version: process.version,
    },
  };
}

/**
 * Analyze performance and return warnings.
 */
export function analyzePerformance() {
  const metrics = getSystemMetrics();
  const warnings = [];

  const heapUsedMB = parseInt(metrics.memory.heapUsed);
  if (heapUsedMB > 500) warnings.push('⚠️ High heap usage: ' + metrics.memory.heapUsed);

  const freeMemMB = parseInt(metrics.system.freeMem);
  if (freeMemMB < 200) warnings.push('⚠️ Low system memory: ' + metrics.system.freeMem);

  const load = metrics.system.loadAvg[0];
  if (load > 4) warnings.push('⚠️ High CPU load: ' + load.toFixed(2));

  return { metrics, warnings, healthy: warnings.length === 0 };
}

export default { getSystemMetrics, analyzePerformance };
