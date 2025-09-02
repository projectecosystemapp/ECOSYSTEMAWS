#!/bin/bash

# ECOSYSTEM Configuration Verification Script
# This script verifies all AWS resources are properly configured

echo "========================================="
echo "ECOSYSTEM - Configuration Verification"
echo "========================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

REGION="us-west-2"
APP_ID="d1f46y6dzix34a"

echo "Checking AWS Configuration..."
echo ""

# 1. Check Amplify App
echo "1. Amplify App Status:"
APP_STATUS=$(aws amplify get-app \
    --app-id "$APP_ID" \
    --region "$REGION" \
    --query 'app.productionBranch.status' \
    --output text 2>/dev/null)

if [ -n "$APP_STATUS" ]; then
    echo -e "   ${GREEN}✓ Amplify App: $APP_STATUS${NC}"
    echo "   URL: https://ecosystem-app.com"
else
    echo -e "   ${RED}✗ Cannot access Amplify App${NC}"
fi
echo ""

# 2. Check Cognito User Pool
echo "2. Cognito User Pool:"
USER_POOL=$(aws cognito-idp list-user-pools \
    --max-results 10 \
    --region "$REGION" \
    --query "UserPools[?contains(Name, 'amplify')].Id" \
    --output text 2>/dev/null | head -1)

if [ -n "$USER_POOL" ]; then
    echo -e "   ${GREEN}✓ User Pool Found: $USER_POOL${NC}"
else
    echo -e "   ${YELLOW}⚠ User Pool not found (may need different search)${NC}"
fi
echo ""

# 3. Check AppSync API
echo "3. AppSync GraphQL API:"
GRAPHQL_API=$(aws appsync list-graphql-apis \
    --region "$REGION" \
    --query "graphqlApis[?contains(name, 'amplify')].apiId" \
    --output text 2>/dev/null | head -1)

if [ -n "$GRAPHQL_API" ]; then
    echo -e "   ${GREEN}✓ GraphQL API Found: $GRAPHQL_API${NC}"
else
    echo -e "   ${YELLOW}⚠ GraphQL API not found${NC}"
fi
echo ""

# 4. Check Lambda Functions
echo "4. Lambda Functions:"
LAMBDA_COUNT=$(aws lambda list-functions \
    --region "$REGION" \
    --query "Functions[?contains(FunctionName, 'amplify-$APP_ID')] | length(@)" \
    --output text 2>/dev/null)

if [ -n "$LAMBDA_COUNT" ] && [ "$LAMBDA_COUNT" -gt 0 ]; then
    echo -e "   ${GREEN}✓ Found $LAMBDA_COUNT Lambda functions${NC}"
    
    # Check for Function URLs
    URL_COUNT=0
    for func in $(aws lambda list-functions \
        --region "$REGION" \
        --query "Functions[?contains(FunctionName, 'amplify-$APP_ID')].FunctionName" \
        --output text 2>/dev/null); do
        
        URL=$(aws lambda get-function-url-config \
            --function-name "$func" \
            --region "$REGION" \
            --query 'FunctionUrl' \
            --output text 2>/dev/null)
        
        if [ -n "$URL" ] && [ "$URL" != "None" ]; then
            ((URL_COUNT++))
        fi
    done
    
    if [ "$URL_COUNT" -eq "$LAMBDA_COUNT" ]; then
        echo -e "   ${GREEN}✓ All Lambda functions have URLs${NC}"
    else
        echo -e "   ${YELLOW}⚠ Only $URL_COUNT/$LAMBDA_COUNT functions have URLs${NC}"
        echo -e "   ${YELLOW}  Run: ./setup-lambda-urls.sh${NC}"
    fi
else
    echo -e "   ${RED}✗ No Lambda functions found${NC}"
fi
echo ""

# 5. Check DynamoDB Tables
echo "5. DynamoDB Tables:"
TABLE_COUNT=$(aws dynamodb list-tables \
    --region "$REGION" \
    --query "TableNames[?contains(@, 'amplify')] | length(@)" \
    --output text 2>/dev/null)

if [ -n "$TABLE_COUNT" ] && [ "$TABLE_COUNT" -gt 0 ]; then
    echo -e "   ${GREEN}✓ Found $TABLE_COUNT DynamoDB tables${NC}"
else
    echo -e "   ${YELLOW}⚠ No DynamoDB tables found${NC}"
fi
echo ""

# 6. Test Stripe Configuration
echo "6. Stripe Configuration:"
if [ -n "$STRIPE_SECRET_KEY" ]; then
    # Test Stripe API connection
    STRIPE_TEST=$(curl -s -o /dev/null -w "%{http_code}" \
        -u "$STRIPE_SECRET_KEY:" \
        https://api.stripe.com/v1/balance)
    
    if [ "$STRIPE_TEST" = "200" ]; then
        echo -e "   ${GREEN}✓ Stripe API connection successful${NC}"
    else
        echo -e "   ${RED}✗ Stripe API connection failed (HTTP $STRIPE_TEST)${NC}"
    fi
else
    echo -e "   ${YELLOW}⚠ STRIPE_SECRET_KEY not set in environment${NC}"
fi
echo ""

echo "========================================="
echo "Configuration Summary:"
echo ""
echo "Region: $REGION"
echo "App ID: $APP_ID"
echo "Production URL: https://ecosystem-app.com"
echo ""
echo "If any checks failed, follow these steps:"
echo "1. Run: ./setup-lambda-urls.sh"
echo "2. Update Amplify Console environment variables"
echo "3. Verify Stripe webhook configuration"
echo "========================================="