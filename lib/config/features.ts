/**
 * Feature Flags Configuration
 * 
 * Centralized feature flag management for gradual rollouts,
 * A/B testing, and safe deployments.
 */

import { ENVIRONMENT } from './constants';
import { nullableToString, nullableToNumber } from '@/lib/type-utils';

/**
 * Feature flag configuration
 */
interface FeatureFlag {
  enabled: boolean;
  description: string;
  rolloutPercentage?: number;
  environments?: ('development' | 'test' | 'production')[];
  requiredUserRole?: ('CUSTOMER' | 'PROVIDER' | 'ADMIN')[];
}

/**
 * All feature flags in the system
 */
const FEATURE_FLAGS: Record<string, FeatureFlag> = {
  // Core Platform Features
  ENABLE_USER_REGISTRATION: {
    enabled: true,
    description: 'Allow new user registration',
  },
  
  ENABLE_PROVIDER_ONBOARDING: {
    enabled: true,
    description: 'Allow provider onboarding and verification',
  },
  
  ENABLE_SERVICE_BOOKING: {
    enabled: true,
    description: 'Allow customers to book services',
  },
  
  ENABLE_PAYMENTS: {
    enabled: true,
    description: 'Enable payment processing via Stripe',
  },
  
  // Advanced Features
  ENABLE_MESSAGING: {
    enabled: true,
    description: 'In-app messaging between customers and providers',
  },
  
  ENABLE_REVIEWS: {
    enabled: true,
    description: 'Allow customers to leave reviews',
  },
  
  ENABLE_SEARCH_FILTERS: {
    enabled: true,
    description: 'Advanced search and filtering',
  },
  
  ENABLE_GEOLOCATION: {
    enabled: true,
    description: 'Location-based service discovery',
  },
  
  // Beta Features
  ENABLE_VIDEO_CALLS: {
    enabled: false,
    description: 'Video calls between customers and providers',
    environments: ['development'],
    rolloutPercentage: 10,
  },
  
  ENABLE_SUBSCRIPTIONS: {
    enabled: false,
    description: 'Recurring service subscriptions',
    environments: ['development'],
    rolloutPercentage: 5,
  },
  
  ENABLE_GROUP_BOOKINGS: {
    enabled: false,
    description: 'Allow booking for multiple people',
    environments: ['development', 'test'],
  },
  
  ENABLE_AI_RECOMMENDATIONS: {
    enabled: false,
    description: 'AI-powered service recommendations',
    environments: ['development'],
    rolloutPercentage: 25,
  },
  
  // Business Features
  ENABLE_MULTI_CURRENCY: {
    enabled: false,
    description: 'Support for multiple currencies',
    environments: ['development'],
  },
  
  ENABLE_PROMOTIONAL_CODES: {
    enabled: false,
    description: 'Discount codes and promotions',
    rolloutPercentage: 50,
  },
  
  ENABLE_LOYALTY_PROGRAM: {
    enabled: false,
    description: 'Customer loyalty rewards program',
    environments: ['development'],
  },
  
  // Admin Features
  ENABLE_ADMIN_DASHBOARD: {
    enabled: true,
    description: 'Admin dashboard for platform management',
    requiredUserRole: ['ADMIN'],
  },
  
  ENABLE_ANALYTICS_DASHBOARD: {
    enabled: true,
    description: 'Business analytics and reporting',
    requiredUserRole: ['ADMIN'],
  },
  
  ENABLE_CONTENT_MODERATION: {
    enabled: true,
    description: 'Automated content moderation',
  },
  
  // Development/Debug Features
  ENABLE_DEBUG_MODE: {
    enabled: nullableToString(ENVIRONMENT.IS_DEVELOPMENT),
    description: 'Debug information and development tools',
    environments: ['development'],
  },
  
  ENABLE_MOCK_PAYMENTS: {
    enabled: ENVIRONMENT.IS_DEVELOPMENT || ENVIRONMENT.IS_TEST,
    description: 'Use mock payments instead of real Stripe',
    environments: ['development', 'test'],
  },
  
  ENABLE_PERFORMANCE_MONITORING: {
    enabled: true,
    description: 'Performance monitoring and metrics collection',
  },
  
  // Security Features
  ENABLE_TWO_FACTOR_AUTH: {
    enabled: false,
    description: 'Two-factor authentication for enhanced security',
    rolloutPercentage: 20,
  },
  
  ENABLE_RATE_LIMITING: {
    enabled: true,
    description: 'API rate limiting protection',
  },
  
  ENABLE_ADVANCED_FRAUD_DETECTION: {
    enabled: false,
    description: 'Enhanced fraud detection algorithms',
    rolloutPercentage: 30,
  },
} as const;

/**
 * Check if a feature is enabled for the current environment
 */
export function isFeatureEnabled(
  featureName: keyof typeof FEATURE_FLAGS,
  context?: {
    userRole?: 'CUSTOMER' | 'PROVIDER' | 'ADMIN';
    userId?: string;
    environment?: string;
  }
): boolean {
  const feature = FEATURE_FLAGS[featureName];
  
  if (!feature) {
    console.warn(`Unknown feature flag: ${featureName}`);
    return false;
  }
  
  // Check if feature is globally disabled
  if (!feature.enabled) {
    return false;
  }
  
  // Check environment restrictions
  if (feature.environments) {
    const currentEnv = context?.environment || process.env.NODE_ENV || 'development';
    if (!feature.environments.includes(currentEnv as any)) {
      return false;
    }
  }
  
  // Check user role restrictions
  if (feature.requiredUserRole && context?.userRole) {
    if (!feature.requiredUserRole.includes(context.userRole)) {
      return false;
    }
  }
  
  // Check rollout percentage (simple hash-based distribution)
  if (feature.rolloutPercentage && feature.rolloutPercentage < 100) {
    if (context?.userId) {
      const hash = simpleHash(context.userId + featureName);
      const userPercentile = hash % 100;
      return userPercentile < feature.rolloutPercentage;
    }
    // If no userId provided, randomly distribute based on session
    const sessionHash = simpleHash(Date.now().toString() + featureName);
    const sessionPercentile = sessionHash % 100;
    return sessionPercentile < feature.rolloutPercentage;
  }
  
  return true;
}

/**
 * Get all enabled features for a given context
 */
export function getEnabledFeatures(context?: {
  userRole?: 'CUSTOMER' | 'PROVIDER' | 'ADMIN';
  userId?: string;
  environment?: string;
}): string[] {
  return Object.keys(FEATURE_FLAGS).filter(featureName => 
    isFeatureEnabled(featureName as keyof typeof FEATURE_FLAGS, context)
  );
}

/**
 * Get feature flag information (for debugging)
 */
export function getFeatureInfo(featureName: keyof typeof FEATURE_FLAGS) {
  const feature = FEATURE_FLAGS[featureName];
  
  if (!feature) {
    return null;
  }
  
  return {
    name: featureName,
    enabled: nullableToString(feature.enabled),
    description: nullableToString(feature.description),
    rolloutPercentage: nullableToString(feature.rolloutPercentage),
    environments: nullableToString(feature.environments),
    requiredUserRole: nullableToString(feature.requiredUserRole),
  };
}

/**
 * Simple hash function for consistent user distribution
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Feature flag middleware for API routes
 */
export function requireFeature(featureName: keyof typeof FEATURE_FLAGS) {
  return (context?: { userRole?: 'CUSTOMER' | 'PROVIDER' | 'ADMIN'; userId?: string }) => {
    if (!isFeatureEnabled(featureName, context)) {
      throw new Error(`Feature ${featureName} is not enabled`);
    }
  };
}

/**
 * React hook for feature flags (to be used in components)
 */
export function useFeatureFlag(
  featureName: keyof typeof FEATURE_FLAGS,
  context?: { userRole?: 'CUSTOMER' | 'PROVIDER' | 'ADMIN'; userId?: string }
): boolean {
  return isFeatureEnabled(featureName, context);
}

// Export feature flag names for type safety
export type FeatureFlagName = keyof typeof FEATURE_FLAGS;

// Export all feature flags for external access
export { FEATURE_FLAGS };