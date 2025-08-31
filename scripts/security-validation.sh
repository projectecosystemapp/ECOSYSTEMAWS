#!/bin/bash

# Stripe Security Configuration Validation Script
# 
# This script validates that the Stripe integration follows security best practices
# and ensures no live credentials are exposed in development environment.

set -e

echo "🔐 Stripe Security Configuration Validation"
echo "==========================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

VALIDATION_ERRORS=0

# Function to print status
print_status() {
    local status=$1
    local message=$2
    if [ "$status" == "PASS" ]; then
        echo -e "${GREEN}✅ PASS:${NC} $message"
    elif [ "$status" == "FAIL" ]; then
        echo -e "${RED}❌ FAIL:${NC} $message"
        ((VALIDATION_ERRORS++))
    elif [ "$status" == "WARN" ]; then
        echo -e "${YELLOW}⚠️  WARN:${NC} $message"
    fi
}

echo "1. Checking .env.local configuration..."

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    print_status "FAIL" ".env.local file not found"
else
    # Check for test keys (good)
    if grep -q "pk_test_" .env.local; then
        print_status "PASS" "Using Stripe test publishable key"
    else
        print_status "FAIL" "No Stripe test publishable key found in .env.local"
    fi

    if grep -q "sk_test_" .env.local; then
        print_status "PASS" "Using Stripe test secret key"
    else
        print_status "FAIL" "No Stripe test secret key found in .env.local"
    fi

    # Check for live keys (bad - should not be in .env.local)
    if grep -q "pk_live_" .env.local; then
        print_status "FAIL" "CRITICAL: Live publishable key found in .env.local - REMOVE IMMEDIATELY"
    else
        print_status "PASS" "No live publishable keys in .env.local"
    fi

    if grep -q "sk_live_" .env.local; then
        print_status "FAIL" "CRITICAL: Live secret key found in .env.local - REMOVE IMMEDIATELY"
    else
        print_status "PASS" "No live secret keys in .env.local"
    fi
fi

echo ""
echo "2. Checking Amplify function configuration..."

# Check if stripe security configuration exists
if [ -f "amplify/security/stripe-secrets.ts" ]; then
    print_status "PASS" "Stripe security configuration found"
else
    print_status "FAIL" "Stripe security configuration missing"
fi

# Check if functions are configured to use secrets
if [ -f "amplify/functions/stripe-connect/resource.ts" ]; then
    if grep -q "stripeSecrets" amplify/functions/stripe-connect/resource.ts; then
        print_status "PASS" "Stripe Connect function uses centralized secrets"
    else
        print_status "WARN" "Stripe Connect function may not use centralized secrets"
    fi
else
    print_status "FAIL" "Stripe Connect function resource not found"
fi

if [ -f "amplify/functions/stripe-webhook/resource.ts" ]; then
    print_status "PASS" "Stripe webhook function configured"
else
    print_status "WARN" "Stripe webhook function not found (may not be implemented yet)"
fi

echo ""
echo "3. Checking for security best practices..."

# Check for hardcoded secrets in source files
echo "Scanning for hardcoded secrets..."
SECRET_FILES=$(find . -name "*.ts" -o -name "*.js" -o -name "*.tsx" -o -name "*.jsx" | grep -v node_modules | grep -v .git)

FOUND_SECRETS=0
for file in $SECRET_FILES; do
    # Look for actual secrets (not placeholders like YOUR_LIVE_SECRET_KEY)
    if grep -l "sk_live_[0-9A-Za-z]\{20,\}\|pk_live_[0-9A-Za-z]\{20,\}\|whsec_[0-9A-Fa-f]\{32,\}" "$file" 2>/dev/null; then
        print_status "FAIL" "Potential live secret found in: $file"
        FOUND_SECRETS=1
    fi
done

if [ $FOUND_SECRETS -eq 0 ]; then
    print_status "PASS" "No hardcoded live secrets found in source code"
fi

# Check git configuration to ensure .env.local is ignored
if [ -f ".gitignore" ]; then
    if grep -q ".env.local\|.env\*.local" .gitignore; then
        print_status "PASS" ".env.local is properly ignored by git"
    else
        print_status "FAIL" ".env.local is not in .gitignore - sensitive data may be committed"
    fi
else
    print_status "WARN" ".gitignore file not found"
fi

echo ""
echo "4. Checking deployment security..."

# Check if IAM policies are defined
if [ -f "amplify/security/iam-policies.json" ]; then
    print_status "PASS" "IAM security policies defined"
else
    print_status "WARN" "IAM security policies not found"
fi

# Check if deployment guide exists
if [ -f "amplify/security/deployment-guide.md" ]; then
    print_status "PASS" "Security deployment guide available"
else
    print_status "WARN" "Security deployment guide not found"
fi

echo ""
echo "5. Environment validation..."

# Check NODE_ENV
if [ "${NODE_ENV:-development}" != "production" ]; then
    print_status "PASS" "Running in development/test environment"
else
    print_status "WARN" "Running in production environment - ensure live secrets are in AWS Secrets Manager"
fi

# Check if AWS CLI is configured (needed for secret management)
if command -v aws &> /dev/null; then
    print_status "PASS" "AWS CLI is available"
else
    print_status "WARN" "AWS CLI not found - needed for secret management"
fi

echo ""
echo "========================================="
echo "🔍 Security Validation Summary"
echo "========================================="

if [ $VALIDATION_ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All security checks passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Deploy to sandbox environment for testing"
    echo "2. Configure production secrets in AWS Secrets Manager"
    echo "3. Set up monitoring and alerting for security events"
    exit 0
else
    echo -e "${RED}❌ $VALIDATION_ERRORS security issues found!${NC}"
    echo ""
    echo "Please resolve the issues above before deploying to production."
    echo "Refer to amplify/security/deployment-guide.md for detailed instructions."
    exit 1
fi