/**
 * Mock for node:sqlite — used in CI where Node < 22.5
 * Maps to node:sqlite via moduleNameMapper in jest.config.js
 */
class DatabaseSync {
  constructor() { this.open = true; }
  exec() {}
  prepare() {
    return {
      all: () => [],
      get: () => null,
      run: () => ({ changes: 0, lastInsertRowid: 0 }),
      iterate: () => [],
    };
  }
  close() { this.open = false; }
  pragma() {}
}

export { DatabaseSync };
