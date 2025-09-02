#!/usr/bin/env bash

# Example: Setup Amplify Secrets for Stripe and App
# Copy to scripts/setup-secrets.sh and fill in real values. Do NOT commit the real file.

set -euo pipefail

# Stripe Secrets (TEST environment)
# echo "<your-stripe-secret-key>" | npx ampx sandbox secret set STRIPE_SECRET_KEY
# echo "<your-stripe-webhook-secret>" | npx ampx sandbox secret set STRIPE_WEBHOOK_SECRET

# Application URL
# echo "https://your-app.example.com" | npx ampx sandbox secret set APP_URL

# DynamoDB Table Names
# echo "<user-profile-table>" | npx ampx sandbox secret set USER_PROFILE_TABLE_NAME
# echo "<service-table>" | npx ampx sandbox secret set SERVICE_TABLE_NAME
# echo "<booking-table>" | npx ampx sandbox secret set BOOKING_TABLE_NAME
# echo "<transaction-table>" | npx ampx sandbox secret set TRANSACTION_TABLE_NAME

# Internal API Key
# echo "<internal-api-key>" | npx ampx sandbox secret set AWS_API_KEY

# Bedrock API Key (optional)
# echo "<bedrock-api-key>" | npx ampx sandbox secret set AWS_BEDROCK_API_KEY

printf "Secrets template ready. Copy to scripts/setup-secrets.sh and customize.\n"
