import { defineFunction } from '@aws-amplify/backend';

export const disputeWorkflow = defineFunction({
  name: 'dispute-workflow',
  entry: './handler.ts',
  environment: {
    STEP_FUNCTIONS_ARN: 'arn:aws:states:us-east-1:123456789012:stateMachine:DisputeResolution',
    DISPUTE_TABLE_NAME: 'Dispute',
    DISPUTEEVIDENCE_TABLE_NAME: 'DisputeEvidence',
    BOOKING_TABLE_NAME: 'Booking',
  },
  runtime: 20,
  timeoutSeconds: 30,
});