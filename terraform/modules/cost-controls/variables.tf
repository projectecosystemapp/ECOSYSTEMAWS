variable "environment" {
  description = "Environment name"
  type        = string
}

variable "project_name" {
  description = "Project name"
  type        = string
}

variable "monthly_budget_limit" {
  description = "Monthly budget limit in USD"
  type        = string
  default     = "5000"
}

variable "lambda_budget_limit" {
  description = "Lambda-specific monthly budget limit in USD"
  type        = string
  default     = "1000"
}

variable "budget_alert_emails" {
  description = "List of email addresses for budget alerts"
  type        = list(string)
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

# AWS Native Payment Cost Tracking Variables
variable "payment_cost_baseline_stripe" {
  description = "Monthly Stripe processing costs baseline for comparison"
  type        = number
  default     = 10000
}

variable "target_payment_cost_savings_percent" {
  description = "Target cost savings percentage compared to Stripe baseline"
  type        = number
  default     = 98
}

variable "aws_payment_cost_threshold" {
  description = "Threshold for AWS payment processing cost alarm in USD"
  type        = number
  default     = 200
}