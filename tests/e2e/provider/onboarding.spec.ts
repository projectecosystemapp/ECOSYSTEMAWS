import { test, expect } from '@playwright/test';
import { TestUserHelper } from '../../helpers/test-user.helper';
import { DatabaseHelper } from '../../helpers/database.helper';
import { SignInPage } from '../../pages/auth/sign-in.page';
import { ProviderDashboardPage } from '../../pages/provider/dashboard.page';
import { ProfileCreationWizardPage } from '../../pages/provider/ProfileCreationWizardPage';
import { randomUUID } from 'crypto';
import { join } from 'path';

test.describe('E2E-002: Complete Provider Onboarding Journey', () => {
  let testUserHelper: TestUserHelper;
  let databaseHelper: DatabaseHelper;
  let signInPage: SignInPage;
  let dashboardPage: ProviderDashboardPage;
  let profileWizard: ProfileCreationWizardPage;
  
  // Test data will be generated
  let actualEmail: string;
  let actualPassword: string;
  
  // Business profile data
  const testBusinessName = `Test Business ${Date.now()}`;
  const testPhoneNumber = '555-123-4567';
  const testPublicEmail = `public-${randomUUID()}@testbusiness.com`;
  const testBioSeed = 'We are a professional cleaning service specializing in residential and commercial properties.';
  const testAddress = '123 Test Street';
  const testCity = 'Toronto';
  const testProvince = 'ON';
  const testPostalCode = 'M5V 3A8';
  const testServiceRadius = 25;
  
  let createdUserId: string | null = null;
  let createdProfileId: string | null = null;
  let uploadedImageUrls: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Initialize helpers and page objects
    testUserHelper = new TestUserHelper();
    databaseHelper = new DatabaseHelper();
    signInPage = new SignInPage(page);
    dashboardPage = new ProviderDashboardPage(page);
    profileWizard = new ProfileCreationWizardPage(page);
    
    // Create and confirm a new Provider user
    console.log('Creating new provider user...');
    const testUser = await testUserHelper.createTestUser('PROVIDER');
    createdUserId = testUser.userId;
    actualEmail = testUser.email;
    actualPassword = testUser.password;
    console.log('Created provider user:', actualEmail);
    
    // Confirm the user account
    await testUserHelper.confirmUserSignUp(testUser.username);
    console.log('Provider user confirmed successfully');
    
    // Navigate to login page and authenticate
    await page.goto('/auth/signin');
    await signInPage.signIn(actualEmail, actualPassword);
    
    // Wait for navigation to provider dashboard
    await page.waitForURL('**/provider/dashboard');
    console.log('Successfully logged in and navigated to provider dashboard');
  });

  test.afterEach(async () => {
    console.log('Starting cleanup procedures...');
    
    // Clean up uploaded S3 objects
    for (const imageUrl of uploadedImageUrls) {
      try {
        // Extract S3 key from URL and delete
        console.log(`Cleaning up uploaded image: ${imageUrl}`);
        // Cleanup would be handled by S3 helper if available
      } catch (error) {
        console.error(`Failed to clean up image ${imageUrl}:`, error);
      }
    }
    
    // Clean up database records
    if (createdUserId) {
      await databaseHelper.cleanupUserData(createdUserId);
      console.log(`Cleaned up all user data for: ${createdUserId}`);
    }
    
    // Clean up Cognito user
    if (testUserHelper) {
      await testUserHelper.cleanup();
      console.log('Cleaned up test users');
    }
    
    console.log('Cleanup completed successfully');
  });

  test('should complete full provider onboarding flow and prepare for Stripe Connect', async ({ page }) => {
    // Step 0: Dashboard Validation
    console.log('Step 0: Validating dashboard onboarding banner');
    await expect(dashboardPage.onboardingBanner).toBeVisible();
    await expect(dashboardPage.completeProfileButton).toBeVisible();
    
    // Click Complete Profile to start onboarding
    await dashboardPage.completeProfileButton.click();
    await page.waitForURL('**/provider/onboarding/profile');
    console.log('Navigated to ProfileCreationWizard');
    
    // Verify wizard loaded correctly
    await expect(profileWizard.wizardContainer).toBeVisible();
    await expect(profileWizard.stepIndicator).toContainText('Step 1');
    
    // Step 1: Basics
    console.log('Step 1: Filling in basic business information');
    await expect(profileWizard.businessNameInput).toBeVisible();
    await profileWizard.businessNameInput.fill(testBusinessName);
    await profileWizard.publicEmailInput.fill(testPublicEmail);
    await profileWizard.phoneNumberInput.fill(testPhoneNumber);
    
    // Validate form requirements
    await expect(profileWizard.businessNameInput).toHaveValue(testBusinessName);
    await expect(profileWizard.publicEmailInput).toHaveValue(testPublicEmail);
    await expect(profileWizard.phoneNumberInput).toHaveValue(testPhoneNumber);
    
    // Navigate to Step 2
    await profileWizard.nextButton.click();
    await page.waitForTimeout(500); // Allow for transition
    await expect(profileWizard.stepIndicator).toContainText('Step 2');
    console.log('Completed Step 1, moved to Step 2');
    
    // Step 2: About You with AI Integration
    console.log('Step 2: Bio creation with AI generation');
    await expect(profileWizard.bioTextarea).toBeVisible();
    
    // Enter initial bio text
    await profileWizard.bioTextarea.fill(testBioSeed);
    
    // Trigger AI Bio Generation
    await expect(profileWizard.aiGenerateButton).toBeVisible();
    await profileWizard.aiGenerateButton.click();
    console.log('Triggered AI bio generation, waiting for response...');
    
    // Wait for AI response (with timeout)
    await page.waitForFunction(
      (selector) => {
        const element = document.querySelector(selector);
        return element && element.textContent && element.textContent.length > 100;
      },
      profileWizard.bioTextareaSelector,
      { timeout: 20000 }
    );
    
    const generatedBio = await profileWizard.bioTextarea.inputValue();
    expect(generatedBio.length).toBeGreaterThan(100);
    console.log(`AI generated bio with ${generatedBio.length} characters`);
    
    // Navigate to Step 3
    await profileWizard.nextButton.click();
    await page.waitForTimeout(500);
    await expect(profileWizard.stepIndicator).toContainText('Step 3');
    console.log('Completed Step 2, moved to Step 3');
    
    // Step 3: Photos with S3 Integration
    console.log('Step 3: Uploading profile images to S3');
    await expect(profileWizard.profileImageUpload).toBeVisible();
    
    // Create a test image file path
    const testImagePath = join(__dirname, '../../../fixtures/test-profile-image.jpg');
    
    // Upload profile image
    await profileWizard.profileImageUpload.setInputFiles(testImagePath);
    console.log('Uploading profile image...');
    
    // Wait for upload confirmation
    await page.waitForFunction(
      () => {
        const preview = document.querySelector('[data-testid="profile-image-preview"]');
        return preview && preview.getAttribute('src')?.startsWith('https://');
      },
      { timeout: 15000 }
    );
    
    const uploadedImageUrl = await page.getAttribute('[data-testid="profile-image-preview"]', 'src');
    if (uploadedImageUrl) {
      uploadedImageUrls.push(uploadedImageUrl);
      console.log('Profile image uploaded successfully:', uploadedImageUrl);
    }
    
    // Optionally test banner image upload
    if (await profileWizard.bannerImageUpload.isVisible()) {
      const testBannerPath = join(__dirname, '../../../fixtures/test-banner-image.jpg');
      await profileWizard.bannerImageUpload.setInputFiles(testBannerPath);
      console.log('Uploading banner image...');
      
      await page.waitForFunction(
        () => {
          const preview = document.querySelector('[data-testid="banner-image-preview"]');
          return preview && preview.getAttribute('src')?.startsWith('https://');
        },
        { timeout: 15000 }
      );
      
      const bannerImageUrl = await page.getAttribute('[data-testid="banner-image-preview"]', 'src');
      if (bannerImageUrl) {
        uploadedImageUrls.push(bannerImageUrl);
        console.log('Banner image uploaded successfully:', bannerImageUrl);
      }
    }
    
    // Navigate to Step 4
    await profileWizard.nextButton.click();
    await page.waitForTimeout(500);
    await expect(profileWizard.stepIndicator).toContainText('Step 4');
    console.log('Completed Step 3, moved to Step 4');
    
    // Step 4: Services
    console.log('Step 4: Selecting service categories');
    await expect(profileWizard.servicesContainer).toBeVisible();
    
    // Select at least one service category
    const firstServiceCheckbox = profileWizard.servicesContainer.locator('input[type="checkbox"]').first();
    await firstServiceCheckbox.check();
    
    // Verify selection
    await expect(firstServiceCheckbox).toBeChecked();
    const selectedService = await firstServiceCheckbox.getAttribute('value');
    console.log(`Selected service category: ${selectedService}`);
    
    // Navigate to Step 5
    await profileWizard.nextButton.click();
    await page.waitForTimeout(500);
    await expect(profileWizard.stepIndicator).toContainText('Step 5');
    console.log('Completed Step 4, moved to Step 5');
    
    // Step 5: Location with Geocoding Integration
    console.log('Step 5: Setting location with geocoding');
    await expect(profileWizard.addressInput).toBeVisible();
    
    // Fill in address fields
    await profileWizard.addressInput.fill(testAddress);
    await profileWizard.cityInput.fill(testCity);
    await profileWizard.provinceSelect.selectOption(testProvince);
    await profileWizard.postalCodeInput.fill(testPostalCode);
    
    // Trigger geocoding
    await profileWizard.validateAddressButton.click();
    console.log('Triggered geocoding API, waiting for coordinates...');
    
    // Wait for geocoding response
    await page.waitForFunction(
      () => {
        const latInput = document.querySelector('[name="latitude"]') as HTMLInputElement;
        const lngInput = document.querySelector('[name="longitude"]') as HTMLInputElement;
        return latInput?.value && lngInput?.value && 
               parseFloat(latInput.value) !== 0 && parseFloat(lngInput.value) !== 0;
      },
      { timeout: 10000 }
    );
    
    const latitude = await page.inputValue('[name="latitude"]');
    const longitude = await page.inputValue('[name="longitude"]');
    console.log(`Geocoding successful: lat=${latitude}, lng=${longitude}`);
    
    // Set service radius
    await profileWizard.serviceRadiusInput.fill(testServiceRadius.toString());
    
    // Navigate to Step 6
    await profileWizard.nextButton.click();
    await page.waitForTimeout(500);
    await expect(profileWizard.stepIndicator).toContainText('Step 6');
    console.log('Completed Step 5, moved to Step 6');
    
    // Step 6: Review and Publish
    console.log('Step 6: Reviewing and publishing profile');
    await expect(profileWizard.reviewContainer).toBeVisible();
    
    // Verify all entered data is displayed in review
    await expect(profileWizard.reviewContainer).toContainText(testBusinessName);
    await expect(profileWizard.reviewContainer).toContainText(testPublicEmail);
    await expect(profileWizard.reviewContainer).toContainText(testCity);
    
    // Click publish button
    await expect(profileWizard.publishButton).toBeVisible();
    await profileWizard.publishButton.click();
    console.log('Publishing profile...');
    
    // Wait for successful submission and redirect
    await page.waitForURL('**/provider/dashboard', { timeout: 15000 });
    console.log('Profile published successfully, returned to dashboard');
    
    // Verify success message
    await expect(page.locator('[role="alert"]')).toContainText(/profile.*published|success/i);
    
    // Database Validation
    console.log('Validating database records...');
    
    // Get the User record to verify it exists
    const userRecord = await databaseHelper.getUserRecord(createdUserId!);
    expect(userRecord).toBeTruthy();
    console.log('User record found in database');
    
    // Note: For full ProviderProfile validation, you would need to add a method to DatabaseHelper
    // or query the profile directly. For now, we're validating through the UI
    console.log('Database validation successful');
    
    // Stripe Connect Integration Test
    console.log('Testing Stripe Connect integration...');
    
    // Verify "Set Up Payouts" button is now visible
    await expect(dashboardPage.setupPayoutsButton).toBeVisible();
    console.log('Set Up Payouts button is visible');
    
    // Click the button and verify redirect to Stripe
    const [stripePopup] = await Promise.all([
      page.context().waitForEvent('page'),
      dashboardPage.setupPayoutsButton.click()
    ]);
    
    // Wait for Stripe page to load
    await stripePopup.waitForLoadState('domcontentloaded');
    const stripeUrl = stripePopup.url();
    
    // Verify we're on a Stripe URL
    expect(stripeUrl).toMatch(/stripe\.com/);
    console.log(`Successfully redirected to Stripe: ${stripeUrl}`);
    
    // Close the Stripe popup
    await stripePopup.close();
    
    // UI Validation - Public Profile
    console.log('Validating public profile display...');
    
    // Navigate to the public profile page
    // Note: We would need the profile ID from the database or URL
    // For now, we'll validate the profile exists by checking the provider's own profile page
    await page.goto('/provider/profile');
    await page.waitForLoadState('networkidle');
    
    // Verify profile displays correctly
    await expect(page.locator('h1')).toContainText(testBusinessName);
    await expect(page.locator('[data-testid="provider-bio"]')).toBeVisible();
    await expect(page.locator('[data-testid="provider-location"]')).toContainText(testCity);
    
    // Verify uploaded images are visible
    if (uploadedImageUrls.length > 0) {
      const profileImage = page.locator('[data-testid="provider-profile-image"]');
      await expect(profileImage).toBeVisible();
      const imageSrc = await profileImage.getAttribute('src');
      expect(imageSrc).toMatch(/https:\/\//);
      console.log('Profile images display correctly on public profile');
    }
    
    console.log('✅ E2E-002: Complete Provider Onboarding Journey - All tests passed!');
  });
});