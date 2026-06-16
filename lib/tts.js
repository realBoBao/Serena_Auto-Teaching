/**
 * lib/tts.js — Text-to-Speech Helper
 * Chuyển text thành audio stream để phát trong Discord voice channel.
 * Hỗ trợ: ElevenLabs API (chất lọc cao) hoặc Edge TTS (miễn phí).
 * @module lib/tts
 */

import { getLogger } from './logger.js';
const logger = getLogger('TTS');

/**
 * Chuyển text thành audio buffer.
 * @param {string} text
 * @param {Object} opts
 * @param {string} opts.voice — Voice ID (ElevenLabs) hoặc voice name (Edge TTS)
 * @param {string} opts.provider — 'elevenlabs' hoặc 'edge' (mặc định: edge)
 * @returns {Promise<Buffer|null>}
 */
export async function textToSpeech(text, opts = {}) {
  const provider = opts.provider || 'edge';

  if (provider === 'elevenlabs') {
    return _ttsElevenLabs(text, opts.voice);
  }

  return _ttsEdge(text, opts.voice);
}

/**
 * Edge TTS (miễn phí, Microsoft).
 */
async function _ttsEdge(text, voiceName = 'vi-VN-HoaiNeural') {
  try {
    // Dynamic import để không bắt buộc cài edge-tts
    const { createWriteStream } = await import('fs');
    const { tmpdir } = await import('os');
    const { join } = await import('path');
    const { randomUUID } = await import('crypto');

    const edgeTts = await import('edge-tts');
    const communicate = new edgeTts.Communicate(text, voiceName);

    const tmpFile = join(tmpdir(), `tts-${randomUUID()}.mp3`);
    await communicate.save(tmpFile);

    const { readFile } = await import('fs/promises');
    const buffer = await readFile(tmpFile);

    // Cleanup temp file
    const { unlink } = await import('fs/promises');
    unlink(tmpFile).catch(() => {});

    logger.debug(`[TTS] Edge TTS: ${text.slice(0, 30)}...`);
    return buffer;
  } catch (err) {
    logger.error(`[TTS] Edge TTS failed: ${err.message}`);
    return null;
  }
}

/**
 * ElevenLabs TTS (chất lượng cao, cần API key).
 */
async function _ttsElevenLabs(text, voiceId = '21m00Tcm4TlvDq8ikWAM') {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    logger.warn('[TTS] No ELEVENLABS_API_KEY, falling back to Edge TTS');
    return _ttsEdge(text);
  }

  try {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });

    if (!res.ok) {
      logger.error(`[TTS] ElevenLabs error: ${res.status}`);
      return _ttsEdge(text);
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    logger.debug(`[TTS] ElevenLabs: ${text.slice(0, 30)}...`);
    return buffer;
  } catch (err) {
    logger.error(`[TTS] ElevenLabs failed: ${err.message}`);
    return _ttsEdge(text);
  }
}
