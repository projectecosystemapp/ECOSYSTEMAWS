import { Page, Locator } from '@playwright/test';

export class EarningsDashboardPage {
  readonly page: Page;
  readonly earningsOverview: Locator;
  readonly totalEarnings: Locator;
  readonly availableBalance: Locator;
  readonly pendingBalance: Locator;
  readonly platformFees: Locator;
  readonly netEarnings: Locator;
  readonly transactionsTab: Locator;
  readonly payoutsTab: Locator;
  readonly searchInput: Locator;
  readonly timeFilter: Locator;
  readonly exportButton: Locator;
  readonly refreshButton: Locator;
  readonly transactionsTable: Locator;
  readonly payoutHistory: Locator;
  readonly earningsChart: Locator;
  readonly servicePerformanceChart: Locator;
  readonly emptyState: Locator;
  readonly errorState: Locator;
  readonly payoutSchedule: Locator;
  readonly bankAccount: Locator;
  readonly nextPageButton: Locator;
  readonly previousPageButton: Locator;
  readonly paginationInfo: Locator;
  
  constructor(page: Page) {
    this.page = page;
    
    // Overview elements
    this.earningsOverview = page.locator('[data-testid="earnings-overview"]');
    this.totalEarnings = page.locator('text=Total Earnings').locator('..').locator('.text-2xl');
    this.availableBalance = page.locator('text=Available Balance').locator('..').locator('.text-2xl');
    this.pendingBalance = page.locator('text=Pending Balance').locator('..').locator('.text-2xl');
    this.platformFees = page.locator('text=Platform Fees').locator('..').locator('.text-2xl');
    this.netEarnings = page.locator('text=Net Earnings').locator('..').locator('.text-2xl');
    
    // Navigation
    this.transactionsTab = page.locator('button[role="tab"]:has-text("Transactions")');
    this.payoutsTab = page.locator('button[role="tab"]:has-text("Payouts")');
    
    // Controls
    this.searchInput = page.locator('input[placeholder*="Search transactions"]');
    this.timeFilter = page.locator('[data-testid="time-filter"]');
    this.exportButton = page.locator('button:has-text("Export")');
    this.refreshButton = page.locator('[data-testid="refresh-button"]');
    
    // Tables and charts
    this.transactionsTable = page.locator('table').first();
    this.payoutHistory = page.locator('text=Payout History').locator('..');
    this.earningsChart = page.locator('[data-testid="earnings-chart"], .recharts-wrapper').first();
    this.servicePerformanceChart = page.locator('[data-testid="service-performance-chart"], .recharts-wrapper').nth(1);
    
    // States
    this.emptyState = page.locator('text=No Earnings Yet').locator('..');
    this.errorState = page.locator('text=Unable to Load Earnings').locator('..');
    
    // Payout settings
    this.payoutSchedule = page.locator('text=Payout Schedule').locator('..');
    this.bankAccount = page.locator('text=Bank Account').locator('..');
    
    // Pagination
    this.nextPageButton = page.locator('[data-testid="next-page-button"], button:has-text("Next")');
    this.previousPageButton = page.locator('[data-testid="previous-page-button"], button:has-text("Previous")');
    this.paginationInfo = page.locator('[data-testid="pagination-info"], text=/Showing \\d+ to \\d+/');
  }
  
  async goto() {
    await this.page.goto('/provider/earnings');
  }
  
  async getTotalEarnings(): Promise<string> {
    return await this.totalEarnings.textContent() || '';
  }
  
  async getAvailableBalance(): Promise<string> {
    return await this.availableBalance.textContent() || '';
  }
  
  async getPendingBalance(): Promise<string> {
    return await this.pendingBalance.textContent() || '';
  }
  
  async getPlatformFees(): Promise<string> {
    return await this.platformFees.textContent() || '';
  }
  
  async getNetEarnings(): Promise<string> {
    return await this.netEarnings.textContent() || '';
  }
  
  async searchTransactions(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
    await this.page.waitForTimeout(500); // Wait for search to apply
  }
  
  async selectTimeFilter(period: string) {
    await this.timeFilter.click();
    await this.page.locator(`[data-value="${period}"]`).click();
  }
  
  async clickExportButton() {
    await this.exportButton.click();
  }
  
  async clickRefreshButton() {
    await this.refreshButton.click();
  }
  
  async clickTransactionsTab() {
    await this.transactionsTab.click();
  }
  
  async clickPayoutsTab() {
    await this.payoutsTab.click();
  }
  
  async clickNextPage() {
    await this.nextPageButton.click();
  }
  
  async clickPreviousPage() {
    await this.previousPageButton.click();
  }
  
  async getTransactionsList(): Promise<Array<{
    date: string;
    customer: string;
    service: string;
    amount: string;
    fee: string;
    net: string;
    status: string;
  }>> {
    const rows = await this.transactionsTable.locator('tbody tr').all();
    const transactions = [];
    
    for (const row of rows) {
      const cells = await row.locator('td').all();
      if (cells.length >= 7) {
        transactions.push({
          date: await cells[0].textContent() || '',
          customer: await cells[1].textContent() || '',
          service: await cells[2].textContent() || '',
          amount: await cells[3].textContent() || '',
          fee: await cells[4].textContent() || '',
          net: await cells[5].textContent() || '',
          status: await cells[6].textContent() || ''
        });
      }
    }
    
    return transactions;
  }
  
  async getPayoutsList(): Promise<Array<{
    amount: string;
    status: string;
    date: string;
    transactions: string;
  }>> {
    const payoutItems = await this.page.locator('[data-testid="payout-item"]').all();
    const payouts = [];
    
    for (const item of payoutItems) {
      payouts.push({
        amount: await item.locator('.font-medium').first().textContent() || '',
        status: await item.locator('[class*="badge"]').textContent() || '',
        date: await item.locator('.text-sm.font-medium').textContent() || '',
        transactions: await item.locator('.text-sm.text-gray-600').textContent() || ''
      });
    }
    
    return payouts;
  }
  
  async waitForDataToLoad() {
    await this.page.waitForSelector('[data-testid="earnings-overview"]', { timeout: 10000 });
  }
  
  async isLoading(): Promise<boolean> {
    const skeleton = this.page.locator('[class*="skeleton"]');
    return await skeleton.count() > 0;
  }
  
  async hasError(): Promise<boolean> {
    return await this.errorState.isVisible();
  }
  
  async isEmpty(): Promise<boolean> {
    return await this.emptyState.isVisible();
  }
}