/**
 * Anti-Vibe-Coding Audit Tests — Tier 1 + Tier 3
 * Tests the vibeCodingAudit function from agents/SecurityAuditor.js
 */
import { describe, test, expect } from '@jest/globals';
import { auditVibeCoding } from '../agents/SecurityAuditor.js';

describe('Vibe Coding Audit — Tier 1: Defensive Programming', () => {
  test('flags await without try/catch', () => {
    const code = `
async function fetchData() {
  const result = await fetch(url);
  return result.json();
}
`;
    const r = auditVibeCoding(code);
    expect(r.issues.some(i => i.rule === 'T1-NO-CATCH')).toBe(true);
    expect(r.riskLevel).toBe('high');
  });

  test('passes await inside try/catch', () => {
    const code = `
async function fetchData() {
  try {
    const result = await fetch(url);
    return result.json();
  } catch (err) {
    return [];
  }
}
`;
    const r = auditVibeCoding(code);
    expect(r.issues.filter(i => i.rule === 'T1-NO-CATCH').length).toBe(0);
  });

  test('flags nested property access without optional chaining', () => {
    const code = `
function getName(response) {
  return response.data.user.profile.name;
}
`;
    const r = auditVibeCoding(code);
    expect(r.issues.some(i => i.rule === 'T1-NO-OPTIONAL-CHAINING')).toBe(true);
  });

  test('passes optional chaining', () => {
    const code = `
function getName(response) {
  return response?.data?.user?.profile?.name ?? 'unknown';
}
`;
    const r = auditVibeCoding(code);
    expect(r.issues.filter(i => i.rule === 'T1-NO-OPTIONAL-CHAINING').length).toBe(0);
  });
});

describe('Vibe Coding Audit — Tier 3: Stdlib First', () => {
  test('flags moment import', () => {
    const code = `import moment from 'moment';`;
    const r = auditVibeCoding(code);
    expect(r.issues.some(i => i.rule === 'T3-STDlib' && i.msg.includes('Intl'))).toBe(true);
  });

  test('flags lodash import', () => {
    const code = `import { pick } from 'lodash';`;
    const r = auditVibeCoding(code);
    expect(r.issues.some(i => i.rule === 'T3-STDlib')).toBe(true);
  });

  test('flags axios import', () => {
    const code = `import axios from 'axios';`;
    const r = auditVibeCoding(code);
    expect(r.issues.some(i => i.rule === 'T3-STDlib' && i.msg.includes('fetch'))).toBe(true);
  });

  test('flags uuid import', () => {
    const code = `import { v4 } from 'uuid';`;
    const r = auditVibeCoding(code);
    expect(r.issues.some(i => i.rule === 'T3-STDlib' && i.msg.includes('crypto'))).toBe(true);
  });

  test('passes stdlib usage', () => {
    const code = `
import crypto from 'crypto';
import fs from 'fs/promises';
const id = crypto.randomUUID();
const formatted = new Intl.DateTimeFormat('en-CA').format(date);
`;
    const r = auditVibeCoding(code);
    expect(r.issues.filter(i => i.rule === 'T3-STDlib').length).toBe(0);
  });
});

describe('Vibe Coding Audit — Summary', () => {
  test('clean code returns low risk', () => {
    const code = `
import crypto from 'crypto';
async function process(input) {
  try {
    const id = crypto.randomUUID();
    const name = input?.data?.name ?? 'unknown';
    return { id, name };
  } catch (err) {
    return null;
  }
}
`;
    const r = auditVibeCoding(code);
    expect(r.riskLevel).toBe('low');
    expect(r.issues.length).toBe(0);
  });

  test('bad code returns high risk', () => {
    const code = `
import moment from 'moment';
import axios from 'axios';
async function process() {
  const res = await axios.get(url);
  const date = moment().format('YYYY-MM-DD');
  return res.data.user.profile.name;
}
`;
    const r = auditVibeCoding(code);
    expect(r.riskLevel).toBe('high');
    expect(r.issues.length).toBeGreaterThanOrEqual(3);
  });
});
