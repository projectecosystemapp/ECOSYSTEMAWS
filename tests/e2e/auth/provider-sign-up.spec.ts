import { test, expect } from '@playwright/test';
import { SelectRolePage } from '../../pages/auth/select-role.page';
import { SignUpPage } from '../../pages/auth/sign-up.page';
import { SignInPage } from '../../pages/auth/sign-in.page';
import { ProviderDashboardPage } from '../../pages/provider/dashboard.page';
import { TestUserHelper } from '../../helpers/test-user.helper';
import { DatabaseHelper } from '../../helpers/database.helper';
import { randomBytes } from 'crypto';

test.describe('Provider Sign-Up Flow @auth @critical', () => {
  let testUserHelper: TestUserHelper;
  let databaseHelper: DatabaseHelper;
  let testEmail: string;
  let testPassword: string;
  let createdUserId: string;

  test.beforeEach(async () => {
    // Generate unique test credentials
    const uniqueId = randomBytes(8).toString('hex');
    testEmail = `e2e-provider-${uniqueId}@test.ecosystem.com`;
    testPassword = `Test123!${randomBytes(4).toString('hex')}`;
    
    testUserHelper = new TestUserHelper();
    databaseHelper = new DatabaseHelper();
  });

  test.afterEach(async () => {
    // Cleanup regardless of test outcome
    if (createdUserId) {
      await databaseHelper.cleanupUserData(createdUserId);
    }
    await testUserHelper.cleanup();
  });

  test('E2E-001: Complete provider sign-up flow through actual UI', async ({ page }) => {
    // Page objects
    const selectRolePage = new SelectRolePage(page);
    const signUpPage = new SignUpPage(page);
    const signInPage = new SignInPage(page);
    const dashboardPage = new ProviderDashboardPage(page);

    console.log(`🧪 Starting E2E-001 with email: ${testEmail}`);

    // Step 1: Navigate to home page
    console.log('📍 Step 1: Navigating to home page...');
    await page.goto('/');
    
    // Step 2: Navigate directly to register page (Get Started button goes to /auth/register)
    console.log('📍 Step 2: Navigating to register page...');
    await page.goto('/auth/register');
    
    // Step 3: Verify we're on register/role selection page
    console.log('📍 Step 3: Verifying registration page...');
    await expect(page).toHaveURL(/\/auth\/(register|select-role)/);
    await expect(selectRolePage.pageTitle).toBeVisible();
    
    // Step 4: Select Provider role - THIS IS THE CRITICAL STEP
    console.log('📍 Step 4: Selecting Provider role...');
    await selectRolePage.selectProviderRole();
    
    // Step 5: Verify redirect with role parameter
    console.log('📍 Step 5: Verifying sign-up page with role parameter...');
    await expect(page).toHaveURL(/\/auth\/sign-up\?role=PROVIDER/);
    
    // Step 6: Fill and submit sign-up form - THIS TRIGGERS THE REAL FLOW
    console.log('📍 Step 6: Filling sign-up form with real data...');
    await signUpPage.fillSignUpForm(testEmail, testPassword);
    await signUpPage.submit();
    
    // Step 7: Wait for and verify email verification page
    console.log('📍 Step 7: Verifying email verification page...');
    await expect(page).toHaveURL(/\/auth\/verify-email/);
    
    // Step 8: Programmatically confirm the user (bypass email)
    console.log('📍 Step 8: Confirming user via AWS SDK...');
    createdUserId = await testUserHelper.confirmUserByEmail(testEmail);
    console.log(`   ✓ User confirmed with ID: ${createdUserId}`);
    
    // Step 9: Navigate to sign-in and log in with the new credentials
    console.log('📍 Step 9: Signing in with new user...');
    await page.goto('/auth/sign-in');
    await signInPage.signIn(testEmail, testPassword);
    
    // Step 10: Verify redirect to provider dashboard
    console.log('📍 Step 10: Verifying dashboard redirect...');
    await expect(page).toHaveURL(/\/provider\/dashboard/);
    
    // Step 11: Verify onboarding banner is visible
    console.log('📍 Step 11: Verifying onboarding banner...');
    await expect(dashboardPage.onboardingBanner).toBeVisible();
    await expect(dashboardPage.completeProfileButton).toBeVisible();
    
    // Step 12: Critical backend assertion - verify User record has correct accountType
    console.log('📍 Step 12: Verifying database record...');
    const userRecord = await databaseHelper.getUserRecord(createdUserId);
    
    expect(userRecord).toBeTruthy();
    expect(userRecord.accountType).toBe('PROVIDER'); // THIS VALIDATES THE ENTIRE FLOW
    expect(userRecord.email).toBe(testEmail);
    
    console.log('✅ E2E-001: Provider sign-up flow completed successfully!');
  });
});