export const testConfig = {
  staging: {
    baseUrl: process.env.STAGING_URL || 'https://staging.ecosystem-app.com',
    awsRegion: process.env.AWS_REGION || 'us-east-1',
    cognitoUserPoolId: process.env.TEST_COGNITO_USER_POOL_ID || '',
    cognitoClientId: process.env.TEST_COGNITO_CLIENT_ID || '',
    stripeTestKey: process.env.STRIPE_TEST_PUBLIC_KEY || '',
  },
  dynamodb: {
    tablePrefix: process.env.TEST_DYNAMODB_TABLE_PREFIX || process.env.AMPLIFY_ENV || 'staging',
    region: process.env.AWS_REGION || 'us-east-1',
  },
  local: {
    baseUrl: 'http://localhost:3000',
    awsRegion: 'us-east-1',
    useMockServices: true,
  },
  timeouts: {
    navigation: 30000,
    assertion: 5000,
    upload: 60000,
    animation: 300,
  },
  testData: {
    userPrefix: 'e2e-test',
    cleanupDelay: 1000,
    maxRetries: 3,
  },
  stripe: {
    testCards: {
      valid: '4242424242424242',
      declined: '4000000000000002',
      insufficientFunds: '4000000000009995',
      incorrectCvc: '4000000000000127',
      expired: '4000000000000069',
      processingError: '4000000000000119',
      requiresAuthentication: '4000002500003155',
    },
    expiryDate: '12/30',
    cvc: '123',
    postalCode: '10001',
  },
};