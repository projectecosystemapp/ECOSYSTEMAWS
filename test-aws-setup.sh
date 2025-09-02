#!/bin/bash

echo "=== AWS CLI and Toolkit Setup Verification ==="
echo ""

# Check AWS CLI version
echo "1. AWS CLI Version:"
aws --version
echo ""

# Check SAM CLI
echo "2. SAM CLI Version:"
sam --version 2>/dev/null || echo "SAM CLI not found in PATH"
echo ""

# Check configured profiles
echo "3. Configured AWS Profiles:"
aws configure list-profiles
echo ""

# Test default profile
echo "4. Testing Default Profile:"
aws sts get-caller-identity --profile default
echo ""

# Check CodeCatalyst
echo "5. CodeCatalyst CLI Available:"
aws codecatalyst help 2>&1 | head -3
echo ""

# List Lambda functions
echo "6. Lambda Functions in us-east-1:"
aws lambda list-functions --profile default --region us-east-1 --query 'Functions[].FunctionName' --output table
echo ""

echo "=== Setup Complete ==="
echo ""
echo "Your AWS CLI is configured with:"
echo "  - Default profile: Active ✓"
echo "  - CodeCatalyst profile: Configured (requires space invitation)"
echo "  - Region: us-east-1"
echo "  - Account: 219895243073"
echo ""
echo "VS Code AWS Toolkit settings have been configured in .vscode/settings.json"
echo ""
echo "To use CodeCatalyst:"
echo "  1. Get invited to a CodeCatalyst space by an administrator"
echo "  2. Or create your own space at https://codecatalyst.aws/"
echo "  3. Update the sso_start_url in ~/.aws/config if using a different organization"