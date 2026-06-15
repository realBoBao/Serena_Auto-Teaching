/**
 * PlannerWorker — BullMQ worker for PlannerAgent
 * Processes planner jobs from the queue.
 * @module agents/PlannerWorker
 */

import { getLogger } from '../lib/logger.js';
const logger = getLogger('PlannerWorker');

/**
 * Process a planner job.
 */
export async function processPlannerJob(job) {
  const { type, data } = job;
  logger.info(`[PlannerWorker] Processing job type: ${type}`);

  try {
    switch (type) {
      case 'create_plan': {
        const { createPlan } = await import('./PlannerAgent.js');
        return await createPlan(data.query, data.options);
      }
      case 'create_vision_plan': {
        const { createVisionFirstPlan } = await import('./PlannerAgent.js');
        return await createVisionFirstPlan(data);
      }
      default:
        logger.warn(`[PlannerWorker] Unknown job type: ${type}`);
        return { error: `Unknown job type: ${type}` };
    }
  } catch (err) {
    logger.error('[PlannerWorker] Job failed:', err.message);
    throw err; // Let BullMQ retry
  }
}

export default { processPlannerJob };
