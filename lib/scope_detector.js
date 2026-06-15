/**
 * lib/scope_detector.js — Detect query scope (on-topic vs off-topic)
 * Prevents the bot from answering questions outside its knowledge domain.
 * @module lib/scope_detector
 */

import { getLogger } from './logger.js';
const logger = getLogger('ScopeDetector');

// Topics the bot is designed for
const ON_TOPIC_KEYWORDS = [
  'học', 'code', 'lập trình', 'programming', 'algorithm', 'thuật toán',
  'javascript', 'python', 'node', 'react', 'database', 'sql', 'git',
  'debug', 'error', 'bug', 'deploy', 'cloud', 'api', 'rest',
  'machine learning', 'ai', 'data structure', 'design pattern',
  'flashcard', 'quiz', 'ôn tập', 'bài tập', 'dự án',
];

const OFF_TOPIC_PATTERNS = [
  /chính trị|bầu cử|đảng phải|đảng tả/,
  /cờ bạc|cá độ|cược/,
  /khiêu dâm|porn|xxx/,
  /bạo lực|giết người|đánh nhau|hành hung/,
  /ma túy|cần sa|heroin|cocaine/,
  /lừa đảo|scam|fraud/,
  /tôn giáo|đạo giáo|phật giáo|thiên chúa|hồi giáo/,
  /sức khỏe|bệnh tật|y học|chữa bệnh/,

];

/**
 * Check if a query is within the bot's scope.
 * @returns {{ inScope: boolean, reason: string }}
 */
export function checkScope(query) {
  const q = query.toLowerCase().trim();

  // Check off-topic patterns
  for (const pattern of OFF_TOPIC_PATTERNS) {
    if (pattern.test(q)) {
      return { inScope: false, reason: 'off_topic_blocked' };
    }
  }

  // Check on-topic keywords
  const hasTopic = ON_TOPIC_KEYWORDS.some(kw => q.includes(kw));
  if (hasTopic) {
    return { inScope: true, reason: 'on_topic' };
  }

  // Short queries or greetings are OK
  if (q.length < 20 || /^(hi|hello|hey|chào|xin chào|ok|cảm ơn|thanks)/i.test(q)) {
    return { inScope: true, reason: 'greeting_short' };
  }

  // Default: allow but flag as potentially off-topic
  return { inScope: true, reason: 'general_query' };
}

export default { checkScope };
