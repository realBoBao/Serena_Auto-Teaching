/**
 * lib/north_star.js — North Star Metric Framework (Tier 2)
 * Theo dõi 1 metric cốt lõi: "Thời gian tập trung khi có Serena đồng hành"
 * Mọi feature phải trả lời: "Có giúp kéo dài thời gian tập trung không?"
 * @module lib/north_star
 */

import { getLogger } from './logger.js';
const logger = getLogger('NorthStar');

// North Star Metric: focus_time_minutes
// Các supporting metrics:
// - session_count: Số lần user bắt đầu session học
// - avg_session_duration: Thời gian trung bình mỗi session
// - interruptions: Số lần user bị gián đoạn (từ bên ngoài)
// - serena_responses: Số lần Serena phản hồi
// - serena_helpful: Số lần user đánh giá Serena hữu ích (👍)

const _sessions = new Map(); // userId → { startTime, endTime, interrupts, responses, helpful }

/**
 * Bắt đầu session học.
 * @param {string} userId
 */
export function startSession(userId) {
  _sessions.set(userId, {
    startTime: Date.now(),
    endTime: null,
    interrupts: 0,
    responses: 0,
    helpful: 0,
  });
  logger.info(`[NorthStar] Session started: ${userId}`);
}

/**
 * Kết thúc session học.
 * @param {string} userId
 * @returns {Object|null} — Session stats
 */
export function endSession(userId) {
  const session = _sessions.get(userId);
  if (!session) return null;

  session.endTime = Date.now();
  const duration = Math.round((session.endTime - session.startTime) / 60000); // minutes

  const stats = {
    userId,
    duration_minutes: duration,
    interrupts: session.interrupts,
    responses: session.responses,
    helpful: session.helpful,
    helpful_ratio: session.responses > 0 ? (session.helpful / session.responses).toFixed(2) : 0,
  };

  logger.info(`[NorthStar] Session ended: ${userId}`, stats);
  _sessions.delete(userId);
  return stats;
}

/**
 * Record Serena response.
 * @param {string} userId
 */
export function recordResponse(userId) {
  const session = _sessions.get(userId);
  if (session) session.responses++;
}

/**
 * Record helpful feedback.
 * @param {string} userId
 */
export function recordHelpful(userId) {
  const session = _sessions.get(userId);
  if (session) session.helpful++;
}

/**
 * Record interruption.
 * @param {string} userId
 */
export function recordInterruption(userId) {
  const session = _sessions.get(userId);
  if (session) session.interrupts++;
}

/**
 * Lấy session hiện tại.
 * @param {string} userId
 */
export function getSession(userId) {
  return _sessions.get(userId) || null;
}

/**
 * Lấy tất cả sessions (cho analytics).
 */
export function getAllSessions() {
  return [..._sessions.entries()].map(([userId, s]) => ({
    userId,
    duration_minutes: s.endTime ? Math.round((s.endTime - s.startTime) / 60000) : Math.round((Date.now() - s.startTime) / 60000),
    interrupts: s.interrupts,
    responses: s.responses,
    helpful: s.helpful,
  }));
}
