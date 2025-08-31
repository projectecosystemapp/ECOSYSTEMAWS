import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown for E2E tests...');
  
  // Here you can add global teardown logic such as:
  // - Cleaning up test databases
  // - Removing test users
  // - Clearing test data
  // - Stopping mock services
  
  console.log('✅ Global teardown completed');
}

export default globalTeardown;