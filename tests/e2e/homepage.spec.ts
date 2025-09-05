import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the homepage', async ({ page }) => {
    // Check if the page loads without errors
    await expect(page).toHaveTitle(/Marketplace/i);
  });

  test('should have main navigation', async ({ page }) => {
    // Check for navigation elements that should be present
    // Update these selectors based on your actual navigation structure
    const navigation = page.locator('nav');
    await expect(navigation).toBeVisible();
  });

  test('should display hero section', async ({ page }) => {
    // Check for hero section or main content
    // Update this selector based on your actual homepage structure
    const heroSection = page.locator('main').first();
    await expect(heroSection).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check that the page still renders correctly on mobile
    await expect(page.locator('body')).toBeVisible();
    
    // Check that navigation is mobile-friendly (you may need to adjust selectors)
    const mobileNav = page.locator('[data-testid="mobile-menu"], .mobile-menu, nav');
    await expect(mobileNav).toBeVisible();
  });

  test('should have accessible navigation', async ({ page }) => {
    // Check for basic accessibility features
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();

    // Verify keyboard navigation works
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should load without JavaScript errors', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter out known acceptable errors (like network requests to localhost in tests)
    const criticalErrors = errors.filter(error => 
      !error.includes('net::ERR_') && 
      !error.includes('localhost') &&
      !error.includes('127.0.0.1')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});