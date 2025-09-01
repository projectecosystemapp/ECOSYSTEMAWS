import { Page, Locator } from '@playwright/test';

export class BookingPage {
  readonly page: Page;
  
  // Calendar elements
  readonly calendar: Locator;
  readonly selectedDate: Locator;
  readonly monthYear: Locator;
  readonly nextMonthButton: Locator;
  readonly prevMonthButton: Locator;
  
  // Time selection elements
  readonly timeSlots: Locator;
  readonly selectedTime: Locator;
  readonly morningSlots: Locator;
  readonly afternoonSlots: Locator;
  readonly eveningSlots: Locator;
  
  // Navigation buttons
  readonly continueToTimeButton: Locator;
  readonly continueToPaymentButton: Locator;
  readonly backButton: Locator;
  readonly cancelButton: Locator;
  
  // Notes field
  readonly notesTextarea: Locator;
  
  // Progress indicators
  readonly progressBar: Locator;
  readonly currentStep: Locator;
  readonly stepIndicators: Locator;
  
  // Service summary
  readonly serviceName: Locator;
  readonly servicePrice: Locator;
  readonly serviceDuration: Locator;
  readonly providerName: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Calendar elements
    this.calendar = page.locator('[role="grid"]');
    this.selectedDate = page.locator('[aria-selected="true"]');
    this.monthYear = page.locator('[data-testid="month-year"]');
    this.nextMonthButton = page.getByRole('button', { name: /next month/i });
    this.prevMonthButton = page.getByRole('button', { name: /previous month/i });
    
    // Time selection elements
    this.timeSlots = page.locator('button').filter({ hasText: /^\d{1,2}:\d{2}/ });
    this.selectedTime = page.locator('[data-selected="true"]');
    this.morningSlots = page.locator('[data-period="morning"] button');
    this.afternoonSlots = page.locator('[data-period="afternoon"] button');
    this.eveningSlots = page.locator('[data-period="evening"] button');
    
    // Navigation buttons
    this.continueToTimeButton = page.getByRole('button', { name: /continue.*time/i });
    this.continueToPaymentButton = page.getByRole('button', { name: /continue.*payment/i });
    this.backButton = page.getByRole('button', { name: /back|previous|change/i });
    this.cancelButton = page.getByRole('button', { name: /cancel/i });
    
    // Notes field
    this.notesTextarea = page.locator('textarea[name="notes"], textarea[placeholder*="notes"]');
    
    // Progress indicators
    this.progressBar = page.locator('[role="progressbar"]');
    this.currentStep = page.locator('[data-current-step="true"]');
    this.stepIndicators = page.locator('[data-testid="step-indicator"]');
    
    // Service summary
    this.serviceName = page.locator('[data-testid="service-name"]');
    this.servicePrice = page.locator('[data-testid="service-price"]');
    this.serviceDuration = page.locator('[data-testid="service-duration"]');
    this.providerName = page.locator('[data-testid="provider-name"]');
  }

  async selectDate(date: Date): Promise<void> {
    const day = date.getDate().toString();
    const month = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear();
    
    // Check if we need to navigate to the correct month
    const currentMonthYear = await this.monthYear.textContent();
    const targetMonthYear = `${month} ${year}`;
    
    if (currentMonthYear !== targetMonthYear) {
      // Navigate to correct month
      // This is simplified - in reality you'd need more complex navigation
      await this.nextMonthButton.click();
    }
    
    // Click on the specific date
    await this.page.locator(`[role="gridcell"] button:has-text("${day}")`).first().click();
  }

  async selectFirstAvailableTime(): Promise<string> {
    const firstSlot = this.timeSlots.first();
    const timeText = await firstSlot.textContent() || '';
    await firstSlot.click();
    return timeText;
  }

  async selectTimeByPeriod(period: 'morning' | 'afternoon' | 'evening'): Promise<string> {
    let slots: Locator;
    
    switch (period) {
      case 'morning':
        slots = this.morningSlots;
        break;
      case 'afternoon':
        slots = this.afternoonSlots;
        break;
      case 'evening':
        slots = this.eveningSlots;
        break;
    }
    
    const firstAvailable = slots.first();
    const timeText = await firstAvailable.textContent() || '';
    await firstAvailable.click();
    return timeText;
  }

  async proceedToTimeSelection(): Promise<void> {
    await this.continueToTimeButton.click();
    await this.page.waitForTimeout(500); // Allow for transition
  }

  async proceedToPayment(): Promise<void> {
    await this.continueToPaymentButton.click();
    await this.page.waitForTimeout(500);
  }

  async goBack(): Promise<void> {
    await this.backButton.click();
    await this.page.waitForTimeout(500);
  }

  async addNotes(notes: string): Promise<void> {
    if (await this.notesTextarea.isVisible()) {
      await this.notesTextarea.fill(notes);
    }
  }

  async getCurrentStep(): Promise<string> {
    return await this.currentStep.textContent() || '';
  }

  async getServiceSummary(): Promise<{
    name: string;
    price: string;
    duration: string;
    provider: string;
  }> {
    return {
      name: await this.serviceName.textContent() || '',
      price: await this.servicePrice.textContent() || '',
      duration: await this.serviceDuration.textContent() || '',
      provider: await this.providerName.textContent() || ''
    };
  }

  async waitForStep(stepName: 'date' | 'time' | 'payment' | 'confirm'): Promise<void> {
    await this.page.waitForFunction(
      (step) => {
        const indicator = document.querySelector('[data-current-step]');
        return indicator?.textContent?.toLowerCase().includes(step);
      },
      stepName,
      { timeout: 5000 }
    );
  }
}