import { defineFunction, secret } from '@aws-amplify/backend';

export const bedrockAiFunction = defineFunction({
  name: 'bedrock-ai-generator',
  entry: './handler.ts',
  runtime: 20,
  timeoutSeconds: 30,
  memoryMB: 512,
  environment: {
    PROVIDER_PROFILE_TABLE_NAME: 'ProviderProfile',
    AWS_BEDROCK_API_KEY: secret('AWS_BEDROCK_API_KEY'),
  }
});