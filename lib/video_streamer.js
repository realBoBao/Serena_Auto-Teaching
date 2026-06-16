/**
 * lib/video_streamer.js — Puppeteer Video Streamer (Tier 1)
 * Render PNGTuber HTML thành video stream cho Discord.
 * Dùng puppeteer-core để chạy headless Chrome, capture frames, stream qua FFmpeg.
 * @module lib/video_streamer
 */

import { getLogger } from './logger.js';
const logger = getLogger('VideoStreamer');

let _browser = null;
let _page = null;
let _streaming = false;

/**
 * Khởi tạo Puppeteer browser.
 */
export async function init() {
  try {
    const puppeteer = await import('puppeteer-core');
    _browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
    _page = await _browser.newPage();
    await _page.setViewport({ width: 300, height: 300 });
    logger.info('[VideoStreamer] Puppeteer initialized');
  } catch (err) {
    logger.error(`[VideoStreamer] Init failed: ${err.message}`);
  }
}

/**
 * Load PNGTuber HTML page.
 * @param {string} url — URL của PNGTuber page
 */
export async function loadPage(url) {
  if (!_page) await init();
  try {
    await _page.goto(url, { waitUntil: 'networkidle0' });
    logger.info(`[VideoStreamer] Loaded: ${url}`);
  } catch (err) {
    logger.error(`[VideoStreamer] Load failed: ${err.message}`);
  }
}

/**
 * Gửi lệnh đến PNGTuber page.
 * @param {Object} data — { type: 'speaking'|'idle'|'emotion', ...}
 */
export async function sendCommand(data) {
  if (!_page) return;
  try {
    await _page.evaluate((d) => {
      // Trigger event trong page
      window.dispatchEvent(new CustomEvent('avatar', { detail: d }));
    }, data);
  } catch (err) {
    logger.debug(`[VideoStreamer] Command failed: ${err.message}`);
  }
}

/**
 * Capture screenshot từ page.
 * @returns {Promise<Buffer|null>}
 */
export async function captureFrame() {
  if (!_page) return null;
  try {
    return await _page.screenshot({ type: 'png', omitBackground: true });
  } catch {
    return null;
  }
}

/**
 * Đóng browser.
 */
export async function close() {
  if (_browser) {
    await _browser.close();
    _browser = null;
    _page = null;
    logger.info('[VideoStreamer] Closed');
  }
}

/**
 * Kiểm tra đang streaming không.
 */
export function isStreaming() {
  return _streaming;
}

/**
 * Set streaming state.
 */
export function setStreaming(val) {
  _streaming = val;
}
