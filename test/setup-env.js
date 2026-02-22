/**
 * Jest setupFilesAfterFramework: runs once per test file, after the
 * test framework is installed but before any tests execute.
 * Replaces the manual bootstrapApp() call in each test file's beforeAll.
 */
require('./setup').bootstrapApp();
