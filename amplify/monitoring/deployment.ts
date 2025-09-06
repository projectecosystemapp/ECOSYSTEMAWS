import { Construct } from 'constructs';
import { Stack, StackProps, Duration } from 'aws-cdk-lib';
import { Function as LambdaFunction } from 'aws-cdk-lib/aws-lambda';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { EcosystemPaymentMonitoring } from './comprehensive-monitoring';

/**
 * ECOSYSTEMAWS Monitoring Infrastructure Deployment
 * 
 * Deploys the complete monitoring and observability stack for the AWS native
 * payment system. Includes all dashboards, alarms, metrics, and supporting
 * infrastructure.
 */

export interface MonitoringStackProps extends StackProps {
  environment: 'dev' | 'staging' | 'production';
  
  // Payment system Lambda functions
  paymentFunctions: {
    awsPaymentProcessor: LambdaFunction;
    fraudDetector: LambdaFunction;
    escrowManager: LambdaFunction;
    achTransferManager: LambdaFunction;
    costMonitor: LambdaFunction;
    payoutManager: LambdaFunction;
    refundProcessor: LambdaFunction;
    bookingProcessor: LambdaFunction;
  };
  
  // DynamoDB tables
  tables: {
    transactions: Table;
    escrowAccounts: Table;
    paymentMethods: Table;
    costMetrics: Table;
    savingsReport: Table;
    businessMetrics: Table;
    systemHealthMetrics: Table;
    paymentMetrics: Table;
    incidents: Table;
    alertHistory: Table;
  };
  
  // Monitoring configuration
  alertConfig: {
    criticalEmail: string;
    warningEmail: string;
    slackWebhookUrl?: string;
    pagerDutyServiceKey?: string;
  };
  
  // Performance targets
  performanceTargets?: {
    paymentProcessingLatencyMs?: number;
    fraudDetectionLatencyMs?: number;
    transactionSuccessRate?: number;
    costSavingsTarget?: number;
  };
}

export class EcosystemMonitoringStack extends Stack {
  public readonly monitoring: EcosystemPaymentMonitoring;
  public readonly monitoringConfig: any;
  
  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);
    
    console.log(`Deploying monitoring stack for environment: ${props.environment}`);
    
    // Deploy comprehensive monitoring system
    this.monitoring = new EcosystemPaymentMonitoring(this, 'PaymentMonitoring', {
      environment: props.environment,
      paymentFunctions: props.paymentFunctions,
      tables: props.tables,
      alertConfig: props.alertConfig,
      performanceTargets: props.performanceTargets,
    });
    
    // Get monitoring configuration for outputs
    this.monitoringConfig = this.monitoring.getMonitoringConfiguration();
    
    // Add stack tags for resource management
    this.addStackTags();
    
    console.log('Monitoring stack deployment completed');
  }
  
  /**
   * Add consistent tags to all stack resources
   */
  private addStackTags(): void {
    const commonTags = {
      Project: 'ECOSYSTEMAWS',
      Component: 'Payment-Monitoring',
      Environment: this.node.tryGetContext('environment') || 'unknown',
      ManagedBy: 'CDK',
      CostCenter: 'Payment-Operations',
      DataClassification: 'Internal',
      Backup: 'Required',
      MonitoringEnabled: 'True',
    };
    
    Object.entries(commonTags).forEach(([key, value]) => {
      this.node.addMetadata(key, value);
    });
  }
  
  /**
   * Get deployment outputs for integration
   */
  public getDeploymentOutputs() {
    return {
      monitoringConfiguration: this.monitoringConfig,
      dashboardUrls: {
        executive: this.monitoringConfig.dashboards.executive.url,
        technical: this.monitoringConfig.dashboards.technical.url,
        security: this.monitoringConfig.dashboards.security.url,
        costOptimization: this.monitoringConfig.dashboards.costOptimization.url,
      },
      alertTopics: {
        critical: this.monitoringConfig.alerting.criticalTopicArn,
        warning: this.monitoringConfig.alerting.warningTopicArn,
        business: this.monitoringConfig.alerting.businessTopicArn,
      },
      alarmsDeployed: {
        critical: this.monitoringConfig.alerting.totalCriticalAlarms,
        warning: this.monitoringConfig.alerting.totalWarningAlarms,
        business: this.monitoringConfig.alerting.totalBusinessAlarms,
      },
      namespace: this.monitoringConfig.metrics.namespace,
    };
  }
}

/**
 * Monitoring Deployment Configuration
 * 
 * Environment-specific configuration for monitoring deployment
 */
export const MonitoringDeploymentConfig = {
  dev: {
    performanceTargets: {
      paymentProcessingLatencyMs: 300, // More relaxed for dev
      fraudDetectionLatencyMs: 100,
      transactionSuccessRate: 99.0,
      costSavingsTarget: 95,
    },
    alertConfig: {
      criticalEmail: 'dev-alerts@ecosystem.aws',
      warningEmail: 'dev-alerts@ecosystem.aws',
    },
  },
  
  staging: {
    performanceTargets: {
      paymentProcessingLatencyMs: 250,
      fraudDetectionLatencyMs: 75,
      transactionSuccessRate: 99.5,
      costSavingsTarget: 97,
    },
    alertConfig: {
      criticalEmail: 'staging-alerts@ecosystem.aws',
      warningEmail: 'staging-alerts@ecosystem.aws',
      slackWebhookUrl: process.env.STAGING_SLACK_WEBHOOK,
    },
  },
  
  production: {
    performanceTargets: {
      paymentProcessingLatencyMs: 200,
      fraudDetectionLatencyMs: 50,
      transactionSuccessRate: 99.95,
      costSavingsTarget: 98,
    },
    alertConfig: {
      criticalEmail: 'production-alerts@ecosystem.aws',
      warningEmail: 'production-alerts@ecosystem.aws',
      slackWebhookUrl: process.env.PRODUCTION_SLACK_WEBHOOK,
      pagerDutyServiceKey: process.env.PAGERDUTY_SERVICE_KEY,
    },
  },
};

/**
 * Monitoring Feature Flags
 * 
 * Control deployment of specific monitoring features
 */
export const MonitoringFeatureFlags = {
  // Dashboard features
  enableExecutiveDashboard: true,
  enableTechnicalDashboard: true,
  enableSecurityDashboard: true,
  enableCostOptimizationDashboard: true,
  
  // Alerting features
  enableSlackIntegration: true,
  enablePagerDutyIntegration: true,
  enableBusinessAlerts: true,
  enableSecurityAlerts: true,
  
  // Advanced features
  enableLogAnalysis: true,
  enableAnomalyDetection: true,
  enablePredictiveAlerting: false, // Future feature
  enableAutoRemediation: false, // Future feature
  
  // Compliance features
  enableAuditLogging: true,
  enableComplianceReporting: true,
  enableDataRetentionPolicies: true,
};

/**
 * Monitoring Resource Limits
 * 
 * Prevent monitoring costs from spiraling
 */
export const MonitoringResourceLimits = {
  // CloudWatch limits
  maxCustomMetrics: 100,
  maxDashboards: 10,
  maxAlarms: 50,
  
  // Log retention limits
  maxLogRetentionDays: 180,
  maxLogGroups: 50,
  
  // Query limits
  maxConcurrentQueries: 10,
  maxQueryResultsPerDay: 1000,
  
  // Storage limits
  maxDashboardHistory: '15 months',
  maxAlertHistory: '90 days',
  maxIncidentHistory: '2 years',
  
  // Cost controls
  maxMonthlyBudget: 500, // $500/month
  alertThreshold: 400, // Alert at 80% of budget
};