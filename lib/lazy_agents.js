/**
 * lib/lazy_agents.js — Lazy agent loading utilities
 * Provides stats about loaded agents without importing all of them.
 * @module lib/lazy_agents
 */

import { getLogger } from './logger.js';
const logger = getLogger('LazyAgents');

const AGENT_NAMES = [
  'AnalysisAgent', 'CoderAgent', 'DebateAgent', 'IncidentAgent',
  'ManimAgent', 'MentorAgent', 'RagAgent', 'RouterAgent',
  'SocraticAgent', 'VisionAgent', 'VoiceAgent',
];

/**
 * Get stats about available agents (without loading them).
 */
export function getStats() {
  return {
    available: AGENT_NAMES.length,
    agents: AGENT_NAMES,
    loaded: 0, // Would track actual loaded count if we maintained state
  };
}

export default { getStats };
