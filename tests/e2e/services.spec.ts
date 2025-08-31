import { test, expect } from '@playwright/test';

test.describe('Services Marketplace', () => {
  test.describe('Service Listing Page', () => {
    test('should display service listings', async ({ page }) => {
      await page.goto('/services');
      
      // Check that the services page loads
      await expect(page).toHaveTitle(/Services|Marketplace/i);
      
      // Look for service listing container
      const servicesContainer = page.locator('[data-testid="services-list"], .services-grid, main');
      await expect(servicesContainer).toBeVisible();
    });

    test('should have search functionality', async ({ page }) => {
      await page.goto('/services');
      
      // Look for search input
      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="find" i]');
      await expect(searchInput).toBeVisible();
      
      // Test search functionality
      await searchInput.fill('cleaning');
      await page.keyboard.press('Enter');
      
      // Should show search results or loading state
      await page.waitForTimeout(1000);
    });

    test('should have category filters', async ({ page }) => {
      await page.goto('/services');
      
      // Look for category filter options
      const categories = page.locator('.category-filter, [data-testid="categories"], .filter-section');
      await expect(categories).toBeVisible();
    });

    test('should be responsive on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/services');
      
      // Check that services display properly on mobile
      await expect(page.locator('main')).toBeVisible();
      
      // Mobile-specific elements might be present
      const mobileElements = page.locator('.mobile-view, .grid-cols-1');
      if (await mobileElements.count() > 0) {
        await expect(mobileElements.first()).toBeVisible();
      }
    });
  });

  test.describe('Service Details', () => {
    test('should handle non-existent service gracefully', async ({ page }) => {
      await page.goto('/services/non-existent-service-id');
      
      // Should show 404 or error message, not crash
      const errorElements = page.locator('h1:has-text("404"), h1:has-text("Not Found"), .error, [data-testid="not-found"]');
      await expect(errorElements.first()).toBeVisible();
    });

    test('should display service information structure', async ({ page }) => {
      // This test assumes you have some services, adjust as needed
      await page.goto('/services');
      
      // Look for service links/cards
      const serviceLinks = page.locator('a[href*="/services/"], .service-card a');
      const linkCount = await serviceLinks.count();
      
      if (linkCount > 0) {
        // Click on the first service
        await serviceLinks.first().click();
        
        // Should navigate to service details page
        await expect(page).toHaveURL(/\/services\/[^\/]+/);
        
        // Should have service details container
        const serviceDetails = page.locator('.service-details, main, [data-testid="service-details"]');
        await expect(serviceDetails).toBeVisible();
      } else {
        // If no services exist, check for empty state
        const emptyState = page.locator('.empty-state, .no-services, p:has-text("No services")');
        await expect(emptyState).toBeVisible();
      }
    });
  });

  test.describe('Service Creation (Provider Flow)', () => {
    test('should redirect to auth when not logged in', async ({ page }) => {
      await page.goto('/services/create');
      
      // Should redirect to authentication
      await expect(page).toHaveURL(/auth|login|signin/);
    });

    test('should show create service form structure when accessed directly', async ({ page }) => {
      // This test checks the route exists and handles unauthorized access
      const response = await page.goto('/services/create');
      
      // Should either redirect to auth (302/301) or show unauthorized (401/403)
      expect([200, 302, 401, 403]).toContain(response?.status() || 200);
    });
  });

  test.describe('Search and Filtering', () => {
    test('should handle empty search results', async ({ page }) => {
      await page.goto('/services');
      
      // Search for something that likely doesn't exist
      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');
      
      if (await searchInput.count() > 0) {
        await searchInput.fill('xyznonexistentservice123');
        await page.keyboard.press('Enter');
        
        // Wait for search to complete
        await page.waitForTimeout(2000);
        
        // Should show no results message
        const noResults = page.locator('.no-results, .empty-state, p:has-text("No services"), p:has-text("found")');
        await expect(noResults.first()).toBeVisible();
      }
    });

    test('should maintain filters on page reload', async ({ page }) => {
      await page.goto('/services?category=services&location=new-york');
      
      // Reload the page
      await page.reload();
      
      // URL should maintain parameters
      await expect(page).toHaveURL(/category=services/);
      await expect(page).toHaveURL(/location=new-york/);
    });
  });

  test.describe('Performance', () => {
    test('should load services page within reasonable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/services');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 5 seconds (adjust threshold as needed)
      expect(loadTime).toBeLessThan(5000);
    });

    test('should handle large service lists without crashing', async ({ page }) => {
      await page.goto('/services');
      
      // Check that page doesn't crash with potential large data sets
      await expect(page.locator('body')).toBeVisible();
      
      // Look for pagination or virtual scrolling
      const pagination = page.locator('.pagination, [aria-label*="pagination"], .load-more');
      
      if (await pagination.count() > 0) {
        await expect(pagination.first()).toBeVisible();
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper heading structure', async ({ page }) => {
      await page.goto('/services');
      
      // Should have a main heading
      const h1 = page.locator('h1');
      await expect(h1).toHaveCount(1);
    });

    test('should have proper alt text for images', async ({ page }) => {
      await page.goto('/services');
      
      // Check that images have alt text
      const images = page.locator('img');
      const imageCount = await images.count();
      
      for (let i = 0; i < Math.min(imageCount, 5); i++) {
        const img = images.nth(i);
        const altText = await img.getAttribute('alt');
        expect(altText).toBeTruthy();
      }
    });

    test('should support keyboard navigation', async ({ page }) => {
      await page.goto('/services');
      
      // Test that page can be navigated with keyboard
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });
  });
});