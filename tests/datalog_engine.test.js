/**
 * DatalogEngine Tests — Pure logic, no LLM, no external dependencies
 */
import { describe, test, expect } from '@jest/globals';
import { DatalogEngine } from '../lib/datalog_engine.js';

describe('DatalogEngine — addFact / query', () => {
  test('addFact returns true for new fact', () => {
    const e = new DatalogEngine();
    expect(e.addFact('is_a', 'raft', 'consensus_algorithm')).toBe(true);
  });

  test('addFact returns false for duplicate', () => {
    const e = new DatalogEngine();
    e.addFact('is_a', 'raft', 'consensus_algorithm');
    expect(e.addFact('is_a', 'raft', 'consensus_algorithm')).toBe(false);
  });

  test('query returns true for existing fact', () => {
    const e = new DatalogEngine();
    e.addFact('is_a', 'raft', 'consensus_algorithm');
    expect(e.query('is_a', 'raft', 'consensus_algorithm')).toBe(true);
  });

  test('query returns false for non-existing fact', () => {
    const e = new DatalogEngine();
    expect(e.query('is_a', 'raft', 'consensus_algorithm')).toBe(false);
  });

  test('facts are case-insensitive', () => {
    const e = new DatalogEngine();
    e.addFact('is_a', 'Raft', 'Consensus_Algorithm');
    expect(e.query('is_a', 'raft', 'consensus_algorithm')).toBe(true);
  });

  test('factCount tracks correctly', () => {
    const e = new DatalogEngine();
    e.addFact('is_a', 'a', 'b');
    e.addFact('is_a', 'b', 'c');
    e.addFact('is_a', 'a', 'b'); // duplicate
    expect(e.factCount).toBe(2);
  });
});

describe('DatalogEngine — forward chaining: transitivity', () => {
  test('is_a transitivity: A→B, B→C ⇒ A→C', () => {
    const e = new DatalogEngine();
    e.addFact('is_a', 'raft', 'consensus_algorithm');
    e.addFact('is_a', 'consensus_algorithm', 'distributed_protocol');

    e.addRule('is_a', ['X', 'Z'], [
      { predicate: 'is_a', args: ['X', 'Y'] },
      { predicate: 'is_a', args: ['Y', 'Z'] },
    ]);

    e.run();

    expect(e.query('is_a', 'raft', 'distributed_protocol')).toBe(true);
  });

  test('is_a transitivity: 3-hop chain A→B→C→D ⇒ A→D', () => {
    const e = new DatalogEngine();
    e.addFact('is_a', 'tcp', 'transport_protocol');
    e.addFact('is_a', 'transport_protocol', 'network_protocol');
    e.addFact('is_a', 'network_protocol', 'protocol');

    e.addRule('is_a', ['X', 'Z'], [
      { predicate: 'is_a', args: ['X', 'Y'] },
      { predicate: 'is_a', args: ['Y', 'Z'] },
    ]);

    e.run();

    expect(e.query('is_a', 'tcp', 'protocol')).toBe(true);
    expect(e.query('is_a', 'tcp', 'network_protocol')).toBe(true);
  });

  test('no spurious facts generated', () => {
    const e = new DatalogEngine();
    e.addFact('is_a', 'raft', 'consensus_algorithm');

    e.addRule('is_a', ['X', 'Z'], [
      { predicate: 'is_a', args: ['X', 'Y'] },
      { predicate: 'is_a', args: ['Y', 'Z'] },
    ]);

    e.run();

    // Only the original fact should exist (no chain to follow)
    expect(e.factCount).toBe(1);
  });
});

describe('DatalogEngine — forward chaining: inheritance', () => {
  test('deprecated inheritance: X is_a Y, Y deprecated ⇒ X deprecated', () => {
    const e = new DatalogEngine();
    e.addFact('is_a', 'paxos', 'consensus_algorithm');
    e.addFact('deprecated', 'consensus_algorithm');

    e.addRule('deprecated', ['X'], [
      { predicate: 'is_a', args: ['X', 'Y'] },
      { predicate: 'deprecated', args: ['Y'] },
    ]);

    e.run();

    expect(e.query('deprecated', 'paxos')).toBe(true);
  });

  test('recommended inheritance: X is_a Y, Y recommended ⇒ X recommended', () => {
    const e = new DatalogEngine();
    e.addFact('is_a', 'raft', 'consensus_algorithm');
    e.addFact('recommended', 'consensus_algorithm');

    e.addRule('recommended', ['X'], [
      { predicate: 'is_a', args: ['X', 'Y'] },
      { predicate: 'recommended', args: ['Y'] },
    ]);

    e.run();

    expect(e.query('recommended', 'raft')).toBe(true);
  });
});

describe('DatalogEngine — contradiction detection', () => {
  test('finds contradiction: deprecated + recommended for same entity', () => {
    const e = new DatalogEngine();
    e.addFact('deprecated', 'paxos');
    e.addFact('recommended', 'paxos');

    const contradictions = e.findContradictions([['deprecated', 'recommended']]);
    expect(contradictions.length).toBe(1);
    expect(contradictions[0].entity).toBe('paxos');
    expect(contradictions[0].predicate).toBe('deprecated');
    expect(contradictions[0].conflictsWith).toBe('recommended');
  });

  test('no contradiction when predicates are for different entities', () => {
    const e = new DatalogEngine();
    e.addFact('deprecated', 'paxos');
    e.addFact('recommended', 'raft');

    const contradictions = e.findContradictions([['deprecated', 'recommended']]);
    expect(contradictions.length).toBe(0);
  });

  test('no contradiction when only one predicate exists', () => {
    const e = new DatalogEngine();
    e.addFact('deprecated', 'paxos');

    const contradictions = e.findContradictions([['deprecated', 'recommended']]);
    expect(contradictions.length).toBe(0);
  });

  test('empty engine has no contradictions', () => {
    const e = new DatalogEngine();
    const contradictions = e.findContradictions([['deprecated', 'recommended']]);
    expect(contradictions.length).toBe(0);
  });
});

describe('DatalogEngine — run() return value', () => {
  test('returns number of new facts derived', () => {
    const e = new DatalogEngine();
    e.addFact('is_a', 'a', 'b');
    e.addFact('is_a', 'b', 'c');
    e.addFact('is_a', 'c', 'd');

    e.addRule('is_a', ['X', 'Z'], [
      { predicate: 'is_a', args: ['X', 'Y'] },
      { predicate: 'is_a', args: ['Y', 'Z'] },
    ]);

    const derived = e.run();
    // a→b, b→c ⇒ a→c; b→c, c→d ⇒ b→d; a→c, c→d ⇒ a→d = 3 new facts
    expect(derived).toBe(3);
  });

  test('returns 0 when no new facts can be derived', () => {
    const e = new DatalogEngine();
    e.addFact('is_a', 'a', 'b');

    e.addRule('is_a', ['X', 'Z'], [
      { predicate: 'is_a', args: ['X', 'Y'] },
      { predicate: 'is_a', args: ['Y', 'Z'] },
    ]);

    expect(e.run()).toBe(0);
  });
});

describe('DatalogEngine — getFactsByPredicate', () => {
  test('returns matching facts', () => {
    const e = new DatalogEngine();
    e.addFact('is_a', 'raft', 'consensus');
    e.addFact('is_a', 'paxos', 'consensus');
    e.addFact('deprecated', 'paxos');

    const isAFacts = e.getFactsByPredicate('is_a');
    expect(isAFacts.length).toBe(2);

    const deprecatedFacts = e.getFactsByPredicate('deprecated');
    expect(deprecatedFacts.length).toBe(1);
    expect(deprecatedFacts[0].args[0]).toBe('paxos');
  });

  test('returns empty array for unknown predicate', () => {
    const e = new DatalogEngine();
    expect(e.getFactsByPredicate('nonexistent')).toEqual([]);
  });
});

describe('DatalogEngine — real-world scenario: Paxos/Raft consensus', () => {
  test('full scenario: detect contradiction in knowledge base', () => {
    const e = new DatalogEngine();

    // Ground truth from context
    e.addFact('is_a', 'raft', 'consensus_algorithm');
    e.addFact('is_a', 'paxos', 'consensus_algorithm');
    e.addFact('deprecated', 'paxos');
    e.addFact('recommended', 'raft');

    // But context also has old doc saying paxos is recommended
    e.addFact('recommended', 'paxos'); // contradiction!

    // Add rules
    e.addRule('deprecated', ['X'], [
      { predicate: 'is_a', args: ['X', 'Y'] },
      { predicate: 'deprecated', args: ['Y'] },
    ]);
    e.addRule('recommended', ['X'], [
      { predicate: 'is_a', args: ['X', 'Y'] },
      { predicate: 'recommended', args: ['Y'] },
    ]);

    e.run();

    // paxos is both deprecated and recommended → contradiction
    const contradictions = e.findContradictions([['deprecated', 'recommended']]);
    expect(contradictions.length).toBeGreaterThan(0);
    expect(contradictions.some(c => c.entity === 'paxos')).toBe(true);
  });

  test('verify answer claims against ground truth', () => {
    const e = new DatalogEngine();

    // Ground truth
    e.addFact('is_a', 'raft', 'consensus_algorithm');
    e.addFact('deprecated', 'paxos');
    e.addFact('recommended', 'raft');

    e.addRule('deprecated', ['X'], [
      { predicate: 'is_a', args: ['X', 'Y'] },
      { predicate: 'deprecated', args: ['Y'] },
    ]);

    e.run();

    // Answer claims to verify
    expect(e.query('deprecated', 'paxos')).toBe(true);   // ✓ correct
    expect(e.query('recommended', 'raft')).toBe(true);    // ✓ correct
    expect(e.query('deprecated', 'raft')).toBe(false);    // ✗ wrong — raft is not deprecated
  });
});
