import { Page, Locator } from '@playwright/test';

export class ProfileCreationWizardPage {
  readonly page: Page;
  
  // Wizard container and navigation
  readonly wizardContainer: Locator;
  readonly stepIndicator: Locator;
  readonly nextButton: Locator;
  readonly backButton: Locator;
  readonly publishButton: Locator;
  
  // Step 1: Basics
  readonly businessNameInput: Locator;
  readonly publicEmailInput: Locator;
  readonly phoneNumberInput: Locator;
  
  // Step 2: About
  readonly bioTextarea: Locator;
  readonly bioTextareaSelector = '[data-testid="bio-textarea"]';
  readonly aiGenerateButton: Locator;
  readonly bioCharacterCount: Locator;
  
  // Step 3: Photos
  readonly profileImageUpload: Locator;
  readonly bannerImageUpload: Locator;
  readonly profileImagePreview: Locator;
  readonly bannerImagePreview: Locator;
  readonly removeProfileImageButton: Locator;
  readonly removeBannerImageButton: Locator;
  
  // Step 4: Services
  readonly servicesContainer: Locator;
  readonly serviceCheckboxes: Locator;
  readonly selectedServicesList: Locator;
  
  // Step 5: Location
  readonly addressInput: Locator;
  readonly cityInput: Locator;
  readonly provinceSelect: Locator;
  readonly postalCodeInput: Locator;
  readonly validateAddressButton: Locator;
  readonly latitudeInput: Locator;
  readonly longitudeInput: Locator;
  readonly serviceRadiusInput: Locator;
  readonly locationMapPreview: Locator;
  
  // Step 6: Review
  readonly reviewContainer: Locator;
  readonly reviewBusinessName: Locator;
  readonly reviewEmail: Locator;
  readonly reviewPhone: Locator;
  readonly reviewBio: Locator;
  readonly reviewLocation: Locator;
  readonly reviewServices: Locator;
  readonly editButtons: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Wizard container and navigation
    this.wizardContainer = page.locator('[data-testid="profile-wizard-container"]');
    this.stepIndicator = page.locator('[data-testid="step-indicator"]');
    this.nextButton = page.locator('button:has-text("Next")');
    this.backButton = page.locator('button:has-text("Back")');
    this.publishButton = page.locator('button:has-text("Publish Profile")');
    
    // Step 1: Basics
    this.businessNameInput = page.locator('[name="businessName"]');
    this.publicEmailInput = page.locator('[name="publicEmail"]');
    this.phoneNumberInput = page.locator('[name="phoneNumber"]');
    
    // Step 2: About
    this.bioTextarea = page.locator(this.bioTextareaSelector);
    this.aiGenerateButton = page.locator('button:has-text("Generate with AI")');
    this.bioCharacterCount = page.locator('[data-testid="bio-character-count"]');
    
    // Step 3: Photos
    this.profileImageUpload = page.locator('input[type="file"][data-testid="profile-image-upload"]');
    this.bannerImageUpload = page.locator('input[type="file"][data-testid="banner-image-upload"]');
    this.profileImagePreview = page.locator('[data-testid="profile-image-preview"]');
    this.bannerImagePreview = page.locator('[data-testid="banner-image-preview"]');
    this.removeProfileImageButton = page.locator('[data-testid="remove-profile-image"]');
    this.removeBannerImageButton = page.locator('[data-testid="remove-banner-image"]');
    
    // Step 4: Services
    this.servicesContainer = page.locator('[data-testid="services-container"]');
    this.serviceCheckboxes = page.locator('[data-testid="services-container"] input[type="checkbox"]');
    this.selectedServicesList = page.locator('[data-testid="selected-services-list"]');
    
    // Step 5: Location
    this.addressInput = page.locator('[name="address"]');
    this.cityInput = page.locator('[name="city"]');
    this.provinceSelect = page.locator('[name="province"]');
    this.postalCodeInput = page.locator('[name="postalCode"]');
    this.validateAddressButton = page.locator('button:has-text("Validate Address")');
    this.latitudeInput = page.locator('[name="latitude"]');
    this.longitudeInput = page.locator('[name="longitude"]');
    this.serviceRadiusInput = page.locator('[name="serviceRadius"]');
    this.locationMapPreview = page.locator('[data-testid="location-map-preview"]');
    
    // Step 6: Review
    this.reviewContainer = page.locator('[data-testid="review-container"]');
    this.reviewBusinessName = page.locator('[data-testid="review-business-name"]');
    this.reviewEmail = page.locator('[data-testid="review-email"]');
    this.reviewPhone = page.locator('[data-testid="review-phone"]');
    this.reviewBio = page.locator('[data-testid="review-bio"]');
    this.reviewLocation = page.locator('[data-testid="review-location"]');
    this.reviewServices = page.locator('[data-testid="review-services"]');
    this.editButtons = page.locator('[data-testid^="edit-step-"]');
  }

  async getCurrentStep(): Promise<number> {
    const stepText = await this.stepIndicator.textContent();
    const match = stepText?.match(/Step (\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  async goToStep(stepNumber: number): Promise<void> {
    const currentStep = await this.getCurrentStep();
    
    if (currentStep < stepNumber) {
      for (let i = currentStep; i < stepNumber; i++) {
        await this.nextButton.click();
        await this.page.waitForTimeout(500); // Allow for transition
      }
    } else if (currentStep > stepNumber) {
      for (let i = currentStep; i > stepNumber; i--) {
        await this.backButton.click();
        await this.page.waitForTimeout(500);
      }
    }
  }

  async selectServices(services: string[]): Promise<void> {
    for (const service of services) {
      const checkbox = this.servicesContainer.locator(`input[value="${service}"]`);
      await checkbox.check();
    }
  }

  async waitForAIGeneration(timeout: number = 20000): Promise<string> {
    await this.page.waitForFunction(
      (selector) => {
        const element = document.querySelector(selector);
        return element && element.textContent && element.textContent.length > 100;
      },
      this.bioTextareaSelector,
      { timeout }
    );
    
    return await this.bioTextarea.inputValue();
  }

  async waitForImageUpload(imageType: 'profile' | 'banner', timeout: number = 15000): Promise<string | null> {
    const selector = imageType === 'profile' 
      ? '[data-testid="profile-image-preview"]'
      : '[data-testid="banner-image-preview"]';
    
    await this.page.waitForFunction(
      (sel) => {
        const preview = document.querySelector(sel);
        return preview && preview.getAttribute('src')?.startsWith('https://');
      },
      selector,
      { timeout }
    );
    
    return await this.page.getAttribute(selector, 'src');
  }

  async waitForGeocoding(timeout: number = 10000): Promise<{ lat: string; lng: string }> {
    await this.page.waitForFunction(
      () => {
        const latInput = document.querySelector('[name="latitude"]') as HTMLInputElement;
        const lngInput = document.querySelector('[name="longitude"]') as HTMLInputElement;
        return latInput?.value && lngInput?.value && 
               parseFloat(latInput.value) !== 0 && parseFloat(lngInput.value) !== 0;
      },
      { timeout }
    );
    
    const lat = await this.latitudeInput.inputValue();
    const lng = await this.longitudeInput.inputValue();
    
    return { lat, lng };
  }

  async fillBasicsStep(businessName: string, publicEmail: string, phoneNumber: string): Promise<void> {
    await this.businessNameInput.fill(businessName);
    await this.publicEmailInput.fill(publicEmail);
    await this.phoneNumberInput.fill(phoneNumber);
  }

  async fillLocationStep(
    address: string,
    city: string,
    province: string,
    postalCode: string,
    serviceRadius: number
  ): Promise<void> {
    await this.addressInput.fill(address);
    await this.cityInput.fill(city);
    await this.provinceSelect.selectOption(province);
    await this.postalCodeInput.fill(postalCode);
    await this.serviceRadiusInput.fill(serviceRadius.toString());
  }

  async validateReviewData(expectedData: {
    businessName?: string;
    publicEmail?: string;
    city?: string;
    services?: string[];
  }): Promise<void> {
    if (expectedData.businessName) {
      await this.page.waitForSelector(
        `[data-testid="review-container"]:has-text("${expectedData.businessName}")`
      );
    }
    
    if (expectedData.publicEmail) {
      await this.page.waitForSelector(
        `[data-testid="review-container"]:has-text("${expectedData.publicEmail}")`
      );
    }
    
    if (expectedData.city) {
      await this.page.waitForSelector(
        `[data-testid="review-container"]:has-text("${expectedData.city}")`
      );
    }
    
    if (expectedData.services) {
      for (const service of expectedData.services) {
        await this.page.waitForSelector(
          `[data-testid="review-container"]:has-text("${service}")`
        );
      }
    }
  }

  async publishProfile(): Promise<void> {
    await this.publishButton.click();
    await this.page.waitForURL('**/provider/dashboard', { timeout: 15000 });
  }
}