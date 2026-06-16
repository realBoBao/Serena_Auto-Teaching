/**
 * lib/plugin_api.js — Plugin API ("syscall table")
 * Mọi plugin chỉ tương tác với hệ thống qua class này.
 * Không plugin nào được import trực tiếp RouterAgent, knowledge_graph.js, F1Evaluator.
 * @module lib/plugin_api
 */

import { getLogger } from './logger.js';
const logger = getLogger('PluginAPI');

// ─── Capability map: permission → methods ──────────────────────────────────
const CAPABILITY_MAP = {
  'llm:ask':      ['ask'],
  'kg:read':      ['kgSearch', 'kgGetEntity'],
  'kg:write':     ['kgAddFact'],
  'memory:read':  ['memoryGetStrength'],
  'memory:write': ['memoryRecord'],
  'discord:reply': ['reply'],
  'f1:log':       ['logMetric'],
};

export class PluginAPI {
  constructor(pluginName, grantedPermissions) {
    this._name        = pluginName;
    this._permissions = new Set(grantedPermissions);

    for (const [perm, methods] of Object.entries(CAPABILITY_MAP)) {
      for (const method of methods) {
        if (this._permissions.has(perm)) {
          this[method] = this._impl[method].bind(this);
        } else {
          this[method] = () => {
            throw new Error(
              `[PluginAPI] Plugin "${pluginName}" không có permission "${perm}" để gọi ${method}()`
            );
          };
        }
      }
    }
  }

  // ─── Implementation thật ────────────────────────────────────────────────
  _impl = {
    ask: async (prompt, options = {}) => {
      const { ask } = await import('./llm.js');
      const maxTokens = Math.min(options.maxTokens ?? 300, 500);
      return ask(prompt, { ...options, maxTokens });
    },

    kgSearch: async (query, limit = 10) => {
      const { getKgDb } = await import('./knowledge_graph.js');
      const db = getKgDb();
      return db.prepare(`
        SELECT id, name, type FROM entities
        WHERE lower(name) LIKE lower(?) LIMIT ?
      `).all(`%${query}%`, limit);
    },

    kgGetEntity: async (entityId) => {
      const { getKgDb } = await import('./knowledge_graph.js');
      const db = getKgDb();
      return db.prepare('SELECT * FROM entities WHERE id = ?').get(entityId);
    },

    kgAddFact: async ({ source, target, relationship }) => {
      const { TemporalKG } = await import('./temporal_kg.js');
      return TemporalKG.addFact({
        sourceEntity: source,
        targetEntity: target,
        relationship,
        source: `plugin:${this._name}`,
        confidence: 0.6,
      });
    },

    memoryGetStrength: async (userId, topic) => {
      const { temporalMemory } = await import('./temporal_memory.js');
      return temporalMemory.getStrength(userId, topic);
    },

    memoryRecord: async (userId, topic) => {
      const { temporalMemory } = await import('./temporal_memory.js');
      return temporalMemory.record(userId, topic, 'plugin_interaction', '', `plugin:${this._name}`);
    },

    reply: async (discordMessage, content) => {
      const embed = typeof content === 'string'
        ? { description: content, footer: { text: `via plugin: ${this._name}` } }
        : { ...content, footer: { text: `via plugin: ${this._name}` } };
      return discordMessage.reply({ embeds: [embed] });
    },

    logMetric: async (metrics, context = '') => {
      const { F1Evaluator } = await import('./f1_evaluator.js');
      const { getKgDb } = await import('./knowledge_graph.js');
      F1Evaluator.logMetrics(getKgDb(), `plugin:${this._name}`, metrics, context);
    },
  };

  hasPermission(perm) {
    return this._permissions.has(perm);
  }
}
