# Data sources to reference existing AWS Amplify resources
# These resources are managed by Amplify, not Terraform

# Get the current AWS account ID and region
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Note: AppSync GraphQL API data source is not available in the AWS provider
# We'll use local values to reference the API ID directly from variables
# In a real deployment, you would get this from the Amplify CLI outputs

# Reference existing DynamoDB tables created by Amplify
# These tables are managed by Amplify, we're just referencing them
data "aws_dynamodb_table" "user_profile" {
  name = var.user_profile_table_name
}

data "aws_dynamodb_table" "service" {
  name = var.service_table_name
}

# Reference existing Lambda functions created by Amplify
data "aws_lambda_function" "aws_payment_processor" {
  function_name = var.aws_payment_processor_function_name
}

data "aws_lambda_function" "ach_transfer_manager" {
  function_name = var.ach_transfer_manager_function_name
}

data "aws_lambda_function" "escrow_manager" {
  function_name = var.escrow_manager_function_name
}

data "aws_lambda_function" "fraud_detector" {
  function_name = var.fraud_detector_function_name
}

data "aws_lambda_function" "cost_monitor" {
  function_name = var.cost_monitor_function_name
}

# Reference existing S3 bucket created by Amplify
data "aws_s3_bucket" "amplify_storage" {
  bucket = var.amplify_storage_bucket_name
}

# Note: Cognito User Pool lookup by name is not directly supported
# In a real deployment, you would get the User Pool ID from Amplify CLI outputs
# For now, we'll reference it via variable

# Get availability zones for the current region
data "aws_availability_zones" "available" {
  state = "available"
}

# Reference CloudTrail (if it exists) for audit logging
data "aws_cloudtrail_service_account" "main" {}

# Local values for computed data
locals {
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.name

  # Computed ARNs for existing resources
  # AppSync API ARN will be constructed from known format
  appsync_api_arn = "arn:aws:appsync:${local.region}:${local.account_id}:apis/${var.appsync_api_id}"

  # Common tags
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
    Account     = local.account_id
    Region      = local.region
  }

  # Lambda function ARNs for AWS native payment processing
  lambda_functions = {
    aws_payment_processor = data.aws_lambda_function.aws_payment_processor.arn
    ach_transfer_manager  = data.aws_lambda_function.ach_transfer_manager.arn
    escrow_manager        = data.aws_lambda_function.escrow_manager.arn
    fraud_detector        = data.aws_lambda_function.fraud_detector.arn
    cost_monitor         = data.aws_lambda_function.cost_monitor.arn
  }
}