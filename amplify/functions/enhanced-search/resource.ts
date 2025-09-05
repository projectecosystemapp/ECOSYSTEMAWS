import { defineFunction } from '@aws-amplify/backend';

export const enhancedSearch = defineFunction({
  name: 'enhanced-search',
  entry: './handler.ts',
  environment: {
    SERVICE_TABLE_NAME: 'Service',
    SERVICEREQUEST_TABLE_NAME: 'ServiceRequest',
  },
  runtime: 20,
  timeoutSeconds: 30,
});