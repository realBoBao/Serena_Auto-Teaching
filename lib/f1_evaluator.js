/**
 * lib/f1_evaluator.js — F1 score evaluation for answer quality
 * Compares predicted answer against reference using token-level F1.
 * @module lib/f1_evaluator
 */

/**
 * Tokenize text into lowercase word set.
 */
function tokenize(text) {
  return text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
}

/**
 * Compute F1 score between predicted and reference text.
 * @param {string} predicted
 * @param {string} reference
 * @returns {{ precision: number, recall: number, f1: number }}
 */
export function computeF1(predicted, reference) {
  const predTokens = new Set(tokenize(predicted));
  const refTokens = new Set(tokenize(reference));

  if (refTokens.size === 0) return { precision: 0, recall: 0, f1: 0 };

  let overlap = 0;
  for (const token of predTokens) {
    if (refTokens.has(token)) overlap++;
  }

  const precision = predTokens.size > 0 ? overlap / predTokens.size : 0;
  const recall = refTokens.size > 0 ? overlap / refTokens.size : 0;
  const f1 = (precision + recall) > 0 ? 2 * precision * recall / (precision + recall) : 0;

  return {
    precision: Math.round(precision * 100) / 100,
    recall: Math.round(recall * 100) / 100,
    f1: Math.round(f1 * 100) / 100,
  };
}

/**
 * Evaluate a batch of predictions.
 */
export function evaluateBatch(predictions, references) {
  const scores = predictions.map((p, i) => computeF1(p, references[i] || ''));
  const avgF1 = scores.reduce((s, sc) => s + sc.f1, 0) / Math.max(scores.length, 1);
  return { scores, avgF1: Math.round(avgF1 * 100) / 100 };
}

export class F1Evaluator {
  constructor() { this.history = []; }

  evaluate(predicted, reference) {
    const result = computeF1(predicted, reference);
    this.history.push(result);
    return result;
  }

  getAverage() {
    if (this.history.length === 0) return 0;
    return Math.round(this.history.reduce((s, r) => s + r.f1, 0) / this.history.length * 100) / 100;
  }

  reset() { this.history = []; }
}

export default { computeF1, evaluateBatch, F1Evaluator };
