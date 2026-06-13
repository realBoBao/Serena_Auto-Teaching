/**
 * lib/metrics.js — Prometheus metrics endpoint
 */

import { getLogger } from './logger.js';
const logger = getLogger('Metrics');

// ── In-memory metrics store
const metrics = {
  requests: 0,
  errors: 0,
  agentCalls: {},
  llmCalls: { openrouter: 0, gemini: 0, local: 0, static: 0 },
  ragQueries: 0,
  flashcardReviews: 0,
  sandboxRuns: 0,
  startTime: Date.now(),
};

export function recordRequest() { metrics.requests++; }
export function recordError() { metrics.errors++; }
export function recordAgentCall(agent) {
  metrics.agentCalls[agent] = (metrics.agentCalls[agent] || 0) + 1;
}
export function recordLlmCall(provider) {
  metrics.llmCalls[provider] = (metrics.llmCalls[provider] || 0) + 1;
}
export function recordRagQuery() { metrics.ragQueries++; }
export function recordFlashcardReview() { metrics.flashcardReviews++; }
export function recordSandboxRun() { metrics.sandboxRuns++; }

export function getMetrics() {
  const uptime = Math.floor((Date.now() - metrics.startTime) / 1000);
  return {
    uptime,
    requests: metrics.requests,
    errors: metrics.requests > 0 ? ((metrics.errors / metrics.requests) * 100).toFixed(2) + '%' : '0%',
    agentCalls: metrics.agentCalls,
    llmCalls: metrics.llmCalls,
    ragQueries: metrics.ragQueries,
    flashcardReviews: metrics.flashcardReviews,
    sandboxRuns: metrics.sandboxRuns,
  };
}

export function getPrometheusMetrics() {
  const m = getMetrics();
  return `
# HELP ai_brain_requests_total Total requests
# TYPE ai_brain_requests_total counter
ai_brain_requests_total ${m.requests}

# HELP ai_brain_errors_total Total errors
# TYPE ai_brain_errors_total counter
ai_brain_errors_total ${metrics.errors}

# HELP ai_brain_uptime_seconds Uptime in seconds
# TYPE ai_brain_uptime_seconds gauge
ai_brain_uptime_seconds ${m.uptime}

# HELP ai_brain_rag_queries_total Total RAG queries
# TYPE ai_brain_rag_queries_total counter
ai_brain_rag_queries_total ${m.ragQueries}

# HELP ai_brain_flashcard_reviews_total Total flashcard reviews
# TYPE ai_brain_flashcard_reviews_total counter
ai_brain_flashcard_reviews_total ${m.flashcardReviews}

# HELP ai_brain_sandbox_runs_total Total sandbox runs
# TYPE ai_brain_sandbox_runs_total counter
ai_brain_sandbox_runs_total ${m.sandboxRuns}
`.trim();
}

export default { recordRequest, recordError, recordAgentCall, recordLlmCall, recordRagQuery, recordFlashcardReview, recordSandboxRun, getMetrics, getPrometheusMetrics };
