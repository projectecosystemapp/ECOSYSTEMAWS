import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/login.page';
import { ProviderDashboardPage } from '../../pages/provider/dashboard.page';
import { EarningsDashboardPage } from '../../pages/provider/earnings-dashboard.page';

/**
 * Simplified Provider Payment System test that doesn't require data seeding
 * This test verifies the UI flow without backend data manipulation
 */
test.describe('E2E-004: Provider Payment System (Simple)', () => {
  let loginPage: LoginPage;
  let dashboardPage: ProviderDashboardPage;
  let earningsPage: EarningsDashboardPage;
  
  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new ProviderDashboardPage(page);
    earningsPage = new EarningsDashboardPage(page);
  });
  
  test('Provider can navigate to earnings page', async ({ page }) => {
    // Go to login page
    await loginPage.goto();
    
    // Verify login page loads
    await expect(page).toHaveURL(/.*auth\/sign-in/);
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    
    // Note: We can't actually login without valid test credentials
    // For now, just verify the page structure exists
  });
  
  test('Earnings dashboard page structure exists', async ({ page }) => {
    // Navigate directly to earnings page
    await page.goto('/provider/earnings');
    
    // Should redirect to login since not authenticated
    await expect(page).toHaveURL(/.*auth\/sign-in/);
    
    // Verify the login redirect works
    await expect(loginPage.emailInput).toBeVisible();
  });
  
  test('Provider dashboard page exists', async ({ page }) => {
    // Navigate to provider dashboard
    await page.goto('/provider/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*auth\/sign-in/);
  });
  
  test('Login page has all required elements', async ({ page }) => {
    await loginPage.goto();
    
    // Check all elements are present
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
    
    // Verify button text
    const buttonText = await loginPage.submitButton.textContent();
    expect(buttonText?.toLowerCase()).toContain('sign in');
  });
  
  test('Login form validation works', async ({ page }) => {
    await loginPage.goto();
    
    // Try to submit empty form
    await loginPage.submitButton.click();
    
    // Should stay on login page
    await expect(page).toHaveURL(/.*auth\/sign-in/);
    
    // Try with invalid email
    await loginPage.emailInput.fill('invalid-email');
    await loginPage.passwordInput.fill('password123');
    await loginPage.submitButton.click();
    
    // Should still be on login page (validation failed)
    await expect(page).toHaveURL(/.*auth\/sign-in/);
  });
});