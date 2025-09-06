import { a } from '@aws-amplify/backend';

/**
 * ECOSYSTEMAWS Monitoring Schema Extensions
 * 
 * Extends the main GraphQL schema with comprehensive monitoring capabilities
 * for the AWS native payment system. Provides real-time business metrics,
 * system health monitoring, and compliance reporting.
 */

export const monitoringSchema = {
  // ========== Monitoring Data Models ==========
  
  // System Health Metrics
  SystemHealthMetric: a
    .model({
      metricId: a.string().required(),
      serviceName: a.string().required(),
      metricType: a.enum(['PERFORMANCE', 'BUSINESS', 'SECURITY', 'COST']),
      metricName: a.string().required(),
      value: a.float().required(),
      unit: a.string().required(),
      dimensions: a.json(),
      timestamp: a.datetime().required(),
      region: a.string().required(),
      environment: a.string().required(),
      alertStatus: a.enum(['OK', 'WARNING', 'CRITICAL']),
      tags: a.json(),
    })
    .secondaryIndexes((index) => [
      index('serviceName').sortKeys(['timestamp']),
      index('metricType').sortKeys(['timestamp']),
      index('alertStatus').sortKeys(['timestamp']),
    ])
    .authorization((allow) => [
      allow.groups(['Admin', 'DevOps']).to(['create', 'read', 'update']),
      allow.authenticated().to(['read']),
    ]),

  // Payment Processing Metrics
  PaymentMetric: a
    .model({
      transactionId: a.string().required(),
      paymentMethod: a.enum(['card', 'ach', 'wire', 'digital_wallet']),
      processingTimeMs: a.integer().required(),
      fraudScore: a.float(),
      fraudDecision: a.enum(['APPROVE', 'REVIEW', 'BLOCK']),
      costBreakdown: a.json(), // AWS vs Stripe cost comparison
      success: a.boolean().required(),
      errorCode: a.string(),
      errorMessage: a.string(),
      correlationId: a.string().required(),
      region: a.string().required(),
      timestamp: a.datetime().required(),
    })
    .secondaryIndexes((index) => [
      index('paymentMethod').sortKeys(['timestamp']),
      index('success').sortKeys(['timestamp']),
      index('correlationId'),
    ])
    .authorization((allow) => [
      allow.groups(['Admin', 'Finance', 'DevOps']).to(['create', 'read']),
    ]),

  // Business Performance Dashboard Data
  BusinessMetric: a
    .model({
      date: a.string().required(), // YYYY-MM-DD format
      metricCategory: a.enum(['REVENUE', 'VOLUME', 'PERFORMANCE', 'COST']),
      totalTransactions: a.integer(),
      totalVolumeCents: a.integer(),
      averageTransactionSizeCents: a.integer(),
      successRate: a.float(),
      averageProcessingTimeMs: a.float(),
      fraudDetectionRate: a.float(),
      costSavingsVsStripeCents: a.integer(),
      monthlyProjectedSavings: a.integer(),
      topPaymentMethods: a.json(),
      regional breakdown: a.json(),
      metadata: a.json(),
    })
    .authorization((allow) => [
      allow.groups(['Admin', 'Finance', 'Executive']).to(['create', 'read']),
    ]),

  // Incident Management
  Incident: a
    .model({
      incidentId: a.string().required(),
      title: a.string().required(),
      description: a.string().required(),
      severity: a.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
      status: a.enum(['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED']),
      affectedServices: a.string().array(),
      detectedAt: a.datetime().required(),
      resolvedAt: a.datetime(),
      assignedTo: a.string(),
      rootCause: a.string(),
      actionItems: a.json(),
      impactAssessment: a.json(),
      communicationLog: a.json(),
      tags: a.json(),
    })
    .secondaryIndexes((index) => [
      index('severity').sortKeys(['detectedAt']),
      index('status').sortKeys(['detectedAt']),
      index('assignedTo').sortKeys(['detectedAt']),
    ])
    .authorization((allow) => [
      allow.groups(['Admin', 'DevOps', 'Support']).to(['create', 'read', 'update']),
    ]),

  // Cost Optimization Tracking
  CostOptimization: a
    .model({
      optimizationId: a.string().required(),
      resourceType: a.enum(['LAMBDA', 'DYNAMODB', 'APPSYNC', 'KMS', 'ACH']),
      currentCost: a.float().required(),
      optimizedCost: a.float().required(),
      savingsPercent: a.float().required(),
      implementationDate: a.date().required(),
      description: a.string().required(),
      measuredImpact: a.json(),
      roi: a.float(),
      status: a.enum(['PROPOSED', 'APPROVED', 'IMPLEMENTED', 'MEASURED']),
    })
    .authorization((allow) => [
      allow.groups(['Admin', 'Finance', 'DevOps']).to(['create', 'read', 'update']),
    ]),

  // ========== Monitoring Query Operations ==========
  
  // Real-time System Health Dashboard
  getSystemHealth: a
    .query()
    .arguments({
      timeRange: a.enum(['1H', '6H', '24H', '7D', '30D']).required(),
      services: a.string().array(),
      metricTypes: a.string().array(),
    })
    .returns(a.json())
    .handler([
      a.handler.function('systemHealthMonitor')
    ])
    .authorization((allow) => [
      allow.authenticated()
    ]),

  // Payment Processing Analytics
  getPaymentAnalytics: a
    .query()
    .arguments({
      startDate: a.string().required(),
      endDate: a.string().required(),
      paymentMethods: a.string().array(),
      groupBy: a.enum(['HOUR', 'DAY', 'WEEK', 'MONTH']),
    })
    .returns(a.json())
    .handler([
      a.handler.function('paymentAnalyticsProcessor')
    ])
    .authorization((allow) => [
      allow.groups(['Admin', 'Finance', 'DevOps'])
    ]),

  // Cost Savings Dashboard
  getCostSavingsReport: a
    .query()
    .arguments({
      period: a.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY']).required(),
      compareToStripe: a.boolean(),
    })
    .returns(a.json())
    .handler([
      a.handler.function('costSavingsAnalyzer')
    ])
    .authorization((allow) => [
      allow.groups(['Admin', 'Finance', 'Executive'])
    ]),

  // Fraud Detection Analytics
  getFraudAnalytics: a
    .query()
    .arguments({
      timeRange: a.string().required(),
      scoreThreshold: a.float(),
    })
    .returns(a.json())
    .handler([
      a.handler.function('fraudAnalyticsProcessor')
    ])
    .authorization((allow) => [
      allow.groups(['Admin', 'Security', 'DevOps'])
    ]),

  // Performance Benchmarking
  getPerformanceBenchmark: a
    .query()
    .arguments({
      services: a.string().array().required(),
      benchmarkType: a.enum(['LATENCY', 'THROUGHPUT', 'ERROR_RATE']).required(),
    })
    .returns(a.json())
    .handler([
      a.handler.function('performanceBenchmarkAnalyzer')
    ])
    .authorization((allow) => [
      allow.groups(['Admin', 'DevOps'])
    ]),

  // ========== Monitoring Mutation Operations ==========
  
  // Trigger System Health Check
  triggerHealthCheck: a
    .mutation()
    .arguments({
      services: a.string().array(),
      depth: a.enum(['SHALLOW', 'DEEP']),
    })
    .returns(a.json())
    .handler([
      a.handler.function('healthCheckOrchestrator')
    ])
    .authorization((allow) => [
      allow.groups(['Admin', 'DevOps'])
    ]),

  // Create Performance Alert
  createPerformanceAlert: a
    .mutation()
    .arguments({
      serviceName: a.string().required(),
      metricName: a.string().required(),
      threshold: a.float().required(),
      comparisonOperator: a.enum(['GREATER_THAN', 'LESS_THAN', 'EQUAL_TO']).required(),
      alertSeverity: a.enum(['INFO', 'WARNING', 'CRITICAL']).required(),
      notificationChannels: a.string().array().required(),
    })
    .returns(a.ref('SystemHealthMetric'))
    .handler([
      a.handler.function('alertConfigurationManager')
    ])
    .authorization((allow) => [
      allow.groups(['Admin', 'DevOps'])
    ]),

  // Generate Compliance Report
  generateComplianceReport: a
    .mutation()
    .arguments({
      reportType: a.enum(['PCI_DSS', 'SOC2', 'GDPR', 'CUSTOM']).required(),
      startDate: a.string().required(),
      endDate: a.string().required(),
      includeRaw data: a.boolean(),
    })
    .returns(a.json())
    .handler([
      a.handler.function('complianceReportGenerator')
    ])
    .authorization((allow) => [
      allow.groups(['Admin', 'Compliance', 'Security'])
    ]),

  // ========== Real-time Subscriptions ==========
  
  // Real-time System Health Updates
  onSystemHealthUpdate: a
    .subscription()
    .for(a.ref('SystemHealthMetric'))
    .arguments({
      serviceName: a.string(),
      alertStatus: a.string(),
    })
    .authorization((allow) => [
      allow.authenticated()
    ]),

  // Real-time Payment Processing Events
  onPaymentProcessingEvent: a
    .subscription()
    .for(a.ref('PaymentMetric'))
    .arguments({
      paymentMethod: a.string(),
      correlationId: a.string(),
    })
    .authorization((allow) => [
      allow.groups(['Admin', 'DevOps', 'Finance'])
    ]),

  // Critical Incident Alerts
  onCriticalIncident: a
    .subscription()
    .for(a.ref('Incident'))
    .arguments({
      severity: a.string(),
    })
    .authorization((allow) => [
      allow.groups(['Admin', 'DevOps', 'Support'])
    ]),
};