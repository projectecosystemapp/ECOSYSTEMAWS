import { Page, Locator } from '@playwright/test';

export class ConfirmationPage {
  readonly page: Page;
  
  // Success indicators
  readonly successIcon: Locator;
  readonly confirmationHeading: Locator;
  readonly bookingId: Locator;
  readonly confirmationMessage: Locator;
  
  // Service details
  readonly serviceName: Locator;
  readonly serviceDescription: Locator;
  readonly serviceDate: Locator;
  readonly serviceTime: Locator;
  readonly serviceDuration: Locator;
  readonly serviceLocation: Locator;
  
  // Provider details
  readonly providerSection: Locator;
  readonly providerName: Locator;
  readonly providerEmail: Locator;
  readonly providerPhone: Locator;
  readonly providerAddress: Locator;
  
  // Payment summary
  readonly paymentSection: Locator;
  readonly serviceAmount: Locator;
  readonly platformFee: Locator;
  readonly totalAmount: Locator;
  readonly paymentStatus: Locator;
  readonly paymentMethod: Locator;
  
  // Action buttons
  readonly addToCalendarButton: Locator;
  readonly shareButton: Locator;
  readonly contactProviderButton: Locator;
  readonly downloadReceiptButton: Locator;
  readonly viewAllBookingsButton: Locator;
  readonly backToHomeButton: Locator;
  
  // Important information
  readonly importantInfoSection: Locator;
  readonly cancellationPolicy: Locator;
  readonly confirmationEmail: Locator;
  readonly escrowNotice: Locator;
  
  // Special instructions
  readonly notesSection: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Success indicators
    this.successIcon = page.locator('[data-testid="success-icon"], .text-green-600 svg');
    this.confirmationHeading = page.locator('h1:has-text("Confirmed"), h1:has-text("Success")');
    this.bookingId = page.locator('[data-testid="booking-id"], text=/Booking ID:/');
    this.confirmationMessage = page.locator('[data-testid="confirmation-message"]');
    
    // Service details
    this.serviceName = page.locator('[data-testid="service-name"], h2:first-of-type');
    this.serviceDescription = page.locator('[data-testid="service-description"]');
    this.serviceDate = page.locator('[data-testid="service-date"], text=/Date:/, text=/[A-Z][a-z]+.*\\d{1,2}.*\\d{4}/');
    this.serviceTime = page.locator('[data-testid="service-time"], text=/Time:/, text=/\\d{1,2}:\\d{2}/');
    this.serviceDuration = page.locator('[data-testid="service-duration"]');
    this.serviceLocation = page.locator('[data-testid="service-location"]');
    
    // Provider details
    this.providerSection = page.locator('section:has-text("Provider"), div:has-text("Provider Details")');
    this.providerName = page.locator('[data-testid="provider-name"]');
    this.providerEmail = page.locator('[data-testid="provider-email"], a[href^="mailto:"]');
    this.providerPhone = page.locator('[data-testid="provider-phone"], a[href^="tel:"]');
    this.providerAddress = page.locator('[data-testid="provider-address"]');
    
    // Payment summary
    this.paymentSection = page.locator('section:has-text("Payment"), div:has-text("Payment Summary")');
    this.serviceAmount = page.locator('[data-testid="service-amount"]');
    this.platformFee = page.locator('[data-testid="platform-fee"]');
    this.totalAmount = page.locator('[data-testid="total-amount"], text=/Total.*\\$/');
    this.paymentStatus = page.locator('[data-testid="payment-status"], text=/Payment Status:/');
    this.paymentMethod = page.locator('[data-testid="payment-method"]');
    
    // Action buttons
    this.addToCalendarButton = page.getByRole('button', { name: /add.*calendar/i });
    this.shareButton = page.getByRole('button', { name: /share/i });
    this.contactProviderButton = page.getByRole('button', { name: /contact.*provider/i });
    this.downloadReceiptButton = page.getByRole('button', { name: /download.*receipt/i });
    this.viewAllBookingsButton = page.getByRole('button', { name: /view.*bookings/i });
    this.backToHomeButton = page.getByRole('button', { name: /home/i });
    
    // Important information
    this.importantInfoSection = page.locator('[role="alert"], div:has-text("Important Information")');
    this.cancellationPolicy = page.locator('text=/cancel.*24.*hours/');
    this.confirmationEmail = page.locator('text=/confirmation.*email.*sent/');
    this.escrowNotice = page.locator('text=/payment.*held.*escrow/');
    
    // Special instructions
    this.notesSection = page.locator('[data-testid="special-instructions"], div:has-text("Special Instructions")');
  }

  async getBookingId(): Promise<string> {
    const bookingIdText = await this.bookingId.textContent() || '';
    const match = bookingIdText.match(/[a-zA-Z0-9-]+$/);
    return match ? match[0] : '';
  }

  async getServiceDetails(): Promise<{
    name: string;
    date: string;
    time: string;
    location: string;
  }> {
    return {
      name: await this.serviceName.textContent() || '',
      date: await this.serviceDate.textContent() || '',
      time: await this.serviceTime.textContent() || '',
      location: await this.serviceLocation.textContent() || ''
    };
  }

  async getProviderDetails(): Promise<{
    name: string;
    email: string;
    phone: string;
    address: string;
  }> {
    return {
      name: await this.providerName.textContent() || '',
      email: await this.providerEmail.textContent() || '',
      phone: await this.providerPhone.textContent() || '',
      address: await this.providerAddress.textContent() || ''
    };
  }

  async getPaymentSummary(): Promise<{
    serviceAmount: string;
    platformFee: string;
    total: string;
    status: string;
  }> {
    return {
      serviceAmount: await this.serviceAmount.textContent() || '',
      platformFee: await this.platformFee.textContent() || '',
      total: await this.totalAmount.textContent() || '',
      status: await this.paymentStatus.textContent() || ''
    };
  }

  async isConfirmationSuccessful(): Promise<boolean> {
    return (await this.successIcon.isVisible()) && 
           (await this.confirmationHeading.isVisible());
  }

  async areActionButtonsVisible(): Promise<boolean> {
    return (await this.addToCalendarButton.isVisible()) &&
           (await this.contactProviderButton.isVisible());
  }

  async clickAddToCalendar(): Promise<void> {
    await this.addToCalendarButton.click();
    // This typically opens a new window/tab
    const [calendarPage] = await Promise.all([
      this.page.context().waitForEvent('page'),
      this.addToCalendarButton.click()
    ]);
    await calendarPage.waitForLoadState();
  }

  async clickContactProvider(): Promise<void> {
    await this.contactProviderButton.click();
    // This may open email client
  }

  async clickDownloadReceipt(): Promise<void> {
    // Start waiting for download before clicking
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      this.downloadReceiptButton.click()
    ]);
    return download.saveAs('./test-receipt.pdf');
  }

  async navigateToAllBookings(): Promise<void> {
    await this.viewAllBookingsButton.click();
    await this.page.waitForURL('**/bookings');
  }

  async navigateToHome(): Promise<void> {
    await this.backToHomeButton.click();
    await this.page.waitForURL('/');
  }

  async waitForPageLoad(): Promise<void> {
    await this.confirmationHeading.waitFor({ state: 'visible' });
    await this.page.waitForLoadState('networkidle');
  }

  async validateEssentialElements(): Promise<boolean> {
    const elements = [
      this.confirmationHeading,
      this.serviceName,
      this.serviceDate,
      this.totalAmount,
      this.addToCalendarButton
    ];
    
    for (const element of elements) {
      if (!(await element.isVisible())) {
        return false;
      }
    }
    
    return true;
  }
}