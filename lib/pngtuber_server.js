/**
 * lib/pngtuber_server.js — PNGTuber WebSocket Server (Tier 1 + Tier 2)
 * Thin Client: chỉ cần trình duyệt trên tablet/điện thoại.
 * Graceful Degradation: CSS PNGTuber thay vì Live2D nặng.
 * @module lib/pngtuber_server
 */

import { WebSocketServer } from 'ws';
import { getLogger } from './logger.js';
const logger = logger = getLogger('PNGTuber');

let _wss = null;
const _clients = new Set();

/**
 * Khởi tạo WebSocket server.
 * @param {import('http').Server} httpServer
 */
export function init(httpServer) {
  _wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  _wss.on('connection', (ws) => {
    _clients.add(ws);
    logger.info(`[PNGTuber] Client connected (${_clients.size} total)`);

    ws.on('close', () => {
      _clients.delete(ws);
      logger.info(`[PNGTuber] Client disconnected (${_clients.size} remaining)`);
    });

    ws.on('error', (err) => {
      logger.error(`[PNGTuber] WS error: ${err.message}`);
      _clients.delete(ws);
    });
  });

  logger.info('[PNGTuber] WebSocket server initialized');
}

/**
 * Broadcast message đến tất cả clients.
 * @param {Object} data
 */
export function broadcast(data) {
  if (!_wss || _clients.size === 0) return;

  const msg = JSON.stringify(data);
  for (const client of _clients) {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(msg).catch(() => {});
    }
  }
}

/**
 * Gửi trạng thái speaking.
 */
export function setSpeaking() {
  broadcast({ type: 'speaking' });
}

/**
 * Gửi trạng thái idle.
 */
export function setIdle() {
  broadcast({ type: 'idle' });
}

/**
 * Gửi trạng thái studying.
 */
export function setStudying() {
  broadcast({ type: 'studying' });
}

/**
 * Gửi emotion.
 * @param {string} emotion — happy, sad, thinking, surprised
 */
export function setEmotion(emotion) {
  broadcast({ type: 'emotion', emotion });
}

/**
 * Gửi text.
 * @param {string} text
 */
export function setText(text) {
  broadcast({ type: 'text', text });
}

/**
 * Lấy số lượng clients đang kết nối.
 */
export function clientCount() {
  return _clients.size;
}
