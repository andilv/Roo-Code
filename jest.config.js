module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'], // Only src as tests are alongside source files
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      // ts-jest configuration options go here
      // For example, if you have a specific tsconfig for tests:
      // tsconfig: 'tsconfig.test.json'
    }],
  },
  moduleNameMapper: {
    // Handle module aliases (if you have them in tsconfig.paths)
    // e.g., '^@/(.*)$': '<rootDir>/src/$1'
  },
  // Setup files after env is set up but before tests run
  // setupFilesAfterEnv: ['<rootDir>/tests/setupTests.ts'],
  collectCoverage: true,
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '.*\\.d\\.ts$',
    '<rootDir>/__mocks__/' // Also ignore mocks from coverage
  ],
};
