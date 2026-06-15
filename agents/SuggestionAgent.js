/**
 * SuggestionAgent — Proactive suggestion engine
 * Monitors context and suggests relevant topics, actions, or follow-ups.
 * @module agents/SuggestionAgent
 */

import { ask as llmAsk } from '../lib/llm.js';
import { getLogger } from '../lib/logger.js';

const logger = getLogger('SuggestionAgent');

/**
 * Run context monitor and generate proactive suggestions.
 */
export async function runContextMonitor(options = {}) {
  logger.info('[SuggestionAgent] Running context monitor');

  try {
    const prompt = `Bạn là AI assistant. Dựa trên context hệ thống hiện tại, đưa ra 3 gợi ý hữu ích cho user.

Gợi ý nên liên quan đến:
1. Ôn tập kiến thức cũ (spaced repetition)
2. Học topic mới dựa trên interest
3. Cải thiện code/project hiện tại

Trả về JSON: { "suggestions": [{ "title": "...", "reason": "...", "action": "..." }] }`;

    const result = await llmAsk(prompt, {
      systemPrompt: 'Bạn là AI gợi ý thông minh. Trả về JSON hợp lệ.',
      temperature: 0.7,
      maxTokens: 1024,
    });

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { suggestions: [] };

    return {
      suggestions: parsed.suggestions || [],
      message: (parsed.suggestions || []).map((s, i) => `${i + 1}. **${s.title}** — ${s.reason}`).join('\n'),
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    logger.error('[SuggestionAgent] runContextMonitor failed:', err.message);
    return { suggestions: [], message: '', error: err.message };
  }
}

export default { runContextMonitor };
