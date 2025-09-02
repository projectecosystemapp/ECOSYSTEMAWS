#!/bin/bash

# ECOSYSTEM Lambda Function URL Setup Script
# This script creates Function URLs for all Lambda functions in us-west-2

echo "========================================="
echo "ECOSYSTEM - Lambda Function URL Setup"
echo "Region: us-west-2"
echo "========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Set the region
REGION="us-west-2"

# Lambda function names (from your AWS Console)
declare -a LAMBDAS=(
    "amplify-d1f46y6dzix34a-ma-stripeconnectlambda03822-0XVjwD9kqJn7"
    "amplify-d1f46y6dzix34a-ma-stripewebhooklambdaF97E3-NiX5WUIQlnbp"
    "amplify-d1f46y6dzix34a-ma-payoutmanagerlambdaD87A7-qXl2O3BWueG2"
    "amplify-d1f46y6dzix34a-ma-refundprocessorlambda1FA-9BFoTgCbYDNz"
    "amplify-d1f46y6dzix34a-ma-bookingprocessorlambda1C-nBWq5NSIFQLT"
    "amplify-d1f46y6dzix34a-ma-messaginghandlerlambda24-88yQTXZVk4KQ"
    "amplify-d1f46y6dzix34a-ma-notificationhandlerlambd-xYXvkEqGQpbi"
)

# Function friendly names for output
declare -a NAMES=(
    "Stripe Connect"
    "Stripe Webhook"
    "Payout Manager"
    "Refund Processor"
    "Booking Processor"
    "Messaging Handler"
    "Notification Handler"
)

echo "Creating Function URLs for all Lambda functions..."
echo ""

# Create output file for environment variables
ENV_FILE="lambda_urls_for_amplify.txt"
echo "# Lambda Function URLs for Amplify Console" > $ENV_FILE
echo "# Generated: $(date)" >> $ENV_FILE
echo "" >> $ENV_FILE

# Loop through each Lambda function
for i in "${!LAMBDAS[@]}"; do
    LAMBDA_NAME="${LAMBDAS[$i]}"
    FRIENDLY_NAME="${NAMES[$i]}"
    
    echo -e "${YELLOW}Processing:${NC} $FRIENDLY_NAME"
    echo "Function: $LAMBDA_NAME"
    
    # Check if Function URL already exists
    EXISTING_URL=$(aws lambda get-function-url-config \
        --function-name "$LAMBDA_NAME" \
        --region "$REGION" \
        --query 'FunctionUrl' \
        --output text 2>/dev/null)
    
    if [ -n "$EXISTING_URL" ] && [ "$EXISTING_URL" != "None" ]; then
        echo -e "${GREEN}✓ Function URL already exists:${NC}"
        echo "  $EXISTING_URL"
        URL="$EXISTING_URL"
    else
        # Create Function URL
        echo "Creating Function URL..."
        URL=$(aws lambda create-function-url-config \
            --function-name "$LAMBDA_NAME" \
            --auth-type NONE \
            --region "$REGION" \
            --query 'FunctionUrl' \
            --output text 2>/dev/null)
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Function URL created:${NC}"
            echo "  $URL"
            
            # Add permission for public access
            aws lambda add-permission \
                --function-name "$LAMBDA_NAME" \
                --statement-id "FunctionURLAllowPublicAccess" \
                --action "lambda:InvokeFunctionUrl" \
                --principal "*" \
                --function-url-auth-type NONE \
                --region "$REGION" 2>/dev/null
        else
            echo -e "${RED}✗ Failed to create Function URL${NC}"
            URL="ERROR - Manual creation required"
        fi
    fi
    
    # Write to environment file
    case $i in
        0) echo "STRIPE_CONNECT_LAMBDA_URL=$URL" >> $ENV_FILE ;;
        1) echo "STRIPE_WEBHOOK_LAMBDA_URL=$URL" >> $ENV_FILE ;;
        2) echo "PAYOUT_MANAGER_LAMBDA_URL=$URL" >> $ENV_FILE ;;
        3) echo "REFUND_PROCESSOR_LAMBDA_URL=$URL" >> $ENV_FILE ;;
        4) echo "BOOKING_PROCESSOR_LAMBDA_URL=$URL" >> $ENV_FILE ;;
        5) echo "MESSAGING_HANDLER_LAMBDA_URL=$URL" >> $ENV_FILE ;;
        6) echo "NOTIFICATION_HANDLER_LAMBDA_URL=$URL" >> $ENV_FILE ;;
    esac
    
    echo "---"
    echo ""
done

echo "========================================="
echo -e "${GREEN}Setup Complete!${NC}"
echo ""
echo "Environment variables have been saved to: $ENV_FILE"
echo ""
echo "Next steps:"
echo "1. Review the file: cat $ENV_FILE"
echo "2. Copy these values to AWS Amplify Console"
echo "3. Go to: App settings → Environment variables"
echo "4. Add each URL as an environment variable"
echo "========================================="