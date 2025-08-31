#!/bin/bash

# Security Validation Script for Production Deployments

set -euo pipefail

ENVIRONMENT=${1:-staging}
PRODUCTION_URL=${PRODUCTION_URL:-https://marketplace.yourdomain.com}
STAGING_URL=${STAGING_URL:-https://staging.marketplace.yourdomain.com}

if [ "$ENVIRONMENT" == "production" ]; then
    TARGET_URL=$PRODUCTION_URL
else
    TARGET_URL=$STAGING_URL
fi

echo "🔒 Starting Security Validation for $ENVIRONMENT environment"
echo "Target URL: $TARGET_URL"
echo "================================================"

# Track failures
FAILURES=0

# Function to check test result
check_result() {
    if [ $1 -eq 0 ]; then
        echo "✅ $2"
    else
        echo "❌ $2"
        ((FAILURES++))
    fi
}

# 1. Check Security Headers
echo -e "\n📋 Checking Security Headers..."
HEADERS=$(curl -s -I "$TARGET_URL" 2>/dev/null || echo "")

if [ -n "$HEADERS" ]; then
    echo "$HEADERS" | grep -q "Strict-Transport-Security"
    check_result $? "HSTS Header Present"
    
    echo "$HEADERS" | grep -q "X-Content-Type-Options: nosniff"
    check_result $? "X-Content-Type-Options Header Present"
    
    echo "$HEADERS" | grep -q "X-Frame-Options"
    check_result $? "X-Frame-Options Header Present"
else
    echo "⚠️  Could not fetch headers from $TARGET_URL"
fi

# 2. Check for exposed sensitive files
echo -e "\n📁 Checking for Exposed Sensitive Files..."
SENSITIVE_PATHS=(
    "/.env"
    "/.env.local"
    "/.git/config"
    "/config.json"
    "/secrets.json"
)

for path in "${SENSITIVE_PATHS[@]}"; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$TARGET_URL$path" 2>/dev/null || echo "000")
    if [ "$STATUS" == "404" ] || [ "$STATUS" == "403" ] || [ "$STATUS" == "000" ]; then
        echo "✅ $path is not accessible"
    else
        echo "❌ WARNING: $path returned status $STATUS"
        ((FAILURES++))
    fi
done

# Summary
echo -e "\n================================================"
echo "🏁 Security Validation Complete"
echo "================================================"

if [ $FAILURES -eq 0 ]; then
    echo "✅ All security checks passed!"
    exit 0
else
    echo "❌ $FAILURES security issues found"
    echo "Please review and fix the issues before deploying to production"
    
    # In production, fail the deployment
    if [ "$ENVIRONMENT" == "production" ]; then
        exit 1
    else
        # In staging, just warn
        exit 0
    fi
fi