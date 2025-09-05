# Terraform Outputs for ECOSYSTEM AWS Infrastructure

# Core Infrastructure Information
output "account_id" {
  description = "AWS Account ID"
  value       = local.account_id
}

output "region" {
  description = "AWS Region"
  value       = local.region
}

output "environment" {
  description = "Environment name"
  value       = var.environment
}

# Monitoring Outputs
output "monitoring_dashboard_url" {
  description = "CloudWatch Dashboard URL for monitoring"
  value       = var.enable_detailed_monitoring ? module.monitoring[0].dashboard_url : null
}

output "monitoring_dashboard_arn" {
  description = "CloudWatch Dashboard ARN"
  value       = var.enable_detailed_monitoring ? module.monitoring[0].dashboard_arn : null
}

output "lambda_error_alarms" {
  description = "Lambda error alarm ARNs"
  value       = var.enable_detailed_monitoring ? module.monitoring[0].lambda_error_alarm_arns : {}
}

output "lambda_duration_alarms" {
  description = "Lambda duration alarm ARNs"
  value       = var.enable_detailed_monitoring ? module.monitoring[0].lambda_duration_alarm_arns : {}
}

# Security Outputs
output "waf_web_acl_arn" {
  description = "WAF Web ACL ARN for API protection"
  value       = var.enable_waf_protection ? module.security[0].web_acl_arn : null
}

output "waf_web_acl_id" {
  description = "WAF Web ACL ID"
  value       = var.enable_waf_protection ? module.security[0].web_acl_id : null
}

output "security_alerts_topic_arn" {
  description = "SNS Topic ARN for security alerts"
  value       = var.enable_waf_protection ? module.security[0].security_alerts_topic_arn : null
}

output "waf_log_group_name" {
  description = "WAF CloudWatch log group name"
  value       = var.enable_waf_protection ? module.security[0].waf_log_group_name : null
}

# Cost Control Outputs
output "monthly_budget_name" {
  description = "Monthly budget name"
  value       = length(var.cost_alert_emails) > 0 ? module.cost_controls[0].monthly_budget_name : null
}

output "lambda_budget_name" {
  description = "Lambda-specific budget name"
  value       = length(var.cost_alert_emails) > 0 ? module.cost_controls[0].lambda_budget_name : null
}

output "cost_alerts_topic_arn" {
  description = "SNS Topic ARN for cost alerts"
  value       = length(var.cost_alert_emails) > 0 ? module.cost_controls[0].cost_alerts_topic_arn : null
}

output "cost_anomaly_detector_arn" {
  description = "Cost Anomaly Detector ARN"
  value       = length(var.cost_alert_emails) > 0 ? module.cost_controls[0].anomaly_detector_arn : null
}

# AWS Payment Cryptography Outputs
output "payment_encryption_key_arn" {
  description = "Payment encryption KMS key ARN"
  value       = var.enable_payment_cryptography ? module.payment_cryptography[0].payment_encryption_key_arn : null
}

output "ach_encryption_key_arn" {
  description = "ACH encryption KMS key ARN"
  value       = var.enable_payment_cryptography ? module.payment_cryptography[0].ach_encryption_key_arn : null
}

output "payment_transactions_table_name" {
  description = "Payment transactions DynamoDB table name"
  value       = var.enable_payment_cryptography ? module.payment_cryptography[0].payment_transactions_table_name : null
}

output "escrow_accounts_table_name" {
  description = "Escrow accounts DynamoDB table name"
  value       = var.enable_payment_cryptography ? module.payment_cryptography[0].escrow_accounts_table_name : null
}

output "payment_processor_role_arn" {
  description = "Payment processor IAM role ARN"
  value       = var.enable_payment_cryptography ? module.payment_cryptography[0].payment_processor_role_arn : null
}

output "aws_payment_budget_name" {
  description = "AWS Payment System budget name"
  value       = length(var.cost_alert_emails) > 0 ? module.cost_controls[0].aws_payment_budget_name : null
}

output "payment_cost_savings_alarm_arn" {
  description = "Payment cost savings alarm ARN"
  value       = length(var.cost_alert_emails) > 0 ? module.cost_controls[0].payment_cost_savings_alarm_arn : null
}

# Networking Outputs
output "vpc_id" {
  description = "VPC ID"
  value       = module.networking.vpc_id
}

output "vpc_cidr_block" {
  description = "VPC CIDR block"
  value       = module.networking.vpc_cidr_block
}

output "subnet_ids" {
  description = "Subnet IDs"
  value       = module.networking.subnet_ids
}

output "vpc_endpoints" {
  description = "VPC Endpoint IDs (if enabled)"
  value = {
    s3       = module.networking.s3_vpc_endpoint_id
    dynamodb = module.networking.dynamodb_vpc_endpoint_id
    lambda   = module.networking.lambda_vpc_endpoint_id
  }
}

# Amplify Resource References
output "amplify_resources" {
  description = "References to existing Amplify resources"
  value = {
    appsync_api_id          = var.appsync_api_id
    appsync_api_arn         = local.appsync_api_arn
    user_profile_table_name = var.user_profile_table_name
    service_table_name      = var.service_table_name
    storage_bucket_name     = var.amplify_storage_bucket_name
    cognito_user_pool_name  = var.cognito_user_pool_name
  }
}

output "lambda_functions" {
  description = "Lambda function ARNs"
  value       = local.lambda_functions
}

# Audit and Compliance Outputs
output "cloudtrail_arn" {
  description = "CloudTrail ARN for API auditing"
  value       = var.enable_cloudtrail_logging ? aws_cloudtrail.api_audit[0].arn : null
}

output "cloudtrail_bucket_name" {
  description = "S3 bucket name for CloudTrail logs"
  value       = var.enable_cloudtrail_logging ? aws_s3_bucket.cloudtrail_logs[0].bucket : null
}

output "config_recorder_name" {
  description = "AWS Config recorder name"
  value       = var.environment == "prod" ? aws_config_configuration_recorder.ecosystem_recorder[0].name : null
}

# Summary Information
output "infrastructure_summary" {
  description = "Summary of deployed infrastructure components"
  value = {
    monitoring_enabled           = var.enable_detailed_monitoring
    waf_protection_enabled       = var.enable_waf_protection
    cost_controls_enabled        = length(var.cost_alert_emails) > 0
    vpc_endpoints_enabled        = var.enable_vpc_endpoints
    cloudtrail_enabled           = var.enable_cloudtrail_logging
    config_enabled               = var.environment == "prod"
    backup_enabled               = var.enable_automated_backups
    aws_payment_system_enabled   = var.enable_payment_cryptography
    payment_cost_savings_target  = "${var.target_payment_cost_savings_percent}%"
    payment_cost_baseline_stripe = "$${var.payment_cost_baseline_stripe}/month"
  }
}

# Resource Counts
output "resource_counts" {
  description = "Count of created resources by type"
  value = {
    cloudwatch_dashboards = var.enable_detailed_monitoring ? 1 : 0
    cloudwatch_alarms     = (var.enable_detailed_monitoring ? 15 : 0) + (var.enable_payment_cryptography ? 2 : 0)
    waf_web_acls          = var.enable_waf_protection ? 1 : 0
    budgets               = (length(var.cost_alert_emails) > 0 ? 2 : 0) + (var.enable_payment_cryptography ? 1 : 0)
    sns_topics            = (var.enable_waf_protection ? 1 : 0) + (length(var.cost_alert_emails) > 0 ? 1 : 0)
    vpc_endpoints         = var.enable_vpc_endpoints ? 5 : 0
    s3_buckets            = (var.enable_cloudtrail_logging ? 1 : 0) + (var.environment == "prod" ? 1 : 0)
    kms_keys              = var.enable_payment_cryptography ? 2 : 0
    dynamodb_tables       = var.enable_payment_cryptography ? 2 : 0
    iam_roles             = var.enable_payment_cryptography ? 1 : 0
    iam_policies          = var.enable_payment_cryptography ? 1 : 0
    cloudwatch_log_groups = (var.enable_payment_cryptography ? 4 : 0) + (length(var.cost_alert_emails) > 0 ? 1 : 0)
  }
}

# Important URLs and Console Links
output "important_links" {
  description = "Important AWS Console links"
  value = {
    cloudwatch_dashboard = var.enable_detailed_monitoring ? "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=ecosystem-aws-payment-health" : null
    waf_console          = var.enable_waf_protection ? "https://console.aws.amazon.com/wafv2/homev2/web-acls?region=${var.aws_region}" : null
    cost_explorer        = "https://console.aws.amazon.com/cost-reports/home?region=${var.aws_region}#/dashboard"
    budgets_console      = length(var.cost_alert_emails) > 0 ? "https://console.aws.amazon.com/billing/home?region=${var.aws_region}#/budgets" : null
    kms_console          = var.enable_payment_cryptography ? "https://console.aws.amazon.com/kms/home?region=${var.aws_region}#/kms/keys" : null
    dynamodb_console     = var.enable_payment_cryptography ? "https://console.aws.amazon.com/dynamodb/home?region=${var.aws_region}#tables:" : null
    payment_transactions = var.enable_payment_cryptography ? "https://console.aws.amazon.com/dynamodb/home?region=${var.aws_region}#item-explorer?table=${var.project_name}-payment-transactions" : null
    escrow_accounts      = var.enable_payment_cryptography ? "https://console.aws.amazon.com/dynamodb/home?region=${var.aws_region}#item-explorer?table=${var.project_name}-escrow-accounts" : null
  }
}