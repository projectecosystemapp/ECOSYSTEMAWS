import { Page, Locator } from '@playwright/test';

export class ProviderDashboardPage {
  readonly page: Page;
  readonly onboardingBanner: Locator;
  readonly onboardingTitle: Locator;
  readonly onboardingDescription: Locator;
  readonly completeProfileButton: Locator;
  readonly dashboardTitle: Locator;
  readonly addServiceButton: Locator;
  readonly servicesCard: Locator;
  readonly bookingsCard: Locator;
  readonly earningsCard: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dashboardTitle = page.getByRole('heading', { name: /Provider Dashboard/i });
    this.onboardingBanner = page.locator('[role="alert"]').filter({ hasText: /Welcome to Ecosystem/i });
    this.onboardingTitle = page.getByText('Welcome to Ecosystem!');
    this.onboardingDescription = page.getByText('Complete your public profile to start accepting bookings from customers.');
    this.completeProfileButton = page.getByRole('button', { name: /Complete Profile/i });
    this.addServiceButton = page.getByRole('button', { name: /Add Service/i });
    this.servicesCard = page.locator('.card').filter({ hasText: /Active Services/i });
    this.bookingsCard = page.locator('.card').filter({ hasText: /Active Bookings/i });
    this.earningsCard = page.locator('.card').filter({ hasText: /This Month/i });
  }

  async goto() {
    await this.page.goto('/provider/dashboard');
  }

  async isOnboardingBannerVisible(): Promise<boolean> {
    return await this.onboardingBanner.isVisible();
  }

  async completeProfile() {
    await this.completeProfileButton.click();
    await this.page.waitForURL('**/provider/onboarding/profile');
  }

  async addService() {
    await this.addServiceButton.click();
    await this.page.waitForURL('**/provider/services/new');
  }

  async getServicesCount(): Promise<number> {
    const text = await this.servicesCard.textContent() || '0';
    const match = text.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  async getBookingsCount(): Promise<number> {
    const text = await this.bookingsCard.textContent() || '0';
    const match = text.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  async isDashboardVisible(): Promise<boolean> {
    return await this.dashboardTitle.isVisible();
  }
}