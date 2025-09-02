#!/bin/bash

# Make all setup scripts executable
chmod +x setup-lambda-urls.sh
chmod +x verify-config.sh
chmod +x commit-auth-fix.sh

echo "✅ All scripts are now executable"
echo ""
echo "Run these commands in order:"
echo "1. ./setup-lambda-urls.sh    # Create Lambda Function URLs"
echo "2. ./verify-config.sh        # Verify all configurations"
echo "3. ./commit-auth-fix.sh      # Commit the auth fixes"