/**
 * SNS Topic Resources for Alert Notifications
 * 
 * Creates SNS topics for webhook reconciliation and critical system alerts
 * with proper access policies and subscription management.
 */

import { Stack } from 'aws-cdk-lib';
import { Topic, Subscription, SubscriptionProtocol } from 'aws-cdk-lib/aws-sns';
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export function createSnsTopics(stack: Stack) {
  // Webhook Reconciliation Alerts Topic
  const webhookAlertsTopic = new Topic(stack, 'WebhookReconciliationAlerts', {
    topicName: 'webhook-reconciliation-alerts',
    displayName: 'Webhook Reconciliation Alerts',
  });

  // Critical System Alerts Topic  
  const criticalAlertsTopic = new Topic(stack, 'CriticalSystemAlerts', {
    topicName: 'critical-system-alerts',
    displayName: 'Critical System Alerts',
  });

  // Add email subscriptions (these should be environment variables in production)
  const alertEmail = process.env.ALERT_EMAIL || 'alerts@example.com';
  
  webhookAlertsTopic.addSubscription(
    new EmailSubscription(alertEmail, {
      json: false,
    })
  );

  criticalAlertsTopic.addSubscription(
    new EmailSubscription(alertEmail, {
      json: false,
    })
  );

  // Add access policy for Lambda functions
  const lambdaPublishPolicy = new PolicyStatement({
    effect: Effect.ALLOW,
    principals: [], // Will be filled by Lambda execution role
    actions: ['sns:Publish'],
    resources: [
      webhookAlertsTopic.topicArn,
      criticalAlertsTopic.topicArn,
    ],
  });

  webhookAlertsTopic.addToResourcePolicy(lambdaPublishPolicy);
  criticalAlertsTopic.addToResourcePolicy(lambdaPublishPolicy);

  // Export topic ARNs for use in Lambda environment variables
  return {
    webhookAlertsTopicArn: webhookAlertsTopic.topicArn,
    criticalAlertsTopicArn: criticalAlertsTopic.topicArn,
  };
}