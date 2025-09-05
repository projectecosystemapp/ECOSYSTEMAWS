import { defineFunction } from '@aws-amplify/backend';

export const realtimeMessaging = defineFunction({
  name: 'realtime-messaging',
  entry: './handler.ts',
  environment: {
    MESSAGE_TABLE_NAME: 'Message',
  },
  runtime: 20,
  timeoutSeconds: 10,
});