#!/bin/bash

# Setup Agent Admin Role for Account 219895243073
ACCOUNT_ID="219895243073"
REGION="us-west-2"

echo "🚀 Setting up AgentAdmin role for account $ACCOUNT_ID..."

# 1. Create boundary policy
echo "Creating boundary policy..."
aws iam create-policy \
  --policy-name AgentBoundary \
  --policy-document file://agent-boundary.json \
  --region $REGION

# 2. Create AgentAdmin role with trust policy for root user
echo "Creating AgentAdmin role..."
aws iam create-role \
  --role-name AgentAdmin \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "AWS": "arn:aws:iam::219895243073:root"
        },
        "Action": "sts:AssumeRole"
      }
    ]
  }' \
  --max-session-duration 3600 \
  --permissions-boundary "arn:aws:iam::$ACCOUNT_ID:policy/AgentBoundary" \
  --region $REGION

# 3. Attach AdministratorAccess
echo "Attaching AdministratorAccess..."
aws iam attach-role-policy \
  --role-name AgentAdmin \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess \
  --region $REGION

echo "✅ AgentAdmin role created successfully!"
echo ""
echo "🔑 To assume the role:"
echo "aws sts assume-role --role-arn arn:aws:iam::$ACCOUNT_ID:role/AgentAdmin --role-session-name agent-session"
echo ""
echo "📊 Role ARN: arn:aws:iam::$ACCOUNT_ID:role/AgentAdmin"