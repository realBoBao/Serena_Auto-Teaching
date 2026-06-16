/**
 * lib/backoff.js — Exponential Backoff with Full Jitter (Tier 2)
 * Retry thông minh để tránh Thundering Herd khi API bên ngoài fail.
 * @module lib/backoff
 */

/**
 * Tính delay với exponential backoff + full jitter.
 * @param {number} attempt — Số lần retry (0-indexed)
 * @param {number} baseDelay — Delay cơ bản (ms), mặc định 1000
 * @param {number} maxDelay — Delay tối đa (ms), mặc định 30000
 * @returns {number} — Delay (ms)
 */
export function calcDelay(attempt, baseDelay = 1000, maxDelay = 30000) {
  // Exponential: base * 2^attempt
  const exp = baseDelay * Math.pow(2, attempt);
  // Full Jitter: random từ 0 đến exp
  return Math.min(Math.random() * exp, maxDelay);
}

/**
 * Retry wrapper với exponential backoff + jitter.
 * @param {Function} fn — Async function để retry
 * @param {Object} opts
 * @param {number} opts.maxRetries — Số lần retry tối đa, mặc định 3
 * @param {number} opts.baseDelay — Delay cơ bản (ms), mặc định 1000
 * @param {number} opts.maxDelay — Delay tối đa (ms), mặc định 30000
 * @param {Function} opts.shouldRetry — Hàm kiểm tra nên retry hay không
 * @returns {Promise<any>}
 */
export async function retry(fn, opts = {}) {
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 30000, shouldRetry = () => true } = opts;

  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === maxRetries || !shouldRetry(err)) throw err;

      const delay = calcDelay(attempt, baseDelay, maxDelay);
      console.warn(`[Backoff] Retry ${attempt + 1}/${maxRetries} after ${delay.toFixed(0)}ms: ${err.message?.slice(0, 80)}`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError;
}
