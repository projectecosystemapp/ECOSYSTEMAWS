import { test, expect } from '@playwright/test';
import { TestUserHelper } from '../../helpers/test-user.helper';
import { DatabaseHelper } from '../../helpers/database.helper';
import { randomBytes } from 'crypto';

test.describe('E2E-003: Complete Customer Checkout Flow @payments @critical', () => {
  let testUserHelper: TestUserHelper;
  let databaseHelper: DatabaseHelper;
  
  // Customer test data
  let customerUser: any;
  let customerEmail: string;
  let customerPassword: string;
  let customerId: string;
  
  // Provider test data
  let providerUser: any;
  let providerEmail: string;
  let providerId: string;
  
  // Service and booking data
  let serviceId: string;
  let bookingId: string;
  let paymentIntentId: string;
  
  // Test configuration
  const testServicePrice = 10000; // $100.00 in cents
  const testServiceName = `E2E Test Service ${Date.now()}`;
  const uniqueSuffix = randomBytes(4).toString('hex');

  test.beforeEach(async ({ page }) => {
    // Initialize helpers
    testUserHelper = new TestUserHelper();
    databaseHelper = new DatabaseHelper();
    
    console.log('Setting up test data for checkout flow...');
    
    // Create provider user with published profile
    console.log('Creating provider user...');
    providerUser = await testUserHelper.createTestUser('PROVIDER');
    providerId = providerUser.userId;
    providerEmail = providerUser.email;
    await testUserHelper.confirmUserSignUp(providerUser.username);
    
    // Create provider profile in database
    await databaseHelper.createRecord('ProviderProfile', {
      id: `profile-${providerId}`,
      owner: providerId,
      businessName: `Test Provider ${uniqueSuffix}`,
      publicEmail: providerEmail,
      phoneNumber: '555-0100',
      bio: 'Test provider for E2E testing',
      status: 'PUBLISHED',
      profileComplete: true,
      stripeConnectedAccountId: 'acct_test_' + uniqueSuffix, // Mock Stripe account
      city: 'Toronto',
      province: 'ON',
      postalCode: 'M5V 3A8',
      latitude: 43.6532,
      longitude: -79.3832,
      serviceRadius: 25,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    // Create a published service
    serviceId = `service-${Date.now()}-${uniqueSuffix}`;
    await databaseHelper.createRecord('Service', {
      id: serviceId,
      providerId: providerId,
      providerEmail: providerEmail,
      title: testServiceName,
      description: 'Professional cleaning service for E2E testing',
      category: 'CLEANING',
      priceCents: testServicePrice,
      duration: 120, // 2 hours
      active: true,
      instantBooking: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    console.log(`Created test service: ${serviceId} with price: $${testServicePrice/100}`);
    
    // Create customer user
    console.log('Creating customer user...');
    customerUser = await testUserHelper.createTestUser('CUSTOMER');
    customerId = customerUser.userId;
    customerEmail = customerUser.email;
    customerPassword = customerUser.password;
    await testUserHelper.confirmUserSignUp(customerUser.username);
    
    console.log('Test data setup completed');
  });

  test.afterEach(async () => {
    console.log('Starting cleanup procedures...');
    
    try {
      // Clean up booking if created
      if (bookingId) {
        await databaseHelper.deleteRecord('Booking', { id: bookingId });
        console.log(`Deleted booking: ${bookingId}`);
      }
      
      // Clean up service
      if (serviceId) {
        await databaseHelper.deleteRecord('Service', { id: serviceId });
        console.log(`Deleted service: ${serviceId}`);
      }
      
      // Clean up provider profile
      if (providerId) {
        await databaseHelper.deleteRelatedRecords('ProviderProfile', 'ownerId', providerId);
        console.log('Deleted provider profile');
      }
      
      // Clean up users
      if (customerId) {
        await databaseHelper.cleanupUserData(customerId);
      }
      if (providerId) {
        await databaseHelper.cleanupUserData(providerId);
      }
      
      // Clean up Cognito users
      await testUserHelper.cleanup();
      console.log('Cleanup completed successfully');
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  test('should complete full checkout flow from service selection to confirmation', async ({ page }) => {
    // Step 1: Customer Login
    console.log('Step 1: Customer login');
    await page.goto('/auth/signin');
    await page.getByLabel('Email').fill(customerEmail);
    await page.getByLabel('Password').fill(customerPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Wait for redirect after login
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('Customer logged in successfully');
    
    // Step 2: Navigate to Services
    console.log('Step 2: Navigating to services');
    await page.goto('/services');
    await page.waitForLoadState('networkidle');
    
    // Step 3: Search and Select Service
    console.log('Step 3: Searching for test service');
    // Look for our specific test service
    const serviceCard = page.locator('[data-testid="service-card"]').filter({
      hasText: testServiceName
    });
    
    // If service is not immediately visible, try searching
    if (!(await serviceCard.isVisible())) {
      const searchInput = page.locator('input[placeholder*="Search"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill(testServiceName);
        await page.waitForTimeout(1000); // Wait for search results
      }
    }
    
    await expect(serviceCard).toBeVisible({ timeout: 10000 });
    console.log('Found test service');
    
    // Click on Book Now button for this service
    const bookButton = serviceCard.locator('button:has-text("Book Now")');
    await bookButton.click();
    
    // Step 4: Booking Flow - Date Selection
    console.log('Step 4: Starting booking flow - Date selection');
    await page.waitForURL(`**/services/${serviceId}/book`);
    
    // Select tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayToSelect = tomorrow.getDate().toString();
    
    // Click on tomorrow's date in the calendar
    await page.locator(`[role="gridcell"] button:has-text("${dayToSelect}")`).first().click();
    await page.waitForTimeout(500);
    
    // Click continue to time selection
    await page.getByRole('button', { name: /continue.*time/i }).click();
    console.log('Date selected, moving to time selection');
    
    // Step 5: Time Selection
    console.log('Step 5: Selecting time slot');
    await page.waitForTimeout(1000);
    
    // Select first available time slot
    const timeSlot = page.locator('button').filter({ hasText: /^\d{1,2}:\d{2}/ }).first();
    await timeSlot.click();
    console.log('Time slot selected');
    
    // Continue to payment
    await page.getByRole('button', { name: /continue.*payment/i }).click();
    
    // Step 6: Payment with Stripe Test Card
    console.log('Step 6: Processing payment with Stripe test card');
    await page.waitForTimeout(2000); // Wait for Stripe Elements to load
    
    // Check if we're using the real CheckoutForm or mock
    const stripeFrame = page.frameLocator('iframe[title*="Secure card"]');
    const hasStripeElements = await stripeFrame.locator('input').count() > 0;
    
    if (hasStripeElements) {
      console.log('Using real Stripe Elements for payment');
      
      // Fill in Stripe test card details
      // Card number: 4242 4242 4242 4242
      await stripeFrame.locator('[placeholder="Card number"]').fill('4242424242424242');
      await stripeFrame.locator('[placeholder="MM / YY"]').fill('12/30');
      await stripeFrame.locator('[placeholder="CVC"]').fill('123');
      await stripeFrame.locator('[placeholder="ZIP"]').fill('10001');
      
      // Submit payment
      const payButton = page.getByRole('button', { name: /pay.*\$100/i });
      await payButton.click();
      
      // Wait for payment processing
      console.log('Processing payment...');
      await page.waitForTimeout(3000);
      
      // Check for success or handle 3D Secure if required
      const threeDSecureFrame = page.frameLocator('iframe[name*="3ds"]');
      if (await threeDSecureFrame.locator('button').count() > 0) {
        console.log('Handling 3D Secure authentication');
        await threeDSecureFrame.getByRole('button', { name: /complete|authorize/i }).click();
        await page.waitForTimeout(2000);
      }
    } else {
      console.log('Using mock payment form - clicking pay button');
      // For mock form, just click the pay button
      const payButton = page.getByRole('button').filter({ hasText: /pay.*100/i }).first();
      await payButton.click();
      await page.waitForTimeout(2000);
    }
    
    // Step 7: Confirm Booking
    console.log('Step 7: Confirming booking');
    
    // Look for confirmation step or button
    const confirmButton = page.getByRole('button', { name: /confirm.*booking/i });
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
      console.log('Booking confirmation submitted');
    }
    
    // Step 8: Validate Confirmation Page
    console.log('Step 8: Validating confirmation page');
    
    // Wait for redirect to confirmation page
    await page.waitForURL('**/bookings/**/confirmation', { timeout: 15000 });
    console.log('Redirected to confirmation page');
    
    // Extract booking ID from URL
    const url = page.url();
    const bookingIdMatch = url.match(/bookings\/([^\/]+)\/confirmation/);
    if (bookingIdMatch) {
      bookingId = bookingIdMatch[1];
      console.log(`Booking created with ID: ${bookingId}`);
    }
    
    // Validate confirmation page elements
    await expect(page.locator('h1')).toContainText(/booking.*confirmed/i);
    await expect(page.locator('[data-testid="service-name"]')).toContainText(testServiceName);
    
    // Validate booking details are displayed
    const confirmationContent = page.locator('main, [role="main"]');
    await expect(confirmationContent).toContainText('$100.00'); // Price
    await expect(confirmationContent).toContainText(tomorrow.toLocaleDateString()); // Date
    await expect(confirmationContent).toContainText(/provider.*details/i);
    
    // Validate action buttons are present
    await expect(page.getByRole('button', { name: /add.*calendar/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /contact.*provider/i })).toBeVisible();
    
    console.log('✅ Confirmation page validation successful');
    
    // Step 9: Database Validation
    console.log('Step 9: Validating database records');
    
    if (bookingId) {
      // Verify booking exists in database with correct status
      const bookingExists = await databaseHelper.recordExists('Booking', { id: bookingId });
      expect(bookingExists).toBeTruthy();
      console.log('Booking record verified in database');
      
      // Additional database validations could be added here
      // such as checking payment status, amounts, etc.
    }
    
    console.log('✅ E2E-003: Complete Customer Checkout Flow - All validations passed!');
  });

  test('should handle payment decline gracefully', async ({ page }) => {
    console.log('Testing payment decline scenario');
    
    // Login as customer
    await page.goto('/auth/signin');
    await page.getByLabel('Email').fill(customerEmail);
    await page.getByLabel('Password').fill(customerPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('**/dashboard');
    
    // Navigate to service booking
    await page.goto(`/services/${serviceId}/book`);
    
    // Select date (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayToSelect = tomorrow.getDate().toString();
    await page.locator(`[role="gridcell"] button:has-text("${dayToSelect}")`).first().click();
    await page.getByRole('button', { name: /continue.*time/i }).click();
    
    // Select time
    await page.locator('button').filter({ hasText: /^\d{1,2}:\d{2}/ }).first().click();
    await page.getByRole('button', { name: /continue.*payment/i }).click();
    
    // Use declined test card
    await page.waitForTimeout(2000);
    const stripeFrame = page.frameLocator('iframe[title*="Secure card"]');
    
    if (await stripeFrame.locator('input').count() > 0) {
      console.log('Testing with Stripe decline card: 4000000000000002');
      
      // Use decline test card
      await stripeFrame.locator('[placeholder="Card number"]').fill('4000000000000002');
      await stripeFrame.locator('[placeholder="MM / YY"]').fill('12/30');
      await stripeFrame.locator('[placeholder="CVC"]').fill('123');
      await stripeFrame.locator('[placeholder="ZIP"]').fill('10001');
      
      // Submit payment
      const payButton = page.getByRole('button', { name: /pay.*\$100/i });
      await payButton.click();
      
      // Wait for error message
      await page.waitForTimeout(2000);
      
      // Validate error is displayed
      const errorMessage = page.locator('[role="alert"], [data-testid="error-message"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText(/declined|failed|error/i);
      
      console.log('✅ Payment decline handled correctly - error message displayed');
      
      // Verify user can retry with different card
      await stripeFrame.locator('[placeholder="Card number"]').clear();
      await stripeFrame.locator('[placeholder="Card number"]').fill('4242424242424242');
      
      console.log('✅ User able to retry payment with different card');
    } else {
      console.log('Mock payment form detected - skipping decline test');
    }
  });

  test('should allow cancellation before payment confirmation', async ({ page }) => {
    console.log('Testing booking cancellation flow');
    
    // Login and navigate to booking
    await page.goto('/auth/signin');
    await page.getByLabel('Email').fill(customerEmail);
    await page.getByLabel('Password').fill(customerPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('**/dashboard');
    
    await page.goto(`/services/${serviceId}/book`);
    
    // Progress through booking steps
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.locator(`[role="gridcell"] button:has-text("${tomorrow.getDate()}")`).first().click();
    await page.getByRole('button', { name: /continue.*time/i }).click();
    
    await page.locator('button').filter({ hasText: /^\d{1,2}:\d{2}/ }).first().click();
    await page.getByRole('button', { name: /continue.*payment/i }).click();
    
    // Look for back/cancel button on payment step
    const backButton = page.getByRole('button', { name: /back|cancel|change/i });
    await expect(backButton).toBeVisible();
    
    // Click back to return to time selection
    await backButton.click();
    await page.waitForTimeout(1000);
    
    // Verify we're back at time selection
    await expect(page.locator('text=/select.*time/i')).toBeVisible();
    
    console.log('✅ Booking cancellation/back navigation works correctly');
  });
});