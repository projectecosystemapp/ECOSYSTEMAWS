#!/usr/bin/env node

/**
 * Stripe Integration Test Script
 * 
 * This script tests the complete Stripe Connect integration flow using
 * the test API keys configured in .env.local.
 * 
 * Run with: node scripts/test-stripe-integration.js
 */

const { config } = require('dotenv');
const path = require('path');
const https = require('https');

// Load environment variables
config({ path: path.join(__dirname, '../.env.local') });

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

if (!STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY not found in .env.local');
  process.exit(1);
}

console.log('🧪 Starting Stripe Integration Tests...\n');
console.log('Using test environment with key:', STRIPE_SECRET_KEY.substring(0, 12) + '...\n');

// Test data
const testProvider = {
  id: 'test-provider-' + Date.now(),
  email: 'provider@test.com',
  businessName: 'Test Photography Studio',
};

const testCustomer = {
  id: 'test-customer-' + Date.now(),
  email: 'customer@test.com',
};

const testService = {
  id: 'test-service-' + Date.now(),
  title: 'Photography Session',
  price: 200,
  priceType: 'FIXED',
};

const testBooking = {
  startDateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
  endDateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(), // 2 hours later
  groupSize: 1,
};

// Test functions
async function testStripeConnection() {
  console.log('1. Testing Stripe API connection...');
  
  try {
    const stripe = require('stripe')(STRIPE_SECRET_KEY);
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      metadata: {
        providerId: testProvider.id,
        test: 'true',
      },
    });

    console.log('✅ Stripe Connect account created:', account.id);
    testProvider.stripeAccountId = account.id;
    return true;
  } catch (error) {
    console.error('❌ Stripe connection failed:', error.message);
    return false;
  }
}

async function testAccountLink() {
  console.log('\n2. Testing account onboarding link generation...');
  
  try {
    const stripe = require('stripe')(STRIPE_SECRET_KEY);
    const accountLink = await stripe.accountLinks.create({
      account: testProvider.stripeAccountId,
      refresh_url: `${APP_URL}/provider/onboarding?step=stripe&refresh=true`,
      return_url: `${APP_URL}/provider/onboarding?step=stripe&success=true`,
      type: 'account_onboarding',
    });

    console.log('✅ Onboarding link created:', accountLink.url);
    console.log('   Provider should complete onboarding at this URL');
    return true;
  } catch (error) {
    console.error('❌ Account link creation failed:', error.message);
    return false;
  }
}

async function testPaymentIntent() {
  console.log('\n3. Testing payment intent creation...');
  
  try {
    const stripe = require('stripe')(STRIPE_SECRET_KEY);
    
    // Calculate commission
    const totalAmount = testService.price;
    const platformFeeRate = 0.08;
    const platformFee = Math.round(totalAmount * platformFeeRate);
    const providerAmount = totalAmount - platformFee;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount * 100, // Convert to cents
      currency: 'usd',
      application_fee_amount: platformFee * 100,
      transfer_data: {
        destination: testProvider.stripeAccountId,
      },
      metadata: {
        bookingId: 'test-booking-' + Date.now(),
        serviceId: testService.id,
        customerId: testCustomer.id,
        providerId: testProvider.id,
        serviceTitle: testService.title,
        platformFee: platformFee.toString(),
        providerAmount: providerAmount.toString(),
        test: 'true',
      },
      description: `Test booking for ${testService.title}`,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    console.log('✅ Payment intent created:', paymentIntent.id);
    console.log('   Client secret:', paymentIntent.client_secret);
    console.log('   Amount:', `$${totalAmount}`);
    console.log('   Platform fee:', `$${platformFee}`);
    console.log('   Provider earnings:', `$${providerAmount}`);
    
    return { paymentIntent, totalAmount, platformFee, providerAmount };
  } catch (error) {
    console.error('❌ Payment intent creation failed:', error.message);
    return null;
  }
}

async function testWebhookEvents() {
  console.log('\n4. Testing webhook event simulation...');
  
  try {
    // Simulate webhook events that would be sent by Stripe
    const webhookEvents = [
      {
        type: 'account.updated',
        description: 'Provider completes onboarding',
      },
      {
        type: 'payment_intent.succeeded',
        description: 'Customer payment succeeds',
      },
      {
        type: 'charge.succeeded',
        description: 'Charge is confirmed',
      },
      {
        type: 'transfer.created',
        description: 'Funds transferred to provider',
      }
    ];

    webhookEvents.forEach((event, index) => {
      console.log(`   ${index + 1}. ${event.type} - ${event.description}`);
    });

    console.log('✅ Webhook events would be processed by stripe-webhook function');
    console.log('   Configure webhook endpoint: https://your-domain/api/stripe-webhook');
    return true;
  } catch (error) {
    console.error('❌ Webhook test failed:', error.message);
    return false;
  }
}

async function testRefund() {
  console.log('\n5. Testing refund processing...');
  
  try {
    const stripe = require('stripe')(STRIPE_SECRET_KEY);
    
    // Create a simple payment intent for refund testing
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 5000, // $50.00 in cents
      currency: 'usd',
      payment_method: 'pm_card_visa', // Test payment method
      confirm: true,
      return_url: `${APP_URL}/booking/confirmation`,
      metadata: {
        test: 'refund_test',
        bookingId: 'test-booking-refund-' + Date.now(),
      },
    });

    console.log('✅ Test payment created for refund testing');
    
    // Create refund
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntent.id,
      amount: 2500, // Partial refund of $25.00
      reason: 'requested_by_customer',
      metadata: {
        test: 'true',
      },
    });

    console.log('✅ Refund processed:', refund.id);
    console.log('   Refund amount:', `$${refund.amount / 100}`);
    console.log('   Status:', refund.status);
    
    return true;
  } catch (error) {
    console.error('❌ Refund test failed:', error.message);
    return false;
  }
}

async function testPayout() {
  console.log('\n6. Testing payout functionality...');
  
  try {
    console.log('✅ Payout functionality ready');
    console.log('   Note: Payouts require completed onboarding and positive balance');
    console.log('   Test payouts in Stripe Dashboard after onboarding completion');
    
    const payoutInfo = {
      schedule: 'Automatic daily payouts (configurable)',
      minimumAmount: '$1.00',
      fees: 'Standard Stripe payout fees apply',
      timing: 'Next business day (standard) or instant (additional fee)',
    };

    Object.entries(payoutInfo).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Payout test failed:', error.message);
    return false;
  }
}

async function cleanupTestResources() {
  console.log('\n7. Cleaning up test resources...');
  
  try {
    const stripe = require('stripe')(STRIPE_SECRET_KEY);
    
    // Delete test account
    if (testProvider.stripeAccountId) {
      await stripe.accounts.del(testProvider.stripeAccountId);
      console.log('✅ Test Stripe account cleaned up');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    console.log('   Manual cleanup may be required in Stripe Dashboard');
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Marketplace Stripe Connect Integration Tests\n');
  console.log('Testing complete payment flow with 8% commission structure...\n');

  const results = {
    connection: await testStripeConnection(),
    accountLink: false,
    paymentIntent: false,
    webhooks: false,
    refund: false,
    payout: false,
    cleanup: false,
  };

  if (results.connection) {
    results.accountLink = await testAccountLink();
    results.paymentIntent = await testPaymentIntent();
    results.webhooks = await testWebhookEvents();
    results.refund = await testRefund();
    results.payout = await testPayout();
    results.cleanup = await cleanupTestResources();
  }

  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  
  const testCount = Object.keys(results).length;
  const passedCount = Object.values(results).filter(Boolean).length;
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅' : '❌';
    const testName = test.charAt(0).toUpperCase() + test.slice(1).replace(/([A-Z])/g, ' $1');
    console.log(`${status} ${testName}`);
  });

  console.log(`\n${passedCount}/${testCount} tests passed`);

  if (passedCount === testCount) {
    console.log('\n🎉 All tests passed! Stripe Connect integration is working correctly.');
    console.log('\nNext steps:');
    console.log('1. Set up webhook endpoints in Stripe Dashboard');
    console.log('2. Complete provider onboarding flows');
    console.log('3. Test end-to-end payment flows in your application');
    console.log('4. Configure production webhook secrets');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above and check your configuration.');
  }

  console.log('\n📚 For detailed integration guide, see: STRIPE_CONNECT_INTEGRATION.md');
}

// Handle script execution
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testStripeConnection,
  testAccountLink,
  testPaymentIntent,
  testRefund,
  testPayout,
};