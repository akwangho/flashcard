module.exports = {
  testEnvironment: './test/environment.js',
  setupFilesAfterEnv: ['./test/setup-env.js'],
  testMatch: ['**/test/**/*.test.js'],
  verbose: true,
  bail: 1,
  maxWorkers: '50%'
};
