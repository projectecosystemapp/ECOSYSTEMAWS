import { defineFunction } from '@aws-amplify/backend';

export const disputeWorkflow = defineFunction({
  name: 'dispute-workflow',
  entry: './handler.ts',
  environment: {
    STEP_FUNCTIONS_ARN: 'arn:aws:states:us-east-1:123456789012:stateMachine:DisputeResolution',
  },
  runtime: 20,
  timeoutSeconds: 30,
});