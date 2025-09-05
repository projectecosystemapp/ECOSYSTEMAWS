#!/bin/bash

# Script to create Lambda Function URLs for all deployed functions
echo "Creating Lambda Function URLs..."

# List of function name patterns to look for
FUNCTIONS=(
  "stripeconnect"
  "stripewebhook"  
  "bedrockAi"
  "bookingprocessor"
  "payoutmanager"
  "refundprocessor"
  "messaginghandler"
  "notificationhandler"
)

# Get all Lambda functions for our app
echo "Finding deployed Lambda functions..."
DEPLOYED_FUNCTIONS=$(aws lambda list-functions --region us-east-1 --query "Functions[?contains(FunctionName, 'awsamplifygen2')].FunctionName" --output text)

# Create Function URLs for each
for pattern in "${FUNCTIONS[@]}"; do
  echo "Looking for function with pattern: $pattern"
  
  # Find the actual function name (case-insensitive)
  FUNCTION_NAME=$(echo "$DEPLOYED_FUNCTIONS" | tr ' ' '\n' | grep -i "$pattern" | head -1)
  
  if [ ! -z "$FUNCTION_NAME" ]; then
    echo "Found function: $FUNCTION_NAME"
    
    # Check if Function URL already exists
    EXISTING_URL=$(aws lambda get-function-url-config --function-name "$FUNCTION_NAME" --region us-east-1 2>/dev/null | jq -r '.FunctionUrl')
    
    if [ ! -z "$EXISTING_URL" ] && [ "$EXISTING_URL" != "null" ]; then
      echo "  Function URL already exists: $EXISTING_URL"
    else
      # Create Function URL
      echo "  Creating Function URL..."
      URL_CONFIG=$(aws lambda create-function-url-config \
        --function-name "$FUNCTION_NAME" \
        --auth-type NONE \
        --cors '{
          "AllowOrigins": ["*"],
          "AllowMethods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
          "AllowHeaders": ["*"],
          "ExposeHeaders": ["*"],
          "MaxAge": 86400
        }' \
        --region us-east-1 2>/dev/null)
      
      if [ $? -eq 0 ]; then
        NEW_URL=$(echo "$URL_CONFIG" | jq -r '.FunctionUrl')
        echo "  Created Function URL: $NEW_URL"
        
        # Add public access permission
        aws lambda add-permission \
          --function-name "$FUNCTION_NAME" \
          --statement-id FunctionURLAllowPublicAccess \
          --action lambda:InvokeFunctionUrl \
          --principal "*" \
          --function-url-auth-type NONE \
          --region us-east-1 2>/dev/null
          
        echo "  Added public access permission"
      else
        echo "  Failed to create Function URL"
      fi
    fi
  else
    echo "  Function not found for pattern: $pattern"
  fi
  echo ""
done

echo "Lambda Function URL creation complete!"
echo ""
echo "Next steps:"
echo "1. Copy the Function URLs above"
echo "2. Update environment variables in Amplify Console"
echo "3. Configure Stripe webhook with the webhook URL"