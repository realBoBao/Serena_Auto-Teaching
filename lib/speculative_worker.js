/**
 * lib/speculative_worker.js — Speculative Execution (Tier 2)
 * Chạy trước RAG pipeline cho các câu hỏi tiếp theo có xác suất cao.
 * Giảm perceived latency xuống 0 giây.
 * @module lib/speculative_worker
 */

import { getLogger } from './logger.js';
const logger = getLogger('SpeculativeWorker');

// Map<cacheKey, { promise, timestamp }>
const _prefetchCache = new Map();
const MAX_PREFETCH = 10;
const PREFETCH_TTL = 5 * 60 * 1000; // 5 phút

/**
 * Dự đoán câu hỏi tiếp theo dự trên learning path.
 * @param {string} currentTopic — Topic hiện tại
 * @param {Array} learningPath — DAG learning path nodes
 * @returns {Array<string>} — Danh sách câu hỏi tiềm năng
 */
export function predictNextQueries(currentTopic, learningPath = []) {
  if (!learningPath || learningPath.length === 0) return [];

  // Tìm node hiện tại trong path
  const currentIndex = learningPath.findIndex(n =>
    n.name?.toLowerCase().includes(currentTopic.toLowerCase()) ||
    currentTopic.toLowerCase().includes(n.name?.toLowerCase() || '')
  );

  if (currentIndex === -1 || currentIndex >= learningPath.length - 1) return [];

  // Lấy 3 node tiếp theo
  const nextNodes = learningPath.slice(currentIndex + 1, currentIndex + 4);
  return nextNodes.map(n => `Tổng quan về ${n.name}`);
}

/**
 * Chạy trước RAG pipeline cho một query.
 * @param {string} query
 */
export async function prefetch(query) {
  if (!query || query.length < 10) return;

  const key = query.slice(0, 100);
  if (_prefetchCache.has(key)) return;

  // Giới hạn số lượng prefetch
  if (_prefetchCache.size >= MAX_PREFETCH) {
    // Xóa entry cũ nhất
    const oldest = [..._prefetchCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
    if (oldest) _prefetchCache.delete(oldest[0]);
  }

  logger.debug(`[Speculative] Prefetching: ${query.slice(0, 50)}`);

  // Chạy RAG pipeline ngầm
  const promise = (async () => {
    try {
      const { answerQuestion } = await import('../agents/RagAgent.js');
      return await answerQuestion(query, { userId: 'prefetch' });
    } catch {
      return null;
    }
  })();

  _prefetchCache.set(key, { promise, timestamp: Date.now() });

  // Auto-cleanup sau TTL
  setTimeout(() => _prefetchCache.delete(key), PREFETCH_TTL);
}

/**
 * Lấy kết quả prefetch nếu có.
 * @param {string} query
 * @returns {Promise<string|null>}
 */
export async function getPrefetched(query) {
  const key = query.slice(0, 100);
  const entry = _prefetchCache.get(key);
  if (!entry) return null;

  try {
    const result = await entry.promise;
    _prefetchCache.delete(key);
    logger.info(`[Speculative] Cache hit: ${query.slice(0, 50)}`);
    return result;
  } catch {
    _prefetchCache.delete(key);
    return null;
  }
}

/**
 * Xóa toàn bộ prefetch cache.
 */
export function clearPrefetch() {
  _prefetchCache.clear();
}
