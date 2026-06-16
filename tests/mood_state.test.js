/**
 * Mood State Machine Tests — Tier 2
 */
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { moodState, MOOD_STATES } from '../lib/mood_state.js';

const TEST_USER = 'test_user_mood_001';

beforeEach(() => {
  moodState.cleanup(0);
});

afterEach(() => {
  moodState.cleanup(0);
});

describe('Mood State — MOOD_STATES definition', () => {
  test('has all 7 states', () => {
    expect(Object.keys(MOOD_STATES).length).toBe(7);
    expect(MOOD_STATES.focused).toBeDefined();
    expect(MOOD_STATES.curious).toBeDefined();
    expect(MOOD_STATES.tired).toBeDefined();
    expect(MOOD_STATES.burnout).toBeDefined();
    expect(MOOD_STATES.stressed).toBeDefined();
    expect(MOOD_STATES.celebrating).toBeDefined();
    expect(MOOD_STATES.neutral).toBeDefined();
  });

  test('each state has energy and valence', () => {
    for (const [key, val] of Object.entries(MOOD_STATES)) {
      expect(val.energy).toBeGreaterThanOrEqual(0);
      expect(val.energy).toBeLessThanOrEqual(1);
      expect(val.valence).toBeGreaterThanOrEqual(0);
      expect(val.valence).toBeLessThanOrEqual(1);
      expect(val.emoji).toBeDefined();
      expect(val.label).toBeDefined();
    }
  });

  test('burnout has lowest energy', () => {
    expect(MOOD_STATES.burnout.energy).toBe(0.1);
  });

  test('celebrating has highest valence', () => {
    expect(MOOD_STATES.celebrating.valence).toBe(0.9);
  });
});

describe('Mood State — analyze', () => {
  test('returns neutral for empty text', () => {
    const result = moodState.analyze(TEST_USER, '', { hour: 10 });
    expect(result.state).toBe('neutral');
    expect(result.confidence).toBeGreaterThan(0);
  });

  test('detects celebrating mood from keywords', () => {
    const result = moodState.analyze(TEST_USER, 'Giải được rồi! AC! 🎉', { hour: 14 });
    expect(result.state).toBe('celebrating');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  test('detects stressed mood from keywords', () => {
    const result = moodState.analyze(TEST_USER, 'deadline gất help quá tải', { hour: 15 });
    expect(result.state).toBe('stressed');
  });

  test('detects burnout from late night + negative', () => {
    const result = moodState.analyze(TEST_USER, 'mệt quá error bug', { hour: 2 });
    expect(result.state).toBe('burnout');
  });

  test('detects tired from late evening', () => {
    const result = moodState.analyze(TEST_USER, 'ok', { hour: 23 });
    expect(result.state).toBe('tired');
  });

  test('detects curious from positive + long message', () => {
    const longText = 'Cảm ơn bạn! Giải thích hay quá! '.repeat(10);
    const result = moodState.analyze(TEST_USER, longText, { hour: 10 });
    expect(result.state).toBe('curious');
  });

  test('confidence is clamped to 0.95 max', () => {
    const result = moodState.analyze(TEST_USER, 'giải được 🎉 🥳 🏆 solved!', { hour: 14 });
    expect(result.confidence).toBeLessThanOrEqual(0.95);
  });

  test('includes signals in result', () => {
    const result = moodState.analyze(TEST_USER, 'test message', { hour: 10 });
    expect(result.signals).toBeDefined();
    expect(result.signals.hour).toBe(10);
    expect(result.signals.timeSignal).toBeDefined();
  });
});

describe('Mood State — recordState & getLastState', () => {
  test('recordState persists mood', () => {
    moodState.recordState(TEST_USER, { state: 'focused', confidence: 0.8, signals: {} });
    const last = moodState.getLastState(TEST_USER);
    expect(last).not.toBeNull();
    expect(last.state).toBe('focused');
  });

  test('getLastState returns null for unknown user', () => {
    const last = moodState.getLastState('nonexistent_user');
    expect(last).toBeNull();
  });
});

describe('Mood State — getDominantMood', () => {
  test('returns neutral for unknown user', () => {
    const dominant = moodState.getDominantMood('nonexistent_user');
    expect(dominant).toBe('neutral');
  });

  test('returns most frequent state', () => {
    // Record 3 focused, 1 tired
    for (let i = 0; i < 3; i++) {
      moodState.recordState(TEST_USER, { state: 'focused', confidence: 0.7, signals: {} });
    }
    moodState.recordState(TEST_USER, { state: 'tired', confidence: 0.6, signals: {} });

    const dominant = moodState.getDominantMood(TEST_USER);
    expect(dominant).toBe('focused');
  });
});

describe('Mood State — getRecommendation', () => {
  test('burnout recommendation has 7 actions', () => {
    const rec = moodState.getRecommendation('burnout');
    expect(rec.actions.length).toBeGreaterThanOrEqual(5);
    expect(rec.tone).toBe('caring');
    expect(rec.maxSuggestions).toBe(7);
  });

  test('focused recommendation is technical', () => {
    const rec = moodState.getRecommendation('focused');
    expect(rec.tone).toBe('technical');
    expect(rec.actions).toContain('deep_dive');
  });

  test('celebrating recommendation is enthusiastic', () => {
    const rec = moodState.getRecommendation('celebrating');
    expect(rec.tone).toBe('enthusiastic');
  });

  test('neutral recommendation is friendly', () => {
    const rec = moodState.getRecommendation('neutral');
    expect(rec.tone).toBe('friendly');
  });

  test('unknown state falls back to neutral', () => {
    const rec = moodState.getRecommendation('nonexistent_state');
    expect(rec.tone).toBe('friendly');
  });
});

describe('Mood State — getStateHistory', () => {
  test('returns empty array for unknown user', () => {
    const history = moodState.getStateHistory('nonexistent_user');
    expect(history).toEqual([]);
  });

  test('returns recorded states', () => {
    moodState.recordState(TEST_USER, { state: 'focused', confidence: 0.7, signals: {} });
    moodState.recordState(TEST_USER, { state: 'tired', confidence: 0.6, signals: {} });

    const history = moodState.getStateHistory(TEST_USER);
    expect(history.length).toBe(2);
  });
});
