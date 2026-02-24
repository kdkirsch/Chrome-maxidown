module.exports = {
  testEnvironment: 'jsdom',
  setupFiles: ['./tests/setup.js'],
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'common/**/*.js',
    'content/**/*.js',
    'background/**/*.js',
    'selector/**/*.js',
    'manager/**/*.js',
    '!**/node_modules/**'
  ]
};
