const nextJest = require('next/jest');

// Providing the path to your Next.js app which will enable loading next.config.js and .env files
const createJestConfig = nextJest({ dir: './' });

// Any custom config you want to pass to Jest
const customJestConfig = {
  // Add more setup options before each test is run
  setupFilesAfterEnv: [
    '<rootDir>/tests/test/setup.ts',
    '<rootDir>/tests/test/aws-setup.ts'
  ],
  
  // Jest environment
  testEnvironment: 'jest-environment-jsdom',

  // Module name mapping for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },

  // Test patterns
  testMatch: [
    '<rootDir>/**/*.test.{ts,tsx}',
    '<rootDir>/tests/unit/**/*.test.{ts,tsx}',
    '<rootDir>/tests/integration/**/*.test.{ts,tsx}',
    '<rootDir>/tests/security/**/*.test.{ts,tsx}',
    '<rootDir>/tests/performance/**/*.test.{ts,tsx}',
    '<rootDir>/lib/**/*.test.{ts,tsx}',
    '<rootDir>/amplify/functions/**/*.test.{ts,tsx}'
  ],

  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/tests/e2e/',
    '<rootDir>/amplify/backend.ts',
    '<rootDir>/amplify/data/resource.ts',
    '<rootDir>/amplify/**/*.js',
    '<rootDir>/amplify/**/resource.ts'
  ],

  // Coverage configuration (Constitutional mandate: 80% minimum)
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
    'amplify/functions/**/handler.ts',
    '!**/*.d.ts',
    '!**/*.config.{ts,js}',
    '!**/*.test.{ts,tsx}',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/amplify/backend.ts',
    '!**/amplify/data/resource.ts'
  ],
  
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Coverage reporters
  coverageReporters: ['text', 'json', 'html', 'lcov'],

  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Bail on first test failure in CI
  bail: process.env.CI ? 1 : 0,
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);