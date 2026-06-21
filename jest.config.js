/** @type {import('jest').Config} */
export default {
  testEnvironment: 'node',
  transform: {},
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
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
};
