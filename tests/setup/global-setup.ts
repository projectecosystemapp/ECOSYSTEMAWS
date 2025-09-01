import { getTestAuthHelper } from '../helpers/auth.helper';
import type { FullConfig } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global test setup...');
  
  // Load test environment variables
  const testEnvPath = path.join(process.cwd(), 'tests', 'config', '.env.test');
  dotenv.config({ path: testEnvPath });
  
  // Verify required environment variables
  const requiredVars = [
    'VITE_TEST_USER_POOL_ID',
    'VITE_TEST_USER_POOL_CLIENT_ID',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_REGION'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn('⚠️  Missing test environment variables:', missingVars);
    console.warn('   Tests requiring authentication will be skipped.');
    console.warn('   Copy tests/config/test.env.example to tests/config/.env.test');
    console.warn('   and fill in your AWS Cognito test configuration.');
    return;
  }
  
  // Initialize auth helper
  const authHelper = getTestAuthHelper();
  
  if (!authHelper.isConfigured()) {
    console.warn('⚠️  Cognito not configured for testing.');
    console.warn('   Tests requiring authentication will be skipped.');
    return;
  }
  
  console.log('✅ Test environment configured successfully');
  console.log(`   User Pool: ${process.env.VITE_TEST_USER_POOL_ID}`);
  console.log(`   Region: ${process.env.AWS_REGION}`);
  
  // The auth helper singleton will be available throughout the test run
  // Individual tests can call getTestAuthHelper() to get the instance
}

async function globalTeardown() {
  console.log('🧹 Running global test teardown...');
  
  // Clean up any test users that were created
  const authHelper = getTestAuthHelper();
  if (authHelper.isConfigured()) {
    await authHelper.cleanup();
  }
  
  console.log('✅ Global test teardown complete');
}

export default globalSetup;