import { test, expect } from '@playwright/test';
import { TestUserHelper } from '../../helpers/test-user.helper';
import { TestDataSeeder } from '../../helpers/test-data.seeder';
import { LoginPage } from '../../pages/login.page';
import { ProviderDashboardPage } from '../../pages/provider/dashboard.page';
import { PayoutsOnboardingPage } from '../../pages/provider/payouts-onboarding.page';
import { EarningsDashboardPage } from '../../pages/provider/earnings-dashboard.page';
import { nullableToString, nullableToNumber } from '@/lib/type-utils';

test.describe('E2E-004: Provider Payment System', () => {
  let testUserHelper: TestUserHelper;
  let testDataSeeder: TestDataSeeder;
  let loginPage: LoginPage;
  let dashboardPage: ProviderDashboardPage;
  let payoutsPage: PayoutsOnboardingPage;
  let earningsPage: EarningsDashboardPage;
  
  let providerEmail: string;
  let providerId: string;
  
  test.beforeAll(async () => {
    testUserHelper = new TestUserHelper();
    testDataSeeder = new TestDataSeeder();
    
    // Create test provider with complete profile
    const provider = await testUserHelper.createProvider({
      completedProfile: true,
      businessInfo: {
        businessName: 'Test Cleaning Services',
        businessType: 'INDIVIDUAL',
        taxId: '123456789'
      }
    });
    
    providerEmail = provider.email;
    providerId = provider.id;
    
    // Create services and completed bookings for earnings
    await testDataSeeder.createProviderEarningsData(providerId, {
      services: [
        {
          title: 'Standard Cleaning',
          price: 8000, // $80.00
          bookingsCount: 5,
          completedCount: 3
        },
        {
          title: 'Deep Cleaning',
          price: 12000, // $120.00
          bookingsCount: 3,
          completedCount: 2
        }
      ]
    });
  });
  
  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new ProviderDashboardPage(page);
    payoutsPage = new PayoutsOnboardingPage(page);
    earningsPage = new EarningsDashboardPage(page);
    
    // Login as provider
    await loginPage.goto();
    await loginPage.login(providerEmail, 'Test123!');
    await page.waitForURL('/provider/dashboard');
  });
  
  test.afterAll(async () => {
    // Clean up test data
    await testDataSeeder.cleanupProviderData(providerId);
    await testUserHelper.deleteUser(providerEmail);
  });
  
  test('Provider completes Stripe Connect onboarding', async ({ page }) => {
    // Navigate to payouts onboarding
    await dashboardPage.clickEarningsCard();
    
    // Should redirect to onboarding if not set up
    await expect(page).toHaveURL('/provider/onboarding/payments');
    
    // Verify onboarding page elements
    await expect(payoutsPage.heading).toContainText('Set Up Payouts');
    await expect(payoutsPage.description).toContainText('Connect your Stripe account');
    
    // Start onboarding process
    await payoutsPage.clickStartOnboarding();
    
    // Mock Stripe Connect OAuth flow
    // In real tests, this would redirect to Stripe
    await page.route('**/api/stripe/connect', async route => {
      await route.fulfill({
        status: 200,
        json: {
          url: 'https://connect.stripe.com/oauth/authorize?test=true',
          accountId: 'acct_test_123'
        }
      });
    });
    
    // Simulate return from Stripe
    await page.goto('/provider/onboarding/payments?success=true&account=acct_test_123');
    
    // Verify success state
    await expect(payoutsPage.successMessage).toBeVisible();
    await expect(payoutsPage.successMessage).toContainText('Account connected successfully');
    
    // Should show account details
    await expect(payoutsPage.accountStatus).toContainText('Active');
    await expect(payoutsPage.payoutsEnabled).toContainText('Enabled');
    
    // Continue to dashboard
    await payoutsPage.clickContinueToDashboard();
    await expect(page).toHaveURL('/provider/earnings');
  });
  
  test('Provider views earnings dashboard with real data', async ({ page }) => {
    // Navigate directly to earnings
    await page.goto('/provider/earnings');
    
    // Wait for data to load
    await page.waitForSelector('[data-testid="earnings-overview"]');
    
    // Verify overview cards display correct data
    const totalEarnings = await earningsPage.getTotalEarnings();
    expect(totalEarnings).toBe('$600.00'); // 3 * $80 + 2 * $120
    
    const platformFees = await earningsPage.getPlatformFees();
    expect(platformFees).toBe('$48.00'); // 8% of $600
    
    const netEarnings = await earningsPage.getNetEarnings();
    expect(netEarnings).toBe('$552.00'); // $600 - $48
    
    // Verify transactions are displayed
    const transactions = await earningsPage.getTransactionsList();
    expect(transactions.length).toBe(5); // 3 standard + 2 deep cleaning
    
    // Verify first transaction details
    const firstTransaction = transactions[0];
    expect(firstTransaction.service).toContain('Cleaning');
    expect(firstTransaction.status).toBe('Completed');
    
    // Test search functionality
    await earningsPage.searchTransactions('Deep Cleaning');
    const filteredTransactions = await earningsPage.getTransactionsList();
    expect(filteredTransactions.length).toBe(2);
    
    // Test time filter
    await earningsPage.selectTimeFilter('7days');
    await page.waitForTimeout(500); // Wait for filter to apply
    
    // Verify charts are rendered
    await expect(earningsPage.earningsChart).toBeVisible();
    await expect(earningsPage.servicePerformanceChart).toBeVisible();
  });
  
  test('Provider exports transaction data', async ({ page }) => {
    await page.goto('/provider/earnings');
    
    // Mock export API
    await page.route('**/api/stripe/earnings/export', async route => {
      await route.fulfill({
        status: 200,
        body: 'Date,Customer,Service,Amount,Fee,Net,Status\n2024-01-15,John Doe,Standard Cleaning,$80.00,$6.40,$73.60,Completed',
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="transactions.csv"'
        }
      });
    });
    
    // Click export button
    const downloadPromise = page.waitForEvent('download');
    await earningsPage.clickExportButton();
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('transactions');
    expect(download.suggestedFilename()).toContain('.csv');
  });
  
  test('Provider views payout history', async ({ page }) => {
    await page.goto('/provider/earnings');
    
    // Switch to payouts tab
    await earningsPage.clickPayoutsTab();
    
    // Verify payouts section is visible
    await expect(earningsPage.payoutHistory).toBeVisible();
    
    // Mock payout data should be displayed
    const payouts = await earningsPage.getPayoutsList();
    expect(payouts.length).toBeGreaterThan(0);
    
    if (payouts.length > 0) {
      const firstPayout = payouts[0];
      expect(firstPayout.amount).toMatch(/\$\d+\.\d{2}/);
      expect(firstPayout.status).toMatch(/Paid|Pending/);
    }
    
    // Verify payout settings
    await expect(earningsPage.payoutSchedule).toContainText('Daily automatic payouts');
    await expect(earningsPage.bankAccount).toContainText('****');
  });
  
  test('Provider with no earnings sees empty state', async ({ page }) => {
    // Create new provider without earnings
    const newProvider = await testUserHelper.createProvider({
      completedProfile: true
    });
    
    // Login as new provider
    await page.goto('/logout');
    await loginPage.goto();
    await loginPage.login(newProvider.email, 'Test123!');
    
    // Navigate to earnings
    await page.goto('/provider/earnings');
    
    // Should see empty state
    await expect(earningsPage.emptyState).toBeVisible();
    await expect(earningsPage.emptyState).toContainText('No Earnings Yet');
    
    // Should have CTA to create service
    const createServiceButton = page.locator('text=Create Your First Service');
    await expect(createServiceButton).toBeVisible();
    
    // Clean up
    await testUserHelper.deleteUser(newProvider.email);
  });
  
  test('Error handling for failed data fetch', async ({ page }) => {
    // Mock API failure
    await page.route('**/api/stripe/earnings/**', async route => {
      await route.fulfill({
        status: 500,
        json: { error: 'Internal server error' }
      });
    });
    
    await page.goto('/provider/earnings');
    
    // Should show error state
    await expect(earningsPage.errorState).toBeVisible();
    await expect(earningsPage.errorState).toContainText('Unable to Load Earnings');
    
    // Should have retry button
    const retryButton = page.locator('text=Try Again');
    await expect(retryButton).toBeVisible();
    
    // Remove mock and retry
    await page.unroute('**/api/stripe/earnings/**');
    await retryButton.click();
    
    // Should load successfully
    await expect(earningsPage.earningsOverview).toBeVisible();
  });
  
  test('Pagination works correctly for transactions', async ({ page }) => {
    // Create provider with many transactions
    const provider = await testUserHelper.createProvider({
      completedProfile: true
    });
    
    await testDataSeeder.createProviderEarningsData(provider.id, {
      services: [{
        title: 'Test Service',
        price: 5000,
        bookingsCount: 25,
        completedCount: 25
      }]
    });
    
    // Login and navigate to earnings
    await page.goto('/logout');
    await loginPage.goto();
    await loginPage.login(provider.email, 'Test123!');
    await page.goto('/provider/earnings');
    
    // Verify pagination controls
    const paginationInfo = page.locator('[data-testid="pagination-info"]');
    await expect(paginationInfo).toContainText('Showing 1 to 10 of 25');
    
    // Navigate to next page
    await earningsPage.clickNextPage();
    await expect(paginationInfo).toContainText('Showing 11 to 20 of 25');
    
    // Navigate to last page
    await earningsPage.clickNextPage();
    await expect(paginationInfo).toContainText('Showing 21 to 25 of 25');
    
    // Next button should be disabled
    const nextButton = page.locator('[data-testid="next-page-button"]');
    await expect(nextButton).toBeDisabled();
    
    // Navigate back
    await earningsPage.clickPreviousPage();
    await expect(paginationInfo).toContainText('Showing 11 to 20 of 25');
    
    // Clean up
    await testDataSeeder.cleanupProviderData(provider.id);
    await testUserHelper.deleteUser(provider.email);
  });
  
  test('Real-time updates when new booking is completed', async ({ page, context }) => {
    await page.goto('/provider/earnings');
    
    // Get initial transaction count
    const initialTransactions = await earningsPage.getTransactionsList();
    const initialCount = initialTransactions.length;
    
    // Open new tab to simulate customer completing a booking
    const customerPage = await context.newPage();
    const customerHelper = new TestUserHelper();
    const customer = await customerHelper.createCustomer();
    
    // Customer completes a booking
    await testDataSeeder.createCompletedBooking({
      providerId,
      customerId: nullableToString(customer.id),
      serviceTitle: 'New Cleaning Service',
      amount: 10000
    });
    
    // Switch back to provider tab and refresh data
    await page.bringToFront();
    await page.locator('[data-testid="refresh-button"]').click();
    
    // Wait for data to update
    await page.waitForTimeout(1000);
    
    // Verify new transaction appears
    const updatedTransactions = await earningsPage.getTransactionsList();
    expect(updatedTransactions.length).toBe(initialCount + 1);
    
    // Verify new transaction details
    const newTransaction = updatedTransactions[0];
    expect(newTransaction.service).toBe('New Cleaning Service');
    expect(newTransaction.amount).toBe('$100.00');
    
    // Clean up
    await customerPage.close();
    await customerHelper.deleteUser(customer.email);
  });
});