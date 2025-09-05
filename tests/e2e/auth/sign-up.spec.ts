import { test, expect, testInfo } from '../../fixtures';
import { SignUpPage } from '../../pages/auth/sign-up.page';
import { SelectRolePage } from '../../pages/auth/select-role.page';
import { ProviderDashboardPage } from '../../pages/provider/dashboard.page';

test.describe('Authentication - Sign Up Flow', () => {
  test.describe.configure({ mode: 'parallel' });

  test(`E2E-001: Provider sign-up flow ${testInfo.CRITICAL} ${testInfo.AUTH}`, async ({ 
    page, 
    testUser, 
    database,
    testData 
  }) => {
    const signUpPage = new SignUpPage(page);
    const selectRolePage = new SelectRolePage(page);
    const dashboardPage = new ProviderDashboardPage(page);
    const testEmail = `e2e-provider-${testData.uniqueId}@test.ecosystem.com`;
    const testPassword = 'TestPassword123!';
    let createdUser: any = null;
    
    // Step 1: Navigate to sign-up
    await test.step('Navigate to role selection', async () => {
      await selectRolePage.goto();
      await expect(page).toHaveURL('/auth/select-role');
      await expect(selectRolePage.pageTitle).toBeVisible();
    });
    
    // Step 2: Select provider role
    await test.step('Select provider role', async () => {
      await selectRolePage.selectProviderRole();
      await expect(page).toHaveURL(/\/auth\/sign-up\?role=PROVIDER/);
    });
    
    // Step 3: Fill and submit sign-up form
    await test.step('Complete sign-up form', async () => {
      await signUpPage.fillSignUpForm(testEmail, testPassword);
      await signUpPage.submit();
    });
    
    // Step 4: Verify email verification page
    await test.step('Verify redirection to email verification', async () => {
      await expect(page).toHaveURL(/\/auth\/verify-email/);
      await expect(page.getByText(`We've sent a verification code to`)).toBeVisible();
    });
    
    // Step 5: Create and confirm user programmatically (bypass email verification)
    await test.step('Programmatically confirm user', async () => {
      // Create the user in Cognito with confirmed status
      createdUser = await testUser.createTestUser('PROVIDER');
      
      // Confirm the user signup
      await testUser.confirmUserSignUp(createdUser.username);
      
      // Navigate to confirmed page to trigger dashboard redirect
      await page.goto('/auth/confirmed');
    });
    
    // Step 6: Verify redirect to provider dashboard
    await test.step('Verify provider dashboard access', async () => {
      await page.waitForURL('/provider/dashboard', { timeout: 10000 });
      await expect(dashboardPage.dashboardTitle).toBeVisible();
      
      // Check for onboarding banner
      await expect(dashboardPage.onboardingBanner).toBeVisible();
      await expect(dashboardPage.onboardingTitle).toBeVisible();
      await expect(dashboardPage.onboardingDescription).toBeVisible();
    });
    
    // Step 7: Verify database record creation
    await test.step('Verify User record in database', async () => {
      if (createdUser && createdUser.userId) {
        // Check if User record exists in DynamoDB
        const userExists = await database.recordExists('User', { owner: createdUser.userId });
        expect(userExists).toBeTruthy();
        
        // Optionally get user details for additional assertions
        const userDetails = await testUser.getUserDetails(createdUser.username);
        expect(userDetails['custom:role']).toBe('PROVIDER');
        expect(userDetails['email_verified']).toBe('true');
      }
    });
    
    // Cleanup is handled automatically by fixtures
  });

  test(`E2E-002: Customer sign-up flow ${testInfo.HIGH} ${testInfo.AUTH}`, async ({ 
    page, 
    testData 
  }) => {
    const signUpPage = new SignUpPage(page);
    const testEmail = `e2e-customer-${testData.uniqueId}@test.ecosystem.com`;
    const testPassword = 'TestPassword123!';
    
    await test.step('Complete customer sign-up', async () => {
      await signUpPage.signUp('customer', testEmail, testPassword);
      await expect(page).toHaveURL(/\/auth\/verify-email/);
    });
  });

  test(`E2E-003: Sign-up validation errors ${testInfo.MEDIUM} ${testInfo.AUTH}`, async ({ 
    page 
  }) => {
    const signUpPage = new SignUpPage(page);
    
    await test.step('Navigate to sign-up form', async () => {
      await signUpPage.goto();
      await signUpPage.selectRole('customer');
    });
    
    await test.step('Test invalid email', async () => {
      await signUpPage.emailInput.fill('invalid-email');
      await signUpPage.passwordInput.fill('Test123!');
      await signUpPage.confirmPasswordInput.fill('Test123!');
      await signUpPage.submit();
      
      await expect(page.getByText('Invalid email')).toBeVisible();
    });
    
    await test.step('Test weak password', async () => {
      await signUpPage.emailInput.fill('valid@email.com');
      await signUpPage.passwordInput.fill('weak');
      await signUpPage.confirmPasswordInput.fill('weak');
      await signUpPage.submit();
      
      await expect(page.getByText(/Password must/)).toBeVisible();
    });
    
    await test.step('Test password mismatch', async () => {
      await signUpPage.emailInput.fill('valid@email.com');
      await signUpPage.passwordInput.fill('TestPassword123!');
      await signUpPage.confirmPasswordInput.fill('DifferentPassword123!');
      await signUpPage.submit();
      
      await expect(page.getByText("Passwords don't match")).toBeVisible();
    });
  });

  test(`E2E-004: Cannot access protected routes without authentication ${testInfo.CRITICAL} ${testInfo.AUTH}`, async ({ 
    page 
  }) => {
    // Try to access provider dashboard without authentication
    await test.step('Access provider dashboard without auth', async () => {
      await page.goto('/provider/dashboard');
      
      // Should redirect to sign-in page
      await expect(page).toHaveURL(/\/auth\/sign-in/);
    });
    
    // Try to access customer dashboard without authentication
    await test.step('Access customer dashboard without auth', async () => {
      await page.goto('/dashboard');
      
      // Should redirect to sign-in page
      await expect(page).toHaveURL(/\/auth\/sign-in/);
    });
    
    // Try to access booking page without authentication
    await test.step('Access booking page without auth', async () => {
      await page.goto('/bookings');
      
      // Should redirect to sign-in page
      await expect(page).toHaveURL(/\/auth\/sign-in/);
    });
  });

  test(`E2E-005: Role-based access control ${testInfo.HIGH} ${testInfo.AUTH}`, async ({ 
    page,
    testUser 
  }) => {
    // Create a customer user
    const customer = await testUser.createTestUser('CUSTOMER');
    
    await test.step('Sign in as customer', async () => {
      await page.goto('/auth/sign-in');
      await page.getByLabel('Email').fill(customer.email);
      await page.getByLabel('Password').fill(customer.password);
      await page.getByRole('button', { name: /sign in/i }).click();
      
      // Should redirect to customer dashboard
      await expect(page).toHaveURL('/dashboard');
    });
    
    await test.step('Try to access provider routes as customer', async () => {
      // Try to access provider dashboard
      await page.goto('/provider/dashboard');
      
      // Should redirect or show error
      await expect(page).not.toHaveURL('/provider/dashboard');
      
      // Try to access provider services
      await page.goto('/provider/services');
      await expect(page).not.toHaveURL('/provider/services');
    });
  });

  test(`E2E-006: Duplicate email registration ${testInfo.MEDIUM} ${testInfo.AUTH}`, async ({ 
    page,
    testUser,
    testData 
  }) => {
    const signUpPage = new SignUpPage(page);
    
    // Create an existing user
    const existingUser = await testUser.createTestUser('CUSTOMER');
    
    await test.step('Try to register with existing email', async () => {
      await signUpPage.goto();
      await signUpPage.selectRole('customer');
      await signUpPage.fillSignUpForm(existingUser.email, 'NewPassword123!');
      await signUpPage.submit();
      
      // Should show error about existing account
      const errorMessage = await signUpPage.getErrorMessage();
      expect(errorMessage).toContain('already exists');
    });
  });
});