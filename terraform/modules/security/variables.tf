variable "environment" {
  description = "Environment name"
  type        = string
}

variable "project_name" {
  description = "Project name"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "alert_email_addresses" {
  description = "List of email addresses for security alerts"
  type        = list(string)
  default     = []
}