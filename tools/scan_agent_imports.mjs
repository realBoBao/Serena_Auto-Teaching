#!/usr/bin/env node
/**
 * tools/scan_agent_imports.mjs — Scan imports trong agents/ (bao gồm lazy import)
 * Chạy: node tools/scan_agent_imports.mjs
 */
import fs from 'fs';

const libDir = './lib';
const agentDir = './agents';
const libFiles = fs.readdirSync(libDir).filter(f => f.endsWith('.js')).map(f => f.replace('.js', ''));

// Scan agents/ for both static and lazy imports
const ic = {};
for (const lib of libFiles) ic[lib] = 0;

const agentFiles = fs.readdirSync(agentDir).filter(f => f.endsWith('.js'));

for (const fp of agentFiles) {
  const content = fs.readFileSync(`${agentDir}/${fp}`, 'utf8');
  // Match: from '../lib/xxx' or from './lib/xxx' or import('../lib/xxx') or await import('./lib/xxx')
  const re = /from\s+['"][^'"]*?\/lib\/([^'"]+?)['"]|import\s*\(\s*['"][^'"]*?\/lib\/([^'"]+?)['"]\s*\)/g;
  let m;
  while ((m = re.exec(content))) {
    const imported = (m[1] || m[2]).replace('.js', '').split('/').pop();
    if (ic[imported] !== undefined) ic[imported]++;
  }
}

const s = Object.entries(ic).sort((a, b) => b[1] - a[1]);
console.log('=== LIB IMPORTS IN AGENTS (including lazy) ===');
let used = 0;
for (const [n, c] of s) {
  if (c > 0) { console.log('  ' + c + 'x  ' + n); used++; }
}
console.log('\n=== UNUSED IN AGENTS ===');
let unused = 0;
for (const [n, c] of s) {
  if (c === 0) { console.log('  ' + n); unused++; }
}
console.log('\nTotal: ' + used + ' used, ' + unused + ' unused in agents');
