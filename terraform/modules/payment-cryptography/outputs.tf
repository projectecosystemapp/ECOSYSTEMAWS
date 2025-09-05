# Payment Cryptography Module Outputs

output "payment_encryption_key_id" {
  description = "ID of the payment encryption KMS key"
  value       = aws_kms_key.payment_encryption.key_id
}

output "payment_encryption_key_arn" {
  description = "ARN of the payment encryption KMS key"
  value       = aws_kms_key.payment_encryption.arn
}

output "ach_encryption_key_id" {
  description = "ID of the ACH encryption KMS key"
  value       = aws_kms_key.ach_encryption.key_id
}

output "ach_encryption_key_arn" {
  description = "ARN of the ACH encryption KMS key"
  value       = aws_kms_key.ach_encryption.arn
}

output "payment_transactions_table_name" {
  description = "Name of the payment transactions DynamoDB table"
  value       = aws_dynamodb_table.payment_transactions.name
}

output "payment_transactions_table_arn" {
  description = "ARN of the payment transactions DynamoDB table"
  value       = aws_dynamodb_table.payment_transactions.arn
}

output "escrow_accounts_table_name" {
  description = "Name of the escrow accounts DynamoDB table"
  value       = aws_dynamodb_table.escrow_accounts.name
}

output "escrow_accounts_table_arn" {
  description = "ARN of the escrow accounts DynamoDB table"
  value       = aws_dynamodb_table.escrow_accounts.arn
}

output "payment_processor_role_arn" {
  description = "ARN of the payment processor IAM role"
  value       = aws_iam_role.payment_processor_role.arn
}

output "payment_processor_role_name" {
  description = "Name of the payment processor IAM role"
  value       = aws_iam_role.payment_processor_role.name
}

output "payment_cost_savings_alarm_arn" {
  description = "ARN of the payment cost savings CloudWatch alarm"
  value       = length(aws_cloudwatch_metric_alarm.payment_cost_savings) > 0 ? aws_cloudwatch_metric_alarm.payment_cost_savings[0].arn : null
}

output "payment_security_alarm_arn" {
  description = "ARN of the payment security events CloudWatch alarm"
  value       = length(aws_cloudwatch_metric_alarm.payment_security_events) > 0 ? aws_cloudwatch_metric_alarm.payment_security_events[0].arn : null
}

output "payment_log_groups" {
  description = "CloudWatch log groups for payment functions"
  value = {
    payment_processor = aws_cloudwatch_log_group.payment_processor_logs.name
    ach_manager       = aws_cloudwatch_log_group.ach_manager_logs.name
    escrow_manager    = aws_cloudwatch_log_group.escrow_manager_logs.name
  }
}