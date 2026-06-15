/**
 * lib/bandit.js — Multi-Armed Bandit for prompt strategy selection
 * Thompson Sampling to pick the best prompt modifier per query type.
 * @module lib/bandit
 */

const STRATEGIES = [
  { name: 'baseline', promptModifier: '', weight: 1 },
  { name: 'step_by_step', promptModifier: 'Hãy suy nghĩ từng bước một (step-by-step).', weight: 1 },
  { name: 'few_shot', promptModifier: 'Đưa ra 2 ví dụ minh họa trước khi trả lời.', weight: 1 },
  { name: 'cot', promptModifier: 'Trước khi trả lời, hãy liệt kê các facts từ context, sau đó kết luận.', weight: 1 },
];

const stats = {}; // { strategy: { successes, trials } }

function initStats() {
  for (const s of STRATEGIES) {
    if (!stats[s.name]) stats[s.name] = { successes: 0, trials: 0 };
  }
}
initStats();

// Thompson Sampling: sample from Beta distribution
function sampleBeta(alpha, beta) {
  // Approximate via gamma
  const gammaSample = (a) => {
    if (a <= 0) return 0;
    if (a < 1) return Math.pow(Math.random(), 1 / a) * gammaSample(a + 1);
    const d = a - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    while (true) {
      let x, v;
      do { x = (Math.random() * 2 - 1) * 2; v = 1 + c * x; } while (v <= 0);
      v = v * v * v;
      const u = Math.random();
      if (u < 1 - 0.0331 * x * x * x * x) return d * v;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
  };
  const x = gammaSample(alpha);
  const y = gammaSample(beta);
  return x / (x + y);
}

export function selectPromptStrategy(queryType = 'general') {
  let best = STRATEGIES[0];
  let bestSample = -1;
  for (const s of STRATEGIES) {
    const st = stats[s.name];
    const alpha = 1 + st.successes;
    const beta = 1 + st.trials - st.successes;
    const sample = sampleBeta(alpha, beta);
    if (sample > bestSample) { bestSample = sample; best = s; }
  }
  return { strategy: best.name, promptModifier: best.promptModifier };
}

export function recordBanditFeedback(strategy, reward) {
  if (!stats[strategy]) stats[strategy] = { successes: 0, trials: 0 };
  stats[strategy].trials++;
  stats[strategy].successes += Math.max(0, Math.min(1, reward));
}

export function getBanditStats() {
  return STRATEGIES.map(s => ({
    ...s,
    ...stats[s.name],
    avgReward: stats[s.name].trials > 0 ? stats[s.name].successes / stats[s.name].trials : 0,
  }));
}

export default { selectPromptStrategy, recordBanditFeedback, getBanditStats };
