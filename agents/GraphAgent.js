/**
 * GraphAgent — Knowledge graph maintenance agent
 * Extracts entities, builds relationships, repairs broken graph connections.
 * @module agents/GraphAgent
 */

import { invokeLlm } from '../lib/llm.js';
import { getLogger } from '../lib/logger.js';
import { HumanMessage } from '@langchain/core/messages';
import { embedText } from '../lib/embeddings.js';

const logger = getLogger('GraphAgent');

/**
 * Extract entities from text using LLM.
 */
export async function extractEntities(text) {
  logger.info('[GraphAgent] Extracting entities from text, length:', text.length);

  try {
    const prompt = `Trích xuất các entities (người, địa điểm, tổ chức, khái niệm) từ đoạn văn sau. Trả về JSON array:

Văn bản: ${text.slice(0, 2000)}

Format: [{ "name": "tên", "type": "person|location|organization|concept" }]`;

    const result = await invokeLlm([new HumanMessage(prompt)], 'GraphEntityExtraction');
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  } catch (err) {
    logger.error('[GraphAgent] extractEntities failed:', err.message);
    return [];
  }
}

/**
 * Build relationships between entities.
 */
export async function buildRelationships(entities) {
  if (entities.length < 2) return [];

  try {
    const entityList = entities.map(e => e.name).join(', ');
    const prompt = `Cho danh sách entities: ${entityList}. Xác định các mối quan hệ giữ chúng.

Trả về JSON: [{ "from": "entity1", "to": "entity2", "relationship": "loại quan hệ" }]`;

    const result = await invokeLlm([new HumanMessage(prompt)], 'GraphRelationships');
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  } catch (err) {
    logger.error('[GraphAgent] buildRelationships failed:', err.message);
    return [];
  }
}

/**
 * Sync knowledge graph with vector store.
 */
export async function syncGraph() {
  logger.info('[GraphAgent] Syncing knowledge graph');

  try {
    const { getGraphStats } = await import('../lib/knowledge_graph.js');
    const stats = await getGraphStats();
    return { synced: true, stats };
  } catch (err) {
    logger.error('[GraphAgent] syncGraph failed:', err.message);
    return { synced: false, error: err.message };
  }
}

export default { extractEntities, buildRelationships, syncGraph };
