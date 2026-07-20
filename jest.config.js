/**
 * Jest config (ESM-native). Tests run under Node's experimental VM modules
 * (see the `test` script), so no Babel transform is needed.
 */
export default {
  testEnvironment: 'node',
  transform: {},
  moduleFileExtensions: ['js', 'mjs', 'json'],
  testMatch: ['**/test/**/*.test.js', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: ['src/**/*.js', '!src/**/index.js'],
  coverageDirectory: 'coverage',
  clearMocks: true,
  setupFiles: ['<rootDir>/test/setup-env.js'],
  testPathIgnorePatterns: ['/node_modules/'],
};
