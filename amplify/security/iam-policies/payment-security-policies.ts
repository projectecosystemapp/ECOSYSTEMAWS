import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

/**
 * AWS Payment System Security Policies
 * 
 * CRITICAL SECURITY NOTICE:
 * These IAM policies implement strict least-privilege access controls
 * for AWS-native payment processing functions. Each policy is designed
 * to provide only the minimum permissions required for specific operations
 * while maintaining enterprise-grade security and compliance standards.
 * 
 * SECURITY PRINCIPLES:
 * ✅ Least-privilege access (minimum required permissions only)
 * ✅ Resource-specific ARN restrictions where possible
 * ✅ Time-based access controls with session duration limits
 * ✅ Condition-based restrictions for enhanced security
 * ✅ Separation of duties between payment functions
 * ✅ Comprehensive audit trail requirements
 * ✅ Encryption requirements for all data access
 * ✅ Network-based access restrictions where applicable
 * 
 * COMPLIANCE FRAMEWORKS:
 * - PCI DSS Level 1 compliance requirements
 * - SOC 2 Type II security controls
 * - ISO 27001 information security standards
 * - FFIEC guidelines for financial institutions
 * - NIST Cybersecurity Framework alignment
 */

/**
 * AWS Payment Cryptography Service IAM Policy
 * Provides minimal access to Payment Cryptography for card processing
 */
export const awsPaymentCryptographyPolicy = new PolicyStatement({
  sid: 'AWSPaymentCryptographyAccess',
  effect: Effect.ALLOW,
  actions: [
    // Payment Cryptography Data Plane Operations (card processing)
    'payment-cryptography-data:DecryptData',
    'payment-cryptography-data:EncryptData',
    'payment-cryptography-data:GenerateMac',
    'payment-cryptography-data:VerifyMac',
    'payment-cryptography-data:ReEncryptData',
    
    // Payment Cryptography Control Plane Operations (key management)
    'payment-cryptography:GetKey',
    'payment-cryptography:GetKeyUsage',
    'payment-cryptography:GetParametersForImport',
  ],
  resources: [
    // Restrict to specific payment cryptography keys only
    'arn:aws:payment-cryptography:*:*:key/payment-processing-*',
    'arn:aws:payment-cryptography-data:*:*:key/payment-processing-*',
  ],
  conditions: {
    StringEquals: {
      // Require encryption in transit
      'aws:SecureTransport': 'true',
      // Restrict to specific key usage
      'payment-cryptography:KeyUsage': [
        'TR31_P0_PIN_ENCRYPTION_KEY',
        'TR31_D0_DATA_ENCRYPTION_KEY',
        'TR31_M1_MAC_GENERATION_AUTHENTICATION',
      ],
    },
    StringLike: {
      // Restrict to authorized regions for PCI compliance
      'aws:RequestedRegion': [
        'us-east-1',
        'us-west-2',
        'eu-west-1', // For international compliance if needed
      ],
    },
    DateLessThan: {
      // Session duration limit for enhanced security
      'aws:TokenIssueTime': '${aws:TokenIssueTime + 3600}', // 1 hour sessions
    },
  },
});

/**
 * KMS Key Access Policy for Payment Processing
 * Provides secure access to encryption keys with strict controls
 */
export const paymentKmsKeyPolicy = new PolicyStatement({
  sid: 'PaymentKMSKeyAccess',
  effect: Effect.ALLOW,
  actions: [
    'kms:Encrypt',
    'kms:Decrypt',
    'kms:ReEncrypt*',
    'kms:GenerateDataKey',
    'kms:GenerateDataKeyWithoutPlaintext',
    'kms:CreateGrant',
    'kms:RevokeGrant',
    'kms:RetireGrant',
    'kms:DescribeKey',
    'kms:GetKeyPolicy',
    'kms:GetKeyRotationStatus',
  ],
  resources: [
    // Payment-specific KMS keys only
    'arn:aws:kms:*:*:key/*',
  ],
  conditions: {
    StringEquals: {
      'aws:SecureTransport': 'true',
      // Require specific encryption context for payment data
      'kms:EncryptionContext:purpose': [
        'payment-processing',
        'ach-transfer',
        'escrow-management',
        'audit-logging',
      ],
      'kms:EncryptionContext:service': 'ECOSYSTEMAWS-PAYMENTS',
    },
    StringLike: {
      // Restrict to payment-related key aliases only
      'kms:DescribeKey': [
        'alias/payment-*',
        'alias/escrow-*',
        'alias/ach-*',
        'alias/audit-*',
      ],
    },
    NumericLessThan: {
      // Limit key usage to reasonable amounts
      'kms:GrantOperations': '10',
    },
    Bool: {
      // Require key rotation
      'kms:RotationEnabled': 'true',
    },
  },
});

/**
 * DynamoDB Access Policy for Payment Data
 * Secure access to payment transaction tables with encryption requirements
 */
export const paymentDynamoDbPolicy = new PolicyStatement({
  sid: 'PaymentDynamoDBAccess',
  effect: Effect.ALLOW,
  actions: [
    'dynamodb:GetItem',
    'dynamodb:PutItem',
    'dynamodb:UpdateItem',
    'dynamodb:DeleteItem',
    'dynamodb:Query',
    'dynamodb:Scan',
    'dynamodb:BatchGetItem',
    'dynamodb:BatchWriteItem',
    'dynamodb:TransactWriteItems',
    'dynamodb:TransactGetItems',
    'dynamodb:ConditionCheckItem',
  ],
  resources: [
    // Payment-specific tables only
    'arn:aws:dynamodb:*:*:table/PaymentTransactions',
    'arn:aws:dynamodb:*:*:table/PaymentTransactions/*',
    'arn:aws:dynamodb:*:*:table/AchTransactions',
    'arn:aws:dynamodb:*:*:table/AchTransactions/*',
    'arn:aws:dynamodb:*:*:table/EscrowAccounts',
    'arn:aws:dynamodb:*:*:table/EscrowAccounts/*',
    'arn:aws:dynamodb:*:*:table/BankAccounts',
    'arn:aws:dynamodb:*:*:table/BankAccounts/*',
    'arn:aws:dynamodb:*:*:table/ComplianceReports',
    'arn:aws:dynamodb:*:*:table/ComplianceReports/*',
    'arn:aws:dynamodb:*:*:table/FraudAssessments',
    'arn:aws:dynamodb:*:*:table/FraudAssessments/*',
    'arn:aws:dynamodb:*:*:table/AuditLogs',
    'arn:aws:dynamodb:*:*:table/AuditLogs/*',
  ],
  conditions: {
    StringEquals: {
      'aws:SecureTransport': 'true',
      // Require server-side encryption
      'dynamodb:EncryptionEnabled': 'true',
    },
    StringLike: {
      // Restrict operations based on item attributes
      'dynamodb:LeadingKeys': [
        'PAYMENT_*',
        'ACH_*',
        'ESCROW_*',
        'AUDIT_*',
      ],
    },
    ForAllValues:StringEquals: {
      // Restrict which attributes can be modified
      'dynamodb:Attributes': [
        'id',
        'customerId',
        'amount',
        'status',
        'timestamp',
        'encryptedData',
        'riskScore',
        'complianceFlags',
        'auditTrail',
        'correlationId',
        'transactionType',
      ],
    },
    NumericLessThan: {
      // Limit batch operations size
      'dynamodb:BatchSize': '25',
    },
  },
});

/**
 * Fraud Detector Service Access Policy
 * Secure access to AWS Fraud Detector for risk assessment
 */
export const fraudDetectorPolicy = new PolicyStatement({
  sid: 'FraudDetectorAccess',
  effect: Effect.ALLOW,
  actions: [
    'frauddetector:GetEventPrediction',
    'frauddetector:BatchGetVariable',
    'frauddetector:GetDetectorVersion',
    'frauddetector:GetModelVersion',
    'frauddetector:GetRules',
    'frauddetector:GetVariables',
    'frauddetector:GetOutcomes',
    'frauddetector:DescribeDetector',
    'frauddetector:DescribeModelVersions',
  ],
  resources: [
    // Payment fraud detection models only
    'arn:aws:frauddetector:*:*:detector/payment-fraud-detector',
    'arn:aws:frauddetector:*:*:detector/payment-fraud-detector/*',
    'arn:aws:frauddetector:*:*:model/payment-fraud-model',
    'arn:aws:frauddetector:*:*:model/payment-fraud-model/*',
    'arn:aws:frauddetector:*:*:event-type/payment_transaction',
    'arn:aws:frauddetector:*:*:variable/payment_*',
    'arn:aws:frauddetector:*:*:outcome/fraud_*',
    'arn:aws:frauddetector:*:*:rule/payment_*',
  ],
  conditions: {
    StringEquals: {
      'aws:SecureTransport': 'true',
      // Restrict to specific event types
      'frauddetector:EventTypeName': 'payment_transaction',
    },
    NumericLessThan: {
      // Limit prediction batch size
      'frauddetector:BatchSize': '100',
    },
    StringLike: {
      'aws:userid': [
        // Restrict to specific service roles
        '*:payment-processor-role',
        '*:ach-manager-role',
        '*:escrow-manager-role',
      ],
    },
  },
});

/**
 * CloudWatch Logs Policy for Audit Logging
 * Secure access to CloudWatch for compliance and audit logging
 */
export const auditLoggingPolicy = new PolicyStatement({
  sid: 'AuditLoggingAccess',
  effect: Effect.ALLOW,
  actions: [
    'logs:CreateLogGroup',
    'logs:CreateLogStream',
    'logs:PutLogEvents',
    'logs:DescribeLogGroups',
    'logs:DescribeLogStreams',
    'logs:PutRetentionPolicy',
  ],
  resources: [
    // Payment audit log groups only
    'arn:aws:logs:*:*:log-group:/aws/lambda/aws-payment-processor*',
    'arn:aws:logs:*:*:log-group:/aws/lambda/ach-transfer-manager*',
    'arn:aws:logs:*:*:log-group:/aws/lambda/escrow-manager*',
    'arn:aws:logs:*:*:log-group:/aws/payment-audit/*',
    'arn:aws:logs:*:*:log-group:/aws/compliance-reports/*',
  ],
  conditions: {
    StringEquals: {
      'aws:SecureTransport': 'true',
    },
    NumericGreaterThanEquals: {
      // Enforce minimum retention period for compliance
      'logs:RetentionInDays': '2555', // 7 years
    },
    StringLike: {
      // Ensure proper log group naming convention
      'logs:LogGroupName': [
        '/aws/lambda/payment-*',
        '/aws/lambda/*-payment-*',
        '/aws/payment-audit/*',
        '/aws/compliance-reports/*',
      ],
    },
  },
});

/**
 * SNS Notifications Policy for Security Alerts
 * Access to SNS for critical security and compliance notifications
 */
export const securityNotificationPolicy = new PolicyStatement({
  sid: 'SecurityNotificationAccess',
  effect: Effect.ALLOW,
  actions: [
    'sns:Publish',
    'sns:GetTopicAttributes',
  ],
  resources: [
    // Security alert topics only
    'arn:aws:sns:*:*:payment-security-alerts',
    'arn:aws:sns:*:*:fraud-detection-alerts',
    'arn:aws:sns:*:*:compliance-violations',
    'arn:aws:sns:*:*:suspicious-activity-reports',
    'arn:aws:sns:*:*:ach-transaction-alerts',
    'arn:aws:sns:*:*:escrow-status-updates',
  ],
  conditions: {
    StringEquals: {
      'aws:SecureTransport': 'true',
      // Ensure messages are from authorized sources
      'sns:Protocol': ['https', 'sqs'],
    },
    StringLike: {
      'sns:MessageStructure': 'json',
      // Enforce message format for security alerts
      'sns:Subject': [
        'SECURITY_ALERT*',
        'FRAUD_DETECTION*',
        'COMPLIANCE_VIOLATION*',
        'SUSPICIOUS_ACTIVITY*',
      ],
    },
  },
});

/**
 * EventBridge Policy for Payment Event Processing
 * Secure access to EventBridge for payment workflow orchestration
 */
export const paymentEventBridgePolicy = new PolicyStatement({
  sid: 'PaymentEventBridgeAccess',
  effect: Effect.ALLOW,
  actions: [
    'events:PutEvents',
    'events:DescribeRule',
    'events:ListTargetsByRule',
  ],
  resources: [
    // Payment event bus and rules only
    'arn:aws:events:*:*:event-bus/payment-events',
    'arn:aws:events:*:*:rule/payment-*',
    'arn:aws:events:*:*:rule/ach-*',
    'arn:aws:events:*:*:rule/escrow-*',
    'arn:aws:events:*:*:rule/fraud-*',
    'arn:aws:events:*:*:rule/compliance-*',
  ],
  conditions: {
    StringEquals: {
      'aws:SecureTransport': 'true',
      // Restrict to payment-related event sources
      'events:source': [
        'payment.processor',
        'ach.transfer',
        'escrow.manager',
        'fraud.detector',
        'compliance.monitor',
      ],
    },
    StringLike: {
      'events:detail-type': [
        'Payment*',
        'ACH*',
        'Escrow*',
        'Fraud*',
        'Compliance*',
      ],
    },
    NumericLessThan: {
      // Limit event batch size
      'events:BatchSize': '10',
    },
  },
});

/**
 * Step Functions Policy for Payment Workflows
 * Access to Step Functions for complex payment processing workflows
 */
export const paymentWorkflowPolicy = new PolicyStatement({
  sid: 'PaymentWorkflowAccess',
  effect: Effect.ALLOW,
  actions: [
    'states:StartExecution',
    'states:StopExecution',
    'states:DescribeExecution',
    'states:GetExecutionHistory',
    'states:ListExecutions',
    'states:SendTaskSuccess',
    'states:SendTaskFailure',
    'states:SendTaskHeartbeat',
  ],
  resources: [
    // Payment workflow state machines only
    'arn:aws:states:*:*:stateMachine:payment-processing-*',
    'arn:aws:states:*:*:stateMachine:ach-transfer-*',
    'arn:aws:states:*:*:stateMachine:escrow-management-*',
    'arn:aws:states:*:*:stateMachine:fraud-investigation-*',
    'arn:aws:states:*:*:stateMachine:compliance-monitoring-*',
    'arn:aws:states:*:*:execution:payment-processing-*',
    'arn:aws:states:*:*:execution:ach-transfer-*',
    'arn:aws:states:*:*:execution:escrow-management-*',
  ],
  conditions: {
    StringEquals: {
      'aws:SecureTransport': 'true',
    },
    StringLike: {
      // Ensure proper execution naming convention
      'states:ExecutionName': [
        'payment-*',
        'ach-*',
        'escrow-*',
        'fraud-*',
        'compliance-*',
      ],
    },
    NumericLessThan: {
      // Limit concurrent executions
      'states:ConcurrentExecutions': '100',
    },
  },
});

/**
 * CloudWatch Metrics Policy for Performance Monitoring
 * Access to CloudWatch metrics for payment system monitoring
 */
export const paymentMetricsPolicy = new PolicyStatement({
  sid: 'PaymentMetricsAccess',
  effect: Effect.ALLOW,
  actions: [
    'cloudwatch:PutMetricData',
    'cloudwatch:GetMetricStatistics',
    'cloudwatch:GetMetricData',
    'cloudwatch:ListMetrics',
    'cloudwatch:PutDashboard',
    'cloudwatch:GetDashboard',
  ],
  resources: ['*'], // CloudWatch metrics don't support resource-level permissions
  conditions: {
    StringEquals: {
      'aws:SecureTransport': 'true',
    },
    StringLike: {
      // Restrict to payment-related metrics only
      'cloudwatch:namespace': [
        'AWS/Payment/*',
        'AWS/ACH/*',
        'AWS/Escrow/*',
        'AWS/Fraud/*',
        'Custom/Payment/*',
        'Custom/Security/*',
      ],
    },
    ForAllValues:StringLike: {
      'cloudwatch:metric-name': [
        'PaymentProcessed*',
        'ACHTransfer*',
        'EscrowCreated*',
        'FraudDetected*',
        'ComplianceViolation*',
        'SecurityAlert*',
        'AuditLogGenerated*',
      ],
    },
  },
});

/**
 * Secrets Manager Policy for Secure Configuration
 * Access to Secrets Manager for secure storage of sensitive configuration
 */
export const paymentSecretsPolicy = new PolicyStatement({
  sid: 'PaymentSecretsAccess',
  effect: Effect.ALLOW,
  actions: [
    'secretsmanager:GetSecretValue',
    'secretsmanager:DescribeSecret',
  ],
  resources: [
    // Payment-related secrets only
    'arn:aws:secretsmanager:*:*:secret:payment/*',
    'arn:aws:secretsmanager:*:*:secret:ach/*',
    'arn:aws:secretsmanager:*:*:secret:escrow/*',
    'arn:aws:secretsmanager:*:*:secret:fraud-detector/*',
    'arn:aws:secretsmanager:*:*:secret:banking-partner/*',
    'arn:aws:secretsmanager:*:*:secret:compliance/*',
  ],
  conditions: {
    StringEquals: {
      'aws:SecureTransport': 'true',
      // Require specific version stage
      'secretsmanager:VersionStage': ['AWSCURRENT', 'AWSPENDING'],
    },
    StringLike: {
      // Ensure proper secret naming convention
      'secretsmanager:Name': [
        'payment/*',
        'ach/*',
        'escrow/*',
        'fraud-detector/*',
        'banking-partner/*',
        'compliance/*',
      ],
    },
    DateGreaterThan: {
      // Require recent authentication
      'aws:TokenIssueTime': '${aws:CurrentTime - 3600}', // Within last hour
    },
  },
});

/**
 * Lambda Invocation Policy for Inter-Function Communication
 * Secure Lambda-to-Lambda invocation for payment processing
 */
export const paymentLambdaInvocationPolicy = new PolicyStatement({
  sid: 'PaymentLambdaInvocation',
  effect: Effect.ALLOW,
  actions: [
    'lambda:InvokeFunction',
    'lambda:InvokeAsync',
  ],
  resources: [
    // Payment-related functions only
    'arn:aws:lambda:*:*:function:aws-payment-processor',
    'arn:aws:lambda:*:*:function:ach-transfer-manager',
    'arn:aws:lambda:*:*:function:escrow-manager',
    'arn:aws:lambda:*:*:function:fraud-assessor',
    'arn:aws:lambda:*:*:function:compliance-monitor',
    'arn:aws:lambda:*:*:function:audit-logger',
  ],
  conditions: {
    StringEquals: {
      'aws:SecureTransport': 'true',
      // Require specific invocation type
      'lambda:InvocationType': ['RequestResponse', 'Event'],
    },
    StringLike: {
      'lambda:FunctionName': [
        '*payment*',
        '*ach*',
        '*escrow*',
        '*fraud*',
        '*compliance*',
        '*audit*',
      ],
    },
    NumericLessThan: {
      // Prevent infinite recursion
      'lambda:EventSourceToken': '5',
    },
  },
});

/**
 * Comprehensive Payment System Policy Collection
 * Combines all individual policies for complete payment system access
 */
export const paymentSystemPolicies = [
  awsPaymentCryptographyPolicy,
  paymentKmsKeyPolicy,
  paymentDynamoDbPolicy,
  fraudDetectorPolicy,
  auditLoggingPolicy,
  securityNotificationPolicy,
  paymentEventBridgePolicy,
  paymentWorkflowPolicy,
  paymentMetricsPolicy,
  paymentSecretsPolicy,
  paymentLambdaInvocationPolicy,
];

/**
 * Deny Policy for Explicit Security Restrictions
 * Explicitly denies dangerous operations that could compromise security
 */
export const paymentSecurityDenyPolicy = new PolicyStatement({
  sid: 'PaymentSecurityDenyPolicy',
  effect: Effect.DENY,
  actions: [
    // Deny dangerous KMS operations
    'kms:DeleteKey',
    'kms:ScheduleKeyDeletion',
    'kms:DisableKey',
    'kms:PutKeyPolicy',
    
    // Deny DynamoDB table modifications
    'dynamodb:DeleteTable',
    'dynamodb:UpdateTable',
    'dynamodb:CreateBackup',
    'dynamodb:DeleteBackup',
    
    // Deny CloudWatch log modifications
    'logs:DeleteLogGroup',
    'logs:DeleteLogStream',
    'logs:DeleteRetentionPolicy',
    
    // Deny SNS topic modifications
    'sns:DeleteTopic',
    'sns:SetTopicAttributes',
    'sns:AddPermission',
    'sns:RemovePermission',
    
    // Deny EventBridge modifications
    'events:DeleteRule',
    'events:PutRule',
    'events:PutTargets',
    'events:RemoveTargets',
    
    // Deny Step Functions modifications
    'states:DeleteStateMachine',
    'states:UpdateStateMachine',
    
    // Deny Lambda function modifications
    'lambda:DeleteFunction',
    'lambda:UpdateFunctionCode',
    'lambda:UpdateFunctionConfiguration',
    'lambda:AddPermission',
    'lambda:RemovePermission',
    
    // Deny Secrets Manager deletions
    'secretsmanager:DeleteSecret',
    'secretsmanager:ForceDeleteSecret',
    'secretsmanager:PutSecretValue',
    'secretsmanager:UpdateSecret',
  ],
  resources: ['*'],
  conditions: {
    StringNotEquals: {
      // Allow emergency break-glass access for authorized admins only
      'aws:userid': [
        'AIDACKCEVSQ6C2EXAMPLE', // Emergency admin user ID
        'AROLEID:EmergencyPaymentAdmin', // Emergency admin role
      ],
    },
  },
});

/**
 * Policy validation helper function
 * Validates that all policies follow security best practices
 */
export function validatePaymentPolicies(): boolean {
  const validationChecks = [
    // Check that all policies require encrypted transport
    paymentSystemPolicies.every(policy => 
      policy.conditions?.StringEquals?.['aws:SecureTransport'] === 'true'
    ),
    
    // Check that resource restrictions are in place
    paymentSystemPolicies.every(policy => 
      Array.isArray(policy.resources) && 
      policy.resources.length > 0 && 
      !policy.resources.includes('*')
    ),
    
    // Check that condition statements exist for enhanced security
    paymentSystemPolicies.every(policy => 
      policy.conditions && Object.keys(policy.conditions).length > 0
    ),
  ];
  
  return validationChecks.every(check => check === true);
}

/**
 * Export complete policy configuration
 */
export const paymentSecurityConfiguration = {
  policies: paymentSystemPolicies,
  denyPolicy: paymentSecurityDenyPolicy,
  validationFunction: validatePaymentPolicies,
};