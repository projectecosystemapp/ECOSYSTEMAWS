#!/usr/bin/env node

/**
 * Migration Status Checker
 * 
 * This script checks the current status of the Lambda URL to AppSync migration
 * and provides a visual report of what's been migrated and what remains.
 * 
 * Usage: npx tsx scripts/check-migration-status.ts
 */

import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
config({ path: '.env.local' });

// Define all Lambda functions and their migration status
const migrationStatus = [
  {
    name: 'Stripe Connect',
    envVar: 'NEXT_PUBLIC_USE_APPSYNC_STRIPE_CONNECT',
    lambdaUrl: 'STRIPE_CONNECT_LAMBDA_URL',
    phase: 1,
    priority: 'HIGH',
    status: process.env.NEXT_PUBLIC_USE_APPSYNC_STRIPE_CONNECT === 'true' ? '✅' : '⏳',
  },
  {
    name: 'Booking Processor',
    envVar: 'NEXT_PUBLIC_USE_APPSYNC_BOOKING',
    lambdaUrl: 'BOOKING_PROCESSOR_LAMBDA_URL',
    phase: 2,
    priority: 'HIGH',
    status: process.env.NEXT_PUBLIC_USE_APPSYNC_BOOKING === 'true' ? '✅' : '⏳',
  },
  {
    name: 'Payout Manager',
    envVar: 'NEXT_PUBLIC_USE_APPSYNC_PAYOUT',
    lambdaUrl: 'PAYOUT_MANAGER_LAMBDA_URL',
    phase: 3,
    priority: 'MEDIUM',
    status: process.env.NEXT_PUBLIC_USE_APPSYNC_PAYOUT === 'true' ? '✅' : '⏳',
  },
  {
    name: 'Refund Processor',
    envVar: 'NEXT_PUBLIC_USE_APPSYNC_REFUND',
    lambdaUrl: 'REFUND_PROCESSOR_LAMBDA_URL',
    phase: 3,
    priority: 'MEDIUM',
    status: process.env.NEXT_PUBLIC_USE_APPSYNC_REFUND === 'true' ? '✅' : '⏳',
  },
  {
    name: 'Messaging Handler',
    envVar: 'NEXT_PUBLIC_USE_APPSYNC_MESSAGING',
    lambdaUrl: 'MESSAGING_HANDLER_LAMBDA_URL',
    phase: 4,
    priority: 'LOW',
    status: process.env.NEXT_PUBLIC_USE_APPSYNC_MESSAGING === 'true' ? '✅' : '⏳',
  },
  {
    name: 'Notification Handler',
    envVar: 'NEXT_PUBLIC_USE_APPSYNC_NOTIFICATION',
    lambdaUrl: 'NOTIFICATION_HANDLER_LAMBDA_URL',
    phase: 4,
    priority: 'LOW',
    status: process.env.NEXT_PUBLIC_USE_APPSYNC_NOTIFICATION === 'true' ? '✅' : '⏳',
  },
  {
    name: 'Stripe Webhook',
    envVar: 'NEXT_PUBLIC_USE_APPSYNC_STRIPE_WEBHOOK',
    lambdaUrl: 'STRIPE_WEBHOOK_LAMBDA_URL',
    phase: 5,
    priority: 'HIGH',
    status: process.env.NEXT_PUBLIC_USE_APPSYNC_STRIPE_WEBHOOK === 'true' ? '✅' : '⏳',
  },
];

// Calculate statistics
const totalFunctions = migrationStatus.length;
const migratedFunctions = migrationStatus.filter(f => f.status === '✅').length;
const percentComplete = Math.round((migratedFunctions / totalFunctions) * 100);

// Check for deprecated Lambda URLs still in use
const deprecatedUrls = migrationStatus
  .filter(f => f.status === '✅' && process.env[f.lambdaUrl])
  .map(f => f.lambdaUrl);

// Display report
console.log('\n========================================');
console.log('  Lambda URL to AppSync Migration Status');
console.log('========================================\n');

console.log(`Progress: ${migratedFunctions}/${totalFunctions} (${percentComplete}%)`);
console.log(`${'█'.repeat(Math.floor(percentComplete / 5))}${'░'.repeat(20 - Math.floor(percentComplete / 5))}`);
console.log('\n');

// Group by phase
const phases = [...new Set(migrationStatus.map(f => f.phase))].sort();

phases.forEach(phase => {
  console.log(`Phase ${phase}:`);
  const phaseFunctions = migrationStatus.filter(f => f.phase === phase);
  
  phaseFunctions.forEach(func => {
    const flagValue = process.env[func.envVar] || 'false';
    const architecture = flagValue === 'true' ? 'AppSync' : 'Lambda URL';
    const priorityColor = func.priority === 'HIGH' ? '🔴' : func.priority === 'MEDIUM' ? '🟡' : '🟢';
    
    console.log(`  ${func.status} ${func.name.padEnd(20)} ${priorityColor} ${func.priority.padEnd(6)} → ${architecture}`);
  });
  console.log('');
});

// Warnings
if (deprecatedUrls.length > 0) {
  console.log('⚠️  Warnings:');
  console.log('The following Lambda URLs can be removed from your environment:');
  deprecatedUrls.forEach(url => {
    console.log(`  - ${url}`);
  });
  console.log('');
}

// Recommendations
console.log('📋 Recommendations:');
if (migratedFunctions === 0) {
  console.log('  1. Start with Stripe Connect (Phase 1) as your Golden Thread');
  console.log('  2. Set NEXT_PUBLIC_USE_APPSYNC_STRIPE_CONNECT=true in .env.local');
  console.log('  3. Test the provider onboarding flow');
} else if (migratedFunctions < totalFunctions) {
  const nextToMigrate = migrationStatus.find(f => f.status === '⏳');
  if (nextToMigrate) {
    console.log(`  1. Next to migrate: ${nextToMigrate.name}`);
    console.log(`  2. Set ${nextToMigrate.envVar}=true in .env.local`);
    console.log(`  3. Test thoroughly before proceeding`);
  }
} else {
  console.log('  ✨ Migration complete! Time to:');
  console.log('  1. Remove all Lambda URL environment variables');
  console.log('  2. Delete setup-lambda-urls.sh script');
  console.log('  3. Update documentation');
}

console.log('\n========================================\n');

// Check if running in mixed mode
const mixedMode = migratedFunctions > 0 && migratedFunctions < totalFunctions;
if (mixedMode) {
  console.log('⚠️  Mixed Architecture Mode Detected');
  console.log('Some functions use AppSync, others use Lambda URLs.');
  console.log('This is expected during migration but should be temporary.\n');
}

// Export for use in other scripts
export { migrationStatus, percentComplete };