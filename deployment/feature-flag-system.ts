/**
 * FEATURE FLAG SYSTEM FOR PRODUCTION DEPLOYMENT
 * 
 * Granular control system for AWS Native Payment System rollout
 * - User segment based rollouts
 * - Instant killswitches for emergency scenarios
 * - A/B testing capabilities with metrics collection
 * - Geographic and demographic targeting
 * - Real-time flag updates without deployment
 */

import { DynamoDBClient, GetItemCommand, PutItemCommand, QueryCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import crypto from 'crypto';

interface FeatureFlag {
  flagName: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  userSegments: UserSegment[];
  killSwitch: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
  owner: string;
  rollbackConditions: RollbackCondition[];
  metrics: FlagMetrics;
}

interface UserSegment {
  name: string;
  conditions: SegmentCondition[];
  rolloutPercentage: number;
  enabled: boolean;
}

interface SegmentCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'in' | 'contains' | 'startsWith';
  value: any;
}

interface RollbackCondition {
  metric: string;
  threshold: number;
  operator: 'gt' | 'lt';
  timeWindowMinutes: number;
  consecutiveFailures: number;
}

interface FlagMetrics {
  totalRequests: number;
  enabledRequests: number;
  conversionRate: number;
  errorRate: number;
  averageLatency: number;
  lastUpdated: string;
}

interface UserContext {
  userId: string;
  userType: 'customer' | 'provider' | 'admin';
  registrationDate: string;
  location: {
    country: string;
    state?: string;
    city?: string;
  };
  transactionHistory: {
    totalTransactions: number;
    totalVolume: number;
    lastTransactionDate: string;
  };
  deviceInfo: {
    platform: string;
    version: string;
  };
  customAttributes: Record<string, any>;
}

export class ProductionFeatureFlagSystem {
  private dynamoClient: DynamoDBClient;
  private cloudWatchClient: CloudWatchClient;
  private tableName: string;
  private metricsNamespace: string;

  constructor(region: string, tableName: string = 'FeatureFlags-Production') {
    this.dynamoClient = new DynamoDBClient({ region });
    this.cloudWatchClient = new CloudWatchClient({ region });
    this.tableName = tableName;
    this.metricsNamespace = 'ECOSYSTEMAWS/FeatureFlags';
  }

  /**
   * Check if a feature is enabled for a specific user
   */
  async isFeatureEnabled(flagName: string, userContext: UserContext): Promise<boolean> {
    try {
      const flag = await this.getFeatureFlag(flagName);
      
      if (!flag) {
        console.warn(`Feature flag ${flagName} not found`);
        return false;
      }

      // Kill switch check - highest priority
      if (flag.killSwitch) {
        console.log(`Feature ${flagName} disabled by kill switch`);
        await this.recordFlagEvaluation(flagName, userContext, false, 'killswitch');
        return false;
      }

      // Global flag disabled
      if (!flag.enabled) {
        await this.recordFlagEvaluation(flagName, userContext, false, 'disabled');
        return false;
      }

      // Check user segments first (more specific targeting)
      for (const segment of flag.userSegments) {
        if (segment.enabled && this.userMatchesSegment(userContext, segment)) {
          const segmentEnabled = this.isUserInRollout(userContext.userId, segment.rolloutPercentage);
          await this.recordFlagEvaluation(flagName, userContext, segmentEnabled, `segment:${segment.name}`);
          return segmentEnabled;
        }
      }

      // Fall back to global rollout percentage
      const globalEnabled = this.isUserInRollout(userContext.userId, flag.rolloutPercentage);
      await this.recordFlagEvaluation(flagName, userContext, globalEnabled, 'global');
      return globalEnabled;

    } catch (error) {
      console.error(`Error evaluating feature flag ${flagName}:`, error);
      await this.recordFlagEvaluation(flagName, userContext, false, 'error');
      return false; // Fail safe - default to disabled
    }
  }

  /**
   * Create or update a feature flag
   */
  async setFeatureFlag(flag: Partial<FeatureFlag>): Promise<void> {
    const now = new Date().toISOString();
    const existingFlag = await this.getFeatureFlag(flag.flagName!);
    
    const updatedFlag: FeatureFlag = {
      ...existingFlag,
      ...flag,
      updatedAt: now,
      version: (existingFlag?.version || 0) + 1,
      createdAt: existingFlag?.createdAt || now,
      metrics: existingFlag?.metrics || {
        totalRequests: 0,
        enabledRequests: 0,
        conversionRate: 0,
        errorRate: 0,
        averageLatency: 0,
        lastUpdated: now
      }
    } as FeatureFlag;

    const command = new PutItemCommand({
      TableName: this.tableName,
      Item: marshall(updatedFlag)
    });

    await this.dynamoClient.send(command);
    console.log(`Feature flag ${flag.flagName} updated to version ${updatedFlag.version}`);
  }

  /**
   * Emergency kill switch activation
   */
  async activateKillSwitch(flagName: string, reason: string): Promise<void> {
    console.log(`🚨 ACTIVATING KILL SWITCH for ${flagName}: ${reason}`);
    
    await this.setFeatureFlag({
      flagName,
      killSwitch: true,
      updatedAt: new Date().toISOString()
    });

    // Send alert to monitoring systems
    await this.sendKillSwitchAlert(flagName, reason);
    
    console.log(`✅ Kill switch activated for ${flagName}`);
  }

  /**
   * Deactivate kill switch
   */
  async deactivateKillSwitch(flagName: string): Promise<void> {
    console.log(`🔄 DEACTIVATING KILL SWITCH for ${flagName}`);
    
    await this.setFeatureFlag({
      flagName,
      killSwitch: false,
      updatedAt: new Date().toISOString()
    });
    
    console.log(`✅ Kill switch deactivated for ${flagName}`);
  }

  /**
   * Gradual rollout percentage adjustment
   */
  async adjustRolloutPercentage(flagName: string, percentage: number, segmentName?: string): Promise<void> {
    const flag = await this.getFeatureFlag(flagName);
    if (!flag) {
      throw new Error(`Feature flag ${flagName} not found`);
    }

    if (segmentName) {
      // Update specific segment
      const segment = flag.userSegments.find(s => s.name === segmentName);
      if (segment) {
        segment.rolloutPercentage = Math.max(0, Math.min(100, percentage));
      }
    } else {
      // Update global rollout
      flag.rolloutPercentage = Math.max(0, Math.min(100, percentage));
    }

    await this.setFeatureFlag(flag);
    console.log(`Rollout percentage for ${flagName}${segmentName ? `:${segmentName}` : ''} set to ${percentage}%`);
  }

  /**
   * Monitor rollback conditions and auto-rollback if needed
   */
  async checkRollbackConditions(flagName: string): Promise<boolean> {
    const flag = await this.getFeatureFlag(flagName);
    if (!flag || flag.rollbackConditions.length === 0) {
      return false;
    }

    for (const condition of flag.rollbackConditions) {
      const shouldRollback = await this.evaluateRollbackCondition(flagName, condition);
      if (shouldRollback) {
        console.log(`🚨 Rollback condition met for ${flagName}: ${condition.metric} ${condition.operator} ${condition.threshold}`);
        await this.activateKillSwitch(flagName, `Auto-rollback: ${condition.metric} threshold exceeded`);
        return true;
      }
    }

    return false;
  }

  /**
   * Get feature flag configuration
   */
  private async getFeatureFlag(flagName: string): Promise<FeatureFlag | null> {
    const command = new GetItemCommand({
      TableName: this.tableName,
      Key: marshall({ flagName })
    });

    const result = await this.dynamoClient.send(command);
    return result.Item ? unmarshall(result.Item) as FeatureFlag : null;
  }

  /**
   * Check if user matches segment conditions
   */
  private userMatchesSegment(userContext: UserContext, segment: UserSegment): boolean {
    return segment.conditions.every(condition => 
      this.evaluateSegmentCondition(userContext, condition)
    );
  }

  /**
   * Evaluate individual segment condition
   */
  private evaluateSegmentCondition(userContext: UserContext, condition: SegmentCondition): boolean {
    const userValue = this.getNestedValue(userContext, condition.field);
    
    switch (condition.operator) {
      case 'eq':
        return userValue === condition.value;
      case 'ne':
        return userValue !== condition.value;
      case 'gt':
        return Number(userValue) > Number(condition.value);
      case 'lt':
        return Number(userValue) < Number(condition.value);
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(userValue);
      case 'contains':
        return String(userValue).includes(String(condition.value));
      case 'startsWith':
        return String(userValue).startsWith(String(condition.value));
      default:
        return false;
    }
  }

  /**
   * Get nested object value by path
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Deterministic user assignment to rollout percentage
   */
  private isUserInRollout(userId: string, percentage: number): boolean {
    if (percentage <= 0) return false;
    if (percentage >= 100) return true;

    // Create deterministic hash of user ID
    const hash = crypto.createHash('md5').update(userId).digest('hex');
    const hashNumber = parseInt(hash.substring(0, 8), 16);
    const userPercentile = (hashNumber % 100) + 1;
    
    return userPercentile <= percentage;
  }

  /**
   * Record flag evaluation for metrics and analytics
   */
  private async recordFlagEvaluation(
    flagName: string,
    userContext: UserContext,
    enabled: boolean,
    reason: string
  ): Promise<void> {
    const metrics = [
      {
        MetricName: 'FlagEvaluations',
        Value: 1,
        Unit: 'Count',
        Dimensions: [
          { Name: 'FlagName', Value: flagName },
          { Name: 'Enabled', Value: enabled.toString() },
          { Name: 'Reason', Value: reason },
          { Name: 'UserType', Value: userContext.userType }
        ]
      }
    ];

    const command = new PutMetricDataCommand({
      Namespace: this.metricsNamespace,
      MetricData: metrics
    });

    try {
      await this.cloudWatchClient.send(command);
    } catch (error) {
      console.error('Failed to record flag evaluation metrics:', error);
    }
  }

  /**
   * Send kill switch alert
   */
  private async sendKillSwitchAlert(flagName: string, reason: string): Promise<void> {
    const alertMetric = {
      MetricName: 'KillSwitchActivated',
      Value: 1,
      Unit: 'Count',
      Dimensions: [
        { Name: 'FlagName', Value: flagName },
        { Name: 'Reason', Value: reason }
      ]
    };

    const command = new PutMetricDataCommand({
      Namespace: this.metricsNamespace,
      MetricData: [alertMetric]
    });

    await this.cloudWatchClient.send(command);
  }

  /**
   * Evaluate rollback condition based on metrics
   */
  private async evaluateRollbackCondition(flagName: string, condition: RollbackCondition): Promise<boolean> {
    // This would implement CloudWatch metrics evaluation
    // For now, returning false to prevent automatic rollbacks during development
    return false;
  }
}

/**
 * Pre-defined feature flags for AWS Native Payment System
 */
export const PAYMENT_SYSTEM_FEATURE_FLAGS = {
  // Core payment processing migration
  AWS_PAYMENT_PROCESSOR: {
    flagName: 'aws-payment-processor-enabled',
    description: 'Enable AWS native payment processing instead of Stripe',
    enabled: true,
    rolloutPercentage: 5, // Start with 5% canary
    killSwitch: false,
    userSegments: [
      {
        name: 'beta-testers',
        conditions: [
          { field: 'customAttributes.betaTester', operator: 'eq', value: true }
        ],
        rolloutPercentage: 100,
        enabled: true
      },
      {
        name: 'high-volume-customers',
        conditions: [
          { field: 'transactionHistory.totalVolume', operator: 'gt', value: 10000 }
        ],
        rolloutPercentage: 25,
        enabled: true
      }
    ],
    rollbackConditions: [
      {
        metric: 'PaymentFailureRate',
        threshold: 2.0, // 2% failure rate
        operator: 'gt',
        timeWindowMinutes: 5,
        consecutiveFailures: 3
      },
      {
        metric: 'PaymentLatency',
        threshold: 10000, // 10 seconds
        operator: 'gt',
        timeWindowMinutes: 10,
        consecutiveFailures: 5
      }
    ]
  },

  // Fraud detection system
  AWS_FRAUD_DETECTOR: {
    flagName: 'aws-fraud-detector-enabled',
    description: 'Enable AWS Fraud Detector for payment fraud prevention',
    enabled: true,
    rolloutPercentage: 50,
    killSwitch: false,
    userSegments: [
      {
        name: 'new-users',
        conditions: [
          { field: 'registrationDate', operator: 'gt', value: new Date(Date.now() - 30*24*60*60*1000).toISOString() }
        ],
        rolloutPercentage: 100,
        enabled: true
      }
    ],
    rollbackConditions: [
      {
        metric: 'FraudDetectionLatency',
        threshold: 2000, // 2 seconds
        operator: 'gt',
        timeWindowMinutes: 15,
        consecutiveFailures: 10
      }
    ]
  },

  // Direct ACH transfers
  DIRECT_ACH_TRANSFERS: {
    flagName: 'direct-ach-transfers-enabled',
    description: 'Enable direct ACH transfers for provider payouts',
    enabled: true,
    rolloutPercentage: 75,
    killSwitch: false,
    userSegments: [
      {
        name: 'verified-providers',
        conditions: [
          { field: 'userType', operator: 'eq', value: 'provider' },
          { field: 'customAttributes.verified', operator: 'eq', value: true }
        ],
        rolloutPercentage: 100,
        enabled: true
      }
    ],
    rollbackConditions: [
      {
        metric: 'ACHFailureRate',
        threshold: 1.0, // 1% failure rate
        operator: 'gt',
        timeWindowMinutes: 30,
        consecutiveFailures: 5
      }
    ]
  },

  // Automated escrow system
  AUTOMATED_ESCROW: {
    flagName: 'automated-escrow-enabled',
    description: 'Enable automated escrow management for booking payments',
    enabled: true,
    rolloutPercentage: 90,
    killSwitch: false,
    userSegments: [],
    rollbackConditions: [
      {
        metric: 'EscrowReleaseFailureRate',
        threshold: 0.5, // 0.5% failure rate
        operator: 'gt',
        timeWindowMinutes: 60,
        consecutiveFailures: 3
      }
    ]
  }
};

/**
 * Production feature flag manager
 */
export class ProductionFeatureFlagManager {
  private flagSystem: ProductionFeatureFlagSystem;

  constructor(region: string = 'us-east-1') {
    this.flagSystem = new ProductionFeatureFlagSystem(region);
  }

  /**
   * Initialize all production feature flags
   */
  async initializeProductionFlags(): Promise<void> {
    console.log('🚀 Initializing production feature flags...');

    for (const [key, flagConfig] of Object.entries(PAYMENT_SYSTEM_FEATURE_FLAGS)) {
      try {
        await this.flagSystem.setFeatureFlag(flagConfig as any);
        console.log(`✅ Initialized flag: ${flagConfig.flagName}`);
      } catch (error) {
        console.error(`❌ Failed to initialize flag ${flagConfig.flagName}:`, error);
      }
    }

    console.log('✅ Production feature flags initialized');
  }

  /**
   * Emergency rollback all payment features
   */
  async emergencyRollbackAll(reason: string): Promise<void> {
    console.log(`🚨 EMERGENCY ROLLBACK ALL: ${reason}`);

    const promises = Object.values(PAYMENT_SYSTEM_FEATURE_FLAGS).map(flag =>
      this.flagSystem.activateKillSwitch(flag.flagName, reason)
    );

    await Promise.all(promises);
    console.log('✅ All payment features rolled back');
  }

  /**
   * Get flag system for direct access
   */
  getFeatureFlagSystem(): ProductionFeatureFlagSystem {
    return this.flagSystem;
  }
}

export default ProductionFeatureFlagSystem;