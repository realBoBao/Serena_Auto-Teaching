/**
 * GraphAgentLauncher — Launcher for GraphAgent standalone service
 * Starts GraphAgent as a background PM2 service.
 * @module agents/GraphAgentLauncher
 */

import { getLogger } from '../lib/logger.js';
const logger = getLogger('GraphAgentLauncher');

export async function start() {
  logger.info('[GraphAgentLauncher] Starting GraphAgent service');
  // In PM2 mode, this would be started via ecosystem.config.cjs
  // For now, just verify the agent can be loaded
  try {
    const agent = await import('./GraphAgent.js');
    logger.info('[GraphAgentLauncher] GraphAgent loaded successfully');
    return { started: true, agent: Object.keys(agent) };
  } catch (err) {
    logger.error('[GraphAgentLauncher] Failed to load GraphAgent:', err.message);
    return { started: false, error: err.message };
  }
}

export default { start };
