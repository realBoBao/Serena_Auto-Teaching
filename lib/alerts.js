/**
 * Alert Webhook Handler
 * Nhận alerts từ Alertmanager và gửi vào Discord
 */

import { EmbedBuilder } from 'discord.js';

// Discord channel ID for alerts (set via env)
const ALERT_CHANNEL_ID = process.env.DISCORD_ALERT_CHANNEL_ID;
const CRITICAL_ALERT_CHANNEL_ID = process.env.DISCORD_CRITICAL_ALERT_CHANNEL_ID;

/**
 * Process alert from Alertmanager webhook
 */
export async function processAlert(alert, client) {
  const status = alert.status || 'unknown';
  const severity = alert.labels?.severity || 'info';
  const alertName = alert.labels?.alertname || 'Unknown Alert';
  const summary = alert.annotations?.summary || 'No summary';
  const description = alert.annotations?.description || 'No description';
  const startsAt = alert.startsAt || new Date().toISOString();

  // Choose channel based on severity
  const channelId = severity === 'critical' 
    ? CRITICAL_ALERT_CHANNEL_ID 
    : ALERT_CHANNEL_ID;

  if (!channelId) {
    console.warn('No alert channel configured, logging to console:', alertName);
    return { sent: false, reason: 'no-channel-configured' };
  }

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel) {
      console.error('Alert channel not found:', channelId);
      return { sent: false, reason: 'channel-not-found' };
    }

    // Build embed
    const color = status === 'firing' 
      ? (severity === 'critical' ? 0xFF0000 : 0xFFA500)
      : 0x00FF00;

    const emoji = status === 'firing' 
      ? (severity === 'critical' ? '🔴' : '🟡')
      : '🟢';

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`${emoji} ${alertName}`)
      .setDescription(summary)
      .addFields(
        { name: 'Status', value: status.toUpperCase(), inline: true },
        { name: 'Severity', value: severity.toUpperCase(), inline: true },
        { name: 'Started', value: startsAt, inline: true },
      )
      .setTimestamp();

    if (description && description !== summary) {
      embed.addFields({ name: 'Details', value: description.slice(0, 1024) });
    }

    await channel.send({ embeds: [embed] });
    return { sent: true };
  } catch (err) {
    console.error('Failed to send alert to Discord:', err.message);
    return { sent: false, reason: err.message };
  }
}

/**
 * Express middleware for Alertmanager webhook
 */
export function createAlertWebhook(client) {
  return async (req, res) => {
    try {
      const { alerts } = req.body;
      if (!alerts || !Array.isArray(alerts)) {
        return res.status(400).json({ error: 'Invalid alert format' });
      }

      const results = [];
      for (const alert of alerts) {
        const result = await processAlert(alert, client);
        results.push(result);
      }

      res.json({ processed: results.length, results });
    } catch (err) {
      console.error('Alert webhook error:', err.message);
      res.status(500).json({ error: err.message });
    }
  };
}
