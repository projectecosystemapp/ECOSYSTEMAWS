#!/bin/bash

# FIX THIS BROKEN AWS AMPLIFY SHIT
# This script does what AWS should have done automatically

echo "🔥 FIXING AWS AMPLIFY'S BROKEN SETUP"
echo "====================================="
echo ""

REGION="us-west-2"
APP_ID="d1f46y6dzix34a"

# These are your ACTUAL Lambda function names from AWS
LAMBDAS=(
    "amplify-d1f46y6dzix34a-ma-stripeconnectlambda03822-0XVjwD9kqJn7"
    "amplify-d1f46y6dzix34a-ma-stripewebhooklambdaF97E3-NiX5WUIQlnbp"
    "amplify-d1f46y6dzix34a-ma-payoutmanagerlambdaD87A7-qXl2O3BWueG2"
    "amplify-d1f46y6dzix34a-ma-refundprocessorlambda1FA-9BFoTgCbYDNz"
    "amplify-d1f46y6dzix34a-ma-bookingprocessorlambda1C-nBWq5NSIFQLT"
    "amplify-d1f46y6dzix34a-ma-messaginghandlerlambda24-88yQTXZVk4KQ"
    "amplify-d1f46y6dzix34a-ma-notificationhandlerlambd-xYXvkEqGQpbi"
)

echo "Creating Function URLs (because AWS couldn't be bothered)..."
echo ""

# Create the URLs
URLS=()
for lambda in "${LAMBDAS[@]}"; do
    echo "📡 Creating URL for: ${lambda:0:50}..."
    
    # Create the URL
    URL=$(aws lambda create-function-url-config \
        --function-name "$lambda" \
        --auth-type NONE \
        --region "$REGION" \
        --query 'FunctionUrl' \
        --output text 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        # Add public access permission
        aws lambda add-permission \
            --function-name "$lambda" \
            --statement-id "FunctionURLAllowPublicAccess" \
            --action "lambda:InvokeFunctionUrl" \
            --principal "*" \
            --function-url-auth-type NONE \
            --region "$REGION" 2>/dev/null
        
        URLS+=("$URL")
        echo "✅ Created: $URL"
    else
        # Maybe it already exists?
        URL=$(aws lambda get-function-url-config \
            --function-name "$lambda" \
            --region "$REGION" \
            --query 'FunctionUrl' \
            --output text 2>/dev/null)
        
        if [ -n "$URL" ] && [ "$URL" != "None" ]; then
            URLS+=("$URL")
            echo "✅ Already exists: $URL"
        else
            URLS+=("ERROR")
            echo "❌ Failed to create URL"
        fi
    fi
    echo ""
done

# Output the environment variables
echo "====================================="
echo "📋 COPY THESE TO AMPLIFY CONSOLE:"
echo "====================================="
echo ""
echo "STRIPE_CONNECT_LAMBDA_URL=${URLS[0]}"
echo "STRIPE_WEBHOOK_LAMBDA_URL=${URLS[1]}"
echo "PAYOUT_MANAGER_LAMBDA_URL=${URLS[2]}"
echo "REFUND_PROCESSOR_LAMBDA_URL=${URLS[3]}"
echo "BOOKING_PROCESSOR_LAMBDA_URL=${URLS[4]}"
echo "MESSAGING_HANDLER_LAMBDA_URL=${URLS[5]}"
echo "NOTIFICATION_HANDLER_LAMBDA_URL=${URLS[6]}"
echo ""
echo "NEXT_PUBLIC_STRIPE_LAMBDA_URL=${URLS[0]}"
echo "NEXT_PUBLIC_STRIPE_WEBHOOK_URL=${URLS[1]}"
echo ""
echo "====================================="
echo "✅ DONE. AWS should have done this automatically."
echo "====================================="
echo ""
echo "Next steps:"
echo "1. Copy the above to AWS Amplify Console → Environment Variables"
echo "2. git push origin main"
echo "3. Your app should actually fucking work now"
