#!/bin/bash

# Setup Amplify Secrets for Stripe and Bedrock
echo "Setting up AWS Amplify secrets..."

# Stripe Secrets (TEST environment)
echo "sk_test_51RxWCID905P0bnNcybVX55XQBnYcikWljrcbotmAmd9IAkhUSqgVlzqp4eBNrpqagzPRqOvTw8UvnqpqfHbjhp5u00g6WkdVsp" | npx ampx sandbox secret set STRIPE_SECRET_KEY

echo "whsec_c74f92ccb15e1a752b85752c471365d71e7e6e31391960934cd8ebf774e1688b" | npx ampx sandbox secret set STRIPE_WEBHOOK_SECRET

# Application URL (update with your actual domain)
echo "https://main.d83xdqx57dtkr.amplifyapp.com" | npx ampx sandbox secret set APP_URL

# DynamoDB Table Names
echo "UserProfile-sandbox" | npx ampx sandbox secret set USER_PROFILE_TABLE_NAME
echo "Service-sandbox" | npx ampx sandbox secret set SERVICE_TABLE_NAME
echo "Booking-sandbox" | npx ampx sandbox secret set BOOKING_TABLE_NAME
echo "Transaction-sandbox" | npx ampx sandbox secret set TRANSACTION_TABLE_NAME

# AWS API Key for internal calls
echo "test-api-key-123" | npx ampx sandbox secret set AWS_API_KEY

# Bedrock API Key (if you have one)
echo "bedrock-test-key" | npx ampx sandbox secret set AWS_BEDROCK_API_KEY

echo "All secrets have been configured!"
echo ""
echo "Next steps:"
echo "1. Run 'npx ampx sandbox' to deploy the backend"
echo "2. The Lambda function URLs will be displayed after deployment"
echo "3. Update your .env.local with the Lambda URLs"
echo "4. Configure webhook endpoint in Stripe Dashboard"