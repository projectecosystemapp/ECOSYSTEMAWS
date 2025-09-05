import { Page, Locator } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  
  // Dashboard elements
  readonly dashboardContainer: Locator;
  readonly welcomeMessage: Locator;
  readonly statsContainer: Locator;
  
  // Onboarding elements
  readonly onboardingBanner: Locator;
  readonly completeProfileButton: Locator;
  readonly onboardingProgress: Locator;
  readonly onboardingSteps: Locator;
  
  // Stripe Connect elements
  readonly setupPayoutsButton: Locator;
  readonly payoutStatusBadge: Locator;
  readonly stripeConnectBanner: Locator;
  
  // Navigation elements
  readonly profileLink: Locator;
  readonly bookingsLink: Locator;
  readonly servicesLink: Locator;
  readonly settingsLink: Locator;
  readonly logoutButton: Locator;
  
  // Stats and metrics
  readonly totalBookings: Locator;
  readonly totalRevenue: Locator;
  readonly avgRating: Locator;
  readonly activeServices: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Dashboard elements
    this.dashboardContainer = page.locator('[data-testid="dashboard-container"]');
    this.welcomeMessage = page.locator('[data-testid="welcome-message"]');
    this.statsContainer = page.locator('[data-testid="stats-container"]');
    
    // Onboarding elements
    this.onboardingBanner = page.locator('[data-testid="onboarding-banner"]');
    this.completeProfileButton = page.locator('button:has-text("Complete Profile")');
    this.onboardingProgress = page.locator('[data-testid="onboarding-progress"]');
    this.onboardingSteps = page.locator('[data-testid="onboarding-steps"]');
    
    // Stripe Connect elements
    this.setupPayoutsButton = page.locator('button:has-text("Set Up Payouts")');
    this.payoutStatusBadge = page.locator('[data-testid="payout-status"]');
    this.stripeConnectBanner = page.locator('[data-testid="stripe-connect-banner"]');
    
    // Navigation elements
    this.profileLink = page.locator('a[href*="/provider/profile"]');
    this.bookingsLink = page.locator('a[href*="/provider/bookings"]');
    this.servicesLink = page.locator('a[href*="/provider/services"]');
    this.settingsLink = page.locator('a[href*="/provider/settings"]');
    this.logoutButton = page.locator('button:has-text("Logout")');
    
    // Stats and metrics
    this.totalBookings = page.locator('[data-testid="total-bookings"]');
    this.totalRevenue = page.locator('[data-testid="total-revenue"]');
    this.avgRating = page.locator('[data-testid="avg-rating"]');
    this.activeServices = page.locator('[data-testid="active-services"]');
  }

  async waitForDashboard(): Promise<void> {
    await this.page.waitForURL('**/provider/dashboard');
    await this.dashboardContainer.waitFor({ state: 'visible' });
  }

  async isOnboardingComplete(): Promise<boolean> {
    // Check if onboarding banner is NOT visible
    const bannerCount = await this.onboardingBanner.count();
    return bannerCount === 0;
  }

  async isPayoutsEnabled(): Promise<boolean> {
    // Check if setup payouts button is NOT visible (meaning payouts are already set up)
    const buttonCount = await this.setupPayoutsButton.count();
    return buttonCount === 0;
  }

  async getOnboardingProgress(): Promise<string | null> {
    if (await this.onboardingProgress.isVisible()) {
      return await this.onboardingProgress.textContent();
    }
    return null;
  }

  async navigateToProfile(): Promise<void> {
    await this.profileLink.click();
    await this.page.waitForURL('**/provider/profile');
  }

  async navigateToBookings(): Promise<void> {
    await this.bookingsLink.click();
    await this.page.waitForURL('**/provider/bookings');
  }

  async navigateToServices(): Promise<void> {
    await this.servicesLink.click();
    await this.page.waitForURL('**/provider/services');
  }

  async navigateToSettings(): Promise<void> {
    await this.settingsLink.click();
    await this.page.waitForURL('**/provider/settings');
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
    await this.page.waitForURL('**/login');
  }

  async getStats(): Promise<{
    bookings: string | null;
    revenue: string | null;
    rating: string | null;
    services: string | null;
  }> {
    return {
      bookings: await this.totalBookings.textContent(),
      revenue: await this.totalRevenue.textContent(),
      rating: await this.avgRating.textContent(),
      services: await this.activeServices.textContent()
    };
  }

  async startOnboarding(): Promise<void> {
    await this.completeProfileButton.click();
    await this.page.waitForURL('**/provider/onboarding/profile');
  }

  async setupPayouts(): Promise<void> {
    // This will open Stripe Connect in a new tab/window
    const [stripePopup] = await Promise.all([
      this.page.context().waitForEvent('page'),
      this.setupPayoutsButton.click()
    ]);
    
    // Wait for Stripe page to load
    await stripePopup.waitForLoadState('domcontentloaded');
  }
}