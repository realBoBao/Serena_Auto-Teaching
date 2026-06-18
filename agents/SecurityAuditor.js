/**
 * SecurityAuditor — Security audit agent
 * Scans code and configurations for security vulnerabilities.
 * @module agents/SecurityAuditor
 */

import { getLogger } from '../lib/logger.js';
const logger = getLogger('SecurityAuditor');

/**
 * Audit code for security issues.
 */
export async function auditCode(code, options = {}) {
  logger.info('[SecurityAuditor] Auditing code, length:', code.length);

  try {
    const { auditCode: auditFn } = await import('../lib/security_auditor.js');
    const result = auditFn(code);

    return {
      ...result,
      summary: result.issues.length === 0
        ? '✅ No security issues found'
        : `⚠️ Found ${result.issues.length} issue(s), risk level: ${result.riskLevel}`,
    };
  } catch (err) {
    logger.error('[SecurityAuditor] auditCode failed:', err.message);
    return { issues: [], riskLevel: 'unknown', error: err.message };
  }
}

/**
 * Audit a file.
 */
export async function auditFile(filePath) {
  try {
    const fs = await import('fs');
    const code = fs.readFileSync(filePath, 'utf8');
    return await auditCode(code, { filePath });
  } catch (err) {
    logger.error('[SecurityAuditor] auditFile failed:', err.message);
    return { issues: [], riskLevel: 'error', error: err.message };
  }
}

export class SecurityAuditor {
  async audit(code) { return auditCode(code); }
  async auditFile(path) { return auditFile(path); }

  async onLoad() {
    logger.info('[SecurityAuditor] loaded');
  }

  async onMessage(context) {
    return this.audit(context);
  }

  async onUnload() {
    logger.info('[SecurityAuditor] unloaded');
  }
}

/**
 * Anti-Vibe-Coding Audit — Tier 1 + Tier 3 rules.
 * Flags: missing try/catch, no optional chaining, unnecessary dependencies.
 */
export function auditVibeCoding(code, options = {}) {
  const issues = [];
  const lines = code.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNum = i + 1;

    // Tier 3: Flag unnecessary imports (stdlib alternatives exist)
    const stdlibReplacements = {
      'from \'moment\'': 'Intl.DateTimeFormat (built-in)',
      'from "moment"': 'Intl.DateTimeFormat (built-in)',
      'from \'lodash\'': 'native JS (spread, Object.assign, etc.)',
      'from "lodash"': 'native JS (spread, Object.assign, etc.)',
      'from \'axios\'': 'fetch (built-in, Node 18+)',
      'from "axios"': 'fetch (built-in, Node 18+)',
      'from \'uuid\'': 'crypto.randomUUID (built-in)',
      'from "uuid"': 'crypto.randomUUID (built-in)',
      'from \'nanoid\'': 'crypto.randomUUID (built-in)',
      'from "nanoid"': 'crypto.randomUUID (built-in)',
    };
    for (const [pattern, replacement] of Object.entries(stdlibReplacements)) {
      if (line.includes(pattern)) {
        issues.push({
          rule: 'T3-STDlib',
          severity: 'warn',
          line: lineNum,
          msg: `Unnecessary dependency. Use ${replacement} instead.`,
        });
      }
    }

    // Tier 1: Flag await without try/catch (simple heuristic)
    if (line.includes('await ') && !line.includes('try') && !line.includes('catch')) {
      // Check if inside a try block (look back up to 10 lines)
      let inTry = false;
      for (let j = Math.max(0, i - 10); j < i; j++) {
        if (lines[j].includes('try {') || lines[j].includes('try{')) {
          inTry = true;
          break;
        }
      }
      if (!inTry) {
        issues.push({
          rule: 'T1-NO-CATCH',
          severity: 'error',
          line: lineNum,
          msg: 'await without try/catch — handle errors defensively.',
        });
      }
    }

    // Tier 1: Flag nested property access without optional chaining
    const nestedAccess = line.match(/\w+\.\w+\.\w+/);
    if (nestedAccess && !line.includes('?.') && !line.includes('//') && !line.includes('*')) {
      issues.push({
        rule: 'T1-NO-OPTIONAL-CHAINING',
        severity: 'warn',
        line: lineNum,
        msg: `Nested access "${nestedAccess[0]}" without ?. — use optional chaining.`,
      });
    }
  }

  const errors = issues.filter(i => i.severity === 'error').length;
  const warns = issues.filter(i => i.severity === 'warn').length;

  return {
    issues,
    summary: issues.length === 0
      ? '✅ No vibe-coding issues found'
      : `⚠️ ${errors} error(s), ${warns} warning(s)`,
    riskLevel: errors > 0 ? 'high' : warns > 0 ? 'medium' : 'low',
  };
}

export default { auditCode, auditFile, auditVibeCoding, SecurityAuditor };
