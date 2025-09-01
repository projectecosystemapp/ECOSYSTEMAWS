import { Page, Locator, FrameLocator } from '@playwright/test';

export class CheckoutPage {
  readonly page: Page;
  
  // Stripe Elements frame
  readonly stripeFrame: FrameLocator;
  
  // Card input fields (within Stripe iframe)
  readonly cardNumberInput: Locator;
  readonly expiryInput: Locator;
  readonly cvcInput: Locator;
  readonly zipInput: Locator;
  
  // Payment form elements
  readonly paymentForm: Locator;
  readonly amountDisplay: Locator;
  readonly serviceName: Locator;
  readonly payButton: Locator;
  readonly processingSpinner: Locator;
  
  // Error and success messages
  readonly errorMessage: Locator;
  readonly successMessage: Locator;
  readonly validationErrors: Locator;
  
  // Security badges
  readonly securityBadge: Locator;
  readonly stripeBadge: Locator;
  
  // 3D Secure frame (if required)
  readonly threeDSecureFrame: FrameLocator;
  readonly threeDSecureAuthorizeButton: Locator;
  readonly threeDSecureDeclineButton: Locator;
  
  // Additional info
  readonly cancellationPolicy: Locator;
  readonly escrowNotice: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Stripe Elements frame
    this.stripeFrame = page.frameLocator('iframe[title*="Secure card"], iframe[src*="stripe"]');
    
    // Card input fields within Stripe iframe
    this.cardNumberInput = this.stripeFrame.locator('[placeholder*="Card number"], [placeholder*="card"], input[name="cardnumber"]');
    this.expiryInput = this.stripeFrame.locator('[placeholder*="MM / YY"], [placeholder*="Expiry"], input[name="exp-date"]');
    this.cvcInput = this.stripeFrame.locator('[placeholder*="CVC"], [placeholder*="Security"], input[name="cvc"]');
    this.zipInput = this.stripeFrame.locator('[placeholder*="ZIP"], [placeholder*="Postal"], input[name="postal"]');
    
    // Payment form elements
    this.paymentForm = page.locator('form[data-testid="payment-form"], [data-testid="checkout-form"]');
    this.amountDisplay = page.locator('[data-testid="amount-display"], .text-2xl:has-text("$")');
    this.serviceName = page.locator('[data-testid="service-name"]');
    this.payButton = page.getByRole('button').filter({ hasText: /pay.*\$/i });
    this.processingSpinner = page.locator('[data-testid="processing-spinner"], .animate-spin');
    
    // Error and success messages
    this.errorMessage = page.locator('[role="alert"], [data-testid="error-message"]');
    this.successMessage = page.locator('[data-testid="success-message"]');
    this.validationErrors = page.locator('[data-testid="validation-error"]');
    
    // Security badges
    this.securityBadge = page.locator('text=/secure.*payment/i');
    this.stripeBadge = page.locator('text=/powered.*stripe/i');
    
    // 3D Secure frame
    this.threeDSecureFrame = page.frameLocator('iframe[name*="3ds"], iframe[title*="3D Secure"]');
    this.threeDSecureAuthorizeButton = this.threeDSecureFrame.getByRole('button', { name: /complete|authorize|authenticate/i });
    this.threeDSecureDeclineButton = this.threeDSecureFrame.getByRole('button', { name: /decline|cancel/i });
    
    // Additional info
    this.cancellationPolicy = page.locator('text=/cancel.*24.*hours/i');
    this.escrowNotice = page.locator('text=/escrow|held.*securely/i');
  }

  async fillCardDetails(cardDetails: {
    cardNumber: string;
    expiry: string;
    cvc: string;
    zip: string;
  }): Promise<void> {
    // Check if Stripe Elements are loaded
    const hasStripeElements = await this.stripeFrame.locator('input').count() > 0;
    
    if (hasStripeElements) {
      console.log('Filling Stripe Elements card details');
      await this.cardNumberInput.fill(cardDetails.cardNumber);
      await this.expiryInput.fill(cardDetails.expiry);
      await this.cvcInput.fill(cardDetails.cvc);
      await this.zipInput.fill(cardDetails.zip);
    } else {
      console.log('Stripe Elements not found - may be using mock form');
    }
  }

  async fillTestCard(type: 'success' | 'decline' | 'insufficient' | '3ds' = 'success'): Promise<void> {
    const testCards = {
      success: '4242424242424242',
      decline: '4000000000000002',
      insufficient: '4000000000009995',
      '3ds': '4000002500003155'
    };
    
    await this.fillCardDetails({
      cardNumber: testCards[type],
      expiry: '12/30',
      cvc: '123',
      zip: '10001'
    });
  }

  async submitPayment(): Promise<void> {
    await this.payButton.click();
  }

  async waitForPaymentProcessing(timeout: number = 10000): Promise<void> {
    // Wait for either success redirect or error message
    await Promise.race([
      this.page.waitForURL('**/confirmation', { timeout }),
      this.errorMessage.waitFor({ state: 'visible', timeout })
    ]);
  }

  async handle3DSecure(action: 'authorize' | 'decline' = 'authorize'): Promise<void> {
    // Check if 3D Secure frame appears
    const has3DS = await this.threeDSecureFrame.locator('button').count() > 0;
    
    if (has3DS) {
      console.log('Handling 3D Secure authentication');
      if (action === 'authorize') {
        await this.threeDSecureAuthorizeButton.click();
      } else {
        await this.threeDSecureDeclineButton.click();
      }
      await this.page.waitForTimeout(2000);
    }
  }

  async getErrorMessage(): Promise<string | null> {
    if (await this.errorMessage.isVisible()) {
      return await this.errorMessage.textContent();
    }
    return null;
  }

  async getDisplayedAmount(): Promise<string> {
    return await this.amountDisplay.textContent() || '';
  }

  async isProcessing(): Promise<boolean> {
    return await this.processingSpinner.isVisible();
  }

  async hasStripeElements(): Promise<boolean> {
    return await this.stripeFrame.locator('input').count() > 0;
  }

  async waitForStripeElements(timeout: number = 5000): Promise<void> {
    await this.page.waitForFunction(
      () => {
        const iframe = document.querySelector('iframe[title*="Secure card"], iframe[src*="stripe"]');
        return iframe !== null;
      },
      { timeout }
    );
    
    // Additional wait for inputs to be ready
    await this.page.waitForTimeout(1000);
  }

  async isSecurityBadgeVisible(): Promise<boolean> {
    return await this.securityBadge.isVisible() || await this.stripeBadge.isVisible();
  }
}