# AWS Budgets for Cost Control
resource "aws_budgets_budget" "monthly_budget" {
  name              = "${var.project_name}-monthly-budget"
  budget_type       = "COST"
  limit_amount      = var.monthly_budget_limit
  limit_unit        = "USD"
  time_unit         = "MONTHLY"
  time_period_start = formatdate("YYYY-MM-01_00:00", timestamp())

  cost_filter {
    name   = "Service"
    values = ["Amazon Simple Storage Service", "AWS Lambda", "Amazon DynamoDB", "Amazon CloudWatch", "AWS AppSync", "Amazon Cognito"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.budget_alert_emails
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = var.budget_alert_emails
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 90
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.budget_alert_emails
  }

  depends_on = [aws_sns_topic.cost_alerts]
}

# SNS Topic for Cost Alerts
resource "aws_sns_topic" "cost_alerts" {
  name = "${var.project_name}-cost-alerts"

  tags = {
    Name        = "${var.project_name}-cost-alerts"
    Environment = var.environment
  }
}

resource "aws_sns_topic_subscription" "cost_email_alerts" {
  count     = length(var.budget_alert_emails)
  topic_arn = aws_sns_topic.cost_alerts.arn
  protocol  = "email"
  endpoint  = var.budget_alert_emails[count.index]
}

# CloudWatch Alarms for High Costs
resource "aws_cloudwatch_metric_alarm" "high_lambda_costs" {
  alarm_name          = "high-lambda-costs"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = "21600" # 6 hours
  statistic           = "Maximum"
  threshold           = var.lambda_cost_threshold
  alarm_description   = "This metric monitors estimated Lambda charges"
  alarm_actions       = [aws_sns_topic.cost_alerts.arn]

  dimensions = {
    Currency    = "USD"
    ServiceName = "AWSLambda"
  }

  tags = {
    Name        = "high-lambda-costs-alarm"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_metric_alarm" "high_dynamodb_costs" {
  alarm_name          = "high-dynamodb-costs"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = "21600" # 6 hours
  statistic           = "Maximum"
  threshold           = var.dynamodb_cost_threshold
  alarm_description   = "This metric monitors estimated DynamoDB charges"
  alarm_actions       = [aws_sns_topic.cost_alerts.arn]

  dimensions = {
    Currency    = "USD"
    ServiceName = "AmazonDynamoDB"
  }

  tags = {
    Name        = "high-dynamodb-costs-alarm"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_metric_alarm" "high_s3_costs" {
  alarm_name          = "high-s3-costs"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = "21600" # 6 hours
  statistic           = "Maximum"
  threshold           = var.s3_cost_threshold
  alarm_description   = "This metric monitors estimated S3 charges"
  alarm_actions       = [aws_sns_topic.cost_alerts.arn]

  dimensions = {
    Currency    = "USD"
    ServiceName = "AmazonS3"
  }

  tags = {
    Name        = "high-s3-costs-alarm"
    Environment = var.environment
  }
}

# Note: Cost Anomaly Detection resources are not available in all AWS regions
# These would be configured manually in the AWS Console or via AWS CLI
# Commented out to avoid validation errors

# resource "aws_ce_anomaly_detector" "service_anomaly_detector" {
#   name         = "${var.project_name}-service-anomaly-detector"
#   monitor_type = "DIMENSIONAL"
# 
#   specification = jsonencode({
#     Dimension    = "SERVICE"
#     MatchOptions = ["EQUALS"]
#     Values = [
#       "Amazon Simple Storage Service",
#       "AWS Lambda",
#       "Amazon DynamoDB",
#       "Amazon CloudWatch",
#       "AWS AppSync",
#       "Amazon Cognito"
#     ]
#   })
# 
#   tags = {
#     Name        = "${var.project_name}-service-anomaly-detector"
#     Environment = var.environment
#   }
# }

# Resource-based budget for Lambda functions
resource "aws_budgets_budget" "lambda_budget" {
  name              = "${var.project_name}-lambda-budget"
  budget_type       = "COST"
  limit_amount      = var.lambda_budget_limit
  limit_unit        = "USD"
  time_unit         = "MONTHLY"
  time_period_start = formatdate("YYYY-MM-01_00:00", timestamp())

  cost_filter {
    name   = "Service"
    values = ["AWS Lambda"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.budget_alert_emails
  }

  depends_on = [aws_sns_topic.cost_alerts]
}

# AWS Native Payment System Cost Tracking
resource "aws_budgets_budget" "aws_payment_budget" {
  name              = "${var.project_name}-aws-payment-budget"
  budget_type       = "COST"
  limit_amount      = tostring(var.payment_cost_baseline_stripe * (100 - var.target_payment_cost_savings_percent) / 100)
  limit_unit        = "USD"
  time_unit         = "MONTHLY"
  time_period_start = formatdate("YYYY-MM-01_00:00", timestamp())

  cost_filter {
    name   = "TagKey"
    values = ["PaymentProcessing"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 50
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.budget_alert_emails
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.budget_alert_emails
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = var.budget_alert_emails
  }

  depends_on = [aws_sns_topic.cost_alerts]
}

# Cost Savings Tracking Custom CloudWatch Metric
resource "aws_cloudwatch_log_metric_filter" "payment_cost_savings" {
  name           = "${var.project_name}-payment-cost-savings"
  log_group_name = "/aws/lambda/${var.project_name}-cost-tracking"
  pattern        = "[timestamp, level=\"INFO\", savings_metric, actual_cost, stripe_baseline]"

  metric_transformation {
    name          = "PaymentCostSavingsPercent"
    namespace     = "ECOSYSTEMAWS/Payments"
    value         = "((${var.payment_cost_baseline_stripe} - $actual_cost) / ${var.payment_cost_baseline_stripe}) * 100"
    default_value = "0"
  }
}

resource "aws_cloudwatch_log_group" "cost_tracking" {
  name              = "/aws/lambda/${var.project_name}-cost-tracking"
  retention_in_days = 30

  tags = {
    Name        = "${var.project_name}-cost-tracking-logs"
    Environment = var.environment
    Type        = "CostOptimization"
  }
}

# Alarm for Cost Savings Target Miss
resource "aws_cloudwatch_metric_alarm" "payment_cost_savings_target" {
  alarm_name          = "${var.project_name}-payment-cost-savings-target"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "PaymentCostSavingsPercent"
  namespace           = "ECOSYSTEMAWS/Payments"
  period              = "86400" # Daily evaluation
  statistic           = "Average"
  threshold           = var.target_payment_cost_savings_percent
  alarm_description   = "AWS Payment System cost savings below target of ${var.target_payment_cost_savings_percent}%"
  alarm_actions       = [aws_sns_topic.cost_alerts.arn]
  treat_missing_data  = "notBreaching"

  tags = {
    Name        = "${var.project_name}-payment-cost-savings-target-alarm"
    Environment = var.environment
    Type        = "CostOptimization"
  }
}

# AWS Payment Processing Costs Alarm
resource "aws_cloudwatch_metric_alarm" "aws_payment_processing_costs" {
  alarm_name          = "${var.project_name}-aws-payment-processing-costs"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = "21600" # 6 hours
  statistic           = "Maximum"
  threshold           = var.aws_payment_cost_threshold
  alarm_description   = "AWS Payment Processing costs exceeded threshold"
  alarm_actions       = [aws_sns_topic.cost_alerts.arn]

  dimensions = {
    Currency = "USD"
    TagKey   = "PaymentProcessing"
  }

  tags = {
    Name        = "${var.project_name}-aws-payment-processing-costs-alarm"
    Environment = var.environment
    Type        = "PaymentCostMonitoring"
  }
}