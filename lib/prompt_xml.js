/**
 * lib/prompt_xml.js — XML Tagging Architecture for Agent Prompts
 *
 * Based on reverse-engineered patterns from system_prompts_leaks (Anthropic/OpenAI/Google).
 * XML tags create hard boundaries between instruction sections, preventing LLMs from
 * confusing system directives with user data or RAG context.
 *
 * Structure (Anthropic Claude optimal):
 *   <system>        — Role, persona, high-level behavior
 *   <context>       — RAG data, conversation history, external knowledge
 *   <instructions>  — Step-by-step task directives
 *   <constraints>   — Hard rules the model must never violate
 *   <output>        — Expected output format
 *   <scratchpad>    — (Optional) Chain-of-thought reasoning space
 *
 * @module lib/prompt_xml
 */

/**
 * Build a structured XML-wrapped system prompt.
 *
 * @param {object} opts
 * @param {string} opts.system      — Role/persona definition
 * @param {string} [opts.context]   — External data, RAG results, history
 * @param {string} [opts.instructions] — Task directives
 * @param {string} [opts.constraints]  — Hard rules (comma-separated or newline)
 * @param {string} [opts.output]    — Output format specification
 * @param {boolean} [opts.scratchpad=false] — Include <scratchpad> for CoT
 * @returns {string} XML-wrapped prompt
 */
export function buildXmlPrompt({ system, context, instructions, constraints, output, scratchpad = false }) {
  let prompt = '';

  // ── System: Role & Persona ──
  prompt += `<system>\n${system.trim()}\n</system>\n\n`;

  // ── Context: External Data (RAG, history, etc.) ──
  if (context && context.trim()) {
    prompt += `<context>\n${context.trim()}\n</context>\n\n`;
  }

  // ── Instructions: Task Directives ──
  if (instructions && instructions.trim()) {
    prompt += `<instructions>\n${instructions.trim()}\n</instructions>\n\n`;
  }

  // ── Constraints: Hard Rules ──
  if (constraints && constraints.trim()) {
    prompt += `<constraints>\n${constraints.trim()}\n</constraints>\n\n`;
  }

  // ── Output Format ──
  if (output && output.trim()) {
    prompt += `<output>\n${output.trim()}\n</output>\n\n`;
  }

  // ── Scratchpad: Chain-of-Thought (for CoderAgent, PlannerAgent) ──
  if (scratchpad) {
    prompt += `<scratchpad>\nThink step by step. Show your reasoning here.\n</scratchpad>\n\n`;
    prompt += `After reasoning in <scratchpad>, provide your final answer.\n`;
  }

  return prompt.trim();
}

/**
 * Wrap user message in XML to separate it from system context.
 * Prevents prompt injection from user input.
 *
 * @param {string} message — User message
 * @returns {string}
 */
export function wrapUserMessage(message) {
  return `<user_message>\n${message}\n</user_message>`;
}

/**
 * Wrap RAG/retrieved context in XML to prevent data from being interpreted as instructions.
 *
 * @param {string} data — Retrieved context data
 * @param {string} [source] — Source identifier
 * @returns {string}
 */
export function wrapContext(data, source = '') {
  const src = source ? ` source="${source}"` : '';
  return `<retrieved_context${src}>\n${data}\n</retrieved_context>`;
}

/**
 * Wrap tool results in XML.
 *
 * @param {string} toolName — Tool identifier
 * @param {string} result — Tool output
 * @returns {string}
 */
export function wrapToolResult(toolName, result) {
  return `<tool_result name="${toolName}">\n${result}\n</tool_result>`;
}

/**
 * Extract content from an XML tag in a model response.
 *
 * @param {string} text — Model response text
 * @param {string} tag — Tag name (e.g., 'scratchpad', 'output')
 * @returns {string|null}
 */
export function extractXmlTag(text, tag) {
  if (!text) return null;
  const match = text.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return match ? match[1].trim() : null;
}

export default { buildXmlPrompt, wrapUserMessage, wrapContext, wrapToolResult, extractXmlTag };
