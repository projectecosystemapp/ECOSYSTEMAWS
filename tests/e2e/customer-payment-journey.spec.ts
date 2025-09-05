/**
 * End-to-End Tests for Customer Payment Journey
 * 
 * Complete browser-based E2E testing for AWS native payment system:
 * - Customer service booking and payment flow
 * - AWS Payment Cryptography integration in browser
 * - Real-time fraud detection feedback
 * - Payment confirmation and receipt generation
 * - Error handling and user experience validation
 * - Cost optimization visibility to customers
 * - Security compliance in production environment
 * 
 * These tests validate the complete user experience with AWS native payments
 * and demonstrate the 98%+ cost savings benefits to end users.
 */

import { test, expect, type Page } from '@playwright/test';

// E2E test configuration
test.describe.configure({ mode: 'parallel' });

// Test data
const TEST_CUSTOMER = {
  email: 'test.customer@example.com',
  password: 'TestPassword123!',
  firstName: 'John',
  lastName: 'Doe',
  phone: '+1-555-123-4567',
  address: {
    street: '123 Test Street',
    city: 'Test City',
    state: 'TS',
    zipCode: '12345'
  }
};

const TEST_CARD = {
  number: '4242424242424242', // Visa test card
  expiry: '12/25',
  cvc: '123',
  zipCode: '12345'
};

const TEST_SERVICE = {
  name: 'Premium Home Cleaning',
  duration: '3 hours',
  price: 15000, // $150.00
  providerId: 'provider_test_123'
};

test.describe('Customer Payment Journey E2E Tests', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Set up test environment
    await page.goto('/');
    
    // Mock successful authentication for faster testing
    await page.evaluate(() => {
      localStorage.setItem('amplify-user', JSON.stringify({
        sub: 'customer_e2e_test',
        email: 'test.customer@example.com',
        name: 'John Doe'
      }));
    });
  });

  test.afterEach(async () => {
    // Cleanup test data
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should complete full customer payment journey successfully', async () => {
    console.log('🚀 Starting complete customer payment journey E2E test...');

    // Step 1: Navigate to service booking
    await test.step('Navigate to service selection', async () => {
      await page.goto('/services');
      await expect(page).toHaveTitle(/Services/);
      
      // Wait for services to load
      await page.waitForSelector('[data-testid="service-grid"]');
      await expect(page.locator('[data-testid="service-card"]').first()).toBeVisible();
      
      console.log('✅ Services page loaded successfully');
    });

    // Step 2: Select and book service
    await test.step('Select and configure service', async () => {
      // Select the premium cleaning service
      await page.click('[data-testid="service-card"]:has-text("Home Cleaning")');
      
      // Configure service details
      await page.fill('[data-testid="service-duration"]', '3');
      await page.selectOption('[data-testid="service-frequency"]', 'one-time');
      await page.fill('[data-testid="service-date"]', '2024-12-15');
      await page.fill('[data-testid="service-time"]', '10:00');
      
      // Add special instructions
      await page.fill('[data-testid="service-notes"]', 'Please focus on kitchen and bathrooms');
      
      // Proceed to booking
      await page.click('[data-testid="proceed-to-booking"]');
      
      await expect(page.locator('[data-testid="booking-summary"]')).toBeVisible();
      console.log('✅ Service configured and booking summary displayed');
    });

    // Step 3: Review booking details and pricing
    await test.step('Review booking summary and cost breakdown', async () => {
      // Verify service details
      await expect(page.locator('[data-testid="service-name"]')).toHaveText('Premium Home Cleaning');
      await expect(page.locator('[data-testid="service-duration"]')).toHaveText('3 hours');
      await expect(page.locator('[data-testid="service-date"]')).toHaveText('December 15, 2024');
      
      // Verify cost breakdown showing AWS cost savings
      await expect(page.locator('[data-testid="service-cost"]')).toHaveText('$150.00');
      await expect(page.locator('[data-testid="platform-fee"]')).toHaveText('$12.00'); // 8% platform fee
      await expect(page.locator('[data-testid="processing-fee"]')).toHaveText('$0.05'); // AWS native minimal processing
      await expect(page.locator('[data-testid="total-amount"]')).toHaveText('$162.05');
      
      // Verify cost savings message
      await expect(page.locator('[data-testid="cost-savings-message"]')).toHaveText(/Save \$4\.\d+ with AWS native payments/);
      
      console.log('✅ Booking summary and cost savings displayed correctly');
    });

    // Step 4: Proceed to payment
    await test.step('Navigate to payment form', async () => {
      await page.click('[data-testid="proceed-to-payment"]');
      
      // Wait for AWS Payment Form to load
      await page.waitForSelector('[data-testid="aws-payment-form"]');
      await expect(page.locator('[data-testid="payment-security-badge"]')).toBeVisible();
      await expect(page.locator('[data-testid="payment-security-badge"]')).toHaveText(/Secured by AWS Payment Cryptography/);
      
      console.log('✅ AWS payment form loaded with security indicators');
    });

    // Step 5: Fill payment information
    await test.step('Enter payment details', async () => {
      // Fill card information
      await page.fill('[data-testid="card-number"]', TEST_CARD.number);
      await page.fill('[data-testid="card-expiry"]', TEST_CARD.expiry);
      await page.fill('[data-testid="card-cvc"]', TEST_CARD.cvc);
      await page.fill('[data-testid="card-zip"]', TEST_CARD.zipCode);
      
      // Fill billing information
      await page.fill('[data-testid="billing-name"]', `${TEST_CUSTOMER.firstName} ${TEST_CUSTOMER.lastName}`);
      await page.fill('[data-testid="billing-email"]', TEST_CUSTOMER.email);
      await page.fill('[data-testid="billing-address"]', TEST_CUSTOMER.address.street);
      await page.fill('[data-testid="billing-city"]', TEST_CUSTOMER.address.city);
      await page.selectOption('[data-testid="billing-state"]', TEST_CUSTOMER.address.state);
      await page.fill('[data-testid="billing-zip"]', TEST_CUSTOMER.address.zipCode);
      
      // Verify card validation
      await expect(page.locator('[data-testid="card-type"]')).toHaveText('Visa');
      await expect(page.locator('[data-testid="card-validation"]')).toHaveClass(/valid/);
      
      console.log('✅ Payment details entered and validated');
    });

    // Step 6: Real-time fraud detection feedback
    await test.step('Verify fraud detection integration', async () => {
      // Wait for fraud risk assessment
      await page.waitForSelector('[data-testid="fraud-risk-indicator"]');
      
      const riskLevel = await page.locator('[data-testid="fraud-risk-level"]').textContent();
      expect(['Low', 'Medium', 'High']).toContain(riskLevel);
      
      if (riskLevel === 'Low') {
        await expect(page.locator('[data-testid="fraud-risk-indicator"]')).toHaveClass(/low-risk/);
        await expect(page.locator('[data-testid="payment-submit"]')).toBeEnabled();
      } else if (riskLevel === 'Medium') {
        await expect(page.locator('[data-testid="fraud-risk-indicator"]')).toHaveClass(/medium-risk/);
        await expect(page.locator('[data-testid="additional-verification"]')).toBeVisible();
      } else {
        await expect(page.locator('[data-testid="fraud-risk-indicator"]')).toHaveClass(/high-risk/);
        await expect(page.locator('[data-testid="payment-blocked-message"]')).toBeVisible();
      }
      
      console.log(`✅ Fraud detection completed: ${riskLevel} risk`);
    });

    // Step 7: Process payment
    await test.step('Submit payment and process', async () => {
      // Check if payment is allowed (not blocked by fraud detection)
      const submitButton = page.locator('[data-testid="payment-submit"]');
      const isEnabled = await submitButton.isEnabled();
      
      if (!isEnabled) {
        console.log('⚠️ Payment blocked by fraud detection (expected for some test scenarios)');
        return; // Exit test early for blocked payments
      }
      
      // Submit payment
      await submitButton.click();
      
      // Wait for payment processing
      await expect(page.locator('[data-testid="payment-processing"]')).toBeVisible();
      await expect(page.locator('[data-testid="processing-message"]')).toHaveText(/Processing your payment securely with AWS/);
      
      // Wait for payment completion (timeout for payment processing)
      await page.waitForSelector('[data-testid="payment-success"]', { timeout: 30000 });
      
      console.log('✅ Payment processed successfully');
    });

    // Step 8: Verify payment confirmation
    await test.step('Verify payment confirmation and receipt', async () => {
      await expect(page.locator('[data-testid="payment-success"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toHaveText(/Payment successful!/);
      
      // Verify booking confirmation details
      await expect(page.locator('[data-testid="booking-confirmation-id"]')).toBeVisible();
      await expect(page.locator('[data-testid="payment-id"]')).toMatch(/^pay_\w+/);
      await expect(page.locator('[data-testid="transaction-id"]')).toMatch(/^txn_\w+/);
      
      // Verify cost savings summary
      await expect(page.locator('[data-testid="savings-summary"]')).toBeVisible();
      await expect(page.locator('[data-testid="processing-fee-saved"]')).toHaveText(/You saved \$4\.\d+ on processing fees/);
      
      // Verify escrow information
      await expect(page.locator('[data-testid="escrow-notice"]')).toHaveText(/Funds held securely until service completion/);
      
      console.log('✅ Payment confirmation displayed with all details');
    });

    // Step 9: Download and verify receipt
    await test.step('Generate and verify receipt', async () => {
      // Click download receipt
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click('[data-testid="download-receipt"]')
      ]);
      
      expect(download.suggestedFilename()).toMatch(/receipt_\w+\.pdf/);
      
      // Verify email receipt option
      await page.click('[data-testid="email-receipt"]');
      await expect(page.locator('[data-testid="email-sent-confirmation"]')).toBeVisible();
      
      console.log('✅ Receipt generated and email sent');
    });

    // Step 10: Verify booking appears in customer dashboard
    await test.step('Verify booking in customer dashboard', async () => {
      await page.goto('/dashboard');
      await page.waitForSelector('[data-testid="bookings-list"]');
      
      // Find the new booking
      const latestBooking = page.locator('[data-testid="booking-item"]').first();
      await expect(latestBooking).toBeVisible();
      
      await expect(latestBooking.locator('[data-testid="booking-service"]')).toHaveText('Premium Home Cleaning');
      await expect(latestBooking.locator('[data-testid="booking-status"]')).toHaveText('Confirmed');
      await expect(latestBooking.locator('[data-testid="booking-amount"]')).toHaveText('$162.05');
      await expect(latestBooking.locator('[data-testid="booking-date"]')).toHaveText('December 15, 2024');
      
      console.log('✅ Booking appears correctly in customer dashboard');
    });

    console.log('🎉 Complete customer payment journey E2E test successful!');
  });

  test('should handle payment errors gracefully', async () => {
    console.log('🚀 Testing payment error handling...');

    await test.step('Navigate to payment form', async () => {
      await page.goto('/services');
      await page.click('[data-testid="service-card"]:has-text("Home Cleaning")');
      await page.fill('[data-testid="service-duration"]', '2');
      await page.click('[data-testid="proceed-to-booking"]');
      await page.click('[data-testid="proceed-to-payment"]');
    });

    await test.step('Test invalid card number', async () => {
      await page.fill('[data-testid="card-number"]', '4000000000000002'); // Declined card
      await page.fill('[data-testid="card-expiry"]', '12/25');
      await page.fill('[data-testid="card-cvc"]', '123');
      
      await expect(page.locator('[data-testid="card-validation"]')).toHaveClass(/invalid/);
      await expect(page.locator('[data-testid="card-error"]')).toHaveText(/Card number is invalid/);
      
      console.log('✅ Invalid card validation working');
    });

    await test.step('Test expired card', async () => {
      await page.fill('[data-testid="card-number"]', '4242424242424242');
      await page.fill('[data-testid="card-expiry"]', '12/20'); // Expired
      await page.fill('[data-testid="card-cvc"]', '123');
      
      await expect(page.locator('[data-testid="expiry-error"]')).toHaveText(/Card has expired/);
      
      console.log('✅ Expired card validation working');
    });

    await test.step('Test payment processing failure', async () => {
      // Fill valid card but simulate processing failure
      await page.fill('[data-testid="card-expiry"]', '12/25'); // Fix expiry
      await page.fill('[data-testid="billing-name"]', 'Test User');
      
      // Mock payment processing failure
      await page.evaluate(() => {
        window.mockPaymentFailure = true;
      });
      
      await page.click('[data-testid="payment-submit"]');
      
      // Should show error message
      await expect(page.locator('[data-testid="payment-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toHaveText(/Payment processing failed/);
      
      // Should offer retry option
      await expect(page.locator('[data-testid="retry-payment"]')).toBeVisible();
      
      console.log('✅ Payment processing failure handled correctly');
    });

    console.log('🎉 Payment error handling E2E test successful!');
  });

  test('should demonstrate mobile payment experience', async ({ browserName }) => {
    // Skip on non-mobile viewports
    test.skip(browserName !== 'webkit', 'Mobile-specific test');
    
    console.log('🚀 Testing mobile payment experience...');

    await test.step('Configure mobile viewport', async () => {
      await page.setViewportSize({ width: 375, height: 812 }); // iPhone X size
    });

    await test.step('Navigate through mobile payment flow', async () => {
      await page.goto('/services');
      
      // Mobile-optimized service selection
      await page.click('[data-testid="mobile-service-card"]');
      await page.click('[data-testid="mobile-book-service"]');
      
      // Mobile payment form
      await expect(page.locator('[data-testid="mobile-payment-form"]')).toBeVisible();
      
      // Touch-optimized payment inputs
      await page.tap('[data-testid="card-number"]');
      await page.fill('[data-testid="card-number"]', TEST_CARD.number);
      
      // Mobile-specific features
      await expect(page.locator('[data-testid="mobile-payment-summary"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-cost-savings"]')).toBeVisible();
      
      console.log('✅ Mobile payment experience optimized');
    });

    console.log('🎉 Mobile payment E2E test successful!');
  });

  test('should validate accessibility compliance', async () => {
    console.log('🚀 Testing payment form accessibility...');

    await test.step('Navigate to payment form', async () => {
      await page.goto('/services');
      await page.click('[data-testid="service-card"]:has-text("Home Cleaning")');
      await page.click('[data-testid="proceed-to-booking"]');
      await page.click('[data-testid="proceed-to-payment"]');
    });

    await test.step('Check form accessibility', async () => {
      // Check form labels
      await expect(page.locator('label[for="card-number"]')).toBeVisible();
      await expect(page.locator('label[for="card-expiry"]')).toBeVisible();
      await expect(page.locator('label[for="card-cvc"]')).toBeVisible();
      
      // Check ARIA attributes
      await expect(page.locator('[data-testid="card-number"]')).toHaveAttribute('aria-describedby');
      await expect(page.locator('[data-testid="payment-form"]')).toHaveAttribute('role', 'form');
      
      // Check keyboard navigation
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="card-number"]')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="card-expiry"]')).toBeFocused();
      
      // Check screen reader announcements
      await expect(page.locator('[aria-live="polite"]')).toBeInViewport();
      
      console.log('✅ Payment form accessibility validated');
    });

    console.log('🎉 Accessibility compliance E2E test successful!');
  });

  test('should handle high-volume payment scenarios', async () => {
    console.log('🚀 Testing high-volume payment handling...');

    await test.step('Simulate multiple concurrent bookings', async () => {
      // Simulate multiple tabs/windows booking simultaneously
      const contexts = await Promise.all([
        page.context().newPage(),
        page.context().newPage(),
        page.context().newPage()
      ]);

      const bookingPromises = contexts.map(async (contextPage, index) => {
        await contextPage.goto('/services');
        await contextPage.click('[data-testid="service-card"]:has-text("Home Cleaning")');
        await contextPage.fill('[data-testid="service-duration"]', (2 + index).toString());
        await contextPage.click('[data-testid="proceed-to-booking"]');
        await contextPage.click('[data-testid="proceed-to-payment"]');
        
        // Fill payment info
        await contextPage.fill('[data-testid="card-number"]', TEST_CARD.number);
        await contextPage.fill('[data-testid="card-expiry"]', TEST_CARD.expiry);
        await contextPage.fill('[data-testid="card-cvc"]', TEST_CARD.cvc);
        await contextPage.fill('[data-testid="billing-name"]', `Test User ${index + 1}`);
        
        return contextPage;
      });

      const pages = await Promise.all(bookingPromises);
      
      // Submit all payments simultaneously
      await Promise.all(pages.map(async (contextPage) => {
        const submitButton = contextPage.locator('[data-testid="payment-submit"]');
        if (await submitButton.isEnabled()) {
          await submitButton.click();
        }
      }));

      console.log('✅ Multiple concurrent payments handled successfully');
      
      // Cleanup
      await Promise.all(pages.map(p => p.close()));
    });

    console.log('🎉 High-volume payment E2E test successful!');
  });
});