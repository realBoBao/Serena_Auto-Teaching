/**
 * lib/aho_corasick.js — Aho-Corasick string matching for security scanning
 * Efficient multi-pattern string matching.
 * @module lib/aho_corasick
 */

export class AhoCorasickNode {
  constructor() {
    this.children = {};
    this.fail = null;
    this.output = [];
  }
}

export class AhoCorasick {
  constructor(patterns = []) {
    this.root = new AhoCorasickNode();
    this.built = false;
    for (const p of patterns) this.addPattern(p);
    this.build();
  }

  addPattern(pattern) {
    let node = this.root;
    for (const ch of pattern) {
      if (!node.children[ch]) node.children[ch] = new AhoCorasickNode();
      node = node.children[ch];
    }
    node.output.push(pattern);
  }

  build() {
    const queue = [];
    for (const ch in this.root.children) {
      this.root.children[ch].fail = this.root;
      queue.push(this.root.children[ch]);
    }
    while (queue.length > 0) {
      const current = queue.shift();
      for (const ch in current.children) {
        const child = current.children[ch];
        let fail = current.fail;
        while (fail && !fail.children[ch]) fail = fail.fail;
        child.fail = fail ? fail.children[ch] : this.root;
        child.output = child.output.concat(child.fail ? child.fail.output : []);
        queue.push(child);
      }
    }
    this.built = true;
  }

  search(text) {
    const matches = [];
    let node = this.root;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      while (node && !node.children[ch]) node = node.fail;
      if (!node) { node = this.root; continue; }
      node = node.children[ch];
      for (const pattern of node.output) {
        matches.push({ pattern, index: i - pattern.length + 1 });
      }
    }
    return matches;
  }
}

export function createSecurityScanner(patterns) {
  return new AhoCorasick(patterns);
}

export default { AhoCorasick, AhoCorasickNode, createSecurityScanner };
