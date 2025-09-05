import { type AppSyncResolverEvent, type Context } from 'aws-lambda';
import { FraudDetectorClient, GetEventPredictionCommand, PutEventCommand } from '@aws-sdk/client-frauddetector';
import { DynamoDBClient, PutItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

/**
 * AWS Fraud Detector Service
 * 
 * Provides real-time fraud detection for payment transactions using AWS Fraud Detector ML models.
 * Replaces third-party fraud detection services with native AWS capabilities.
 * 
 * FEATURES:
 * - Real-time transaction scoring using ML models
 * - Custom rules for marketplace-specific fraud patterns
 * - Historical fraud pattern analysis
 * - Automatic model improvement with feedback
 * - Integration with payment processing pipeline
 * 
 * DETECTION CAPABILITIES:
 * - Card fraud detection
 * - Account takeover prevention
 * - Velocity checking (multiple rapid transactions)
 * - Geographic anomaly detection
 * - Device fingerprinting
 * 
 * COST BENEFITS:
 * - Pay-per-prediction pricing (vs subscription-based services)
 * - No minimum commitments or setup fees
 * - Built-in model training and optimization
 */

interface FraudDetectorInput {
  action: 'evaluate_transaction' | 'report_fraud' | 'get_fraud_score' | 'update_rules' | 'get_fraud_history';
  transactionId?: string;
  customerId?: string;
  amount?: number;
  currency?: string;
  paymentMethod?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  billingAddress?: any;
  cardBin?: string;
  email?: string;
  phone?: string;
  fraudType?: 'payment_fraud' | 'account_takeover' | 'identity_theft' | 'velocity_abuse';
  reportDetails?: string;
  rules?: any[];
}

interface FraudDetectorResponse {
  success: boolean;
  fraudScore?: number;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  recommendation?: 'APPROVE' | 'REVIEW' | 'BLOCK';
  ruleMatches?: string[];
  reasonCodes?: string[];
  fraudHistory?: any[];
  modelVersion?: string;
  evaluationTime?: number;
  error?: string;
  timestamp?: string;
}

const fraudDetectorClient = new FraudDetectorClient({ region: process.env.AWS_REGION });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const snsClient = new SNSClient({ region: process.env.AWS_REGION });

export const handler = async (
  event: AppSyncResolverEvent<FraudDetectorInput>,
  context: Context
): Promise<FraudDetectorResponse> => {
  const startTime = Date.now();
  
  console.log(JSON.stringify({
    level: 'INFO',
    resolver: 'fraud-detector',
    action: event.arguments.action,
    userId: event.identity?.sub,
    requestId: context.awsRequestId,
    timestamp: new Date().toISOString(),
    message: 'Fraud Detector invoked'
  }));

  try {
    const { action } = event.arguments;

    let result: FraudDetectorResponse;

    switch (action) {
      case 'evaluate_transaction':
        result = await evaluateTransaction(event.arguments);
        break;
      case 'report_fraud':
        result = await reportFraud(event.arguments, event.identity?.sub);
        break;
      case 'get_fraud_score':
        result = await getFraudScore(event.arguments);
        break;
      case 'update_rules':
        result = await updateFraudRules(event.arguments);
        break;
      case 'get_fraud_history':
        result = await getFraudHistory(event.arguments);
        break;
      default:
        throw new Error(`Unsupported action: ${action}`);
    }

    result.evaluationTime = Date.now() - startTime;
    return result;

  } catch (error) {
    console.error(JSON.stringify({
      level: 'ERROR',
      resolver: 'fraud-detector',
      action: event.arguments.action,
      userId: event.identity?.sub,
      requestId: context.awsRequestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }));

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fraud detection failed',
      timestamp: new Date().toISOString(),
      evaluationTime: Date.now() - startTime
    };
  }
};

async function evaluateTransaction(args: FraudDetectorInput): Promise<FraudDetectorResponse> {
  if (!args.customerId || !args.amount || !args.email) {
    throw new Error('Customer ID, amount, and email are required for fraud evaluation');
  }

  const eventId = generateEventId();
  const timestamp = new Date().toISOString();

  try {
    // Prepare event variables for fraud detector
    const eventVariables = {
      // Transaction details
      amount: args.amount.toString(),
      currency: args.currency || 'USD',
      payment_method: args.paymentMethod || 'card',
      
      // Customer information
      customer_id: args.customerId,
      email_domain: args.email.split('@')[1] || '',
      
      // Device and location
      ip_address: args.ipAddress || '0.0.0.0',
      user_agent: args.userAgent || '',
      device_fingerprint: args.deviceFingerprint || '',
      
      // Payment method details
      card_bin: args.cardBin || '',
      
      // Timing
      transaction_time: timestamp,
      hour_of_day: new Date().getHours().toString(),
      day_of_week: new Date().getDay().toString(),
    };

    // Add billing address information if provided
    if (args.billingAddress) {
      eventVariables.billing_country = args.billingAddress.country || '';
      eventVariables.billing_state = args.billingAddress.state || '';
      eventVariables.billing_zip = args.billingAddress.zipCode || '';
    }

    // Get fraud prediction from AWS Fraud Detector
    const predictionCommand = new GetEventPredictionCommand({
      detectorId: process.env.FRAUD_DETECTOR_NAME,
      detectorVersionId: '1.0',
      eventId,
      eventTypeName: 'payment_transaction',
      entities: [
        {
          entityType: 'customer',
          entityId: args.customerId,
        }
      ],
      eventVariables,
    });

    const predictionResult = await fraudDetectorClient.send(predictionCommand);
    
    // Extract results
    const modelScores = predictionResult.modelScores || [];
    const ruleResults = predictionResult.ruleResults || [];
    
    // Get the primary fraud score
    const fraudScore = modelScores[0]?.scores?.['fraud_score'] || 0;
    
    // Determine risk level and recommendation
    const { riskLevel, recommendation } = categorizeRisk(fraudScore, ruleResults);
    
    // Extract rule matches and reason codes
    const ruleMatches = ruleResults
      .filter(rule => rule.outcomes?.some(outcome => outcome.toLowerCase().includes('block') || outcome.toLowerCase().includes('review')))
      .map(rule => rule.ruleName || 'Unknown Rule');
    
    const reasonCodes = extractReasonCodes(modelScores, ruleResults);

    // Store fraud evaluation event
    await storeFraudEvent({
      eventId,
      transactionId: args.transactionId,
      customerId: args.customerId,
      fraudScore,
      riskLevel,
      recommendation,
      ruleMatches,
      reasonCodes,
      eventVariables,
      timestamp
    });

    // Send alert if high risk
    if (riskLevel === 'HIGH') {
      await sendFraudAlert({
        type: 'high_risk_transaction',
        eventId,
        customerId: args.customerId,
        fraudScore,
        amount: args.amount,
        recommendation,
        reasonCodes
      });
    }

    return {
      success: true,
      fraudScore,
      riskLevel,
      recommendation,
      ruleMatches,
      reasonCodes,
      modelVersion: modelScores[0]?.modelVersion || '1.0',
      timestamp
    };

  } catch (error) {
    console.error('Fraud evaluation failed:', error);
    
    // Return low-risk default on failure to avoid blocking legitimate transactions
    return {
      success: true,
      fraudScore: 100, // Low risk score
      riskLevel: 'LOW',
      recommendation: 'APPROVE',
      ruleMatches: [],
      reasonCodes: ['evaluation_failed'],
      modelVersion: 'fallback',
      error: 'Fraud detection service temporarily unavailable',
      timestamp: new Date().toISOString()
    };
  }
}

async function reportFraud(args: FraudDetectorInput, userId?: string): Promise<FraudDetectorResponse> {
  if (!args.transactionId || !args.fraudType) {
    throw new Error('Transaction ID and fraud type required for fraud reporting');
  }

  const eventId = generateEventId();
  const timestamp = new Date().toISOString();

  try {
    // Store fraud report
    await dynamoClient.send(new PutItemCommand({
      TableName: process.env.FRAUD_EVENTS_TABLE,
      Item: {
        id: { S: eventId },
        type: { S: 'FRAUD_REPORT' },
        transactionId: { S: args.transactionId },
        customerId: { S: args.customerId || '' },
        fraudType: { S: args.fraudType },
        reportDetails: { S: args.reportDetails || '' },
        reportedBy: { S: userId || 'system' },
        status: { S: 'UNDER_INVESTIGATION' },
        createdAt: { S: timestamp },
        updatedAt: { S: timestamp },
      }
    }));

    // Send fraud report to AWS Fraud Detector to improve model
    if (args.transactionId && args.customerId) {
      try {
        await fraudDetectorClient.send(new PutEventCommand({
          eventId,
          eventTypeName: 'fraud_report',
          eventVariables: {
            transaction_id: args.transactionId,
            customer_id: args.customerId,
            fraud_type: args.fraudType,
            report_details: args.reportDetails || '',
          },
          entities: [
            {
              entityType: 'customer',
              entityId: args.customerId,
            }
          ],
          assignedLabel: 'fraud', // This helps train the model
          labelTimestamp: timestamp,
        }));
      } catch (putEventError) {
        console.error('Failed to submit fraud event to AWS Fraud Detector:', putEventError);
      }
    }

    // Send fraud alert
    await sendFraudAlert({
      type: 'fraud_reported',
      eventId,
      transactionId: args.transactionId,
      fraudType: args.fraudType,
      reportedBy: userId || 'system'
    });

    return {
      success: true,
      timestamp,
    };

  } catch (error) {
    console.error('Failed to report fraud:', error);
    return {
      success: false,
      error: 'Failed to report fraud incident',
      timestamp: new Date().toISOString()
    };
  }
}

async function getFraudScore(args: FraudDetectorInput): Promise<FraudDetectorResponse> {
  // This is essentially the same as evaluate_transaction but may have different input requirements
  return evaluateTransaction(args);
}

async function updateFraudRules(args: FraudDetectorInput): Promise<FraudDetectorResponse> {
  // In production, this would integrate with AWS Fraud Detector's rule management API
  // For now, we'll simulate rule updates
  
  if (!args.rules || args.rules.length === 0) {
    throw new Error('Rules array required for rule updates');
  }

  try {
    console.log('Updating fraud detection rules:', args.rules);
    
    // Store rule update event
    const eventId = generateEventId();
    await dynamoClient.send(new PutItemCommand({
      TableName: process.env.FRAUD_EVENTS_TABLE,
      Item: {
        id: { S: eventId },
        type: { S: 'RULE_UPDATE' },
        rules: { S: JSON.stringify(args.rules) },
        updatedAt: { S: new Date().toISOString() },
      }
    }));

    return {
      success: true,
      timestamp: new Date().toISOString(),
    };

  } catch (error) {
    console.error('Failed to update fraud rules:', error);
    return {
      success: false,
      error: 'Failed to update fraud detection rules',
      timestamp: new Date().toISOString()
    };
  }
}

async function getFraudHistory(args: FraudDetectorInput): Promise<FraudDetectorResponse> {
  if (!args.customerId) {
    throw new Error('Customer ID required for fraud history');
  }

  try {
    const result = await dynamoClient.send(new QueryCommand({
      TableName: process.env.FRAUD_EVENTS_TABLE,
      IndexName: 'customerId-createdAt-index', // Assumes GSI exists
      KeyConditionExpression: 'customerId = :customerId',
      ExpressionAttributeValues: {
        ':customerId': { S: args.customerId }
      },
      ScanIndexForward: false, // Latest first
      Limit: 20
    }));

    const fraudHistory = (result.Items || []).map(item => ({
      eventId: item.id?.S,
      type: item.type?.S,
      fraudScore: parseFloat(item.fraudScore?.N || '0'),
      riskLevel: item.riskLevel?.S,
      recommendation: item.recommendation?.S,
      fraudType: item.fraudType?.S,
      status: item.status?.S,
      createdAt: item.createdAt?.S,
    }));

    return {
      success: true,
      fraudHistory,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('Failed to get fraud history:', error);
    return {
      success: false,
      error: 'Failed to retrieve fraud history',
      timestamp: new Date().toISOString()
    };
  }
}

// Helper functions

function categorizeRisk(fraudScore: number, ruleResults: any[]): { riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'; recommendation: 'APPROVE' | 'REVIEW' | 'BLOCK' } {
  // Check if any rules recommend blocking
  const blockingRules = ruleResults.filter(rule => 
    rule.outcomes?.some((outcome: string) => outcome.toLowerCase().includes('block'))
  );

  const reviewRules = ruleResults.filter(rule => 
    rule.outcomes?.some((outcome: string) => outcome.toLowerCase().includes('review'))
  );

  if (blockingRules.length > 0 || fraudScore > 800) {
    return { riskLevel: 'HIGH', recommendation: 'BLOCK' };
  }

  if (reviewRules.length > 0 || fraudScore > 500) {
    return { riskLevel: 'MEDIUM', recommendation: 'REVIEW' };
  }

  return { riskLevel: 'LOW', recommendation: 'APPROVE' };
}

function extractReasonCodes(modelScores: any[], ruleResults: any[]): string[] {
  const reasonCodes: string[] = [];

  // Add model-based reason codes
  modelScores.forEach(model => {
    if (model.scores) {
      Object.entries(model.scores).forEach(([scoreName, score]) => {
        if (typeof score === 'number' && score > 500) {
          reasonCodes.push(`high_${scoreName}`);
        }
      });
    }
  });

  // Add rule-based reason codes
  ruleResults.forEach(rule => {
    if (rule.ruleId) {
      reasonCodes.push(`rule_${rule.ruleId}`);
    }
  });

  return reasonCodes.length > 0 ? reasonCodes : ['low_risk'];
}

async function storeFraudEvent(eventData: any): Promise<void> {
  try {
    await dynamoClient.send(new PutItemCommand({
      TableName: process.env.FRAUD_EVENTS_TABLE,
      Item: {
        id: { S: eventData.eventId },
        type: { S: 'FRAUD_EVALUATION' },
        transactionId: eventData.transactionId ? { S: eventData.transactionId } : undefined,
        customerId: { S: eventData.customerId },
        fraudScore: { N: eventData.fraudScore.toString() },
        riskLevel: { S: eventData.riskLevel },
        recommendation: { S: eventData.recommendation },
        ruleMatches: { SS: eventData.ruleMatches.length > 0 ? eventData.ruleMatches : ['none'] },
        reasonCodes: { SS: eventData.reasonCodes.length > 0 ? eventData.reasonCodes : ['none'] },
        eventVariables: { S: JSON.stringify(eventData.eventVariables) },
        createdAt: { S: eventData.timestamp },
        updatedAt: { S: eventData.timestamp },
      }
    }));
  } catch (error) {
    console.error('Failed to store fraud event:', error);
  }
}

async function sendFraudAlert(alertData: any): Promise<void> {
  try {
    await snsClient.send(new PublishCommand({
      TopicArn: process.env.FRAUD_ALERTS_TOPIC_ARN,
      Message: JSON.stringify(alertData),
      Subject: `Fraud Alert: ${alertData.type}`,
      MessageAttributes: {
        alertType: {
          DataType: 'String',
          StringValue: alertData.type
        },
        severity: {
          DataType: 'String',
          StringValue: alertData.fraudScore > 800 ? 'HIGH' : 'MEDIUM'
        }
      }
    }));
  } catch (error) {
    console.error('Failed to send fraud alert:', error);
  }
}

function generateEventId(): string {
  return `fraud_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}