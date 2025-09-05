# CloudWatch Dashboard for AWS Native Payment System Monitoring
resource "aws_cloudwatch_dashboard" "ecosystem_health" {
  dashboard_name = "ecosystem-aws-payment-health"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/Lambda", "Duration", "FunctionName", var.aws_payment_processor_function_name],
            ["AWS/Lambda", "Duration", "FunctionName", var.ach_transfer_manager_function_name],
            ["AWS/Lambda", "Duration", "FunctionName", var.escrow_manager_function_name],
            ["AWS/Lambda", "Duration", "FunctionName", var.fraud_detector_function_name],
            ["AWS/Lambda", "Duration", "FunctionName", var.cost_monitor_function_name],
            ["AWS/Lambda", "Duration", "FunctionName", var.booking_processor_function_name],
            ["AWS/Lambda", "Duration", "FunctionName", var.refund_processor_function_name]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "AWS Payment System - Lambda Function Duration"
          period  = 300
          stat    = "Average"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/Lambda", "Errors", "FunctionName", var.aws_payment_processor_function_name],
            ["AWS/Lambda", "Errors", "FunctionName", var.ach_transfer_manager_function_name],
            ["AWS/Lambda", "Errors", "FunctionName", var.escrow_manager_function_name],
            ["AWS/Lambda", "Errors", "FunctionName", var.fraud_detector_function_name],
            ["AWS/Lambda", "Errors", "FunctionName", var.cost_monitor_function_name],
            ["AWS/Lambda", "Errors", "FunctionName", var.booking_processor_function_name],
            ["AWS/Lambda", "Errors", "FunctionName", var.refund_processor_function_name]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "AWS Payment System - Lambda Function Errors"
          period  = 300
          stat    = "Sum"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 12
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/Lambda", "Throttles", "FunctionName", var.aws_payment_processor_function_name],
            ["AWS/Lambda", "Throttles", "FunctionName", var.ach_transfer_manager_function_name],
            ["AWS/Lambda", "Throttles", "FunctionName", var.escrow_manager_function_name],
            ["AWS/Lambda", "Throttles", "FunctionName", var.fraud_detector_function_name],
            ["AWS/Lambda", "Throttles", "FunctionName", var.cost_monitor_function_name],
            ["AWS/Lambda", "Throttles", "FunctionName", var.booking_processor_function_name],
            ["AWS/Lambda", "Throttles", "FunctionName", var.refund_processor_function_name]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "AWS Payment System - Lambda Function Throttles"
          period  = 300
          stat    = "Sum"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 18
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/Lambda", "Invocations", "FunctionName", var.aws_payment_processor_function_name],
            ["AWS/Lambda", "Invocations", "FunctionName", var.ach_transfer_manager_function_name],
            ["AWS/Lambda", "Invocations", "FunctionName", var.escrow_manager_function_name],
            ["AWS/Lambda", "Invocations", "FunctionName", var.fraud_detector_function_name],
            ["AWS/Lambda", "Invocations", "FunctionName", var.cost_monitor_function_name],
            ["AWS/Lambda", "Invocations", "FunctionName", var.booking_processor_function_name],
            ["AWS/Lambda", "Invocations", "FunctionName", var.refund_processor_function_name]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "AWS Payment System - Lambda Function Invocations"
          period  = 300
          stat    = "Sum"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 24
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/AppSync", "4XXError", "GraphQLAPIId", var.appsync_api_id],
            ["AWS/AppSync", "5XXError", "GraphQLAPIId", var.appsync_api_id]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "AppSync API Errors"
          period  = 300
          stat    = "Sum"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 30
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/DynamoDB", "ConsumedReadCapacityUnits", "TableName", var.user_profile_table_name],
            ["AWS/DynamoDB", "ConsumedWriteCapacityUnits", "TableName", var.user_profile_table_name],
            ["AWS/DynamoDB", "ConsumedReadCapacityUnits", "TableName", var.service_table_name],
            ["AWS/DynamoDB", "ConsumedWriteCapacityUnits", "TableName", var.service_table_name]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "DynamoDB Capacity Consumption"
          period  = 300
          stat    = "Sum"
        }
      }
    ]
  })

  # Note: CloudWatch dashboards don't support tags
  # tags = {
  #   Name        = "ecosystem-production-health"
  #   Environment = var.environment
  # }
}

# CloudWatch Alarms for AWS Native Payment System
resource "aws_cloudwatch_metric_alarm" "lambda_error_rate" {
  for_each = toset([
    var.aws_payment_processor_function_name,
    var.ach_transfer_manager_function_name,
    var.escrow_manager_function_name,
    var.fraud_detector_function_name,
    var.cost_monitor_function_name,
    var.booking_processor_function_name,
    var.refund_processor_function_name
  ])

  alarm_name          = "${each.key}-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "This metric monitors lambda errors for ${each.key}"
  alarm_actions       = [var.sns_topic_arn]

  dimensions = {
    FunctionName = each.key
  }

  tags = {
    Name        = "${each.key}-error-rate-alarm"
    Environment = var.environment
  }
}

# CloudWatch Alarm for AWS Payment System Lambda Duration
resource "aws_cloudwatch_metric_alarm" "lambda_duration" {
  for_each = toset([
    var.aws_payment_processor_function_name,
    var.ach_transfer_manager_function_name,
    var.escrow_manager_function_name,
    var.fraud_detector_function_name,
    var.cost_monitor_function_name,
    var.booking_processor_function_name,
    var.refund_processor_function_name
  ])

  alarm_name          = "${each.key}-duration"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Average"
  threshold           = "10000" # 10 seconds
  alarm_description   = "This metric monitors lambda duration for ${each.key}"
  alarm_actions       = [var.sns_topic_arn]

  dimensions = {
    FunctionName = each.key
  }

  tags = {
    Name        = "${each.key}-duration-alarm"
    Environment = var.environment
  }
}

# Payment Processing Success Rate Monitoring
resource "aws_cloudwatch_metric_alarm" "payment_success_rate" {
  alarm_name          = "aws-payment-system-success-rate"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "Invocations"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10" # Minimum successful transactions per 5-minute period
  alarm_description   = "AWS Payment System success rate below threshold"
  alarm_actions       = [var.sns_topic_arn]
  treat_missing_data  = "breaching"

  dimensions = {
    FunctionName = var.aws_payment_processor_function_name
  }

  tags = {
    Name        = "aws-payment-success-rate-alarm"
    Environment = var.environment
    Type        = "PaymentMonitoring"
  }
}

# ACH Transfer Failure Monitoring
resource "aws_cloudwatch_metric_alarm" "ach_transfer_failures" {
  alarm_name          = "ach-transfer-failures"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "ACH transfer failures detected"
  alarm_actions       = [var.sns_topic_arn]

  dimensions = {
    FunctionName = var.ach_transfer_manager_function_name
  }

  tags = {
    Name        = "ach-transfer-failures-alarm"
    Environment = var.environment
    Type        = "PaymentSecurity"
  }
}

# Escrow Account Monitoring
resource "aws_cloudwatch_metric_alarm" "escrow_discrepancies" {
  alarm_name          = "escrow-account-discrepancies"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "Escrow account discrepancies detected"
  alarm_actions       = [var.sns_topic_arn]

  dimensions = {
    FunctionName = var.escrow_manager_function_name
  }

  tags = {
    Name        = "escrow-discrepancies-alarm"
    Environment = var.environment
    Type        = "PaymentSecurity"
  }
}