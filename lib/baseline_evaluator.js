/**
 * ═══════════════════════════════════════════════════════════════
 * Baseline Evaluator — Tier 3 (JuliusBrussee/caveman)
 * ═══════════════════════════════════════════════════════════════
 *
 * A/B testing framework: So sánh "caveman" (no optimization) vs optimized.
 * Đo lường thời gian chạy, chi phí token, chất lượng output.
 *
 * Impact: MEDIUM — Củng cố tính minh bạch F1-score dashboard
 * Effort: LOW — Chỉ cần flags điều hướng môi trường
 */

import { getLogger } from './logger.js';
const logger = getLogger('BaselineEval');

// ── Environment flags ──
const BASELINE_MODE = process.env.BASELINE_MODE === 'true'; // "caveman" mode
const AB_TEST_ENABLED = process.env.AB_TEST === 'true';

/**
 * Run function in baseline (caveman) mode — no optimizations.
 * Dùng để so sánh với optimized version.
 */
export async function runBaseline(fn, label = 'operation') {
  const start = Date.now();
  const memBefore = process.memoryUsage().heapUsed;

  try {
    const result = await fn();
    const duration = Date.now() - start;
    const memAfter = process.memoryUsage().heapUsed;

    const metrics = {
      label,
      duration,
      memoryDelta: memAfter - memBefore,
      mode: BASELINE_MODE ? 'baseline' : 'optimized',
      timestamp: new Date().toISOString(),
    };

    logger.info(`[BaselineEval] ${label}: ${duration}ms, mem: ${(memAfter - memBefore) / 1024}KB`);
    return { result, metrics };
  } catch (err) {
    const duration = Date.now() - start;
    logger.error(`[BaselineEval] ${label} failed after ${duration}ms: ${err.message}`);
    return { error: err.message, metrics: { label, duration, failed: true } };
  }
}

/**
 * A/B test: Run both baseline and optimized, compare results.
 */
export async function abTest(baselineFn, optimizedFn, label = 'ab-test') {
  if (!AB_TEST_ENABLED) {
    // Just run optimized if A/B testing disabled
    return runBaseline(optimizedFn, `${label}/optimized`);
  }

  // Run baseline first
  const baseline = await runBaseline(baselineFn, `${label}/baseline`);

  // Run optimized
  const optimized = await runBaseline(optimizedFn, `${label}/optimized`);

  // Compare
  const comparison = {
    label,
    baselineMs: baseline.metrics.duration,
    optimizedMs: optimized.metrics.duration,
    speedup: baseline.metrics.duration / Math.max(optimized.metrics.duration, 1),
    baselineMemory: baseline.metrics.memoryDelta,
    optimizedMemory: optimized.metrics.memoryDelta,
    winner: optimized.metrics.duration < baseline.metrics.duration ? 'optimized' : 'baseline',
  };

  logger.info(`[ABTest] ${label}: ${comparison.speedup.toFixed(2)}x speedup (${comparison.winner})`);
  return { baseline, optimized, comparison };
}

/**
 * Get current evaluation mode.
 */
export function getEvalMode() {
  return {
    baselineMode: BASELINE_MODE,
    abTestEnabled: AB_TEST_ENABLED,
    description: BASELINE_MODE
      ? 'Running in baseline (caveman) mode — no optimizations'
      : 'Running in optimized mode',
  };
}

export default { runBaseline, abTest, getEvalMode };
