/**
 * lib/safe_json.js — Atomic JSON read/write with backup recovery
 *
 * Fix: "Unexpected end of input" khi JSON.parse() gặp file bị cắt giữa chừng.
 * Pattern: ghi vào file tạm → fsync → rename (atomic at kernel level).
 *
 * Usage:
 *   import { writeJsonSafe, readJsonSafe, writeJsonWithBackup } from './safe_json.js';
 *   await writeJsonSafe('./data.json', { key: 'value' });
 *   const data = await readJsonSafe('./data.json', {});
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Ghi JSON an toàn — không bao giờ để lại file corrupt.
 * Ghi vào .tmp.PID → fsync → rename (atomic).
 */
export async function writeJsonSafe(filePath, data) {
  const tmp = `${filePath}.tmp.${process.pid}`;

  try {
    const json = JSON.stringify(data, null, 2) + '\n';
    await fs.writeFile(tmp, json, 'utf8');

    // fsync — đảm bảo data đã flush xuống disk
    const fh = await fs.open(tmp, 'r+');
    await fh.sync();
    await fh.close();

    // rename() là atomic — kernel đảm bảo không bao giờ file nửa chừng
    await fs.rename(tmp, filePath);

  } catch (err) {
    // Dọn file tạm nếu có lỗi
    try { await fs.unlink(tmp); } catch { /* ignore */ }
    throw err;
  }
}

/**
 * Đọc JSON an toàn — validate trước khi parse.
 * Nếu file corrupt, thử đọc .bak backup.
 */
export async function readJsonSafe(filePath, defaultValue = null) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const trimmed = raw.trim();
    if (!trimmed) {
      console.warn(`[safe_json] File rỗng: ${filePath}`);
      return defaultValue;
    }
    return JSON.parse(trimmed);

  } catch (err) {
    if (err.code === 'ENOENT') return defaultValue; // file chưa tồn tại — OK

    // JSON corrupt — thử đọc backup
    const backup = `${filePath}.bak`;
    try {
      const raw = await fs.readFile(backup, 'utf8');
      const trimmed = raw.trim();
      if (trimmed) {
        console.warn(`[safe_json] File corrupt, dùng backup: ${filePath}`);
        // Restore từ backup
        await fs.writeFile(filePath, raw, 'utf8').catch(() => {});
        return JSON.parse(trimmed);
      }
    } catch { /* backup cũng lỗi */ }

    console.error(`[safe_json] Cả file và backup đều lỗi: ${filePath} — ${err.message}`);
    return defaultValue;
  }
}

/**
 * Ghi có rolling backup — giữ lại .bak trước khi ghi mới.
 */
export async function writeJsonWithBackup(filePath, data) {
  const backup = `${filePath}.bak`;

  // Backup file hiện tại trước khi ghi đè
  try {
    await fs.copyFile(filePath, backup);
  } catch {
    // File chưa tồn tại — bỏ qua
  }

  await writeJsonSafe(filePath, data);
}

/**
 * Dọn file .tmp còn sót từ crash trước.
 */
export async function cleanupStaleTempFiles(dir) {
  try {
    const files = await fs.readdir(dir);
    const stale = files.filter(f => f.includes('.tmp.'));
    for (const f of stale) {
      await fs.unlink(path.join(dir, f));
      console.log(`[safe_json] Dọn file tạm còn sót: ${f}`);
    }
  } catch {
    // Bỏ qua nếu thư mục không tồn tại
  }
}
