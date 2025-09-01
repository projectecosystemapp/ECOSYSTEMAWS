import { test as base } from '@playwright/test';
import { TestUserHelper } from '../helpers/test-user.helper';
import { DatabaseHelper } from '../helpers/database.helper';

/**
 * Custom test fixtures that extend Playwright's base test
 * These fixtures automatically handle setup and teardown
 */
type TestFixtures = {
  testUser: TestUserHelper;
  database: DatabaseHelper;
  testData: {
    timestamp: string;
    uniqueId: string;
  };
};

export const test = base.extend<TestFixtures>({
  // Test user management fixture
  testUser: async ({}, use) => {
    const helper = new TestUserHelper();
    
    // Use the helper during the test
    await use(helper);
    
    // Cleanup after test completes
    await helper.cleanup();
  },
  
  // Database management fixture
  database: async ({}, use) => {
    const helper = new DatabaseHelper();
    
    // Use the helper during the test
    await use(helper);
    
    // Cleanup after test completes
    await helper.cleanup();
  },
  
  // Test data fixture for unique values
  testData: async ({}, use) => {
    const timestamp = Date.now().toString();
    const uniqueId = `${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
    
    await use({
      timestamp,
      uniqueId,
    });
  },
});

// Re-export expect from Playwright
export { expect } from '@playwright/test';

// Export custom assertions
export { customExpect } from './custom-assertions';

// Export test annotations
export const testInfo = {
  CRITICAL: '@critical',
  HIGH: '@high',
  MEDIUM: '@medium',
  LOW: '@low',
  SMOKE: '@smoke',
  REGRESSION: '@regression',
  AUTH: '@auth',
  PAYMENTS: '@payments',
  BOOKING: '@booking',
  PROVIDER: '@provider',
  CUSTOMER: '@customer',
};