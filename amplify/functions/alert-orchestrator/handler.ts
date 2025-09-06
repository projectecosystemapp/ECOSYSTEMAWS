import { type AppSyncResolverEvent, type Context } from 'aws-lambda';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { getDynamoDBClient, trackConnectionMetrics } from '../utils/connection-optimizer';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

/**
 * ECOSYSTEMAWS Intelligent Alert Orchestrator
 * 
 * Multi-tier alert management system with intelligent routing, escalation,
 * and automated incident response. Provides comprehensive alerting for the
 * AWS native payment system with business impact assessment.
 */

interface AlertInput {
  alertId?: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'BUSINESS_CRITICAL';
  title: string;
  description: string;
  source: string;
  serviceName: string;
  metricName?: string;
  currentValue?: number;
  threshold?: number;
  dimensions: Record<string, string>;
  correlationId: string;
  businessImpact?: BusinessImpact;
  suggestedActions?: string[];
  runbookUrl?: string;
}

interface BusinessImpact {
  revenueAtRisk: number;
  customersAffected: number;
  servicesImpacted: string[];
  estimatedDowntime: number;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
}

interface AlertResponse {
  alertId: string;
  status: 'SENT' | 'ESCALATED' | 'SUPPRESSED' | 'ERROR';
  channelsNotified: string[];
  incidentCreated: boolean;
  escalationTriggered: boolean;
  errors: string[];
}

interface EscalationRule {
  id: string;
  serviceName: string;
  severity: string;
  escalationDelayMinutes: number;
  channels: AlertChannel[];
  autoResolveMinutes?: number;
  suppressionRules?: SuppressionRule[];
}

interface AlertChannel {
  type: 'SNS' | 'SLACK' | 'PAGERDUTY' | 'EMAIL' | 'WEBHOOK';
  endpoint: string;
  enabled: boolean;
  priority: number;
}

interface SuppressionRule {
  condition: string;
  timeWindowMinutes: number;
  maxAlertsPerWindow: number;
}

// Initialize AWS clients
const snsClient = new SNSClient({ region: process.env.AWS_REGION });
const dynamoDb = getDynamoDBClient();

export const handler = async (
  event: AppSyncResolverEvent<{ input: AlertInput }>,
  context: Context
): Promise<AlertResponse> => {
  const startTime = Date.now();
  const isColdStart = !global.isWarm;
  global.isWarm = true;

  const { input } = event.arguments;
  const alertId = input.alertId || uuidv4();
  
  console.log(`[${input.correlationId}] Processing alert:`, {
    alertId,
    severity: input.severity,
    service: input.serviceName,
    coldStart: isColdStart,
  });

  const response: AlertResponse = {
    alertId,
    status: 'SENT',
    channelsNotified: [],
    incidentCreated: false,
    escalationTriggered: false,
    errors: [],
  };

  try {
    // 1. Check for alert suppression
    const shouldSuppress = await checkAlertSuppression(input);
    if (shouldSuppress) {
      response.status = 'SUPPRESSED';
      await logAlertHistory(alertId, input, 'SUPPRESSED');
      return response;
    }

    // 2. Assess business impact and adjust severity if needed
    const finalInput = await assessBusinessImpact(input);

    // 3. Get escalation rules for the service
    const escalationRules = await getEscalationRules(finalInput.serviceName, finalInput.severity);

    // 4. Create incident for critical alerts
    if (finalInput.severity === 'CRITICAL' || finalInput.severity === 'BUSINESS_CRITICAL') {
      response.incidentCreated = await createIncident(finalInput);
    }

    // 5. Send alerts through configured channels
    const notificationResults = await sendAlerts(finalInput, escalationRules);
    response.channelsNotified = notificationResults.successful;
    response.errors = notificationResults.errors;

    // 6. Schedule escalation if needed
    if (escalationRules.some(rule => rule.escalationDelayMinutes > 0)) {
      response.escalationTriggered = await scheduleEscalation(alertId, finalInput, escalationRules);
    }

    // 7. Log alert history
    await logAlertHistory(alertId, finalInput, response.status);

    // 8. Track alert metrics
    await trackAlertMetrics(finalInput, response, startTime);

    console.log(`[${input.correlationId}] Alert processing completed:`, {
      alertId,
      status: response.status,
      channelsNotified: response.channelsNotified.length,
      incidentCreated: response.incidentCreated,
    });

    return response;

  } catch (error) {
    console.error(`[${input.correlationId}] Alert orchestration error:`, error);
    response.status = 'ERROR';
    response.errors.push(`Alert orchestration failed: ${error.message}`);
    return response;
  }
};

/**
 * Check if alert should be suppressed based on rules
 */
async function checkAlertSuppression(input: AlertInput): Promise<boolean> {
  try {
    // Check recent alert history for the same service/metric
    const recentAlerts = await dynamoDb.query({
      TableName: process.env.ALERT_HISTORY_TABLE || 'AlertHistory',
      IndexName: 'ServiceMetricIndex',
      KeyConditionExpression: 'serviceName = :serviceName AND metricName = :metricName',
      FilterExpression: '#timestamp > :since',
      ExpressionAttributeNames: {
        '#timestamp': 'timestamp',
      },
      ExpressionAttributeValues: {
        ':serviceName': input.serviceName,
        ':metricName': input.metricName || 'unknown',
        ':since': new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes
      },
    });

    // Suppress if more than 5 alerts in 15 minutes for the same metric
    if (recentAlerts.Items && recentAlerts.Items.length >= 5) {
      console.log(`Alert suppressed: Too many recent alerts for ${input.serviceName}/${input.metricName}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking alert suppression:', error);
    return false; // Don't suppress on error
  }
}

/**
 * Assess business impact and potentially escalate severity
 */
async function assessBusinessImpact(input: AlertInput): Promise<AlertInput> {
  const businessImpactRules = {
    'aws-payment-processor': {
      baseRevenueAtRisk: 10000, // $100 per minute
      criticalThreshold: 0.05, // 5% error rate
      customersAffected: 1000,
    },
    'fraud-detector': {
      baseRevenueAtRisk: 50000, // Fraud exposure
      criticalThreshold: 0.10, // 10% error rate
      customersAffected: 5000,
    },
    'escrow-manager': {
      baseRevenueAtRisk: 100000, // Escrow funds at risk
      criticalThreshold: 0.01, // 1% error rate
      customersAffected: 2000,
    },
  };

  const serviceRules = businessImpactRules[input.serviceName as keyof typeof businessImpactRules];
  if (!serviceRules) {
    return input; // No specific rules, return as-is
  }

  // Calculate business impact
  const businessImpact: BusinessImpact = {
    revenueAtRisk: serviceRules.baseRevenueAtRisk,
    customersAffected: serviceRules.customersAffected,
    servicesImpacted: [input.serviceName],
    estimatedDowntime: input.severity === 'CRITICAL' ? 30 : 10, // minutes
    priority: input.severity === 'CRITICAL' ? 'P1' : 'P2',
  };

  // Escalate severity based on business impact
  if (input.severity === 'WARNING' && businessImpact.revenueAtRisk > 25000) {
    input.severity = 'CRITICAL';
    console.log(`Alert escalated to CRITICAL due to business impact: $${businessImpact.revenueAtRisk} at risk`);
  }

  input.businessImpact = businessImpact;
  return input;
}

/**
 * Get escalation rules for service and severity
 */
async function getEscalationRules(serviceName: string, severity: string): Promise<EscalationRule[]> {
  try {
    const result = await dynamoDb.query({
      TableName: process.env.ESCALATION_RULES_TABLE || 'EscalationRule',
      IndexName: 'ServiceSeverityIndex',
      KeyConditionExpression: 'serviceName = :serviceName AND severity = :severity',
      ExpressionAttributeValues: {
        ':serviceName': serviceName,
        ':severity': severity,
      },
    });

    if (result.Items && result.Items.length > 0) {
      return result.Items as EscalationRule[];
    }
  } catch (error) {
    console.error('Error fetching escalation rules:', error);
  }

  // Return default escalation rules
  return getDefaultEscalationRules(severity);
}

/**
 * Get default escalation rules based on severity
 */
function getDefaultEscalationRules(severity: string): EscalationRule[] {
  const baseChannels: AlertChannel[] = [
    {
      type: 'SNS',
      endpoint: getSNSTopicForSeverity(severity),
      enabled: true,
      priority: 1,
    },
  ];

  // Add Slack for WARNING and above
  if (process.env.SLACK_WEBHOOK_URL && ['WARNING', 'CRITICAL', 'BUSINESS_CRITICAL'].includes(severity)) {
    baseChannels.push({
      type: 'SLACK',
      endpoint: process.env.SLACK_WEBHOOK_URL,
      enabled: true,
      priority: 2,
    });
  }

  // Add PagerDuty for CRITICAL
  if (process.env.PAGERDUTY_SERVICE_KEY && ['CRITICAL', 'BUSINESS_CRITICAL'].includes(severity)) {
    baseChannels.push({
      type: 'PAGERDUTY',
      endpoint: process.env.PAGERDUTY_SERVICE_KEY,
      enabled: true,
      priority: 3,
    });
  }

  return [{
    id: `default-${severity}`,
    serviceName: 'default',
    severity,
    escalationDelayMinutes: severity === 'CRITICAL' ? 15 : 30,
    channels: baseChannels,
    autoResolveMinutes: 60,
  }];
}

/**
 * Send alerts through configured channels
 */
async function sendAlerts(
  input: AlertInput,
  escalationRules: EscalationRule[]
): Promise<{ successful: string[]; errors: string[] }> {
  const successful: string[] = [];
  const errors: string[] = [];

  // Get all unique channels from escalation rules
  const channels = escalationRules
    .flatMap(rule => rule.channels)
    .filter(channel => channel.enabled)
    .sort((a, b) => a.priority - b.priority);

  for (const channel of channels) {
    try {
      switch (channel.type) {
        case 'SNS':
          await sendSNSAlert(input, channel.endpoint);
          successful.push(`SNS:${channel.endpoint}`);
          break;

        case 'SLACK':
          await sendSlackAlert(input, channel.endpoint);
          successful.push(`SLACK:webhook`);
          break;

        case 'PAGERDUTY':
          await sendPagerDutyAlert(input, channel.endpoint);
          successful.push(`PAGERDUTY:${channel.endpoint}`);
          break;

        default:
          console.warn(`Unsupported alert channel type: ${channel.type}`);
      }
    } catch (error) {
      console.error(`Failed to send alert via ${channel.type}:`, error);
      errors.push(`${channel.type}: ${error.message}`);
    }
  }

  return { successful, errors };
}

/**
 * Send SNS alert
 */
async function sendSNSAlert(input: AlertInput, topicArn: string): Promise<void> {
  const message = formatAlertMessage(input);
  const subject = `${input.severity}: ${input.title}`;

  const command = new PublishCommand({
    TopicArn: topicArn,
    Subject: subject,
    Message: message,
    MessageAttributes: {
      alertId: {
        DataType: 'String',
        StringValue: input.alertId || 'unknown',
      },
      severity: {
        DataType: 'String',
        StringValue: input.severity,
      },
      serviceName: {
        DataType: 'String',
        StringValue: input.serviceName,
      },
    },
  });

  await snsClient.send(command);
}

/**
 * Send Slack alert
 */
async function sendSlackAlert(input: AlertInput, webhookUrl: string): Promise<void> {
  const color = getSeverityColor(input.severity);
  const businessImpact = input.businessImpact;

  const slackMessage = {
    username: 'ECOSYSTEMAWS Monitoring',
    icon_emoji: ':warning:',
    attachments: [{
      color: color,
      title: `${input.severity}: ${input.title}`,
      text: input.description,
      fields: [
        {
          title: 'Service',
          value: input.serviceName,
          short: true,
        },
        {
          title: 'Source',
          value: input.source,
          short: true,
        },
        ...(businessImpact ? [
          {
            title: 'Revenue at Risk',
            value: `$${businessImpact.revenueAtRisk.toLocaleString()}`,
            short: true,
          },
          {
            title: 'Customers Affected',
            value: businessImpact.customersAffected.toLocaleString(),
            short: true,
          },
        ] : []),
        ...(input.currentValue && input.threshold ? [{
          title: 'Current Value',
          value: `${input.currentValue} (threshold: ${input.threshold})`,
          short: true,
        }] : []),
      ],
      footer: 'ECOSYSTEMAWS Payment System',
      ts: Math.floor(Date.now() / 1000),
    }],
  };

  await axios.post(webhookUrl, slackMessage, {
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Send PagerDuty alert
 */
async function sendPagerDutyAlert(input: AlertInput, serviceKey: string): Promise<void> {
  const payload = {
    routing_key: serviceKey,
    event_action: 'trigger',
    dedup_key: `${input.serviceName}-${input.metricName}-${input.alertId}`,
    payload: {
      summary: `${input.severity}: ${input.title}`,
      severity: input.severity.toLowerCase(),
      source: input.serviceName,
      component: input.source,
      group: 'ECOSYSTEMAWS Payment System',
      class: input.businessImpact?.priority || 'P3',
      custom_details: {
        description: input.description,
        correlationId: input.correlationId,
        currentValue: input.currentValue,
        threshold: input.threshold,
        dimensions: input.dimensions,
        businessImpact: input.businessImpact,
        suggestedActions: input.suggestedActions,
        runbookUrl: input.runbookUrl,
      },
    },
  };

  await axios.post('https://events.pagerduty.com/v2/enqueue', payload, {
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Create incident for critical alerts
 */
async function createIncident(input: AlertInput): Promise<boolean> {
  try {
    const incident = {
      id: uuidv4(),
      incidentId: `INC-${Date.now()}`,
      title: input.title,
      description: input.description,
      severity: input.severity,
      status: 'OPEN',
      affectedServices: [input.serviceName],
      detectedAt: new Date().toISOString(),
      assignedTo: 'auto-assigned',
      impactAssessment: input.businessImpact,
      correlationId: input.correlationId,
      alertId: input.alertId,
      tags: {
        source: input.source,
        automated: true,
      },
      createdAt: new Date().toISOString(),
    };

    await dynamoDb.put({
      TableName: process.env.INCIDENT_TABLE || 'Incident',
      Item: incident,
    });

    console.log(`Incident created: ${incident.incidentId}`);
    return true;
  } catch (error) {
    console.error('Failed to create incident:', error);
    return false;
  }
}

/**
 * Schedule escalation (this would typically use EventBridge or SQS)
 */
async function scheduleEscalation(
  alertId: string,
  input: AlertInput,
  escalationRules: EscalationRule[]
): Promise<boolean> {
  // In a real implementation, this would schedule a delayed event
  // For now, we'll log the escalation schedule
  console.log(`Escalation scheduled for alert ${alertId}:`, {
    escalationRules: escalationRules.map(r => ({
      delay: r.escalationDelayMinutes,
      channels: r.channels.length,
    })),
  });

  return true;
}

/**
 * Log alert history
 */
async function logAlertHistory(alertId: string, input: AlertInput, status: string): Promise<void> {
  try {
    const historyItem = {
      id: uuidv4(),
      alertId,
      serviceName: input.serviceName,
      metricName: input.metricName || 'unknown',
      severity: input.severity,
      status,
      title: input.title,
      correlationId: input.correlationId,
      timestamp: new Date().toISOString(),
      dimensions: input.dimensions,
      ttl: Math.floor((Date.now() + (30 * 24 * 60 * 60 * 1000)) / 1000), // 30 days TTL
    };

    await dynamoDb.put({
      TableName: process.env.ALERT_HISTORY_TABLE || 'AlertHistory',
      Item: historyItem,
    });
  } catch (error) {
    console.error('Failed to log alert history:', error);
  }
}

/**
 * Track alert metrics
 */
async function trackAlertMetrics(
  input: AlertInput,
  response: AlertResponse,
  startTime: number
): Promise<void> {
  const executionTime = Date.now() - startTime;
  
  // This would typically call the metrics publisher
  console.log('Alert metrics:', {
    severity: input.severity,
    service: input.serviceName,
    status: response.status,
    channelsNotified: response.channelsNotified.length,
    executionTime,
    businessImpact: input.businessImpact?.revenueAtRisk,
  });
}

/**
 * Helper functions
 */
function getSNSTopicForSeverity(severity: string): string {
  switch (severity) {
    case 'CRITICAL':
    case 'BUSINESS_CRITICAL':
      return process.env.CRITICAL_SNS_TOPIC_ARN || '';
    case 'WARNING':
      return process.env.WARNING_SNS_TOPIC_ARN || '';
    default:
      return process.env.WARNING_SNS_TOPIC_ARN || '';
  }
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'CRITICAL':
    case 'BUSINESS_CRITICAL':
      return '#d62728'; // Red
    case 'WARNING':
      return '#ff7f0e'; // Orange
    case 'INFO':
      return '#1f77b4'; // Blue
    default:
      return '#666666'; // Gray
  }
}

function formatAlertMessage(input: AlertInput): string {
  const businessImpact = input.businessImpact;
  
  return `
ECOSYSTEMAWS Payment System Alert

Severity: ${input.severity}
Service: ${input.serviceName}
Title: ${input.title}

Description:
${input.description}

${input.currentValue && input.threshold ? `
Current Value: ${input.currentValue}
Threshold: ${input.threshold}
` : ''}

${businessImpact ? `
Business Impact:
- Revenue at Risk: $${businessImpact.revenueAtRisk.toLocaleString()}
- Customers Affected: ${businessImpact.customersAffected.toLocaleString()}
- Priority: ${businessImpact.priority}
- Estimated Downtime: ${businessImpact.estimatedDowntime} minutes
` : ''}

${input.suggestedActions ? `
Suggested Actions:
${input.suggestedActions.map(action => `- ${action}`).join('\n')}
` : ''}

${input.runbookUrl ? `
Runbook: ${input.runbookUrl}
` : ''}

Correlation ID: ${input.correlationId}
Alert ID: ${input.alertId || 'N/A'}
Timestamp: ${new Date().toISOString()}
`;
}

// Global variable to track warm starts
declare global {
  var isWarm: boolean;
}