/**
 * plugins/weather/agent.js — Weather Plugin (template cho cộng đồng)
 * Demo cách viết plugin theo kernel module pattern.
 */

export default class WeatherAgent {
  constructor(api, config) {
    this.api    = api;
    this.config = config;
  }

  async onLoad() {
    console.log('[WeatherAgent] Plugin loaded');
  }

  async onMessage(message, userId) {
    const city = this._extractCity(message.content);

    // Dùng api.ask() — KHÔNG import trực tiếp lib/llm.js
    const weatherSummary = await this.api.ask(
      `Tóm tắt thời tiết hôm nay ở ${city} bằng 1 câu ngắn`,
      { maxTokens: 60 }
    );

    // Reply qua api.reply() — tự động có footer "via plugin"
    return this.api.reply(message, weatherSummary);
  }

  async onUnload() {
    console.log('[WeatherAgent] Plugin unloaded');
  }

  _extractCity(text) {
    const match = text.match(/(?:ở|tại|in)\s+([A-Za-zÀ-ỹ\s]+)/i);
    return match ? match[1].trim() : 'Hà Nội';
  }
}
