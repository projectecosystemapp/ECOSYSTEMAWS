import { expect } from '@playwright/test';

/**
 * Custom assertions for Ecosystem platform testing
 */
export const customExpect = {
  /**
   * Assert that a user is logged in
   */
  async toBeLoggedIn(page: any) {
    // Check for auth cookie or token
    const cookies = await page.context().cookies();
    const authCookie = cookies.find((c: any) => c.name.includes('cognito'));
    expect(authCookie).toBeTruthy();
    
    // Check for user menu or dashboard elements
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible({ timeout: 5000 });
  },

  /**
   * Assert that a user is on the correct dashboard
   */
  async toBeOnDashboard(page: any, role: 'customer' | 'provider') {
    const expectedUrl = role === 'provider' ? '/provider/dashboard' : '/dashboard';
    await expect(page).toHaveURL(new RegExp(expectedUrl));
  },

  /**
   * Assert that a form has validation errors
   */
  async toHaveFormErrors(page: any, fieldNames: string[]) {
    for (const fieldName of fieldNames) {
      const errorMessage = page.locator(`[data-testid="${fieldName}-error"]`);
      await expect(errorMessage).toBeVisible();
    }
  },

  /**
   * Assert that a toast notification appears
   */
  async toShowToast(page: any, message: string) {
    const toast = page.locator('[role="alert"]').filter({ hasText: message });
    await expect(toast).toBeVisible({ timeout: 5000 });
  },

  /**
   * Assert that a Stripe element is loaded
   */
  async toHaveStripeElement(page: any) {
    // Wait for Stripe iframe to load
    const stripeFrame = page.frameLocator('iframe[name*="stripe"]').first();
    await expect(stripeFrame.locator('input')).toBeVisible({ timeout: 10000 });
  },

  /**
   * Assert profile completion percentage
   */
  async toHaveProfileCompletion(page: any, minPercentage: number) {
    const progressText = await page.locator('[data-testid="profile-completion"]').textContent();
    const percentage = parseInt(progressText?.match(/\d+/)?.[0] || '0');
    expect(percentage).toBeGreaterThanOrEqual(minPercentage);
  },

  /**
   * Assert that a booking status is correct
   */
  async toHaveBookingStatus(page: any, bookingId: string, status: string) {
    const statusBadge = page.locator(`[data-booking-id="${bookingId}"] [data-testid="status-badge"]`);
    await expect(statusBadge).toHaveText(status);
  },

  /**
   * Assert that payment was successful
   */
  async toShowPaymentSuccess(page: any) {
    const successMessage = page.locator('[data-testid="payment-success"]');
    await expect(successMessage).toBeVisible({ timeout: 10000 });
    
    // Check for success icon or checkmark
    const successIcon = page.locator('[data-testid="success-icon"]');
    await expect(successIcon).toBeVisible();
  },

  /**
   * Assert that an element is loading
   */
  async toBeLoading(page: any, selector: string) {
    const element = page.locator(selector);
    await expect(element).toHaveAttribute('aria-busy', 'true');
  },

  /**
   * Assert that search results are displayed
   */
  async toShowSearchResults(page: any, minCount: number = 1) {
    const results = page.locator('[data-testid="search-result"]');
    await expect(results).toHaveCount(minCount, { timeout: 10000 });
  },
};