/**
 * lib/edge_router.js — Edge SLM Routing (Tier 4)
 * Dùng model nhỏ local (Phi-3-mini / bge-micro) cho intent classification.
 * Giảm độ trễ routing về O(1) và triệt tiêu chi phí API cho gác cổng.
 * @module lib/edge_router
 */

import { getLogger } from './logger.js';
const logger = getLogger('EdgeRouter');

const LOCAL_LLM_URL = process.env.LOCAL_LLM_URL || 'http://127.0.0.1:3002';

// Intent patterns (keyword-based fallback khi local LLM không available)
const INTENT_PATTERNS = {
  WEATHER: /thời tiết|nhiệt độ|mưa|nắng|gió|cloud|weather|temperature/i,
  CODE: /code|viết|chạy|debug|fix|bug|function|class|script|program/i,
  DEBATE: /debate|tranh luận|so sánh|phản bác|argue/i,
  QUIZ: /quiz|trắc nghiệm|kiểm tra|test|question/i,
  LEARN: /học|learn|giảng|explain|hiểu|understand|tutorial/i,
  PLAN: /plan|kế hoạch|roadmap|lộ trình|schedule/i,
  VISION: /vision|ảnh|image|nhìn|thấy|photo|picture/i,
  VOICE: /voice|audio|nghe|nói|transcribe|speech/i,
  ANIMATE: /animate|video|animation|manim|render/i,
  ANALYZE: /analyze|phân tích|review|check|inspect/i,
  AUDIT: /audit|bảo mật|security|vulnerability|scan/i,
  PROFILE: /profile|hồ sơ|thông tin|stats|thống kê/i,
  MEMORY: /memory|nhớ|ghi nhớ|recall|history/i,
  SEARCH: /search|tìm|find|look up|google/i,
  HELP: /help|trợ giúp|hướng dẫn|command|lệnh/i,
};

/**
 * Phân loại intent bằng keyword matching (không cần LLM).
 * @param {string} text
 * @returns {string} — Intent name hoặc 'GENERAL'
 */
export function classifyIntentLocal(text) {
  if (!text) return 'GENERAL';

  for (const [intent, pattern] of Object.entries(INTENT_PATTERNS)) {
    if (pattern.test(text)) {
      return intent;
    }
  }

  return 'GENERAL';
}

/**
 * Phân loại intent bằng local LLM (nếu có).
 * @param {string} text
 * @returns {Promise<string>}
 */
export async function classifyIntentLlm(text) {
  if (!text) return 'GENERAL';

  // Thử local LLM trước
  if (LOCAL_LLM_URL) {
    try {
      const res = await fetch(`${LOCAL_LLM_URL}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `Phân loại ý định của người dùng thành 1 trong các nhãn: WEATHER, CODE, DEBATE, QUIZ, LEARN, PLAN, VISION, VOICE, ANIMATE, ANALYZE, AUDIT, PROFILE, MEMORY, SEARCH, HELP, GENERAL. Chỉ trả về tên nhãn, không giải thích.\n\nInput: ${text}`,
          maxTokens: 10,
        }),
        signal: AbortSignal.timeout(3000),
      });

      if (res.ok) {
        const data = await res.json();
        const intent = (data.answer || data.content || 'GENERAL').trim().toUpperCase();
        if (Object.keys(INTENT_PATTERNS).includes(intent) || intent === 'GENERAL') {
          return intent;
        }
      }
    } catch {
      // Local LLM không available → fallback keyword
    }
  }

  // Fallback: keyword matching
  return classifyIntentLocal(text);
}

/**
 * Route message đến agent phù hợp.
 * @param {string} text
 * @returns {Promise<string>} — Agent name
 */
export async function route(text) {
  const intent = await classifyIntentLlm(text);

  const AGENT_MAP = {
    WEATHER: 'weather-plugin',
    CODE: 'CoderAgent',
    DEBATE: 'DebateAgent',
    QUIZ: 'SocraticAgent',
    LEARN: 'RagAgent',
    PLAN: 'PlannerAgent',
    VISION: 'VisionAgent',
    VOICE: 'VoiceAgent',
    ANIMATE: 'ManimAgent',
    ANALYZE: 'AnalysisAgent',
    AUDIT: 'SecurityAuditor',
    PROFILE: 'RagAgent',
    MEMORY: 'RagAgent',
    SEARCH: 'RagAgent',
    HELP: 'RagAgent',
    GENERAL: 'RagAgent',
  };

  return AGENT_MAP[intent] || 'RagAgent';
}
