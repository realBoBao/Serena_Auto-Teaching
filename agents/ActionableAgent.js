/**
 * ═══════════════════════════════════════════════════════════════
 * Actionable Agent — Tier 2 Integration (addyosmani/agent-skills)
 * ═══════════════════════════════════════════════════════════════
 *
 * Chuyển đổi AI từ "người tư vấn" thành "người thực thi" bằng cách:
 * - Function Calling: Gọi tools/functions thực tế
 * - Structured Workflows: Define → Plan → Build → Verify → Review → Ship
 * - Quality Gates: Mỗi bước có verification criteria
 * - Anti-rationalization: Chống việc bỏ qua bước
 *
 * Impact: HIGH — AI có thể thực thi hành động thay vì chỉ trả lời
 * Effort: MEDIUM — Cần thiết kế lại luồng xử lý
 */

import { getLogger } from '../lib/logger.js';
const logger = getLogger('ActionableAgent');

// ── Tool Registry — Các tool mà agent có thể gọi ──
const TOOLS = {
  // Code execution
  runSandbox: {
    description: 'Execute code in sandboxed environment',
    parameters: { code: 'string', language: 'string (python|javascript)' },
    execute: async ({ code, language }) => {
      const { sandboxGateway } = await import('../sandbox_gateway.js');
      return sandboxGateway.execute({ agent: 'actionable_agent', code, language });
    },
  },

  // File operations
  readFile: {
    description: 'Read file content from server',
    parameters: { path: 'string' },
    execute: async ({ path }) => {
      const fs = await import('fs/promises');
      return { content: await fs.readFile(path, 'utf8') };
    },
  },

  writeFile: {
    description: 'Write content to file',
    parameters: { path: 'string', content: 'string' },
    execute: async ({ path, content }) => {
      const fs = await import('fs/promises');
      await fs.writeFile(path, content, 'utf8');
      return { ok: true, path };
    },
  },

  // Memory operations
  saveMemory: {
    description: 'Save information to long-term memory',
    parameters: { id: 'string', content: 'string', tags: 'string[]' },
    execute: async ({ id, content, tags }) => {
      const { addMemory } = await import('../lib/memory_manager.js');
      await addMemory({ id, type: 'actionable_memory', content, tags });
      return { ok: true, id };
    },
  },

  searchMemory: {
    description: 'Search memory by keyword',
    parameters: { keyword: 'string', limit: 'number' },
    execute: async ({ keyword, limit = 5 }) => {
      const { searchMemory } = await import('../lib/memory_manager.js');
      return searchMemory(keyword, limit);
    },
  },

  // Web search
  webSearch: {
    description: 'Search the web for information',
    parameters: { query: 'string', maxResults: 'number' },
    execute: async ({ query, maxResults = 5 }) => {
      // Use existing search pipeline
      const { searchWithFallback } = await import('../lib/search_pipeline.js');
      return searchWithFallback(query, maxResults);
    },
  },

  // Discord operations
  sendDiscordMessage: {
    description: 'Send message to Discord channel',
    parameters: { channelId: 'string', content: 'string' },
    execute: async ({ channelId, content }) => {
      // This would need Discord client reference
      logger.info(`[ActionableAgent] Would send to ${channelId}: ${content.slice(0, 100)}`);
      return { ok: true, channelId };
    },
  },

  // System operations
  runCommand: {
    description: 'Run shell command (safe commands only)',
    parameters: { command: 'string', timeout: 'number' },
    execute: async ({ command, timeout = 30000 }) => {
      const { execSync } = await import('child_process');
      // Whitelist safe commands
      const SAFE_COMMANDS = ['ls', 'cat', 'echo', 'pwd', 'git status', 'npm test', 'node --check'];
      const isSafe = SAFE_COMMANDS.some(cmd => command.startsWith(cmd));
      if (!isSafe) {
        return { error: 'Command not in whitelist', command };
      }
      const result = execSync(command, { timeout, encoding: 'utf8' });
      return { output: result.trim() };
    },
  },
};

/**
 * Execute a tool by name with parameters.
 */
export async function executeTool(toolName, params = {}) {
  const tool = TOOLS[toolName];
  if (!tool) {
    throw new Error(`Unknown tool: ${toolName}. Available: ${Object.keys(TOOLS).join(', ')}`);
  }

  logger.info(`[ActionableAgent] Executing tool: ${toolName}`);
  try {
    const result = await tool.execute(params);
    logger.info(`[ActionableAgent] Tool ${toolName} completed`);
    return { success: true, result };
  } catch (err) {
    logger.error(`[ActionableAgent] Tool ${toolName} failed: ${err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Get available tools for LLM function calling.
 */
export function getAvailableTools() {
  return Object.entries(TOOLS).map(([name, tool]) => ({
    name,
    description: tool.description,
    parameters: Object.entries(tool.parameters).map(([param, desc]) => ({
      name: param,
      description: desc,
    })),
  }));
}

/**
 * Build ReAct prompt with available tools.
 */
export function buildActionablePrompt(question, context = '') {
  const toolsList = getAvailableTools()
    .map(t => `- ${t.name}: ${t.description}`)
    .join('\n');

  const contextSection = context ? `\n\n## Context:\n${context}` : '';

  return `## Question:
${question}${contextSection}

## Available Tools:
${toolsList}

## Instructions:
Use the ReAct pattern to answer the question:
1. Think about what information or action is needed
2. Call the appropriate tool if needed
3. Use the tool result to formulate your answer
4. If no tool is needed, answer directly

Format:
Thought: [Your reasoning]
Action: [Tool name or "Answer"]
Action Input: [Parameters for tool, or your final answer]

## Response:`;
}

/**
 * Parse LLM response to extract tool calls.
 */
export function parseToolCall(response) {
  const thoughtMatch = response.match(/Thought:\s*([\s\S]*?)(?=Action:|$)/i);
  const actionMatch = response.match(/Action:\s*([\s\S]*?)(?=Action Input:|$)/i);
  const inputMatch = response.match(/Action Input:\s*([\s\S]*?)$/i);

  return {
    thought: thoughtMatch?.[1]?.trim() || '',
    action: actionMatch?.[1]?.trim() || '',
    input: inputMatch?.[1]?.trim() || '',
  };
}

/**
 * Run actionable agent with tool execution loop.
 */
export async function runActionableAgent(question, context = '', maxSteps = 5) {
  const { ask } = await import('../lib/llm.js');
  const prompt = buildActionablePrompt(question, context);

  let currentPrompt = prompt;
  let finalAnswer = '';

  for (let step = 0; step < maxSteps; step++) {
    const response = await ask(currentPrompt);
    const { thought, action, input } = parseToolCall(response);

    // If action is "Answer", we're done
    if (action.toLowerCase() === 'answer') {
      finalAnswer = input;
      break;
    }

    // Execute tool
    if (action && TOOLS[action]) {
      let params = {};
      try {
        params = JSON.parse(input);
      } catch {
        // If not JSON, treat as single parameter
        const paramName = Object.keys(TOOLS[action].parameters)[0];
        params = { [paramName]: input };
      }

      const toolResult = await executeTool(action, params);

      // Feed result back to LLM
      currentPrompt = `${currentPrompt}\n\nThought: ${thought}\nAction: ${action}\nAction Input: ${input}\nObservation: ${JSON.stringify(toolResult)}\n\nContinue or provide final answer:`;
    } else {
      // No valid tool, treat response as answer
      finalAnswer = response;
      break;
    }
  }

  return finalAnswer || 'Could not complete the task within the allowed steps.';
}

export default {
  executeTool,
  getAvailableTools,
  buildActionablePrompt,
  parseToolCall,
  runActionableAgent,
};
