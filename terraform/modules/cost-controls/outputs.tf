output "monthly_budget_name" {
  description = "Monthly budget name"
  value       = aws_budgets_budget.monthly_budget.name
}

output "lambda_budget_name" {
  description = "Lambda budget name"
  value       = aws_budgets_budget.lambda_budget.name
}

output "cost_alerts_topic_arn" {
  description = "SNS Topic ARN for cost alerts"
  value       = aws_sns_topic.cost_alerts.arn
}

output "anomaly_detector_arn" {
  description = "Cost Anomaly Detector ARN (manual setup required)"
  value       = null # Anomaly detector requires manual setup
}

output "lambda_cost_alarm_arn" {
  description = "Lambda cost alarm ARN"
  value       = aws_cloudwatch_metric_alarm.high_lambda_costs.arn
}

output "dynamodb_cost_alarm_arn" {
  description = "DynamoDB cost alarm ARN"
  value       = aws_cloudwatch_metric_alarm.high_dynamodb_costs.arn
}

output "s3_cost_alarm_arn" {
  description = "S3 cost alarm ARN"
  value       = aws_cloudwatch_metric_alarm.high_s3_costs.arn
}

# AWS Native Payment System Cost Tracking Outputs
output "aws_payment_budget_name" {
  description = "AWS Payment System budget name"
  value       = aws_budgets_budget.aws_payment_budget.name
}

output "payment_cost_savings_alarm_arn" {
  description = "Payment cost savings target alarm ARN"
  value       = aws_cloudwatch_metric_alarm.payment_cost_savings_target.arn
}

output "aws_payment_cost_alarm_arn" {
  description = "AWS Payment processing cost alarm ARN"
  value       = aws_cloudwatch_metric_alarm.aws_payment_processing_costs.arn
}

output "cost_tracking_log_group_name" {
  description = "Cost tracking CloudWatch log group name"
  value       = aws_cloudwatch_log_group.cost_tracking.name
}

output "payment_cost_savings_metric_name" {
  description = "Payment cost savings CloudWatch metric name"
  value       = aws_cloudwatch_log_metric_filter.payment_cost_savings.name
}