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

variable "appsync_api_id" {
  description = "AppSync API ID"
  type        = string
}

variable "user_profile_table_name" {
  description = "DynamoDB UserProfile table name"
  type        = string
}

variable "service_table_name" {
  description = "DynamoDB Service table name"
  type        = string
}

# AWS Native Payment System Lambda Functions
variable "aws_payment_processor_function_name" {
  description = "AWS Payment Processor Lambda function name"
  type        = string
}

variable "ach_transfer_manager_function_name" {
  description = "ACH Transfer Manager Lambda function name"
  type        = string
}

variable "escrow_manager_function_name" {
  description = "Escrow Manager Lambda function name"
  type        = string
}

variable "fraud_detector_function_name" {
  description = "AWS Native Fraud Detector Lambda function name"
  type        = string
}

variable "cost_monitor_function_name" {
  description = "AWS Native Cost Monitor Lambda function name"
  type        = string
}

variable "booking_processor_function_name" {
  description = "Booking Processor Lambda function name"
  type        = string
}

variable "refund_processor_function_name" {
  description = "AWS Native Refund Processor Lambda function name"
  type        = string
}

variable "sns_topic_arn" {
  description = "SNS topic ARN for alerts"
  type        = string
}