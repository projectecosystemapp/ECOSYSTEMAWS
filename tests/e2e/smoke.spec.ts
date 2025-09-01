import { test, expect } from '@playwright/test';

test.describe('Smoke Test', () => {
  test('Homepage loads', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check that we're on some page (either home or auth redirect)
    const url = page.url();
    expect(url).toBeTruthy();
    
    // Check for any visible content
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
  
  test('Auth page is accessible', async ({ page }) => {
    await page.goto('/auth/sign-in');
    
    // Should have some auth-related content
    const url = page.url();
    expect(url).toContain('auth');
  });
});