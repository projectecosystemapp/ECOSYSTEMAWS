import { defineFunction } from '@aws-amplify/backend';

export const isoMatcher = defineFunction({
  name: 'iso-matcher',
  entry: './handler.ts',
  environment: {
    BEDROCK_REGION: 'us-east-1',
    SERVICEREQUEST_TABLE_NAME: 'ServiceRequest',
    SERVICE_TABLE_NAME: 'Service',
  },
  runtime: 20,
  timeoutSeconds: 30,
});