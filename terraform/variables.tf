# Core Configuration Variables
variable "aws_region" {
  description = "AWS region where resources will be created"
  type        = string
  default     = "us-west-2"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.aws_region))
    error_message = "AWS region must be a valid region identifier."
  }
}

variable "project_name" {
  description = "Name of the project - used for resource naming and tagging"
  type        = string
  default     = "ecosystemaws"

  validation {
    condition     = can(regex("^[a-z0-9-]{3,20}$", var.project_name))
    error_message = "Project name must be 3-20 characters, lowercase letters, numbers, and hyphens only."
  }
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "prod"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

# Amplify Resource References
# These variables reference existing resources created by AWS Amplify
variable "appsync_api_id" {
  description = "ID of the existing AppSync API created by Amplify"
  type        = string
  default     = "your-appsync-api-id" # Update this with your actual AppSync API ID
}

variable "appsync_api_name" {
  description = "Name of the existing AppSync API created by Amplify"
  type        = string
  default     = "amplifyDataAPIECOSYSTEMAWS"
}

variable "user_profile_table_name" {
  description = "Name of the existing DynamoDB UserProfile table created by Amplify"
  type        = string
  default     = "UserProfile-amplifyDataAPIECOSYSTEMAWS"
}

variable "service_table_name" {
  description = "Name of the existing DynamoDB Service table created by Amplify"
  type        = string
  default     = "Service-amplifyDataAPIECOSYSTEMAWS"
}

variable "amplify_storage_bucket_name" {
  description = "Name of the existing S3 bucket created by Amplify for storage"
  type        = string
  default     = "amplify-ecosystemaws-prod-storage"
}

variable "cognito_user_pool_name" {
  description = "Name of the existing Cognito User Pool created by Amplify"
  type        = string
  default     = "amplify_backend_Manager_ecosystemaws"
}

# Lambda Function Names (created by Amplify) - AWS Native Payment System
variable "aws_payment_processor_function_name" {
  description = "Name of the AWS Payment Processor Lambda function"
  type        = string
  default     = "amplify-ecosystemaws-prod-aws-payment-processor"
}

variable "ach_transfer_manager_function_name" {
  description = "Name of the ACH Transfer Manager Lambda function"
  type        = string
  default     = "amplify-ecosystemaws-prod-ach-transfer-manager"
}

variable "escrow_manager_function_name" {
  description = "Name of the Escrow Manager Lambda function"
  type        = string
  default     = "amplify-ecosystemaws-prod-escrow-manager"
}

variable "fraud_detector_function_name" {
  description = "Name of the Fraud Detector Lambda function"
  type        = string
  default     = "amplify-ecosystemaws-prod-fraud-detector"
}

variable "cost_monitor_function_name" {
  description = "Name of the Cost Monitor Lambda function"
  type        = string
  default     = "amplify-ecosystemaws-prod-cost-monitor"
}

variable "booking_processor_function_name" {
  description = "Name of the Booking Processor Lambda function"
  type        = string
  default     = "amplify-ecosystemaws-prod-booking-processor"
}

variable "refund_processor_function_name" {
  description = "Name of the AWS Native Refund Processor Lambda function"
  type        = string
  default     = "amplify-ecosystemaws-prod-aws-refund-processor"
}

# Monitoring Configuration
variable "enable_detailed_monitoring" {
  description = "Enable detailed CloudWatch monitoring and alarms"
  type        = bool
  default     = true
}

# Security Configuration
variable "security_alert_emails" {
  description = "List of email addresses to receive security alerts"
  type        = list(string)
  default     = []
}

variable "enable_waf_protection" {
  description = "Enable WAF protection for API endpoints"
  type        = bool
  default     = true
}

# Cost Control Configuration
variable "monthly_budget_limit" {
  description = "Monthly budget limit in USD for cost alerts"
  type        = string
  default     = "5000"
}

variable "lambda_budget_limit" {
  description = "Lambda-specific monthly budget limit in USD"
  type        = string
  default     = "1000"
}

variable "cost_alert_emails" {
  description = "List of email addresses to receive cost alerts and budget notifications"
  type        = list(string)
  default     = []
}

variable "lambda_cost_threshold" {
  description = "Threshold for Lambda cost alarm in USD"
  type        = number
  default     = 500
}

variable "dynamodb_cost_threshold" {
  description = "Threshold for DynamoDB cost alarm in USD"
  type        = number
  default     = 200
}

variable "s3_cost_threshold" {
  description = "Threshold for S3 cost alarm in USD"
  type        = number
  default     = 100
}

# AWS Payment Cryptography Configuration
variable "enable_payment_cryptography" {
  description = "Enable AWS Payment Cryptography for card processing"
  type        = bool
  default     = true
}

variable "payment_key_spec" {
  description = "Key specification for payment encryption (AES_256, RSA_2048)"
  type        = string
  default     = "AES_256"

  validation {
    condition     = contains(["AES_256", "RSA_2048", "RSA_3072"], var.payment_key_spec)
    error_message = "Payment key spec must be AES_256, RSA_2048, or RSA_3072."
  }
}

variable "payment_cost_baseline_stripe" {
  description = "Monthly Stripe processing costs baseline in USD for cost savings tracking"
  type        = number
  default     = 10000
}

variable "target_payment_cost_savings_percent" {
  description = "Target cost savings percentage compared to Stripe baseline"
  type        = number
  default     = 98

  validation {
    condition     = var.target_payment_cost_savings_percent >= 80 && var.target_payment_cost_savings_percent <= 99
    error_message = "Target payment cost savings must be between 80% and 99%."
  }
}

variable "payment_security_alert_emails" {
  description = "List of email addresses to receive payment security alerts"
  type        = list(string)
  default     = []
}

# Networking Configuration
variable "enable_vpc_endpoints" {
  description = "Enable VPC endpoints for AWS services to improve security and reduce costs"
  type        = bool
  default     = false
}

variable "enable_enhanced_security" {
  description = "Enable enhanced network security rules (Network ACLs)"
  type        = bool
  default     = false
}

variable "enable_vpc_flow_logs" {
  description = "Enable VPC Flow Logs for network traffic monitoring"
  type        = bool
  default     = false
}

# Backup and Disaster Recovery
variable "enable_automated_backups" {
  description = "Enable automated backups for supported resources"
  type        = bool
  default     = true
}

variable "backup_retention_days" {
  description = "Number of days to retain automated backups"
  type        = number
  default     = 30

  validation {
    condition     = var.backup_retention_days >= 1 && var.backup_retention_days <= 365
    error_message = "Backup retention days must be between 1 and 365."
  }
}

# Feature Flags
variable "enable_cost_anomaly_detection" {
  description = "Enable AWS Cost Anomaly Detection"
  type        = bool
  default     = true
}

variable "enable_cloudtrail_logging" {
  description = "Enable CloudTrail for API logging and auditing"
  type        = bool
  default     = false
}

