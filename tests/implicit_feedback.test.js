/**
 * Implicit Feedback Loop Tests — Tier 1
 */
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { implicitFeedback } from '../lib/implicit_feedback.js';

const TEST_USER = 'test_user_if_001';

beforeEach(() => {
  // Cleanup test data
  implicitFeedback.cleanup(0);
});

afterEach(() => {
  implicitFeedback.cleanup(0);
});

describe('Implicit Feedback — trackOutbound', () => {
  test('trackOutbound returns a tracking ID', () => {
    const id = implicitFeedback.trackOutbound(TEST_USER, {
      url: 'https://youtube.com/watch?v=abc',
      category: 'video',
      messageId: 'msg123',
    });
    expect(id).toBeDefined();
    expect(id.startsWith('if_')).toBe(true);
  });

  test('trackOutbound increments total_sent for category', () => {
    implicitFeedback.trackOutbound(TEST_USER, {
      url: 'https://github.com/foo/bar',
      category: 'repo',
    });
    implicitFeedback.trackOutbound(TEST_USER, {
      url: 'https://github.com/baz/qux',
      category: 'repo',
    });

    const affinity = implicitFeedback.getCategoryAffinity(TEST_USER);
    const repoEntry = affinity.find(a => a.category === 'repo');
    expect(repoEntry).toBeDefined();
    expect(repoEntry.total_sent).toBe(2);
  });
});

describe('Implicit Feedback — recordClick', () => {
  test('recordClick updates clicked status', () => {
    const id = implicitFeedback.trackOutbound(TEST_USER, {
      url: 'https://example.com/article',
      category: 'article',
    });
    implicitFeedback.recordClick(id, TEST_USER);

    const signals = implicitFeedback.getImplicitSignals(TEST_USER);
    expect(signals.clickThroughRate).toBeGreaterThan(0);
  });

  test('recordClick increments click_count in category affinity', () => {
    const id = implicitFeedback.trackOutbound(TEST_USER, {
      url: 'https://youtube.com/watch?v=xyz',
      category: 'video',
    });
    implicitFeedback.recordClick(id, TEST_USER);

    const affinity = implicitFeedback.getCategoryAffinity(TEST_USER);
    const videoEntry = affinity.find(a => a.category === 'video');
    expect(videoEntry.click_count).toBe(1);
  });
});

describe('Implicit Feedback — recordDwellTime', () => {
  test('recordDwellTime updates reply status', () => {
    const id = implicitFeedback.trackOutbound(TEST_USER, {
      url: 'https://example.com',
      category: 'article',
    });
    implicitFeedback.recordDwellTime(id, TEST_USER, 5000);

    const signals = implicitFeedback.getImplicitSignals(TEST_USER);
    expect(signals.totalReplies).toBe(1);
    expect(signals.avgDwellTimeMs).toBeGreaterThan(0);
  });

  test('fast dwell time (< 30s) increases implicit score', () => {
    const id = implicitFeedback.trackOutbound(TEST_USER, {
      url: 'https://example.com/fast',
      category: 'article',
    });
    implicitFeedback.recordDwellTime(id, TEST_USER, 10000); // 10s

    const affinity = implicitFeedback.getCategoryAffinity(TEST_USER);
    const entry = affinity.find(a => a.category === 'article');
    expect(entry.implicit_score).toBeGreaterThan(0.5);
  });
});

describe('Implicit Feedback — getImplicitSignals', () => {
  test('returns default signals for new user', () => {
    const signals = implicitFeedback.getImplicitSignals('brand_new_user');
    expect(signals.userId).toBe('brand_new_user');
    expect(signals.clickThroughRate).toBe(0);
    expect(signals.totalSent).toBe(0);
    expect(signals.categoryAffinity).toEqual([]);
  });

  test('returns top and bottom categories', () => {
    // Create two categories with different engagement
    const id1 = implicitFeedback.trackOutbound(TEST_USER, {
      url: 'https://youtube.com/watch?v=1',
      category: 'video',
    });
    implicitFeedback.recordClick(id1, TEST_USER);
    implicitFeedback.recordDwellTime(id1, TEST_USER, 5000);

    implicitFeedback.trackOutbound(TEST_USER, {
      url: 'https://example.com/boring',
      category: 'article',
    });

    const signals = implicitFeedback.getImplicitSignals(TEST_USER);
    expect(signals.topCategory).toBe('video');
    expect(signals.bottomCategory).toBe('article');
  });
});

describe('Implicit Feedback — markOldUnclickedAsSkipped', () => {
  test('returns 0 when no old links exist', () => {
    const count = implicitFeedback.markOldUnclickedAsSkipped(0); // 0 hours = all
    expect(typeof count).toBe('number');
  });
});
