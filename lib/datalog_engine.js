/**
 * lib/datalog_engine.js — Datalog-style forward-chaining rule engine
 *
 * Pure JavaScript implementation of Datalog subset:
 * - Facts: ground atoms like is_a(raft, consensus_algorithm)
 * - Rules: Horn clauses like is_a(X,Z) :- is_a(X,Y), is_a(Y,Z)
 * - Forward chaining: derive all possible facts up to fixed point
 * - Contradiction detection: find exclusive predicate pairs
 *
 * No external dependencies. No LLM. Pure logic.
 *
 * Usage:
 *   import { DatalogEngine } from './datalog_engine.js';
 *   const engine = new DatalogEngine();
 *   engine.addFact('is_a', 'raft', 'consensus_algorithm');
 *   engine.addFact('deprecated', 'paxos');
 *   engine.addRule('deprecated', ['X'], [
 *     { predicate: 'is_a', args: ['X', 'Y'] },
 *     { predicate: 'deprecated', args: ['Y'] },
 *   ]);
 *   engine.run();
 *   engine.query('deprecated', 'raft'); // → false
 *   engine.query('deprecated', 'paxos'); // → true
 */

import { getLogger } from './logger.js';

const logger = getLogger('DatalogEngine');

export class DatalogEngine {
  constructor() {
    this.facts = new Set();   // serialized keys for O(1) dedupe lookup
    this.factList = [];       // ordered list for iteration during unification
    this.rules = [];
  }

  // ─── Fact management ─────────────────────────────────────────────────────

  /**
   * Add a ground fact. Returns true if fact was new, false if duplicate.
   * @param {string} predicate
   * @param {...string} args
   * @returns {boolean}
   */
  addFact(predicate, ...args) {
    const key = this._key(predicate, args);
    if (this.facts.has(key)) return false;
    this.facts.add(key);
    this.factList.push({ predicate, args: [...args] });
    return true;
  }

  /**
   * Check if a ground fact exists.
   * @param {string} predicate
   * @param {...string} args
   * @returns {boolean}
   */
  query(predicate, ...args) {
    return this.facts.has(this._key(predicate, args));
  }

  // ─── Rule management ─────────────────────────────────────────────────────

  /**
   * Add a Horn clause rule.
   * @param {string} headPredicate — predicate of the conclusion
   * @param {string[]} headArgsTemplate — args for head; uppercase = variable (e.g. 'X', 'Y')
   * @param {Array<{predicate: string, args: string[]}>} bodyConditions — conjunction of conditions
   *
   * Example — transitivity of is_a:
   *   addRule('is_a', ['X', 'Z'], [
   *     { predicate: 'is_a', args: ['X', 'Y'] },
   *     { predicate: 'is_a', args: ['Y', 'Z'] },
   *   ])
   */
  addRule(headPredicate, headArgsTemplate, bodyConditions) {
    this.rules.push({
      head: { predicate: headPredicate, args: headArgsTemplate },
      body: bodyConditions,
    });
  }

  // ─── Forward chaining ────────────────────────────────────────────────────

  /**
   * Run forward chaining until fixed point or maxIterations.
   * @param {number} maxIterations — safety bound (default 50)
   * @returns {number} total new facts derived
   */
  run(maxIterations = 50) {
    let totalNew = 0;
    let changed = true;
    let iterations = 0;

    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;

      for (const rule of this.rules) {
        const newFacts = this._applyRule(rule);
        for (const fact of newFacts) {
          if (this.addFact(fact.predicate, ...fact.args)) {
            totalNew++;
            changed = true;
          }
        }
      }
    }

    if (iterations >= maxIterations) {
      logger.warn(`[DatalogEngine] Hit maxIterations (${maxIterations}) — possible infinite rule loop`);
    }

    logger.info(`[DatalogEngine] Forward chaining complete: ${totalNew} new facts in ${iterations} iterations`);
    return totalNew;
  }

  // ─── Contradiction detection ─────────────────────────────────────────────

  /**
   * Find contradictions: pairs of exclusive predicates that both hold for same entity.
   * @param {Array<[string, string]>} exclusivePairs — e.g. [['deprecated', 'recommended']]
   * @returns {Array<{entity: string, predicate: string, conflictsWith: string, args: string[]}>}
   */
  findContradictions(exclusivePairs = []) {
    const contradictions = [];

    for (const [predA, predB] of exclusivePairs) {
      // Find all facts with predA and check if predB also holds for same args
      for (const fact of this.factList) {
        if (fact.predicate !== predA) continue;
        if (this.query(predB, ...fact.args)) {
          contradictions.push({
            entity: fact.args[0] || fact.args.join(','),
            predicate: predA,
            conflictsWith: predB,
            args: fact.args,
          });
        }
      }
    }

    if (contradictions.length > 0) {
      logger.warn(`[DatalogEngine] Found ${contradictions.length} contradiction(s):`, contradictions);
    }

    return contradictions;
  }

  // ─── Introspection ───────────────────────────────────────────────────────

  /** Get total number of known facts. */
  get factCount() {
    return this.factList.length;
  }

  /** Get total number of rules. */
  get ruleCount() {
    return this.rules.length;
  }

  /** Get all facts matching a predicate. */
  getFactsByPredicate(predicate) {
    return this.factList.filter(f => f.predicate === predicate);
  }

  // ─── Private: rule application ───────────────────────────────────────────

  /**
   * Apply a single rule: find all body matches, derive head facts.
   * @returns {Array<{predicate: string, args: string[]}>} new facts derived
   */
  _applyRule(rule) {
    const bindingsList = this._unify(rule.body, [{}]);
    const derived = [];

    for (const bindings of bindingsList) {
      const headArgs = rule.head.args.map(arg =>
        this._isVariable(arg) ? bindings[arg] : arg
      );

      // Skip if any variable wasn't bound
      if (headArgs.some(a => a === undefined)) continue;

      derived.push({
        predicate: rule.head.predicate,
        args: headArgs,
      });
    }

    return derived;
  }

  /**
   * Unify a list of conditions against known facts, returning all possible bindings.
   * @param {Array<{predicate: string, args: string[]}>} conditions
   * @param {Array<Record<string, string>>} initialBindings
   * @returns {Array<Record<string, string>>} all valid binding sets
   */
  _unify(conditions, initialBindings) {
    if (conditions.length === 0) return initialBindings;

    const [condition, ...rest] = conditions;
    const results = [];

    for (const bindings of initialBindings) {
      // Resolve variables in condition args using current bindings
      const resolvedArgs = condition.args.map(a =>
        this._isVariable(a) && bindings[a] !== undefined ? bindings[a] : a
      );

      // Try to match against every known fact
      for (const fact of this.factList) {
        if (fact.predicate !== condition.predicate) continue;
        if (fact.args.length !== resolvedArgs.length) continue;

        const newBindings = { ...bindings };
        let matched = true;

        for (let i = 0; i < fact.args.length; i++) {
          const resolved = resolvedArgs[i];
          const actual = fact.args[i];

          if (this._isVariable(condition.args[i])) {
            const varName = condition.args[i];
            if (newBindings[varName] !== undefined) {
              if (newBindings[varName] !== actual) {
                matched = false;
                break;
              }
            } else {
              newBindings[varName] = actual;
            }
          } else {
            // Ground arg — must match exactly
            if (resolved !== actual) {
              matched = false;
              break;
            }
          }
        }

        if (matched) {
          const subResults = this._unify(rest, [newBindings]);
          results.push(...subResults);
        }
      }
    }

    return results;
  }

  // ─── Private: helpers ────────────────────────────────────────────────────

  /** Serialize predicate + args into a unique string key. */
  _key(predicate, args) {
    return `${predicate}(${args.map(a => String(a).toLowerCase().trim()).join(',')})`;
  }

  /** A variable is any single uppercase letter or uppercase-starting string. */
  _isVariable(arg) {
    if (typeof arg !== 'string') return false;
    return /^[A-Z]/.test(arg);
  }
}
