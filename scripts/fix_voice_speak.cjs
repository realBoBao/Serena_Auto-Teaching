const fs = require('fs');
let c = fs.readFileSync('agents/VoiceChannel.js', 'utf8');
c = c.replace(/^\uFEFF/, '');

// 1. Add speak function after leaveChannel
const speakFn = `
/**
 * Speak text in voice channel using TTS
 * @param {string} guildId
 * @param {string} text
 */
export async function speak(guildId, text) {
  const conn = _connections.get(guildId);
  if (!conn) return { success: false, error: 'Not connected' };
  try {
    // Generate TTS audio using edge-tts (Node.js native, no Python needed)
    const { execSync } = require('child_process');
    const tmpFile = '/tmp/tts_temp_' + Date.now() + '.mp3';
    const safeText = text.replace(/"/g, '\\"').slice(0, 500);
    execSync('node -e "const e=require(\\"edge-tts\\");const c=new e.Communicate(\\"' + safeText + '\\",\\"vi-VN-HoaiMyNeural\\");c.save(\\"' + tmpFile + '\\");"', { timeout: 15000 });
    
    const resource = createAudioResource(tmpFile);
    conn.player.play(resource);
    conn.speaking = true;
    logger.info('[Voice] Speaking in ' + guildId);
    return { success: true };
  } catch (err) {
    logger.error('[Voice] Speak failed:', err.message);
    return { success: false, error: err.message };
  }
}
`;

// Insert before the last closing brace
c = c.replace(/export default \{ joinChannel, leaveChannel \};/, speakFn + '\nexport default { joinChannel, leaveChannel, speak };');

// 2. Fix joinChannel to not self-deafen and add TTS greeting
c = c.replace(
  '    logger.info(`[Voice] Joined channel: ${channel.name} (${guildId})`);\n\n    // TODO: TTS greeting — install edge-tts for voice output\n    return { success: true };',
  '    logger.info(`[Voice] Joined channel: ${channel.name} (${guildId})`);\n\n    // Play greeting\n    try {\n      const greetingText = "Xin chao, Serena da san sang ho tro ban!";\n      const { execSync } = require(\'child_process\');\n      const tmpFile = \'/tmp/voice_greeting_\' + Date.now() + \'.mp3\';\n      const safeText = greetingText.replace(/"/g, \'\\\\"\');\n      execSync(\'node -e "const e=require(\\\\\\"edge-tts\\\\\\");const c=new e.Communicate(\\\\\\"\' + safeText + \'\\\\\\",\\\\\\"vi-VN-HoaiMyNeural\\\\\\");c.save(\\\\\\"\' + tmpFile + \'\\\\\\");"\', { timeout: 15000 });\n      const resource = createAudioResource(tmpFile);\n      player.play(resource);\n      logger.info(\'[Voice] Playing greeting\');\n    } catch (ttsErr) {\n      logger.debug(\'[Voice] TTS greeting failed: \' + ttsErr.message);\n    }\n\n    return { success: true };'
);

fs.writeFileSync('agents/VoiceChannel.js', c, 'utf8');
console.log('✅ VoiceChannel speak function added');
