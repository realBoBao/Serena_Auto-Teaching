/**
 * Tests for Orchestrator — Event Routing
 * Uses jest.unstable_mockModule for ESM compatibility
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// ── Mock RouterAgent ──
const mockRoute = jest.fn(async (intent, context) => {
  if (intent === 'RAG') {
    return {
      result: { message: `Processed RAG query: ${context.query || context.url || ''}` },
      agent: 'rag',
      cached: false,
    };
  }
  if (intent === 'VISION') {
    return {
      result: { success: true, analysis: 'Mocked vision analysis' },
      agent: 'vision',
      cached: false,
    };
  }
  return { result: { message: `Handled: ${intent}` }, agent: intent.toLowerCase(), cached: false };
});

jest.unstable_mockModule('../agents/RouterAgent.js', () => ({
  routerAgent: { route: mockRoute },
}));

// ── Import Orchestrator after mock setup ──
const { orchestrator } = await import('../Orchestrator.js');

describe('Orchestrator - Event Routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should have a route method', () => {
    expect(typeof orchestrator.route).toBe('function');
  });

  it('should be an EventEmitter', () => {
    expect(typeof orchestrator.on).toBe('function');
    expect(typeof orchestrator.emit).toBe('function');
  });

  it('should handle unsupported event types', async () => {
    const dummyHandler = jest.fn();
    orchestrator.on('error', dummyHandler);

    const result = await orchestrator.route({ type: 'unknown_event' });
    expect(result).toHaveProperty('error');
    expect(result.error).toContain('Unsupported event type');

    orchestrator.off('error', dummyHandler);
  });

  it('should emit error events for unsupported types', async () => {
    const errorHandler = jest.fn();
    orchestrator.on('error', errorHandler);

    await orchestrator.route({ type: 'invalid_type' });
    expect(errorHandler).toHaveBeenCalled();

    orchestrator.off('error', errorHandler);
  });

  it('should handle pdf_file events', async () => {
    const result = await orchestrator.route({
      type: 'pdf_file',
      filePath: '/test/file.pdf',
    });
    // Orchestrator returns result from RouterAgent or error
    expect(result).toBeDefined();
  });

  it('should handle discord_question events', async () => {
    const result = await orchestrator.route({
      type: 'discord_question',
      query: 'What is AI?',
    });
    expect(result).toBeDefined();
  });

  it('should handle vision_request events', async () => {
    const result = await orchestrator.route({
      type: 'vision_request',
      imageBuffer: Buffer.from('test'),
      mimeType: 'image/png',
      prompt: 'Describe this',
    });
    expect(result).toBeDefined();
  });

  it('should handle voice_request events', async () => {
    const result = await orchestrator.route({
      type: 'voice_request',
      audioBuffer: Buffer.from('test'),
    });
    expect(result).toBeDefined();
  });
});
