#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════
 * Local LLM Server — llama.cpp HTTP API
 * ═══════════════════════════════════════════════════════════════
 *
 * Chạy llama-server với model Qwen 1.5B
 * API tương thích OpenAI format
 *
 * Usage:
 *   node local_llm_server.js
 *
 * Hoặc chạy trực tiếp:
 *   ./llama.cpp/build/bin/llama-server \
 *     -m models/Qwen2.5-1.5B-Instruct-Q4_K_M.gguf \
 *     --port 3002 \
 *     --ctx-size 4096 \
 *     --gpu-layers 0 \
 *     --log-disable
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const MODEL_PATH = join(__dirname, 'models', 'Qwen2.5-1.5B-Instruct-Q4_K_M.gguf');
const PORT = process.env.LOCAL_LLM_PORT || 3002;
const CTX_SIZE = process.env.LOCAL_LLM_CTX || 4096;
const GPU_LAYERS = process.env.LOCAL_LLM_GPU || 0; // 0 = CPU only

// Tìm llama-server binary
const BINARY = process.platform === 'win32'
  ? join(__dirname, 'llama.cpp', 'build', 'bin', 'llama-server.exe')
  : join(__dirname, 'llama.cpp', 'build', 'bin', 'llama-server');

console.log('═══════════════════════════════════════════════');
console.log('  Local LLM Server — llama.cpp');
console.log('═══════════════════════════════════════════════');
console.log(`  Model: ${MODEL_PATH}`);
console.log(`  Port: ${PORT}`);
console.log(`  Context: ${CTX_SIZE}`);
console.log(`  GPU Layers: ${GPU_LAYERS}`);
console.log('═══════════════════════════════════════════════');

const args = [
  '-m', MODEL_PATH,
  '--port', String(PORT),
  '--ctx-size', String(CTX_SIZE),
  '--gpu-layers', String(GPU_LAYERS),
  '--log-disable',
  '--host', '127.0.0.1',
];

console.log(`Starting: ${BINARY} ${args.join(' ')}`);

const server = spawn(BINARY, args, {
  stdio: ['ignore', 'pipe', 'pipe'],
  cwd: __dirname,
});

server.stdout.on('data', (d) => {
  const line = d.toString().trim();
  if (line) console.log(`[llama-server] ${line}`);
});

server.stderr.on('data', (d) => {
  const line = d.toString().trim();
  if (line) console.error(`[llama-server] ${line}`);
});

server.on('exit', (code) => {
  console.log(`[llama-server] Exited with code ${code}`);
});

server.on('error', (err) => {
  console.error(`[llama-server] Failed to start: ${err.message}`);
  console.error('Make sure llama.cpp is built: cd llama.cpp && cmake -B build && cmake --build build -j');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down local LLM server...');
  server.kill('SIGTERM');
  setTimeout(() => process.exit(0), 2000);
});

console.log(`\nLocal LLM server running at http://127.0.0.1:${PORT}`);
console.log('API endpoint: POST /v1/chat/completions');
console.log('Press Ctrl+C to stop\n');
