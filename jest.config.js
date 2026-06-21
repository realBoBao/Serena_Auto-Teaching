/** @type {import('jest').Config} */
export default {
  testEnvironment: 'node',
  transform: {},
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // Force sqlite_adapter to always resolve to the same module instance
    '^(.*/sqlite_adapter\\.js)$': '<rootDir>/lib/sqlite_adapter.js',
  },
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'lib/**/*.js',
    'agents/**/*.js',
    '!lib/vector_store_qdrant.js',
    '!lib/bigquery_store.js',
  ],
  // Fix ESM module caching: sqlite_adapter.js uses top-level await
  // Running workers=1 prevents parallel module loading conflicts
  ...(process.env.CI ? { maxWorkers: 1 } : {}),
  // Ignore artifacts and backups to avoid Haste module naming collisions
  modulePathIgnorePatterns: ['<rootDir>/artifacts/', '<rootDir>/backups/'],
};
