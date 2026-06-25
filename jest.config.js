/** @type {import('jest').Config} */
export default {
  testEnvironment: 'node',
  transform: {},
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^(.*/sqlite_adapter\\.js)$': '<rootDir>/lib/sqlite_adapter.js',
    '^node:sqlite$': '<rootDir>/tests/__mocks__/node-sqlite-mock.js',
  },
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'lib/**/*.js',
    'agents/**/*.js',
    '!lib/vector_store_qdrant.js',
    '!lib/bigquery_store.js',
  ],
  maxWorkers: 1,
  modulePathIgnorePatterns: ['<rootDir>/artifacts/', '<rootDir>/backups/'],
};
