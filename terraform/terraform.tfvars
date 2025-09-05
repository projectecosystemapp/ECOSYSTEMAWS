# Core Configuration
aws_region   = "us-west-2"
project_name = "ecosystemaws"
environment  = "prod"

# Email Configuration for Alerts
# Add your email addresses here for notifications
security_alert_emails = ["alerts@ecosystem.com"]
cost_alert_emails     = ["alerts@ecosystem.com", "finance@ecosystem.com"]

# Budget Configuration
monthly_budget_limit = "5000"
lambda_budget_limit  = "1000"

# Cost Thresholds (in USD)
lambda_cost_threshold   = 500
dynamodb_cost_threshold = 200
s3_cost_threshold       = 100

# Feature Flags
enable_detailed_monitoring    = true
enable_waf_protection         = true
enable_vpc_endpoints          = false # Set to true for enhanced security/performance
enable_enhanced_security      = false # Set to true for additional network ACLs
enable_vpc_flow_logs          = false # Set to true for network monitoring
enable_cloudtrail_logging     = false # Set to true for API audit logging
enable_cost_anomaly_detection = true

# Amplify Resource Names (actual deployed resources)
# These are the real resource names discovered from AWS CLI
appsync_api_id               = "eewn7gx47jesfbcqio4rve4vvm" # Production AppSync API
appsync_api_name             = "amplifyData"
user_profile_table_name      = "UserProfile-eewn7gx47jesfbcqio4rve4vvm-NONE"
service_table_name           = "Service-eewn7gx47jesfbcqio4rve4vvm-NONE"
booking_table_name           = "Booking-eewn7gx47jesfbcqio4rve4vvm-NONE"
transaction_table_name       = "Transaction-eewn7gx47jesfbcqio4rve4vvm-NONE"
message_table_name           = "Message-eewn7gx47jesfbcqio4rve4vvm-NONE"
notification_table_name      = "Notification-eewn7gx47jesfbcqio4rve4vvm-NONE"
review_table_name            = "Review-eewn7gx47jesfbcqio4rve4vvm-NONE"
dispute_table_name           = "Dispute-eewn7gx47jesfbcqio4rve4vvm-NONE"
availability_table_name      = "Availability-eewn7gx47jesfbcqio4rve4vvm-NONE"
analytics_table_name         = "Analytics-eewn7gx47jesfbcqio4rve4vvm-NONE"
user_subscription_table_name = "UserSubscription-eewn7gx47jesfbcqio4rve4vvm-NONE"

# Cognito Configuration
cognito_user_pool_id   = "us-west-2_8kEH4ox55" # Production user pool
cognito_user_pool_name = "amplifyAuthUserPool4BA7F805-P0X93szvGejd"

# Lambda Function Names (actual deployed functions)
stripe_connect_function_name       = "amplify-d1f46y6dzix34a-ma-stripeconnectlambda03822-0XVjwD9kqJn7"
stripe_webhook_function_name       = "amplify-d1f46y6dzix34a-ma-stripewebhooklambdaF97E3-NiX5WUIQlnbp"
payout_manager_function_name       = "amplify-d1f46y6dzix34a-ma-payoutmanagerlambdaD87A7-qXl2O3BWueG2"
refund_processor_function_name     = "amplify-d1f46y6dzix34a-ma-refundprocessorlambda1FA-9BFoTgCbYDNz"
booking_processor_function_name    = "amplify-d1f46y6dzix34a-ma-bookingprocessorlambda1C-nBWq5NSIFQLT"
messaging_handler_function_name    = "amplify-d1f46y6dzix34a-ma-messaginghandlerlambda24-88yQTXZVk4KQ"
notification_handler_function_name = "amplify-d1f46y6dzix34a-ma-notificationhandlerlambd-xYXvkEqGQpbi"

# S3 Storage Configuration (actual deployed bucket)
amplify_storage_bucket_name = "amplify-awsamplifygen2-ry-ecosystemstoragebucket55-fkxwmnai7yn6"

# Stripe Configuration
# Stripe webhook endpoint IP ranges (for WAF allowlist)
stripe_webhook_ips = [
  "3.18.12.63/32",
  "3.130.192.231/32",
  "13.235.14.237/32",
  "13.235.122.149/32",
  "18.211.135.69/32",
  "35.154.171.200/32",
  "52.15.183.38/32",
  "54.187.174.169/32",
  "54.187.205.235/32",
  "54.187.216.72/32"
]