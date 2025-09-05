import { defineFunction } from '@aws-amplify/backend';

export const profileEventsFunction = defineFunction({
  name: 'profile-events-handler',
  entry: './handler.ts',
  runtime: 20,
  timeoutSeconds: 30,
  memoryMB: 512,
  environment: {
    LOG_LEVEL: 'INFO'
  }
});