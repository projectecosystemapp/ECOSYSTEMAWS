variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "project_name" {
  description = "Project name"
  type        = string
}

variable "enable_payment_cryptography" {
  description = "Enable AWS Payment Cryptography"
  type        = bool
  default     = true
}

variable "payment_key_spec" {
  description = "Key specification for payment encryption"
  type        = string
  default     = "SYMMETRIC_DEFAULT"
}

variable "payment_cost_baseline_stripe" {
  description = "Monthly Stripe processing costs baseline for comparison"
  type        = number
}

variable "target_payment_cost_savings_percent" {
  description = "Target cost savings percentage vs Stripe"
  type        = number
}

variable "payment_security_alert_emails" {
  description = "Email addresses for payment security alerts"
  type        = list(string)
  default     = []
}

variable "sns_topic_arn" {
  description = "SNS topic ARN for alerts"
  type        = string
  default     = ""
}