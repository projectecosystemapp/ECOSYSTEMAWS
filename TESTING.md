# Testing Documentation

## Overview
Comprehensive testing strategy for the Ecosystem platform covering unit, integration, and end-to-end tests.

## Test Structure
```
tests/
├── e2e/                    # Playwright E2E tests
│   ├── auth/              # Authentication flows
│   ├── booking/           # Booking workflows
│   ├── payments/          # Payment processes
│   └── global-setup.ts   # Test environment setup
├── unit/                  # Vitest unit tests
├── integration/           # API integration tests
├── fixtures/              # Test fixtures and utilities
├── helpers/               # Test helper functions
└── pages/                 # Page Object Models
```

## Running Tests

### Unit Tests (Vitest)
```bash
# Run all unit tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch

# UI mode for debugging
npm run test:ui
```

### E2E Tests (Playwright)
```bash
# Run all E2E tests
npm run test:e2e

# Run specific test suites
npm run test:e2e:auth      # Authentication tests
npm run test:e2e:payments  # Payment tests
npm run test:e2e:booking   # Booking tests

# Run by priority
npm run test:e2e:smoke     # Critical tests only (@critical tag)

# Debug modes
npm run test:e2e:headed    # Run with browser visible
npm run test:e2e:debug     # Step through tests
npm run test:e2e:ui        # Interactive UI mode

# Generate test code
npm run test:e2e:codegen   # Record actions to generate tests
```

## Test Environment Setup

### 1. Copy Environment Template
```bash
cp .env.test.example .env.test
```

### 2. Configure Test Environment
```bash
# .env.test
PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000
STAGING_URL=https://your-staging-url.com
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=your_test_access_key
AWS_SECRET_ACCESS_KEY=your_test_secret_key
TEST_COGNITO_USER_POOL_ID=us-west-2_xxxxx
TEST_COGNITO_CLIENT_ID=xxxxxxxxxxxxx
TEST_COGNITO_REGION=us-west-2
TEST_DYNAMODB_TABLE_PREFIX=staging
STRIPE_TEST_PUBLIC_KEY=pk_test_xxxxx
```

### 3. Install Playwright Browsers
```bash
npx playwright install
```

## Writing Tests

### E2E Test Structure
```typescript
import { test, expect } from '@playwright/test';
import { SelectRolePage } from '../pages/auth/select-role.page';

test.describe('Feature Name @tag', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
  });

  test('should perform action', async ({ page }) => {
    // Arrange
    const selectRolePage = new SelectRolePage(page);
    
    // Act
    await selectRolePage.selectProviderRole();
    
    // Assert
    await expect(page).toHaveURL(/\/auth\/sign-up/);
  });

  test.afterEach(async () => {
    // Cleanup after each test
  });
});
```

### Page Object Model
```typescript
// tests/pages/auth/sign-up.page.ts
import { Page, Locator } from '@playwright/test';

export class SignUpPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', { name: /sign up/i });
  }

  async fillSignUpForm(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  async submit() {
    await this.submitButton.click();
  }
}
```

### Test Helpers
```typescript
// tests/helpers/test-user.helper.ts
export class TestUserHelper {
  async createTestUser(role: 'CUSTOMER' | 'PROVIDER') {
    // Create user via Cognito Admin API
  }

  async cleanup() {
    // Clean up test data
  }
}
```

## Test Tags

Use tags to categorize and run specific test groups:

- `@critical` - Must pass before deployment
- `@smoke` - Quick sanity checks
- `@regression` - Full regression suite
- `@auth` - Authentication related
- `@payments` - Payment related
- `@booking` - Booking related
- `@slow` - Long-running tests

Example:
```typescript
test('critical payment flow @critical @payments', async ({ page }) => {
  // Test implementation
});
```

## CI/CD Integration

### GitHub Actions Workflow
Tests run automatically on:
- Pull requests to main/develop
- Pushes to main
- Manual workflow dispatch

Configuration in `.github/workflows/e2e-tests.yml`:
- Parallel execution with sharding
- Artifact upload for failures
- Slack notifications
- HTML report generation

### Required GitHub Secrets
```
AWS_REGION
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
TEST_COGNITO_USER_POOL_ID
TEST_COGNITO_CLIENT_ID
STAGING_URL
STRIPE_TEST_PUBLIC_KEY
SLACK_WEBHOOK_URL
```

## Test Data Management

### Creating Test Data
```typescript
test.beforeEach(async () => {
  const testUser = await testUserHelper.createTestUser('PROVIDER');
  const service = await databaseHelper.createTestService(testUser.id);
});
```

### Cleaning Up Test Data
```typescript
test.afterEach(async () => {
  await testUserHelper.cleanup();
  await databaseHelper.cleanup();
});
```

### Test User Naming Convention
```
e2e-{role}-{uniqueId}@test.ecosystem.com
```

## Debugging Tests

### Local Debugging
```bash
# Run specific test file
npx playwright test tests/e2e/auth/sign-up.spec.ts

# Run with --debug flag
npx playwright test --debug

# Use UI mode for step-by-step
npx playwright test --ui
```

### Screenshot on Failure
Configured automatically in `playwright.config.ts`:
```typescript
use: {
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
  trace: 'on-first-retry',
}
```

### View Test Reports
```bash
# After test run
npm run test:e2e:report
```

## Best Practices

### Do's
- ✅ Use Page Object Model for reusability
- ✅ Clean up test data in afterEach/afterAll
- ✅ Use descriptive test names
- ✅ Tag tests appropriately
- ✅ Use data-testid attributes for reliable selectors
- ✅ Test user journeys, not implementation
- ✅ Keep tests independent
- ✅ Use proper assertions

### Don'ts
- ❌ Hardcode test data
- ❌ Use arbitrary waits (use proper wait conditions)
- ❌ Share state between tests
- ❌ Test external services
- ❌ Leave test data in database
- ❌ Use production credentials
- ❌ Commit .env.test file

## Performance Testing

### Load Testing
```bash
# Use Artillery for load testing
npm install -g artillery

# Run load test
artillery run tests/load/checkout.yml
```

### Lighthouse CI
```bash
# Performance metrics in CI
npm install -g @lhci/cli

# Run Lighthouse
lhci autorun
```

## Test Coverage Goals

- Unit Tests: 80% coverage
- Integration Tests: Critical paths covered
- E2E Tests: User journeys covered

### View Coverage Report
```bash
npm run test:coverage
# Open coverage/index.html in browser
```

## Troubleshooting

### Common Issues

**Tests timing out**
- Increase timeout in playwright.config.ts
- Check if dev server is running
- Verify network connectivity

**Flaky tests**
- Use proper wait conditions
- Avoid time-based waits
- Ensure test isolation

**Authentication failures**
- Check Cognito credentials
- Verify user pool configuration
- Ensure test user cleanup

**Database connection issues**
- Verify DynamoDB credentials
- Check table names and regions
- Ensure proper IAM permissions

### Debug Commands
```bash
# Check Playwright version
npx playwright --version

# Install specific browser
npx playwright install chromium

# Show browser console
DEBUG=pw:api npm run test:e2e

# Verbose output
npm run test:e2e -- --reporter=line
```

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Vitest Documentation](https://vitest.dev)
- [Testing Best Practices](https://testingjavascript.com)
- [Page Object Model Pattern](https://playwright.dev/docs/pom)