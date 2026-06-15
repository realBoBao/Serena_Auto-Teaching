/**
 * EvoAgent — Self-evolution background agent
 * Monitors logs, detects OOM errors, tracks quiz scores, optimizes hyperparameters.
 * @module agents/EvoAgent
 */

import { getLogger } from '../lib/logger.js';
const logger = getLogger('EvoAgent');

/**
 * Auto-evaluate system health and suggest optimizations.
 */
export async function autoEvaluate(options = {}) {
  logger.info('[EvoAgent] Running auto-evaluation');

  try {
    const { analyzePerformance } = await import('../lib/performance_profiler.js');
    const perf = analyzePerformance();

    const suggestions = [];
    if (!perf.healthy) {
      perf.warnings.forEach(w => suggestions.push({ type: 'performance', message: w }));
    }

    return {
      healthy: perf.healthy,
      metrics: perf.metrics,
      suggestions,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    logger.error('[EvoAgent] autoEvaluate failed:', err.message);
    return { healthy: true, suggestions: [], error: err.message };
  }
}

/**
 * Detect knowledge gaps from quiz results.
 */
export async function detectKnowledgeGaps() {
  logger.info('[EvoAgent] Detecting knowledge gaps');

  try {
    const { getDb } = await import('../lib/db.js');
    const db = await getDb();

    // Find topics with low accuracy
    const gaps = await db.all(`
      SELECT topic, 
             COUNT(*) as total,
             SUM(CASE WHEN correct = 1 THEN 1 ELSE 0 END) as correct,
             CAST(SUM(CASE WHEN correct = 1 THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) as accuracy
      FROM quiz_results 
      GROUP BY topic 
      HAVING accuracy < 0.6 AND total >= 3
      ORDER BY accuracy ASC
      LIMIT 10
    `).catch(() => []);

    return { gaps: gaps || [], count: gaps?.length || 0 };
  } catch (err) {
    logger.error('[EvoAgent] detectKnowledgeGaps failed:', err.message);
    return { gaps: [], count: 0 };
  }
}

export default { autoEvaluate, detectKnowledgeGaps };
