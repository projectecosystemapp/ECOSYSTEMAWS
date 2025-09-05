# Main Terraform configuration for ECOSYSTEM AWS infrastructure
# This configuration manages supporting infrastructure for the AWS Amplify application
# It does NOT manage core Amplify resources (Lambda, AppSync, DynamoDB, etc.)

# Monitoring Module - AWS Native Payment System
module "monitoring" {
  source = "./modules/monitoring"

  # Core configuration
  aws_region   = var.aws_region
  environment  = var.environment
  project_name = var.project_name

  # Amplify resource references
  appsync_api_id          = var.appsync_api_id
  user_profile_table_name = var.user_profile_table_name
  service_table_name      = var.service_table_name

  # AWS Native Payment Lambda functions
  aws_payment_processor_function_name = var.aws_payment_processor_function_name
  ach_transfer_manager_function_name  = var.ach_transfer_manager_function_name
  escrow_manager_function_name        = var.escrow_manager_function_name
  fraud_detector_function_name        = var.fraud_detector_function_name
  cost_monitor_function_name          = var.cost_monitor_function_name

  # Core business Lambda functions (AWS-native now)
  booking_processor_function_name = var.booking_processor_function_name
  refund_processor_function_name  = var.refund_processor_function_name

  # SNS topic for alerts
  sns_topic_arn = var.enable_waf_protection ? module.security[0].security_alerts_topic_arn : ""

  # Enable monitoring for production
  count = var.enable_detailed_monitoring ? 1 : 0
}

# Security Module
module "security" {
  source = "./modules/security"

  # Core configuration
  aws_region   = var.aws_region
  environment  = var.environment
  project_name = var.project_name

  # Alert configuration
  alert_email_addresses = var.security_alert_emails

  # Conditional creation based on feature flag
  count = var.enable_waf_protection ? 1 : 0
}

# Cost Controls Module
module "cost_controls" {
  source = "./modules/cost-controls"

  # Core configuration
  environment  = var.environment
  project_name = var.project_name

  # Budget configuration
  monthly_budget_limit = var.monthly_budget_limit
  lambda_budget_limit  = var.lambda_budget_limit
  budget_alert_emails  = var.cost_alert_emails

  # Cost thresholds
  lambda_cost_threshold   = var.lambda_cost_threshold
  dynamodb_cost_threshold = var.dynamodb_cost_threshold
  s3_cost_threshold       = var.s3_cost_threshold

  # AWS Native Payment Cost Tracking
  payment_cost_baseline_stripe        = var.payment_cost_baseline_stripe
  target_payment_cost_savings_percent = var.target_payment_cost_savings_percent
  aws_payment_cost_threshold          = var.payment_cost_baseline_stripe * (100 - var.target_payment_cost_savings_percent) / 100

  # Only create if email addresses are provided
  count = length(var.cost_alert_emails) > 0 ? 1 : 0
}

# AWS Payment Cryptography Module
module "payment_cryptography" {
  source = "./modules/payment-cryptography"

  # Core configuration
  aws_region   = var.aws_region
  environment  = var.environment
  project_name = var.project_name

  # Payment configuration
  enable_payment_cryptography = var.enable_payment_cryptography
  payment_key_spec            = var.payment_key_spec

  # Cost tracking
  payment_cost_baseline_stripe        = var.payment_cost_baseline_stripe
  target_payment_cost_savings_percent = var.target_payment_cost_savings_percent

  # Security alerts
  payment_security_alert_emails = var.payment_security_alert_emails
  sns_topic_arn                 = var.enable_waf_protection ? module.security[0].security_alerts_topic_arn : ""

  # Conditional creation based on feature flag
  count = var.enable_payment_cryptography ? 1 : 0
}

# Networking Module
module "networking" {
  source = "./modules/networking"

  # Core configuration
  aws_region   = var.aws_region
  environment  = var.environment
  project_name = var.project_name

  # VPC configuration
  enable_vpc_endpoints     = var.enable_vpc_endpoints
  enable_enhanced_security = var.enable_enhanced_security
  enable_flow_logs         = var.enable_vpc_flow_logs

  # SNS topic for network alerts
  sns_topic_arn = var.enable_waf_protection ? module.security[0].security_alerts_topic_arn : ""
}

# CloudTrail for API Audit Logging (Optional)
resource "aws_cloudtrail" "api_audit" {
  count = var.enable_cloudtrail_logging ? 1 : 0

  name           = "${var.project_name}-api-audit-trail"
  s3_bucket_name = aws_s3_bucket.cloudtrail_logs[0].bucket

  event_selector {
    read_write_type           = "All"
    include_management_events = true

    data_resource {
      type   = "AWS::Lambda::Function"
      values = ["arn:aws:lambda:${var.aws_region}:${local.account_id}:function:*"]
    }

    data_resource {
      type = "AWS::DynamoDB::Table"
      values = [
        data.aws_dynamodb_table.user_profile.arn,
        data.aws_dynamodb_table.service.arn
      ]
    }
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-api-audit-trail"
  })

  depends_on = [aws_s3_bucket_policy.cloudtrail_logs]
}

# S3 Bucket for CloudTrail Logs
resource "aws_s3_bucket" "cloudtrail_logs" {
  count  = var.enable_cloudtrail_logging ? 1 : 0
  bucket = "${var.project_name}-cloudtrail-logs-${random_string.bucket_suffix[0].result}"

  tags = merge(local.common_tags, {
    Name    = "${var.project_name}-cloudtrail-logs"
    Purpose = "CloudTrail API audit logs"
  })
}

resource "aws_s3_bucket_public_access_block" "cloudtrail_logs" {
  count  = var.enable_cloudtrail_logging ? 1 : 0
  bucket = aws_s3_bucket.cloudtrail_logs[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_policy" "cloudtrail_logs" {
  count  = var.enable_cloudtrail_logging ? 1 : 0
  bucket = aws_s3_bucket.cloudtrail_logs[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AWSCloudTrailAclCheck"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.cloudtrail_logs[0].arn
      },
      {
        Sid    = "AWSCloudTrailWrite"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.cloudtrail_logs[0].arn}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      }
    ]
  })
}

# Random string for unique S3 bucket naming
resource "random_string" "bucket_suffix" {
  count   = var.enable_cloudtrail_logging ? 1 : 0
  length  = 8
  special = false
  upper   = false
}

# AWS Config for compliance monitoring (Optional)
resource "aws_config_configuration_recorder" "ecosystem_recorder" {
  count    = var.environment == "prod" ? 1 : 0
  name     = "${var.project_name}-config-recorder"
  role_arn = aws_iam_role.config[0].arn

  recording_group {
    all_supported                 = true
    include_global_resource_types = true
  }
}

resource "aws_config_delivery_channel" "ecosystem_delivery_channel" {
  count          = var.environment == "prod" ? 1 : 0
  name           = "${var.project_name}-config-delivery-channel"
  s3_bucket_name = aws_s3_bucket.config_logs[0].bucket

  depends_on = [
    aws_config_configuration_recorder.ecosystem_recorder,
    aws_s3_bucket_policy.config_logs
  ]
}

resource "aws_s3_bucket" "config_logs" {
  count  = var.environment == "prod" ? 1 : 0
  bucket = "${var.project_name}-config-logs-${random_string.config_bucket_suffix[0].result}"

  tags = merge(local.common_tags, {
    Name    = "${var.project_name}-config-logs"
    Purpose = "AWS Config compliance logs"
  })
}

resource "aws_s3_bucket_public_access_block" "config_logs" {
  count  = var.environment == "prod" ? 1 : 0
  bucket = aws_s3_bucket.config_logs[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_policy" "config_logs" {
  count  = var.environment == "prod" ? 1 : 0
  bucket = aws_s3_bucket.config_logs[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AWSConfigBucketPermissionsCheck"
        Effect = "Allow"
        Principal = {
          Service = "config.amazonaws.com"
        }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.config_logs[0].arn
        Condition = {
          StringEquals = {
            "AWS:SourceAccount" = local.account_id
          }
        }
      },
      {
        Sid    = "AWSConfigBucketExistenceCheck"
        Effect = "Allow"
        Principal = {
          Service = "config.amazonaws.com"
        }
        Action   = "s3:ListBucket"
        Resource = aws_s3_bucket.config_logs[0].arn
        Condition = {
          StringEquals = {
            "AWS:SourceAccount" = local.account_id
          }
        }
      },
      {
        Sid    = "AWSConfigBucketDelivery"
        Effect = "Allow"
        Principal = {
          Service = "config.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.config_logs[0].arn}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl"      = "bucket-owner-full-control"
            "AWS:SourceAccount" = local.account_id
          }
        }
      }
    ]
  })
}

resource "random_string" "config_bucket_suffix" {
  count   = var.environment == "prod" ? 1 : 0
  length  = 8
  special = false
  upper   = false
}

resource "aws_iam_role" "config" {
  count = var.environment == "prod" ? 1 : 0
  name  = "${var.project_name}-config-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "config.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-config-role"
  })
}

resource "aws_iam_role_policy_attachment" "config" {
  count      = var.environment == "prod" ? 1 : 0
  role       = aws_iam_role.config[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWS_ConfigRole"
}