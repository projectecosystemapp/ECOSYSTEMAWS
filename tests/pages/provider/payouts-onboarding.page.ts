import { Page, Locator } from '@playwright/test';

export class PayoutsOnboardingPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly description: Locator;
  readonly startOnboardingButton: Locator;
  readonly continueButton: Locator;
  readonly skipButton: Locator;
  readonly successMessage: Locator;
  readonly errorMessage: Locator;
  readonly accountStatus: Locator;
  readonly payoutsEnabled: Locator;
  readonly chargesEnabled: Locator;
  readonly requirementsList: Locator;
  readonly progressIndicator: Locator;
  readonly continueToDashboardButton: Locator;
  readonly retryButton: Locator;
  readonly stripeConnectFrame: Locator;
  
  constructor(page: Page) {
    this.page = page;
    
    // Main elements
    this.heading = page.locator('h1, h2').filter({ hasText: /Set Up Payouts|Connect Your Bank|Stripe Connect/i });
    this.description = page.locator('p').filter({ hasText: /Connect your Stripe account|receive payments|payouts/i });
    
    // Buttons
    this.startOnboardingButton = page.locator('button:has-text("Start Onboarding"), button:has-text("Connect with Stripe")');
    this.continueButton = page.locator('button:has-text("Continue")');
    this.skipButton = page.locator('button:has-text("Skip"), button:has-text("Later")');
    this.continueToDashboardButton = page.locator('button:has-text("Continue to Dashboard"), button:has-text("Go to Earnings")');
    this.retryButton = page.locator('button:has-text("Retry"), button:has-text("Try Again")');
    
    // Status messages
    this.successMessage = page.locator('[role="alert"]').filter({ hasText: /success|connected|complete/i });
    this.errorMessage = page.locator('[role="alert"]').filter({ hasText: /error|failed|problem/i });
    
    // Account status
    this.accountStatus = page.locator('text=Account Status').locator('..');
    this.payoutsEnabled = page.locator('text=Payouts').locator('..');
    this.chargesEnabled = page.locator('text=Charges').locator('..');
    
    // Requirements
    this.requirementsList = page.locator('[data-testid="requirements-list"], ul:has(li:has-text("verification"))');
    this.progressIndicator = page.locator('[role="progressbar"], [data-testid="progress"]');
    
    // Stripe Connect iframe (if embedded)
    this.stripeConnectFrame = page.frameLocator('iframe[src*="stripe.com"]');
  }
  
  async goto() {
    await this.page.goto('/provider/onboarding/payments');
  }
  
  async clickStartOnboarding() {
    await this.startOnboardingButton.click();
  }
  
  async clickContinue() {
    await this.continueButton.click();
  }
  
  async clickSkip() {
    await this.skipButton.click();
  }
  
  async clickContinueToDashboard() {
    await this.continueToDashboardButton.click();
  }
  
  async clickRetry() {
    await this.retryButton.click();
  }
  
  async getAccountStatus(): Promise<string> {
    return await this.accountStatus.textContent() || '';
  }
  
  async isPayoutsEnabled(): Promise<boolean> {
    const text = await this.payoutsEnabled.textContent() || '';
    return text.toLowerCase().includes('enabled') || text.toLowerCase().includes('active');
  }
  
  async isChargesEnabled(): Promise<boolean> {
    const text = await this.chargesEnabled.textContent() || '';
    return text.toLowerCase().includes('enabled') || text.toLowerCase().includes('active');
  }
  
  async getRequirements(): Promise<string[]> {
    const items = await this.requirementsList.locator('li').all();
    const requirements = [];
    
    for (const item of items) {
      const text = await item.textContent();
      if (text) requirements.push(text);
    }
    
    return requirements;
  }
  
  async getProgress(): Promise<number> {
    const progressText = await this.progressIndicator.getAttribute('aria-valuenow');
    return progressText ? parseInt(progressText) : 0;
  }
  
  async isSuccessful(): Promise<boolean> {
    return await this.successMessage.isVisible();
  }
  
  async hasError(): Promise<boolean> {
    return await this.errorMessage.isVisible();
  }
  
  async getErrorMessage(): Promise<string> {
    return await this.errorMessage.textContent() || '';
  }
  
  async waitForStripeRedirect() {
    // Wait for either Stripe redirect or success message
    await Promise.race([
      this.page.waitForURL('**/connect.stripe.com/**', { timeout: 10000 }),
      this.successMessage.waitFor({ state: 'visible', timeout: 10000 })
    ]);
  }
  
  async completeStripeForm(data: {
    businessType?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    dateOfBirth?: string;
    ssn?: string;
    bankAccount?: string;
    routingNumber?: string;
  }) {
    // This would interact with actual Stripe Connect forms
    // In test environment, we'd mock this
    console.log('Completing Stripe form with:', data);
    
    // If using Stripe Connect embedded components
    if (await this.stripeConnectFrame.locator('input').count() > 0) {
      // Fill in Stripe Connect embedded form fields
      if (data.firstName) {
        await this.stripeConnectFrame.locator('input[name="first_name"]').fill(data.firstName);
      }
      if (data.lastName) {
        await this.stripeConnectFrame.locator('input[name="last_name"]').fill(data.lastName);
      }
      // ... continue for other fields
    }
  }
  
  async isOnboardingComplete(): Promise<boolean> {
    // Check for completion indicators
    const hasSuccess = await this.isSuccessful();
    const hasContinueButton = await this.continueToDashboardButton.isVisible();
    const payoutsEnabled = await this.isPayoutsEnabled();
    
    return hasSuccess || (hasContinueButton && payoutsEnabled);
  }
}