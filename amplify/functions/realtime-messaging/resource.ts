import { defineFunction } from '@aws-amplify/backend';

export const realtimeMessaging = defineFunction({
  name: 'realtime-messaging',
  entry: './handler.ts',
  runtime: 20,
  timeoutSeconds: 10,
});