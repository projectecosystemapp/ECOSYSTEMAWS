output "web_acl_arn" {
  description = "WAF Web ACL ARN"
  value       = aws_wafv2_web_acl.ecosystem_api_shield.arn
}

output "web_acl_id" {
  description = "WAF Web ACL ID"
  value       = aws_wafv2_web_acl.ecosystem_api_shield.id
}

output "security_alerts_topic_arn" {
  description = "SNS Topic ARN for security alerts"
  value       = aws_sns_topic.security_alerts.arn
}

output "waf_log_group_name" {
  description = "WAF CloudWatch log group name"
  value       = aws_cloudwatch_log_group.waf_log_group.name
}

output "stripe_webhook_ip_set_arn" {
  description = "Stripe webhook IP set ARN"
  value       = aws_wafv2_ip_set.stripe_webhook_ips.arn
}