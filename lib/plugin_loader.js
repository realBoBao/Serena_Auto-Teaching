/**
 * lib/plugin_loader.js — Plugin Loader & Lifecycle (module_init/module_exit)
 * Load/unload plugins runtime, giống Linux kernel module loader.
 * @module lib/plugin_loader
 */

import fs from 'fs';
import path from 'path';
import { PluginAPI } from './plugin_api.js';
import { getLogger } from './logger.js';
const logger = getLogger('PluginLoader');

const PLUGIN_DIR = path.join(process.cwd(), 'plugins');
const ALL_PERMISSIONS = new Set([
  'llm:ask', 'kg:read', 'kg:write',
  'memory:read', 'memory:write',
  'discord:reply', 'f1:log',
]);

export class PluginLoader {
  static loaded = new Map(); // name → { manifest, instance, api }

  // ─── Load toàn bộ plugins khi bot start ──────────────────────────────────
  static async loadAll() {
    if (!fs.existsSync(PLUGIN_DIR)) return;

    const pluginDirs = fs.readdirSync(PLUGIN_DIR)
      .filter(d => fs.statSync(path.join(PLUGIN_DIR, d)).isDirectory());

    for (const dir of pluginDirs) {
      try {
        await this.load(dir);
      } catch (err) {
        logger.error(`[PluginLoader] Failed to load "${dir}": ${err.message}`);
        // 1 plugin lỗi KHÔNG được làm crash toàn bộ bot
      }
    }
  }

  static async load(pluginDir) {
    const manifestPath = path.join(PLUGIN_DIR, pluginDir, 'manifest.json');
    const entryPath    = path.join(PLUGIN_DIR, pluginDir, 'agent.js');

    if (!fs.existsSync(manifestPath)) {
      throw new Error('Thiếu manifest.json');
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    this._validateManifest(manifest);

    const api = new PluginAPI(manifest.name, manifest.permissions);

    // Validate config
    for (const [key, schema] of Object.entries(manifest.config_schema ?? {})) {
      if (schema.required && !process.env[key]) {
        throw new Error(`Thiếu config "${key}" trong .env`);
      }
    }

    // Dynamic import agent.js
    const module = await import(`file://${entryPath}`);
    const AgentClass = module.default;

    if (typeof AgentClass !== 'function') {
      throw new Error('agent.js phải export default 1 class');
    }

    const config = manifest.config_schema
      ? Object.fromEntries(Object.keys(manifest.config_schema).map(k => [k, process.env[k]]))
      : {};

    const instance = new AgentClass(api, config);

    // Lifecycle: onLoad
    if (typeof instance.onLoad === 'function') {
      await instance.onLoad();
    }

    this.loaded.set(manifest.name, { manifest, instance, api });
    logger.info(`[PluginLoader] Loaded "${manifest.name}" v${manifest.version} — permissions: [${manifest.permissions.join(', ')}]`);
  }

  static _validateManifest(manifest) {
    const required = ['name', 'version', 'entry', 'permissions', 'intents'];
    for (const field of required) {
      if (!manifest[field]) throw new Error(`Thiếu field "${field}" trong manifest`);
    }
    for (const perm of manifest.permissions) {
      if (!ALL_PERMISSIONS.has(perm)) {
        throw new Error(`Permission "${perm}" không hợp lệ. Cho phép: ${[...ALL_PERMISSIONS].join(', ')}`);
      }
    }
    if (this.loaded.has(manifest.name)) {
      throw new Error(`Plugin "${manifest.name}" đã được load — trùng tên`);
    }
  }

  // ─── Route message tới plugin ────────────────────────────────────────────
  static async route(intent, message, userId) {
    for (const [name, { manifest, instance }] of this.loaded) {
      if (manifest.intents.includes(intent)) {
        if (typeof instance.onMessage === 'function') {
          return await instance.onMessage(message, userId);
        }
      }
    }
    return null;
  }

  // ─── Hot unload (rmmod) ─────────────────────────────────────────────────
  static async unload(name) {
    const entry = this.loaded.get(name);
    if (!entry) return false;

    if (typeof entry.instance.onUnload === 'function') {
      await entry.instance.onUnload();
    }

    this.loaded.delete(name);
    logger.info(`[PluginLoader] Unloaded "${name}"`);
    return true;
  }

  static list() {
    return [...this.loaded.entries()].map(([name, { manifest }]) => ({
      name,
      version: manifest.version,
      intents: manifest.intents,
      permissions: manifest.permissions,
    }));
  }
}
