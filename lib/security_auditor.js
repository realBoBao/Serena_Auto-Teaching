/**
 * lib/security_auditor.js — Code security audit
 * Scans code for common security vulnerabilities.
 * @module lib/security_auditor
 */

import { getLogger } from './logger.js';
const logger = getLogger('SecurityAuditor');

const PATTERNS = [
  { pattern: /eval\s*\(/gi, severity: 'high', message: 'eval() can execute arbitrary code' },
  { pattern: /child_process|exec\s*\(|execSync\s*\(/gi, severity: 'high', message: 'Command injection risk' },
  { pattern: /innerHTML\s*=/gi, severity: 'medium', message: 'XSS risk via innerHTML' },
  { pattern: /document\.write\s*\(/gi, severity: 'medium', message: 'XSS risk via document.write' },
  { pattern: /password\s*=\s*["'][^"']+["']/gi, severity: 'high', message: 'Hardcoded password detected' },
  { pattern: /api[_-]?key\s*=\s*["'][^"']+["']/gi, severity: 'high', message: 'Hardcoded API key detected' },
  { pattern: /SELECT\s+.*\s+FROM\s+.*\+/gi, severity: 'high', message: 'SQL injection risk (string concatenation)' },
  { pattern: /http:\/\//gi, severity: 'low', message: 'Insecure HTTP URL (use HTTPS)' },
];

/**
 * Audit code for security issues.
 * @param {string} code — Source code to audit
 * @returns {{ issues: Array, riskLevel: string }}
 */
export function auditCode(code) {
  const issues = [];
  for (const { pattern, severity, message } of PATTERNS) {
    const matches = code.match(pattern);
    if (matches) {
      issues.push({ severity, message, count: matches.length });
    }
  }

  const riskLevel = issues.some(i => i.severity === 'high') ? 'high'
    : issues.some(i => i.severity === 'medium') ? 'medium'
    : issues.length > 0 ? 'low' : 'none';

  return { issues, riskLevel };
}

export default { auditCode };
