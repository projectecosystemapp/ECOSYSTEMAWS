import { defineFunction } from '@aws-amplify/backend';

/**
 * AWS Payment Card Tokenizer Lambda Function
 * 
 * Securely tokenizes payment cards using AWS Payment Cryptography:
 * - Hardware Security Module (HSM) protection
 * - PCI DSS compliance through AWS infrastructure
 * - Format Preserving Encryption (FPE) for card numbers
 * - Secure token generation and storage
 * 
 * SECURITY FEATURES:
 * - Customer-managed encryption keys
 * - No plain-text card data storage
 * - Comprehensive audit logging
 * - Token lifecycle management
 */
export const cardTokenizer = defineFunction({
  name: 'card-tokenizer',
  entry: './handler.ts',
  
  // Performance Configuration
  timeoutSeconds: 15, // Quick tokenization
  memoryMB: 512, // Sufficient for crypto operations
  
  // Environment Configuration
  environment: {
    // AWS Payment Cryptography Configuration
    PAYMENT_CRYPTOGRAPHY_REGION: process.env.AWS_REGION || 'us-east-1',
    TOKENIZATION_KEY_ID: '', // Set by backend.ts
    
    // DynamoDB Tables
    PAYMENT_CARD_TABLE: 'PaymentCard',
    
    // Security Configuration
    TOKEN_EXPIRY_YEARS: '5', // Tokens valid for 5 years
    ENCRYPTION_ALGORITHM: 'AES_256',
    
    // Environment Identification
    NODE_ENV: 'production',
  },
});