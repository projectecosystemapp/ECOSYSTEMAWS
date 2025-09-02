import { defineFunction, secret } from '@aws-amplify/backend';

export const workflowOrchestrator = defineFunction({
  name: 'workflow-orchestrator',
  entry: './handler.ts',
  environment: {
    BOOKING_STATE_MACHINE_ARN: secret('BOOKING_STATE_MACHINE_ARN'),
    PAYMENT_STATE_MACHINE_ARN: secret('PAYMENT_STATE_MACHINE_ARN'),
    DISPUTE_STATE_MACHINE_ARN: secret('DISPUTE_STATE_MACHINE_ARN'),
    ONBOARDING_STATE_MACHINE_ARN: secret('ONBOARDING_STATE_MACHINE_ARN'),
    MARKETPLACE_EVENT_BUS_ARN: secret('MARKETPLACE_EVENT_BUS_ARN'),
  },
  runtime: 18,
  timeoutSeconds: 300,
});