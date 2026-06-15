/**
 * lib/log_analyzer.js — Log analysis utilities
 * Parses and analyzes application logs for errors, patterns, OOM events.
 * @module lib/log_analyzer
 */

import { getLogger } from './logger.js';
import fs from 'fs';
const logger = getLogger('LogAnalyzer');

const ERROR_PATTERNS = [
  { pattern: /OOM|out of memory/i, type: 'oom', severity: 'critical' },
  { pattern: /FATAL|uncaughtException/i, type: 'fatal', severity: 'critical' },
  { pattern: /ECONNREFUSED|ECONNRESET/i, type: 'connection', severity: 'high' },
  { pattern: /timeout|ETIMEDOUT/i, type: 'timeout', severity: 'medium' },
  { pattern: /rate limit|429/i, type: 'rate_limit', severity: 'medium' },
  { pattern: /401|403|unauthorized|forbidden/i, type: 'auth', severity: 'high' },
];

/**
 * Analyze a log file for errors and patterns.
 */
export async function analyzeLog(filePath, lines = 200) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const recentLines = content.split('\n').slice(-lines);
    const findings = [];

    for (const line of recentLines) {
      for (const { pattern, type, severity } of ERROR_PATTERNS) {
        if (pattern.test(line)) {
          findings.push({ type, severity, line: line.trim().slice(0, 200) });
          break;
        }
      }
    }

    return {
      totalLines: recentLines.length,
      errorCount: findings.length,
      errors: findings.slice(0, 20),
      healthy: findings.filter(f => f.severity === 'critical').length === 0,
    };
  } catch (err) {
    logger.debug('[LogAnalyzer] analyzeLog failed:', err.message);
    return { totalLines: 0, errorCount: 0, errors: [], healthy: true };
  }
}

/**
 * Get recent errors from process stderr/stdout.
 */
export function getRecentErrors(logText, limit = 10) {
  const lines = logText.split('\n');
  return lines.filter(l => /error|fatal|crash|exception/i.test(l)).slice(-limit);
}

export default { analyzeLog, getRecentErrors };
