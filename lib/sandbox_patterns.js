/**
 * ═══════════════════════════════════════════════════════════════
 * Sandbox Security Patterns — Single source of truth
 * ═══════════════════════════════════════════════════════════════
 * Cả code_sandbox.js và code_sandbox_v2.js đều import từ file này.
 * Không có circular dependency.
 */

export const DANGEROUS_COMMANDS = [
  /\brm\s+-rf\s+\//, /\brm\s+-rf\s+~/, /\bformat\s+[a-z]:/i,
  /\bdel\s+\/s\s+\/q/i, /\bshutdown\b/i, /\breboot\b/i,
  /\bos\.system\s*\(/i, /\bsubprocess\b/i, /\bchild_process\b/i,
  /\bprocess\.exit\b/i, /\beval\s*\(/i, /\bFunction\s*\(/i,
  /\bwhile\s*\(\s*true\s*\)\s*\{/, /\bfor\s*\(\s*;\s*;\s*\)\s*\{/,
];

export const DANGEROUS_IMPORTS = [
  /\brequire\s*\(\s*['"]fs['"]\s*\)/i,
  /\brequire\s*\(\s*['"]child_process/i,
  /\brequire\s*\(\s*['"]net['"]\s*\)/i,
  /\brequire\s*\(\s*['"]http['"]\s*\)/i,
  /\bimport\s+.*from\s+['"]child_process['"]/i,
  /\bimport\s+.*from\s+['"]fs['"]/i,
];

export const DANGEROUS_PATTERNS = [
  /\bpassword\s*[:=]\s*['"][^'"]{8,}['"]/i,
  /\bapi[_-]?key\s*[:=]\s*['"][^'"]{16,}['"]/i,
  /\bsecret\s*[:=]\s*['"][^'"]{8,}['"]/i,
];

export const EXFILTRATION_PATTERNS = [
  /\bfetch\s*\(.*(?:password|secret|token|apikey)/i,
  /\baxios\.\w+\(.*(?:password|secret|token)/i,
  /\bhttp\.request\(.*(?:password|secret)/i,
];
