import { Page, Locator } from '@playwright/test';

export class SignUpPage {
  readonly page: Page;
  
  // Role selection elements
  readonly roleCards: {
    customer: Locator;
    provider: Locator;
  };
  
  // Form elements
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  
  // Verification elements
  readonly verificationCodeInput: Locator;
  readonly verifyButton: Locator;
  readonly resendCodeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Role selection
    this.roleCards = {
      customer: page.locator('text="I am a Customer"').locator('..'),
      provider: page.locator('text="I am a Service Provider"').locator('..'),
    };
    
    // Sign-up form
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password', { exact: true });
    this.confirmPasswordInput = page.getByLabel('Confirm Password');
    this.submitButton = page.getByRole('button', { name: /create account/i });
    this.errorMessage = page.locator('[role="alert"]');
    
    // Verification
    this.verificationCodeInput = page.getByPlaceholder('Enter verification code');
    this.verifyButton = page.getByRole('button', { name: /verify/i });
    this.resendCodeButton = page.getByRole('button', { name: /resend code/i });
  }

  /**
   * Navigate to the sign-up page
   */
  async goto() {
    await this.page.goto('/auth/select-role');
  }

  /**
   * Select user role (customer or provider)
   */
  async selectRole(role: 'customer' | 'provider') {
    await this.roleCards[role].click();
    await this.page.waitForURL(/\/auth\/sign-up\?role=/);
  }

  /**
   * Fill in the sign-up form
   */
  async fillSignUpForm(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(password);
  }

  /**
   * Submit the sign-up form
   */
  async submit() {
    await this.submitButton.click();
  }

  /**
   * Complete the entire sign-up process
   */
  async signUp(role: 'customer' | 'provider', email: string, password: string) {
    await this.goto();
    await this.selectRole(role);
    await this.fillSignUpForm(email, password);
    await this.submit();
  }

  /**
   * Enter and submit verification code
   */
  async verifyEmail(code: string) {
    await this.verificationCodeInput.fill(code);
    await this.verifyButton.click();
  }

  /**
   * Resend verification code
   */
  async resendVerificationCode() {
    await this.resendCodeButton.click();
  }

  /**
   * Check if on verification page
   */
  async isOnVerificationPage(): Promise<boolean> {
    return this.page.url().includes('/auth/verify-email');
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string | null> {
    if (await this.errorMessage.isVisible()) {
      return await this.errorMessage.textContent();
    }
    return null;
  }

  /**
   * Check if form has validation errors
   */
  async hasValidationErrors(): Promise<boolean> {
    const emailError = this.page.locator('text="Invalid email"');
    const passwordError = this.page.locator('text=/Password must/');
    return await emailError.isVisible() || await passwordError.isVisible();
  }
}