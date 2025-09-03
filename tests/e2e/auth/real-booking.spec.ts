import { test, expect } from '@playwright/test';
import { getTestAuthHelper } from '../../helpers/auth.helper';
import { TestDataSeeder } from '../../helpers/test-data.seeder';
import type { TestUser } from '../../helpers/auth.helper';
import { nullableToString, nullableToNumber } from '@/lib/type-utils';

test.describe('Real Booking Flow with Authentication', () => {
  let authHelper: ReturnType<typeof getTestAuthHelper>;
  let customer: TestUser | null = null;
  let provider: TestUser | null = null;
  let dataSeeder: TestDataSeeder | null = null;

  test.beforeAll(async () => {
    authHelper = getTestAuthHelper();
    
    // Skip if auth is not configured
    if (!authHelper.isConfigured()) {
      test.skip();
      return;
    }
    
    // Create test users
    console.log('Creating test users...');
    customer = await authHelper.createTestUser('CUSTOMER');
    provider = await authHelper.createTestUser('PROVIDER');
    
    // Create data seeder with provider auth
    dataSeeder = new TestDataSeeder(provider);
    
    // Create provider profile
    await dataSeeder.createProviderProfile(provider.userId, {
      businessName: 'Test Cleaning Service',
      businessType: 'INDIVIDUAL',
      description: 'Professional cleaning services for testing',
      yearsExperience: 5
    });
    
    // Create some test services
    await dataSeeder.createProviderEarningsData(provider.userId, {
      services: [
        {
          title: 'House Cleaning',
          price: 10000, // $100
          bookingsCount: 0,
          completedCount: 0
        },
        {
          title: 'Deep Cleaning',
          price: 15000, // $150
          bookingsCount: 0,
          completedCount: 0
        }
      ]
    });
    
    console.log('Test data created successfully');
  });

  test.afterAll(async () => {
    // Clean up test data
    if (dataSeeder && provider) {
      await dataSeeder.cleanupProviderData(provider.userId);
    }
    if (dataSeeder && customer) {
      await dataSeeder.cleanupCustomerData(customer.userId);
    }
    
    // Clean up test users (this will be done in global teardown)
    // But we can also do it here for immediate cleanup
    if (authHelper.isConfigured()) {
      await authHelper.cleanup();
    }
  });

  test('Customer can book a service from provider', async ({ page }) => {
    // Skip if not configured
    if (!customer || !provider) {
      test.skip();
      return;
    }

    // Navigate to login page
    await page.goto('/login');
    
    // Login as customer
    await page.fill('input[type="email"]', customer.email);
    await page.fill('input[type="password"]', customer.password);
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard/**', { timeout: 10000 });
    
    // Navigate to services/search
    await page.goto('/services');
    
    // Search for the provider's service
    await page.fill('input[placeholder*="Search"]', 'House Cleaning');
    await page.press('input[placeholder*="Search"]', 'Enter');
    
    // Click on the first service
    await page.click('.service-card:first-child');
    
    // Book the service
    await page.click('button:has-text("Book Now")');
    
    // Fill booking details
    await page.selectOption('select[name="date"]', { index: 1 }); // Select first available date
    await page.selectOption('select[name="time"]', { index: 1 }); // Select first available time
    await page.fill('textarea[name="notes"]', 'Test booking via E2E test');
    
    // Submit booking
    await page.click('button:has-text("Confirm Booking")');
    
    // Wait for success message
    await expect(page.locator('.success-message')).toContainText('Booking confirmed');
    
    // Verify booking appears in customer's bookings
    await page.goto('/bookings');
    await expect(page.locator('.booking-card')).toHaveCount(1);
    await expect(page.locator('.booking-card')).toContainText('House Cleaning');
  });

  test('Provider can view their bookings', async ({ page }) => {
    // Skip if not configured
    if (!provider) {
      test.skip();
      return;
    }

    // Login as provider
    await page.goto('/login');
    await page.fill('input[type="email"]', provider.email);
    await page.fill('input[type="password"]', provider.password);
    await page.click('button[type="submit"]');
    
    // Wait for redirect to provider dashboard
    await page.waitForURL('**/provider/dashboard', { timeout: 10000 });
    
    // Navigate to bookings
    await page.goto('/provider/bookings');
    
    // Verify provider can see their services
    await expect(page.locator('.service-listing')).toContainText('House Cleaning');
    await expect(page.locator('.service-listing')).toContainText('Deep Cleaning');
  });

  test('Can create booking via API with authentication', async () => {
    // Skip if not configured
    if (!customer || !provider || !dataSeeder) {
      test.skip();
      return;
    }

    // Switch data seeder to use customer auth
    dataSeeder.updateAuth(customer);
    
    // Create a booking as the customer
    const booking = await dataSeeder.createCompletedBooking({
      providerId: nullableToString(provider.userId),
      customerId: nullableToString(customer.userId),
      serviceTitle: 'API Test Service',
      amount: 5000 // $50
    });
    
    expect(booking.bookingId).toBeTruthy();
    expect(booking.serviceId).toBeTruthy();
    
    // Clean up the test booking
    await dataSeeder.cleanupCustomerData(customer.userId);
  });
});

test.describe('Authentication Error Handling', () => {
  test('Shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText(/invalid|incorrect|wrong/i);
  });

  test('Redirects to login when accessing protected route', async ({ page }) => {
    // Try to access provider dashboard without login
    await page.goto('/provider/dashboard');
    
    // Should redirect to login
    await page.waitForURL('**/login**');
    expect(page.url()).toContain('/login');
  });
});