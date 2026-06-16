/**
 * lib/feature_flags.js — Feature Toggles / Sunsetting (Tier 4)
 * Bật/tắt agents runtime qua env vars hoặc API.
 * Agent không thiết yếu chuyển sang "ngủ đông" thay vì bị xóa.
 * @module lib/feature_flags
 */

import { getLogger } from './logger.js';
const logger = getLogger('FeatureFlags');

// Default feature flags
const _defaults = {
  // Core agents — luôn bật
  RagAgent: true,
  CoderAgent: true,
  SocraticAgent: true,
  DebateAgent: true,
  RouterAgent: true,
  EvoAgent: true,
  SecurityAuditor: true,
  VoiceAgent: true,

  // Optional agents — có thể tắt
  ManimAgent: false,      // Tốn CPU/RAM, ít dùng
  PdfAgent: false,        // Ít dùng
  PlannerAgent: false,    // Ít dùng
  GraphAgent: false,      // Ít dùng
  SuggestionAgent: false, // Ít dùng

  // Features
  voice: true,
  vision: true,
  plugins: true,
  circuit_breaker: true,
  idempotency: true,
  load_shedding: true,
};

// Runtime overrides
const _overrides = new Map();

/**
 * Kiểm tra feature có được bật không.
 * @param {string} name — Tên agent hoặc feature
 * @returns {boolean}
 */
export function isEnabled(name) {
  // Check runtime override trước
  if (_overrides.has(name)) return _overrides.get(name);

  // Check env var: FEATURE_<NAME>=true|false
  const envKey = `FEATURE_${name.toUpperCase()}`;
  const envVal = process.env[envKey];
  if (envVal !== undefined) return envVal === 'true' || envVal === '1';

  // Fallback to defaults
  return _defaults[name] ?? false;
}

/**
 * Bật/tắt feature runtime.
 * @param {string} name
 * @param {boolean} enabled
 */
export function setEnabled(name, enabled) {
  _overrides.set(name, enabled);
  logger.info(`[FeatureFlags] ${name}: ${enabled ? 'ENABLED' : 'DISABLED'}`);
}

/**
 * Lấy trạng thái tất cả features.
 */
export function getAll() {
  const result = {};
  for (const [name, defaultVal] of Object.entries(_defaults)) {
    result[name] = {
      enabled: isEnabled(name),
      default: defaultVal,
      overridden: _overrides.has(name),
    };
  }
  return result;
}

/**
 * Reset về defaults.
 */
export function reset() {
  _overrides.clear();
  logger.info('[FeatureFlags] Reset to defaults');
}
