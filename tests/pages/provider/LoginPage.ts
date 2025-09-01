import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  
  // Login form elements
  readonly loginForm: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly rememberMeCheckbox: Locator;
  
  // Error and message elements
  readonly errorMessage: Locator;
  readonly successMessage: Locator;
  readonly validationErrors: Locator;
  
  // Navigation links
  readonly forgotPasswordLink: Locator;
  readonly signUpLink: Locator;
  readonly backToHomeLink: Locator;
  
  // Social login buttons
  readonly googleLoginButton: Locator;
  readonly facebookLoginButton: Locator;
  
  // Loading states
  readonly loadingSpinner: Locator;
  readonly submitButtonSpinner: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Login form elements
    this.loginForm = page.locator('form[data-testid="login-form"]');
    this.emailInput = page.locator('input[name="email"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.submitButton = page.locator('button[type="submit"]:has-text("Sign In")');
    this.rememberMeCheckbox = page.locator('input[name="rememberMe"]');
    
    // Error and message elements
    this.errorMessage = page.locator('[data-testid="error-message"]');
    this.successMessage = page.locator('[data-testid="success-message"]');
    this.validationErrors = page.locator('[data-testid="validation-error"]');
    
    // Navigation links
    this.forgotPasswordLink = page.locator('a:has-text("Forgot Password")');
    this.signUpLink = page.locator('a:has-text("Sign Up")');
    this.backToHomeLink = page.locator('a:has-text("Back to Home")');
    
    // Social login buttons
    this.googleLoginButton = page.locator('button:has-text("Continue with Google")');
    this.facebookLoginButton = page.locator('button:has-text("Continue with Facebook")');
    
    // Loading states
    this.loadingSpinner = page.locator('[data-testid="loading-spinner"]');
    this.submitButtonSpinner = page.locator('button[type="submit"] [data-testid="spinner"]');
  }

  async navigate(): Promise<void> {
    await this.page.goto('/login');
    await this.loginForm.waitFor({ state: 'visible' });
  }

  async login(email: string, password: string, rememberMe: boolean = false): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    
    if (rememberMe) {
      await this.rememberMeCheckbox.check();
    }
    
    await this.submitButton.click();
  }

  async loginAndWaitForRedirect(
    email: string,
    password: string,
    expectedUrl: string | RegExp
  ): Promise<void> {
    await this.login(email, password);
    await this.page.waitForURL(expectedUrl);
  }

  async getErrorMessage(): Promise<string | null> {
    if (await this.errorMessage.isVisible()) {
      return await this.errorMessage.textContent();
    }
    return null;
  }

  async getSuccessMessage(): Promise<string | null> {
    if (await this.successMessage.isVisible()) {
      return await this.successMessage.textContent();
    }
    return null;
  }

  async getValidationErrors(): Promise<string[]> {
    const errors: string[] = [];
    const errorElements = await this.validationErrors.all();
    
    for (const element of errorElements) {
      const text = await element.textContent();
      if (text) errors.push(text);
    }
    
    return errors;
  }

  async isLoading(): Promise<boolean> {
    return await this.loadingSpinner.isVisible() || await this.submitButtonSpinner.isVisible();
  }

  async waitForLoadingComplete(): Promise<void> {
    await this.loadingSpinner.waitFor({ state: 'hidden' });
    await this.submitButtonSpinner.waitFor({ state: 'hidden' });
  }

  async navigateToForgotPassword(): Promise<void> {
    await this.forgotPasswordLink.click();
    await this.page.waitForURL('**/forgot-password');
  }

  async navigateToSignUp(): Promise<void> {
    await this.signUpLink.click();
    await this.page.waitForURL('**/signup');
  }

  async loginWithGoogle(): Promise<void> {
    // This typically opens OAuth flow in a popup
    const [popup] = await Promise.all([
      this.page.context().waitForEvent('page'),
      this.googleLoginButton.click()
    ]);
    
    // Handle Google OAuth flow
    await popup.waitForLoadState('domcontentloaded');
  }

  async loginWithFacebook(): Promise<void> {
    // This typically opens OAuth flow in a popup
    const [popup] = await Promise.all([
      this.page.context().waitForEvent('page'),
      this.facebookLoginButton.click()
    ]);
    
    // Handle Facebook OAuth flow
    await popup.waitForLoadState('domcontentloaded');
  }

  async isFormValid(): Promise<boolean> {
    const emailValid = await this.emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    const passwordValid = await this.passwordInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    return emailValid && passwordValid;
  }

  async clearForm(): Promise<void> {
    await this.emailInput.clear();
    await this.passwordInput.clear();
    
    if (await this.rememberMeCheckbox.isChecked()) {
      await this.rememberMeCheckbox.uncheck();
    }
  }
}