/**
 * lib/prompt_compressor.js — Prompt Compression (Tier 2)
 * Nén prompt bằng TF-IDF để loại bỏ từ nhiễu, giảm token usage.
 * Không dùng thư viện ngoài — pure JavaScript.
 * @module lib/prompt_compressor
 */

import { getLogger } from './logger.js';
const logger = getLogger('PromptCompressor');

// Stopwords tiếng Việt + English
const STOPWORDS = new Set([
  // Vietnamese
  'và', 'của', 'có', 'được', 'là', 'trong', 'đã', 'để', 'với', 'một',
  'các', 'này', 'cho', 'không', 'về', 'từ', 'mà', 'sẽ', 'đang', 'nên',
  'rất', 'cũng', 'nhưng', 'hay', 'thì', 'nếu', 'khi', 'đó', 'tại', 'bị',
  'tại', 'vì', 'do', 'bởi', 'tuy', 'như', 'mặc', 'dù', 'song', 'lại',
  // English
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
  'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
  'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each',
  'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'just', 'because', 'but', 'and', 'or', 'if', 'while', 'about', 'up',
]);

/**
 * Tính TF-IDF score cho từ trong document.
 * @param {string} text
 * @returns {Map<string, number>} — word → tf-idf score
 */
function computeTfIdf(text) {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const totalWords = words.length;
  if (totalWords === 0) return new Map();

  // Term frequency
  const tf = new Map();
  for (const w of words) {
    tf.set(w, (tf.get(w) || 0) + 1);
  }

  // Normalize TF
  for (const [word, count] of tf) {
    tf.set(word, count / totalWords);
  }

  return tf;
}

/**
 * Nén prompt bằng cách loại bỏ stopwords và từ có TF-IDF thấp.
 * @param {string} prompt — Prompt gốc
 * @param {number} compressionRatio — Tỷ lệ nén (0.0 - 1.0), mặc định 0.3
 * @returns {string} — Prompt đã nén
 */
export function compressPrompt(prompt, compressionRatio = 0.3) {
  if (!prompt || prompt.length < 100) return prompt;

  const tfIdf = computeTfIdf(prompt);
  const words = prompt.split(/\s+/);

  // Tính threshold dựa trên compressionRatio
  const scores = [...tfIdf.values()].sort((a, b) => b - a);
  const thresholdIndex = Math.floor(scores.length * compressionRatio);
  const threshold = scores[thresholdIndex] || 0;

  // Giữ lại từ có score cao hoặc không phải stopword
  const compressed = words.filter(word => {
    const lower = word.toLowerCase();
    // Giữ lại stopwords quan trọng (câu hỏi, động từ chính)
    if (STOPWORDS.has(lower)) {
      // Giữ lại nếu là từ hỏi hoặc động từ quan trọng
      return /^(what|why|how|when|where|who|which|cần|phải|làm|thế|nào|hỏi|trả|lời|giải|thích|mô|tả|cho|biết|hướng|dẫn|giúp|đỡ|tìm|kiếm|xây|dựng|viết|chạy|test|debug|fix|thêm|xóa|sửa|đổi|tạo|xem|kiểm|tra|đánh|giá|so|sánh|phân|tích|giải|quyết|vấn|đề|lỗi|sai|bug|issue|problem|solution|answer|question|explain|describe|help|find|search|build|create|write|run|test|debug|fix|add|remove|delete|update|change|make|check|review|analyze|compare|solve)$/.test(lower);
    }
    // Giữ lại từ có TF-IDF cao
    const score = tfIdf.get(lower) || 0;
    return score >= threshold;
  });

  const result = compressed.join(' ');
  const saved = ((prompt.length - result.length) / prompt.length * 100).toFixed(1);
  logger.debug(`[PromptCompressor] Nén ${prompt.length} → ${result.length} chars (giảm ${saved}%)`);

  return result;
}

/**
 * Trích xuất keywords từ query để tìm kiếm vector hiệu quả hơn.
 * @param {string} query
 * @returns {string[]} — Keywords
 */
export function extractKeywords(query) {
  const words = query.toLowerCase().split(/\s+/);
  const tfIdf = computeTfIdf(query);

  // Lọc stopwords và sắp xếp theo TF-IDF
  return words
    .filter(w => !STOPWORDS.has(w) && w.length > 2)
    .sort((a, b) => (tfIdf.get(b) || 0) - (tfIdf.get(a) || 0))
    .slice(0, 10); // Top 10 keywords
}
