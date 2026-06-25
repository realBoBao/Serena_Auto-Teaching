#!/usr/bin/env node
/**
 * tools/scan_all_imports.mjs — Scan toàn bộ codebase (lib + agents + cron + scheduler + gateway)
 * Chạy: node tools/scan_all_imports.mjs
 */
import fs from 'fs';

const libDir = './lib';
const libFiles = fs.readdirSync(libDir).filter(f => f.endsWith('.js')).map(f => f.replace('.js', ''));

const dirs = ['./lib', './cron', './agents', './tests'];
const allFiles = [];
for (const d of dirs) {
  if (fs.existsSync(d)) {
    for (const f of fs.readdirSync(d)) {
      if (f.endsWith('.js')) allFiles.push(d + '/' + f);
    }
  }
}

// Also check root-level files
for (const f of fs.readdirSync('.')) {
  if (f.endsWith('.js') && !f.startsWith('.')) allFiles.push('./' + f);
}

const ic = {};
for (const lib of libFiles) ic[lib] = 0;

const re = /from\s+['"][^'"]*?\/lib\/([^'"]+?)['"]|import\s*\(\s*['"][^'"]*?\/lib\/([^'"]+?)['"]\s*\)/g;

for (const fp of allFiles) {
  try {
    const content = fs.readFileSync(fp, 'utf8');
    let m;
    while ((m = re.exec(content))) {
      const imported = (m[1] || m[2]).replace('.js', '').split('/').pop();
      if (ic[imported] !== undefined) ic[imported]++;
    }
  } catch { /* skip */ }
}

const s = Object.entries(ic).sort((a, b) => b[1] - a[1]);
console.log('=== LIB IMPORTS ACROSS ENTIRE CODEBASE ===');
let used = 0;
for (const [n, c] of s) {
  if (c > 0) { console.log('  ' + c + 'x  ' + n); used++; }
}
console.log('\n=== TRULY UNUSED (0 imports anywhere) ===');
let unused = 0;
for (const [n, c] of s) {
  if (c === 0) { console.log('  ' + n); unused++; }
}
console.log('\nTotal: ' + used + ' used, ' + unused + ' truly unused');
