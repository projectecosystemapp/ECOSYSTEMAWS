# WAF Web ACL for API Protection
resource "aws_wafv2_web_acl" "ecosystem_api_shield" {
  name  = "ecosystem-api-shield"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  # Rate limiting rule - 2000 requests per 5 minutes per IP
  rule {
    name     = "RateLimitRule"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitRule"
      sampled_requests_enabled   = true
    }
  }

  # AWS Managed Rules - Core Rule Set
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 10

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"

        # Exclude specific rules that might interfere with legitimate API calls
        rule_action_override {
          action_to_use {
            count {}
          }
          name = "SizeRestrictions_BODY"
        }

        rule_action_override {
          action_to_use {
            count {}
          }
          name = "GenericRFI_BODY"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesCommonRuleSet"
      sampled_requests_enabled   = true
    }
  }

  # AWS Managed Rules - Known Bad Inputs
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 20

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesKnownBadInputsRuleSet"
      sampled_requests_enabled   = true
    }
  }

  # AWS Managed Rules - SQL Injection
  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 30

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesSQLiRuleSet"
      sampled_requests_enabled   = true
    }
  }

  # Custom rule to allow Stripe webhook IPs if needed
  rule {
    name     = "AllowStripeWebhooks"
    priority = 5

    action {
      allow {}
    }

    statement {
      ip_set_reference_statement {
        arn = aws_wafv2_ip_set.stripe_webhook_ips.arn
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AllowStripeWebhooks"
      sampled_requests_enabled   = true
    }
  }

  tags = {
    Name        = "ecosystem-api-shield"
    Environment = var.environment
    Purpose     = "API Protection"
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "EcosystemAPIShield"
    sampled_requests_enabled   = true
  }
}

# IP Set for Stripe webhook IPs
resource "aws_wafv2_ip_set" "stripe_webhook_ips" {
  name               = "stripe-webhook-ips"
  description        = "Stripe webhook IP addresses"
  scope              = "REGIONAL"
  ip_address_version = "IPV4"

  # Stripe webhook IP ranges (as of 2024)
  # These should be updated periodically from Stripe's documentation
  addresses = [
    "3.18.12.63/32",
    "3.130.192.231/32",
    "13.235.14.237/32",
    "13.235.122.149/32",
    "18.211.135.69/32",
    "35.154.171.200/32",
    "52.15.183.38/32",
    "54.187.174.169/32",
    "54.187.205.235/32",
    "54.187.216.72/32",
  ]

  tags = {
    Name        = "stripe-webhook-ips"
    Environment = var.environment
  }
}

# CloudWatch Log Group for WAF
resource "aws_cloudwatch_log_group" "waf_log_group" {
  name              = "/aws/wafv2/ecosystem-api-shield"
  retention_in_days = 30

  tags = {
    Name        = "waf-log-group"
    Environment = var.environment
  }
}

# WAF Logging Configuration - DISABLED DUE TO ARN FORMAT ISSUES
# Can be re-enabled once AWS provider issue is resolved
# resource "aws_wafv2_web_acl_logging_configuration" "ecosystem_api_shield_logging" {
#   resource_arn            = aws_wafv2_web_acl.ecosystem_api_shield.arn
#   log_destination_configs = ["${aws_cloudwatch_log_group.waf_log_group.arn}:*"]

#   redacted_fields {
#     single_header {
#       name = "authorization"
#     }
#   }

#   redacted_fields {
#     single_header {
#       name = "cookie"
#     }
#   }

#   depends_on = [
#     aws_cloudwatch_log_group.waf_log_group
#   ]
# }

# SNS Topic for Security Alerts
resource "aws_sns_topic" "security_alerts" {
  name = "${var.project_name}-security-alerts"

  tags = {
    Name        = "${var.project_name}-security-alerts"
    Environment = var.environment
  }
}

resource "aws_sns_topic_subscription" "security_email_alerts" {
  count     = length(var.alert_email_addresses)
  topic_arn = aws_sns_topic.security_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email_addresses[count.index]
}

# CloudWatch Metric Alarm for WAF blocked requests
resource "aws_cloudwatch_metric_alarm" "waf_blocked_requests" {
  alarm_name          = "high-waf-blocked-requests"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "BlockedRequests"
  namespace           = "AWS/WAFV2"
  period              = "300"
  statistic           = "Sum"
  threshold           = "100"
  alarm_description   = "This metric monitors blocked requests by WAF"
  alarm_actions       = [aws_sns_topic.security_alerts.arn]

  dimensions = {
    WebACL = aws_wafv2_web_acl.ecosystem_api_shield.name
    Region = var.aws_region
    Rule   = "ALL"
  }

  tags = {
    Name        = "waf-blocked-requests-alarm"
    Environment = var.environment
  }
}