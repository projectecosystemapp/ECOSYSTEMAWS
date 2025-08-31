import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.describe('Sign Up', () => {
    test('should display sign up form', async ({ page }) => {
      await page.goto('/auth/signup');
      
      // Check for sign up form elements
      await expect(page.locator('form')).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
    });

    test('should show validation errors for invalid email', async ({ page }) => {
      await page.goto('/auth/signup');
      
      // Try to submit with invalid email
      await page.fill('input[type="email"]', 'invalid-email');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      // Should show validation error
      const errorMessage = page.locator('.error, [role="alert"], .text-red-500');
      await expect(errorMessage).toBeVisible();
    });

    test('should show validation errors for weak password', async ({ page }) => {
      await page.goto('/auth/signup');
      
      // Try to submit with weak password
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', '123');
      await page.click('button[type="submit"]');
      
      // Should show validation error for password
      const errorMessage = page.locator('.error, [role="alert"], .text-red-500');
      await expect(errorMessage).toBeVisible();
    });
  });

  test.describe('Sign In', () => {
    test('should display sign in form', async ({ page }) => {
      await page.goto('/auth/signin');
      
      // Check for sign in form elements
      await expect(page.locator('form')).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/auth/signin');
      
      // Try to sign in with invalid credentials
      await page.fill('input[type="email"]', 'nonexistent@example.com');
      await page.fill('input[type="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');
      
      // Should show error message
      await expect(page.locator('.error, [role="alert"], .text-red-500')).toBeVisible();
    });

    test('should have forgot password link', async ({ page }) => {
      await page.goto('/auth/signin');
      
      // Check for forgot password link
      const forgotPasswordLink = page.locator('a[href*="forgot"], a[href*="reset"]');
      await expect(forgotPasswordLink).toBeVisible();
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect to sign in when accessing protected route', async ({ page }) => {
      // Try to access a protected route (adjust URL based on your app)
      await page.goto('/dashboard');
      
      // Should redirect to sign in page
      await expect(page).toHaveURL(/auth|login|signin/);
    });

    test('should redirect to sign in when accessing provider routes', async ({ page }) => {
      // Try to access provider-specific routes
      await page.goto('/provider/dashboard');
      
      // Should redirect to sign in page
      await expect(page).toHaveURL(/auth|login|signin/);
    });
  });

  test.describe('Social Authentication', () => {
    test('should have social login options', async ({ page }) => {
      await page.goto('/auth/signin');
      
      // Check for social login buttons (adjust selectors based on your implementation)
      const socialButtons = page.locator('button[data-provider], .social-login button, [data-testid*="social"]');
      
      // There should be at least one social login option
      const count = await socialButtons.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper form labels', async ({ page }) => {
      await page.goto('/auth/signin');
      
      // Check that form inputs have proper labels
      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');
      
      await expect(emailInput).toHaveAttribute('aria-label');
      await expect(passwordInput).toHaveAttribute('aria-label');
    });

    test('should support keyboard navigation', async ({ page }) => {
      await page.goto('/auth/signin');
      
      // Test keyboard navigation through form
      await page.keyboard.press('Tab');
      let focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
      
      await page.keyboard.press('Tab');
      focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
      
      await page.keyboard.press('Tab');
      focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });
  });
});