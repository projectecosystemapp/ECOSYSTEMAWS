import { defineFunction } from '@aws-amplify/backend';

export const alertOrchestrator = defineFunction({
  name: 'alert-orchestrator',
  entry: './handler.ts',
  environment: {
    CRITICAL_SNS_TOPIC_ARN: '', // Will be set by backend.ts
    WARNING_SNS_TOPIC_ARN: '', // Will be set by backend.ts
    BUSINESS_SNS_TOPIC_ARN: '', // Will be set by backend.ts
    SLACK_WEBHOOK_URL: '', // Optional Slack integration
    PAGERDUTY_SERVICE_KEY: '', // Optional PagerDuty integration
    INCIDENT_TABLE: 'Incident',
    ALERT_HISTORY_TABLE: 'AlertHistory',
    ESCALATION_RULES_TABLE: 'EscalationRule',
  },
  runtime: 20,
  timeoutSeconds: 60,
  memoryMB: 512,
  architecture: 'arm64',
});