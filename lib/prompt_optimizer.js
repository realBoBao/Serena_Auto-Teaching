/**
 * ═══════════════════════════════════════════════════════════════
 * Prompt Optimizer — Tier 1 Integration (dair-ai/Prompt-Engineering-Guide)
 * ═══════════════════════════════════════════════════════════════
 *
 * Áp dụng kỹ thuật prompt engineering tiên tiến:
 * - Chain-of-Thought (CoT): Ép LLM tư duy từng bước
 * - Self-Consistency: Generate multiple answers, pick best
 * - ReAct: Reason + Act loop cho complex queries
 * - Few-Shot Examples: Inject examples vào prompt
 *
 * Impact: HIGH — Giảm hallucination, cải thiện F1-score
 * Effort: LOW — Chỉ thay đổi string variables, không đổi logic
 */

/**
 * Build Chain-of-Thought prompt.
 * Ép LLM suy nghĩ từng bước trước khi trả lời.
 */
export function buildCoTPrompt(question, context = '') {
  const contextSection = context ? `\n\n## Context:\n${context}` : '';

  return `## Question:
${question}${contextSection}

## Instructions:
Think through this step by step:
1. First, identify what is being asked
2. Analyze the relevant information from the context
3. Formulate a clear, accurate answer
4. Verify your answer is supported by the context

If the context doesn't contain enough information, say "I don't have enough information" rather than guessing.

## Step-by-Step Reasoning:
[Think here]

## Final Answer:`;
}

/**
 * Build ReAct (Reason + Act) prompt.
 * Cho phép LLM reason about what tools to use.
 */
export function buildReActPrompt(question, availableTools = []) {
  const toolsSection = availableTools.length > 0
    ? `\n\n## Available Tools:\n${availableTools.map(t => `- ${t.name}: ${t.description}`).join('\n')}`
    : '';

  return `## Question:
${question}${toolsSection}

## Instructions:
Use the ReAct pattern: Thought → Action → Observation → Repeat until answer is found.

Format your response as:
Thought: [Your reasoning about what to do next]
Action: [Tool to use, or "Answer" if you have enough info]
Action Input: [Input for the tool, or your final answer]

When you have enough information, output:
Action: Answer
Action Input: [Your final answer]

## Response:`;
}

/**
 * Build Self-Consistency wrapper.
 * Generate multiple reasoning paths, pick the most consistent answer.
 */
export function buildSelfConsistencyPrompt(question, context = '', numPaths = 3) {
  const contextSection = context ? `\n\n## Context:\n${context}` : '';

  return `## Question:
${question}${contextSection}

## Instructions:
Generate ${numPaths} different reasoning paths to answer this question.
Each path should approach the problem differently.

${Array.from({ length: numPaths }, (_, i) => `## Reasoning Path ${i + 1}:\n[Your unique approach here]\n\n## Answer ${i + 1}:\n[Your answer based on this path]`).join('\n\n')}

## Final Answer:
[Select the most consistent answer across all paths. If paths disagree, explain why.]`;
}

/**
 * Build Few-Shot prompt với examples.
 */
export function buildFewShotPrompt(question, examples = [], context = '') {
  const contextSection = context ? `\n\n## Context:\n${context}` : '';
  const examplesSection = examples.length > 0
    ? `\n\n## Examples:\n${examples.map((ex, i) => `### Example ${i + 1}:\nQ: ${ex.question}\nA: ${ex.answer}`).join('\n\n')}`
    : '';

  return `## Instructions:
You are an expert AI assistant. Answer the question based on the context and examples provided.
Be concise, accurate, and cite sources when possible.${examplesSection}${contextSection}

## Question:
${question}

## Answer:`;
}

/**
 * Auto-select best prompt strategy based on query complexity.
 */
export function buildOptimalPrompt(question, context = '', options = {}) {
  const { strategy = 'auto', examples = [], availableTools = [] } = options;

  // Detect query complexity
  const words = question.split(/\s+/).length;
  const hasMultipleParts = question.includes(' and ') || question.includes(' or ') || (question.match(/\?/) || []).length > 1;
  const isComplex = words > 30 || hasMultipleParts;

  // Auto-select strategy
  let selectedStrategy = strategy;
  if (strategy === 'auto') {
    if (availableTools.length > 0) {
      selectedStrategy = 'react';
    } else if (isComplex) {
      selectedStrategy = 'cot';
    } else if (examples.length > 0) {
      selectedStrategy = 'fewshot';
    } else {
      selectedStrategy = 'standard';
    }
  }

  switch (selectedStrategy) {
    case 'cot':
      return buildCoTPrompt(question, context);
    case 'react':
      return buildReActPrompt(question, availableTools);
    case 'fewshot':
      return buildFewShotPrompt(question, examples, context);
    case 'self-consistency':
      return buildSelfConsistencyPrompt(question, context);
    default:
      // Standard prompt with context
      return context
        ? `## Context:\n${context}\n\n## Question:\n${question}\n\n## Answer:`
        : `## Question:\n${question}\n\n## Answer:`;
  }
}

export default {
  buildCoTPrompt,
  buildReActPrompt,
  buildSelfConsistencyPrompt,
  buildFewShotPrompt,
  buildOptimalPrompt,
};
