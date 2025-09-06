import { defineFunction } from '@aws-amplify/backend';

export const fraudDetector = defineFunction({
  name: 'fraud-detector',
  entry: './handler.ts',
  environment: {
    // AWS Service ARNs (will be set by backend.ts)
    FRAUD_ALERTS_TOPIC_ARN: '',
    SECURITY_TEAM_ALERTS_TOPIC_ARN: '',
    PAYMENT_NOTIFICATIONS_TOPIC_ARN: '',
    
    // AWS Fraud Detector Configuration
    FRAUD_DETECTOR_NAME: 'ecosystem-fraud-detector',
    FRAUD_MODEL_NAME: 'ecosystem-payment-fraud-model',
    FRAUD_MODEL_VERSION: '1.0',
    
    // Database Tables
    TRANSACTION_TABLE: 'Transaction',
    FRAUD_EVENTS_TABLE: 'FraudEvent',
    ESCROW_ACCOUNT_TABLE: 'EscrowAccount',
    
    // Fraud Detection Thresholds (configurable)
    FRAUD_THRESHOLD_LOW: '200',
    FRAUD_THRESHOLD_MEDIUM: '500', 
    FRAUD_THRESHOLD_HIGH: '800',
    FRAUD_THRESHOLD_CRITICAL: '950',
    
    // Velocity Limits (configurable)
    VELOCITY_TXN_HOUR: '10',
    VELOCITY_TXN_DAY: '50',
    VELOCITY_AMOUNT_HOUR: '5000',
    VELOCITY_AMOUNT_DAY: '25000',
    
    // Security and Compliance
    ENABLE_PCI_LOGGING: 'true',
    ENABLE_GDPR_COMPLIANCE: 'true',
    FRAUD_DATA_RETENTION_DAYS: '2555', // 7 years for compliance
    
    // Performance Settings
    ENABLE_FRAUD_CACHING: 'true',
    CACHE_TTL_SECONDS: '300',
    
    // Feature Flags
    ENABLE_VELOCITY_CHECKING: 'true',
    ENABLE_DEVICE_FINGERPRINTING: 'true',
    ENABLE_GEOGRAPHIC_ANALYSIS: 'true',
    ENABLE_ML_SCORING: 'true',
    ENABLE_AUTOMATED_ACTIONS: 'true'
  },
  runtime: 20, // Node.js 20
  timeoutSeconds: 30, // Reduced to 30 seconds for real-time performance
  memoryMB: 1024, // Increased for ML model operations
  // Enable provisioned concurrency for consistent performance
  reservedConcurrency: 100,
});

// Additional resource configuration for enhanced security
export const fraudDetectorConfig = {
  // IAM permissions needed
  requiredPermissions: [
    'frauddetector:GetEventPrediction',
    'frauddetector:PutEvent', 
    'frauddetector:CreateRule',
    'frauddetector:UpdateRule',
    'frauddetector:GetRules',
    'dynamodb:PutItem',
    'dynamodb:GetItem',
    'dynamodb:UpdateItem',
    'dynamodb:Query',
    'dynamodb:Scan',
    'sns:Publish',
    'cloudwatch:PutMetricData',
    'kms:Decrypt',
    'kms:Encrypt',
    'logs:CreateLogGroup',
    'logs:CreateLogStream',
    'logs:PutLogEvents'
  ],
  
  // CloudWatch alarms for monitoring
  alarms: [
    {
      name: 'fraud-detection-errors',
      description: 'High error rate in fraud detection',
      metric: 'ErrorRate',
      threshold: 5, // 5% error rate
      period: 300 // 5 minutes
    },
    {
      name: 'fraud-detection-latency',
      description: 'High latency in fraud detection',
      metric: 'Duration',
      threshold: 5000, // 5 seconds
      period: 300
    },
    {
      name: 'critical-fraud-alerts',
      description: 'Critical fraud risk detected',
      metric: 'CriticalFraudCount', 
      threshold: 1, // Any critical fraud
      period: 60
    }
  ],
  
  // Security configuration
  security: {
    enableEncryptionInTransit: true,
    enableEncryptionAtRest: true,
    enableVpcEndpoints: true,
    enableCloudTrailLogging: true,
    dataClassification: 'CONFIDENTIAL',
    retentionPolicy: 'PCI_DSS_COMPLIANT'
  },
  
  // Performance optimization
  performance: {
    enableXRayTracing: true,
    enableCaching: true,
    enableConnectionPooling: true,
    targetLatency: '50ms', // Sub-50ms fraud detection
    targetThroughput: '1000req/sec'
  },
  
  // Compliance requirements
  compliance: {
    pciDssLevel: 1,
    gdprCompliant: true,
    soxCompliant: true,
    auditLogging: true,
    dataLocalization: 'US',
    encryptionStandard: 'AES-256'
  }
};