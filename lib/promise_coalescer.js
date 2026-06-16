/**
 * lib/promise_coalescer.js — Promise Coalescing (Tier 1)
 * Gộp các request trùng lặp thành 1 Promise duy nhất.
 * Tránh Thundering Herd khi nhiều Agent cùng query 1 dữ liệu.
 * @module lib/promise_coalescer
 */

import { getLogger } from './logger.js';
const logger = getLogger('PromiseCoalescer');

// Map<cacheKey, Promise>
const _pending = new Map();

/**
 * Coalesce wrapper — gộp request trùng key thành 1 Promise.
 * @param {string} key — Cache key
 * @param {Function} fn — Async function để gọi nếu chưa có pending
 * @param {number} ttl — Thời gian giữ pending (ms), mặc định 5000
 * @returns {Promise}
 */
export async function coalesce(key, fn, ttl = 5000) {
  // Nếu đang có pending request cho key này → trả về Promise đang chạy
  if (_pending.has(key)) {
    logger.debug(`[Coalesce] Reuse pending: ${key.slice(0, 40)}`);
    return _pending.get(key);
  }

  // Tạo Promise mới
  const promise = fn().finally(() => {
    // Xóa sau khi hoàn thành (hoặc sau ttl)
    setTimeout(() => _pending.delete(key), ttl);
  });

  _pending.set(key, promise);
  logger.debug(`[Coalesce] New request: ${key.slice(0, 40)}`);
  return promise;
}

/**
 * Xóa pending cache.
 * @param {string} key
 */
export function invalidate(key) {
  _pending.delete(key);
}

/**
 * Xóa tất cả pending.
 */
export function clearAll() {
  _pending.clear();
}

/**
 * Lấy số lượng pending requests.
 */
export function pendingCount() {
  return _pending.size;
}
