# AWS Payment Cryptography Infrastructure
# This module creates the payment processing infrastructure for AWS-native payment processing

locals {
  common_tags = {
    Environment = var.environment
    Project     = var.project_name
    Module      = "payment-cryptography"
    ManagedBy   = "terraform"
  }
}

# KMS Key for Payment Data Encryption
resource "aws_kms_key" "payment_encryption" {
  description              = "${var.project_name} payment data encryption key"
  key_usage                = "ENCRYPT_DECRYPT"
  customer_master_key_spec = var.payment_key_spec
  deletion_window_in_days  = 7
  enable_key_rotation      = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow Payment Functions"
        Effect = "Allow"
        Principal = {
          AWS = [
            "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/*payment*",
            "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/*ach*",
            "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/*escrow*"
          ]
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-payment-encryption-key"
    Type = "PaymentEncryption"
  })
}

resource "aws_kms_alias" "payment_encryption" {
  name          = "alias/${var.project_name}-payment-encryption"
  target_key_id = aws_kms_key.payment_encryption.key_id
}

# KMS Key for ACH Transfer Security
resource "aws_kms_key" "ach_encryption" {
  description              = "${var.project_name} ACH transfer encryption key"
  key_usage                = "ENCRYPT_DECRYPT"
  customer_master_key_spec = var.payment_key_spec
  deletion_window_in_days  = 7
  enable_key_rotation      = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow ACH Functions"
        Effect = "Allow"
        Principal = {
          AWS = [
            "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/*ach*",
            "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/*transfer*"
          ]
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-ach-encryption-key"
    Type = "ACHEncryption"
  })
}

resource "aws_kms_alias" "ach_encryption" {
  name          = "alias/${var.project_name}-ach-encryption"
  target_key_id = aws_kms_key.ach_encryption.key_id
}

# DynamoDB Table for Payment Processing State
resource "aws_dynamodb_table" "payment_transactions" {
  name             = "${var.project_name}-payment-transactions"
  billing_mode     = "PAY_PER_REQUEST"
  hash_key         = "transaction_id"
  range_key        = "created_at"
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  attribute {
    name = "transaction_id"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  attribute {
    name = "provider_id"
    type = "S"
  }

  attribute {
    name = "customer_id"
    type = "S"
  }

  global_secondary_index {
    name            = "ProviderIndex"
    hash_key        = "provider_id"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "CustomerIndex"
    hash_key        = "customer_id"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.payment_encryption.arn
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-payment-transactions"
    Type = "PaymentData"
  })
}

# DynamoDB Table for Escrow Management
resource "aws_dynamodb_table" "escrow_accounts" {
  name             = "${var.project_name}-escrow-accounts"
  billing_mode     = "PAY_PER_REQUEST"
  hash_key         = "account_id"
  range_key        = "transaction_id"
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  attribute {
    name = "account_id"
    type = "S"
  }

  attribute {
    name = "transaction_id"
    type = "S"
  }

  attribute {
    name = "provider_id"
    type = "S"
  }

  global_secondary_index {
    name            = "ProviderEscrowIndex"
    hash_key        = "provider_id"
    range_key       = "account_id"
    projection_type = "ALL"
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.payment_encryption.arn
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-escrow-accounts"
    Type = "EscrowData"
  })
}

# IAM Role for Payment Processing Lambda Functions
resource "aws_iam_role" "payment_processor_role" {
  name = "${var.project_name}-payment-processor-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-payment-processor-role"
    Type = "PaymentRole"
  })
}

# IAM Policy for Payment Processing
resource "aws_iam_policy" "payment_processor_policy" {
  name        = "${var.project_name}-payment-processor-policy"
  description = "Policy for AWS native payment processing"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem"
        ]
        Resource = [
          aws_dynamodb_table.payment_transactions.arn,
          "${aws_dynamodb_table.payment_transactions.arn}/*",
          aws_dynamodb_table.escrow_accounts.arn,
          "${aws_dynamodb_table.escrow_accounts.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = [
          aws_kms_key.payment_encryption.arn,
          aws_kms_key.ach_encryption.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = "arn:aws:secretsmanager:${var.aws_region}:*:secret:*payment*"
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = var.sns_topic_arn != "" ? var.sns_topic_arn : "*"
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-payment-processor-policy"
    Type = "PaymentPolicy"
  })
}

resource "aws_iam_role_policy_attachment" "payment_processor_policy_attachment" {
  role       = aws_iam_role.payment_processor_role.name
  policy_arn = aws_iam_policy.payment_processor_policy.arn
}

# CloudWatch Log Groups for Payment Functions
resource "aws_cloudwatch_log_group" "payment_processor_logs" {
  name              = "/aws/lambda/${var.project_name}-payment-processor"
  retention_in_days = 14
  kms_key_id        = aws_kms_key.payment_encryption.arn

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-payment-processor-logs"
    Type = "PaymentLogs"
  })
}

resource "aws_cloudwatch_log_group" "ach_manager_logs" {
  name              = "/aws/lambda/${var.project_name}-ach-transfer-manager"
  retention_in_days = 14
  kms_key_id        = aws_kms_key.ach_encryption.arn

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-ach-transfer-manager-logs"
    Type = "ACHLogs"
  })
}

resource "aws_cloudwatch_log_group" "escrow_manager_logs" {
  name              = "/aws/lambda/${var.project_name}-escrow-manager"
  retention_in_days = 14
  kms_key_id        = aws_kms_key.payment_encryption.arn

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-escrow-manager-logs"
    Type = "EscrowLogs"
  })
}

# CloudWatch Metrics for Cost Savings Tracking
resource "aws_cloudwatch_metric_alarm" "payment_cost_savings" {
  count = length(var.payment_security_alert_emails) > 0 ? 1 : 0

  alarm_name          = "${var.project_name}-payment-cost-savings"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = "86400" # Daily
  statistic           = "Maximum"
  threshold           = var.payment_cost_baseline_stripe * (100 - var.target_payment_cost_savings_percent) / 100
  alarm_description   = "Payment processing costs exceed ${100 - var.target_payment_cost_savings_percent}% of Stripe baseline"
  treat_missing_data  = "notBreaching"

  dimensions = {
    Currency    = "USD"
    ServiceName = "AWSLambda"
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-payment-cost-savings-alarm"
    Type = "CostOptimization"
  })
}

# Payment Security Event Monitoring
resource "aws_cloudwatch_metric_alarm" "payment_security_events" {
  count = var.sns_topic_arn != "" ? 1 : 0

  alarm_name          = "${var.project_name}-payment-security-events"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "Payment security events detected"
  alarm_actions       = [var.sns_topic_arn]

  dimensions = {
    FunctionName = "${var.project_name}-payment-processor"
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-payment-security-events-alarm"
    Type = "SecurityMonitoring"
  })
}

# Data sources
data "aws_caller_identity" "current" {}