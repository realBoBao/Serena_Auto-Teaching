import { spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const PYTHON = 'C:\\Users\\bogia\\AppData\\Local\\Programs\\Python\\Python312\\python.exe';
const SCRIPT = join(process.cwd(), 'scripts', 'html_to_markdown.py');

console.log('PYTHON:', PYTHON);
console.log('SCRIPT:', SCRIPT);
console.log('PYTHON exists:', existsSync(PYTHON));
console.log('SCRIPT exists:', existsSync(SCRIPT));

const r = spawnSync(PYTHON, [SCRIPT, '--html', '<h1>Test</h1>'], {
  encoding: 'utf8',
  env: { ...process.env, PYTHONIOENCODING: 'utf8' }
});

console.log('STATUS:', r.status);
console.log('STDOUT:', r.stdout?.slice(0, 50));
console.log('STDERR:', r.stderr?.slice(0, 50));
