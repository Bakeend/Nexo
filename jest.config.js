module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/tests/**/*.test.ts', '**/tests/**/*.test.tsx'],
  testPathIgnorePatterns: ['<rootDir>/.kilo/worktrees/'],
  setupFilesAfterEnv: [],
};
