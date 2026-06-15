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
}

export default { auditCode, auditFile, SecurityAuditor };
