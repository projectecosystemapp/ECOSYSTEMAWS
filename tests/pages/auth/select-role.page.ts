import { Page, Locator } from '@playwright/test';

export class SelectRolePage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly customerCard: Locator;
  readonly providerCard: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.getByRole('heading', { name: /How will you use Ecosystem/i });
    this.customerCard = page.locator('text="I am a Customer"').locator('..');
    this.providerCard = page.locator('text="I am a Service Provider"').locator('..');
  }

  async goto() {
    await this.page.goto('/auth/select-role');
  }

  async selectCustomerRole() {
    await this.customerCard.click();
    await this.page.waitForURL('**/auth/sign-up?role=CUSTOMER');
  }

  async selectProviderRole() {
    await this.providerCard.click();
    await this.page.waitForURL('**/auth/sign-up?role=PROVIDER');
  }

  async isVisible(): Promise<boolean> {
    return await this.pageTitle.isVisible();
  }
}