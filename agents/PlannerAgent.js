/**
 * PlannerAgent — OODA-based task planner
 * Creates DAG (Directed Acyclic Graph) plans from high-level goals.
 * Supports vision-first planning (image → plan → execute).
 * @module agents/PlannerAgent
 */

import { ask as llmAsk } from '../lib/llm.js';
import { getLogger } from '../lib/logger.js';
import { HumanMessage } from '@langchain/core/messages';

const logger = getLogger('PlannerAgent');

/**
 * Create a vision-first plan: analyze image → generate DAG → execute.
 */
export async function createVisionFirstPlan({ imageDescription, userQuery, userId }) {
  logger.info('[PlannerAgent] Creating vision-first plan');

  const prompt = `Bạn là một AI planner chuyên nghiệp. Dựa trên mô tả ảnh và yêu cầu user, tạo một kế hoạch thực hiện chi tiết dưới dạng DAG (Directed Acyclic Graph).

Mô tả ảnh: ${imageDescription}
Yêu cầu user: ${userQuery}

Trả về JSON với format:
{
  "goal": "mục tiêu tổng quát",
  "steps": [
    { "id": "step1", "action": "mô tả hành động", "dependsOn": [], "agent": "tên agent thực hiện" },
    { "id": "step2", "action": "mô tả hành động", "dependsOn": ["step1"], "agent": "tên agent" }
  ]
}

Chỉ trả về JSON, không giải thích thêm.`;

  try {
    const result = await llmAsk(prompt, {
      systemPrompt: 'Bạn là AI planner. Luôn trả về JSON hợp lệ.',
      temperature: 0.3,
      maxTokens: 2048,
    });

    // Parse JSON from response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in planner response');

    const dag = JSON.parse(jsonMatch[0]);
    return {
      dag,
      visionDescription: imageDescription,
      userQuery,
      goal: dag.goal || userQuery,
      steps: dag.steps || [],
    };
  } catch (err) {
    logger.error('[PlannerAgent] createVisionFirstPlan failed:', err.message);
    return {
      dag: { goal: userQuery, steps: [{ id: 'step1', action: userQuery, dependsOn: [], agent: 'CoderAgent' }] },
      visionDescription: imageDescription,
      userQuery,
      goal: userQuery,
      steps: [{ id: 'step1', action: userQuery, dependsOn: [], agent: 'CoderAgent' }],
      error: err.message,
    };
  }
}

/**
 * Create a text-based plan from a user query.
 */
export async function createPlan(query, options = {}) {
  logger.info('[PlannerAgent] Creating plan for:', query.slice(0, 100));

  const prompt = `Phân tích yêu cầu sau và tạo kế hoạch thực hiện dưới dạng danh sách bước:

Yêu cầu: ${query}

Trả về JSON:
{
  "goal": "mục tiêu",
  "steps": [
    { "id": "step1", "action": "hành động", "dependsOn": [], "agent": "CoderAgent" }
  ]
}`;

  try {
    const result = await llmAsk(prompt, {
      systemPrompt: 'Bạn là AI planner. Trả về JSON hợp lệ.',
      temperature: 0.3,
      maxTokens: 1500,
    });

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON response');

    const dag = JSON.parse(jsonMatch[0]);
    return { dag, goal: dag.goal, steps: dag.steps || [] };
  } catch (err) {
    logger.error('[PlannerAgent] createPlan failed:', err.message);
    return {
      dag: { goal: query, steps: [{ id: 'step1', action: query, dependsOn: [], agent: 'CoderAgent' }] },
      goal: query,
      steps: [{ id: 'step1', action: query, dependsOn: [], agent: 'CoderAgent' }],
      error: err.message,
    };
  }
}

export default { createVisionFirstPlan, createPlan };
