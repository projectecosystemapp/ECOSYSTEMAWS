/**
 * Feature Flag System for AWS-Native Payment Migration
 * 
 * This system controls the migration to AWS-native payment processing
 * with the ability to instantly rollback if issues arise.
 * 
 * Usage:
 * - Set environment variables to 'true' to enable AWS-native payments
 * - Leave unset or 'false' for legacy behavior
 * - Can be toggled without code changes or redeployment
 */

// Feature flags for AWS-native payment system
export const useNewArchitecture = {
  // AWS Payment operations
  awsPaymentProcessor: process.env.NEXT_PUBLIC_USE_AWS_NATIVE_PAYMENTS === 'true',
  directPayouts: process.env.NEXT_PUBLIC_ENABLE_DIRECT_PAYOUTS === 'true',
  
  // Booking operations
  bookingProcessor: process.env.NEXT_PUBLIC_USE_APPSYNC_BOOKING === 'true',
  
  // Financial operations
  payoutManager: process.env.NEXT_PUBLIC_USE_APPSYNC_PAYOUT === 'true',
  refundProcessor: process.env.NEXT_PUBLIC_USE_APPSYNC_REFUND === 'true',
  
  // Communication operations
  messagingHandler: process.env.NEXT_PUBLIC_USE_APPSYNC_MESSAGING === 'true',
  notificationHandler: process.env.NEXT_PUBLIC_USE_APPSYNC_NOTIFICATION === 'true',
  
  // AI operations
  bedrockAI: process.env.NEXT_PUBLIC_USE_APPSYNC_BEDROCK === 'true',
};

// Helper to check if fully migrated to AWS-native payments
export const isFullyMigrated = (): boolean => {
  return Object.values(useNewArchitecture).every(flag => flag === true);
};

// Helper to get migration status
export const getMigrationStatus = (): {
  total: number;
  migrated: number;
  percentage: number;
  details: Record<string, boolean>;
} => {
  const flags = Object.entries(useNewArchitecture);
  const migrated = flags.filter(([_, enabled]) => enabled).length;
  
  return {
    total: flags.length,
    migrated,
    percentage: Math.round((migrated / flags.length) * 100),
    details: useNewArchitecture,
  };
};

// Helper to log migration status (for debugging)
export const logMigrationStatus = (): void => {
  const status = getMigrationStatus();
  console.log('🔄 AWS Payment Migration Status:', {
    ...status,
    fullyMigrated: isFullyMigrated(),
  });
};

// Development-only warning for mixed architecture
if (process.env.NODE_ENV === 'development') {
  const status = getMigrationStatus();
  if (status.migrated > 0 && status.migrated < status.total) {
    console.warn(
      `⚠️ Mixed payment system detected: ${status.migrated}/${status.total} functions migrated to AWS-native. ` +
      `This may cause inconsistencies. Consider migrating all functions or none.`
    );
  }
}