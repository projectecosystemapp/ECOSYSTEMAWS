output "dashboard_arn" {
  description = "CloudWatch Dashboard ARN"
  value       = aws_cloudwatch_dashboard.ecosystem_health.dashboard_arn
}

output "dashboard_url" {
  description = "CloudWatch Dashboard URL"
  value       = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.ecosystem_health.dashboard_name}"
}

output "lambda_error_alarm_arns" {
  description = "Lambda error alarm ARNs"
  value       = { for k, v in aws_cloudwatch_metric_alarm.lambda_error_rate : k => v.arn }
}

output "lambda_duration_alarm_arns" {
  description = "Lambda duration alarm ARNs"
  value       = { for k, v in aws_cloudwatch_metric_alarm.lambda_duration : k => v.arn }
}