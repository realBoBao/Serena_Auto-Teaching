/**
 * lib/graph_pagerank.js — PageRank for knowledge graph node ranking
 * Ranks entities by importance in the knowledge graph.
 * @module lib/graph_pagerank
 */

const DAMPING = 0.85;
const MAX_ITERATIONS = 50;
const CONVERGENCE_THRESHOLD = 0.0001;

/**
 * Run PageRank on an adjacency list.
 * @param {Object} graph — { nodeId: [neighborId, ...] }
 * @returns {Object} — { nodeId: score }
 */
export function pagerank(graph) {
  const nodes = Object.keys(graph);
  if (nodes.length === 0) return {};

  const N = nodes.length;
  const scores = {};
  const newScores = {};

  // Initialize
  for (const node of nodes) {
    scores[node] = 1 / N;
  }

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    let danglingSum = 0;
    for (const node of nodes) {
      if (!graph[node] || graph[node].length === 0) {
        danglingSum += scores[node];
      }
    }

    for (const node of nodes) {
      let rank = (1 - DAMPING) / N + DAMPING * danglingSum / N;
      for (const other of nodes) {
        if (graph[other] && graph[other].includes(node)) {
          rank += DAMPING * scores[other] / graph[other].length;
        }
      }
      newScores[node] = rank;
    }

    // Check convergence
    let diff = 0;
    for (const node of nodes) {
      diff += Math.abs(newScores[node] - scores[node]);
      scores[node] = newScores[node];
    }
    if (diff < CONVERGENCE_THRESHOLD) break;
  }

  return scores;
}

/**
 * Get top-N nodes by PageRank score.
 */
export function getTopNodes(graph, topN = 10) {
  const scores = pagerank(graph);
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([id, score]) => ({ id, score }));
}

export default { pagerank, getTopNodes };
