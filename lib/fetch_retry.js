/**
 * lib/fetch_retry.js — Universal Retry Mechanism for HTTP Requests
 *
 * Cung cấp `fetchWithRetry()` wrapper bọc toàn bộ fetch calls.
 * - Tự động retry khi gặp lỗi network, 429, 500, 502, 503, 504
 * - Exponential backoff: 1s → 2s → 4s → 8s (max 3 retries)
 * - Respect `Retry-After` header cho 429
 * - Timeout mặc định 30s
 *
 * Usage:
 *   import { fetchWithRetry } from './fetch_retry.js';
 *   const res = await fetchWithRetry(url, { headers: {...}, maxRetries: 3 });
 */

import { getLogger } from './logger.js';

const logger = getLogger('FetchRetry');

const RETRYABLE_STATUS = [429, 500, 502, 503, 504];
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 1000;
const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Fetch với retry tự động + exponential backoff
 *
 * @param {string} url
 * @param {object} options — Fetch options + { maxRetries, baseDelayMs, timeoutMs }
 * @returns {Response}
 */
export async function fetchWithRetry(url, options = {}) {
  const {
    maxRetries = DEFAULT_MAX_RETRIES,
    baseDelayMs = DEFAULT_BASE_DELAY_MS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    ...fetchOptions
  } = options;

  let lastErr;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Delay trước mỗi retry (không delay lần đầu)
    if (attempt > 0) {
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      logger.info(`[FetchRetry] Retry ${attempt}/${maxRetries} for ${url.slice(0, 80)} — waiting ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
    }

    try {
      // Wrap với timeout
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });
      clearTimeout(timer);

      // Nếu OK hoặc không retryable → return ngay
      if (res.ok || !RETRYABLE_STATUS.includes(res.status)) {
        return res;
      }

      // 429 — đọc Retry-After header
      if (res.status === 429) {
        const retryAfter = res.headers.get('retry-after');
        if (retryAfter && attempt < maxRetries) {
          const waitSec = parseInt(retryAfter, 10) || 5;
          logger.warn(`[FetchRetry] 429 Rate limited — waiting ${waitSec}s (Retry-After header)`);
          await new Promise(r => setTimeout(r, waitSec * 1000));
          continue;
        }
      }

      // 5xx — retry với backoff
      logger.warn(`[FetchRetry] HTTP ${res.status} for ${url.slice(0, 80)} — will retry`);
      lastErr = new Error(`HTTP ${res.status}`);
      continue;

    } catch (err) {
      clearTimeout?.(timer);
      // Network error, timeout, abort — retry
      lastErr = err;
      const isTimeout = err.name === 'AbortError';
      logger.warn(`[FetchRetry] ${isTimeout ? 'Timeout' : 'Network error'} for ${url.slice(0, 80)}: ${err.message}`);
      continue;
    }
  }

  // Hết retries — throw lỗi cuối
  logger.error(`[FetchRetry] All ${maxRetries} retries exhausted for ${url.slice(0, 80)}`);
  throw lastErr || new Error(`Fetch failed after ${maxRetries} retries`);
}

/**
 * Fetch JSON với retry — shortcut cho các API call
 */
export async function fetchJsonWithRetry(url, options = {}) {
  const res = await fetchWithRetry(url, options);
  return res.json();
}

export default { fetchWithRetry, fetchJsonWithRetry };
