# VPC Endpoints for AWS services (optional - for enhanced security and performance)
# Note: These are optional and can reduce costs and improve performance
# by keeping traffic within AWS network

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# VPC Endpoint for S3 (Gateway endpoint - no charges)
resource "aws_vpc_endpoint" "s3" {
  count             = var.enable_vpc_endpoints ? 1 : 0
  vpc_id            = data.aws_vpc.default.id
  service_name      = "com.amazonaws.${var.aws_region}.s3"
  vpc_endpoint_type = "Gateway"

  tags = {
    Name        = "${var.project_name}-s3-endpoint"
    Environment = var.environment
  }
}

# VPC Endpoint for DynamoDB (Gateway endpoint - no charges)
resource "aws_vpc_endpoint" "dynamodb" {
  count             = var.enable_vpc_endpoints ? 1 : 0
  vpc_id            = data.aws_vpc.default.id
  service_name      = "com.amazonaws.${var.aws_region}.dynamodb"
  vpc_endpoint_type = "Gateway"

  tags = {
    Name        = "${var.project_name}-dynamodb-endpoint"
    Environment = var.environment
  }
}

# Security Group for VPC Endpoints
resource "aws_security_group" "vpc_endpoints" {
  count       = var.enable_vpc_endpoints ? 1 : 0
  name_prefix = "${var.project_name}-vpc-endpoints"
  description = "Security group for VPC endpoints"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "HTTPS from VPC"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [data.aws_vpc.default.cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.project_name}-vpc-endpoints-sg"
    Environment = var.environment
  }
}

# VPC Endpoint for Lambda (Interface endpoint)
resource "aws_vpc_endpoint" "lambda" {
  count              = var.enable_vpc_endpoints ? 1 : 0
  vpc_id             = data.aws_vpc.default.id
  service_name       = "com.amazonaws.${var.aws_region}.lambda"
  vpc_endpoint_type  = "Interface"
  subnet_ids         = data.aws_subnets.default.ids
  security_group_ids = [aws_security_group.vpc_endpoints[0].id]

  policy = jsonencode({
    Statement = [
      {
        Effect    = "Allow"
        Principal = "*"
        Action = [
          "lambda:InvokeFunction",
          "lambda:GetFunction"
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Name        = "${var.project_name}-lambda-endpoint"
    Environment = var.environment
  }
}

# VPC Endpoint for CloudWatch Logs (Interface endpoint)
resource "aws_vpc_endpoint" "logs" {
  count              = var.enable_vpc_endpoints ? 1 : 0
  vpc_id             = data.aws_vpc.default.id
  service_name       = "com.amazonaws.${var.aws_region}.logs"
  vpc_endpoint_type  = "Interface"
  subnet_ids         = data.aws_subnets.default.ids
  security_group_ids = [aws_security_group.vpc_endpoints[0].id]

  tags = {
    Name        = "${var.project_name}-logs-endpoint"
    Environment = var.environment
  }
}

# VPC Endpoint for Secrets Manager (Interface endpoint)
resource "aws_vpc_endpoint" "secretsmanager" {
  count              = var.enable_vpc_endpoints ? 1 : 0
  vpc_id             = data.aws_vpc.default.id
  service_name       = "com.amazonaws.${var.aws_region}.secretsmanager"
  vpc_endpoint_type  = "Interface"
  subnet_ids         = data.aws_subnets.default.ids
  security_group_ids = [aws_security_group.vpc_endpoints[0].id]

  tags = {
    Name        = "${var.project_name}-secretsmanager-endpoint"
    Environment = var.environment
  }
}

# CloudWatch Alarms for VPC Endpoint Health
resource "aws_cloudwatch_metric_alarm" "vpc_endpoint_packets_dropped" {
  count               = var.enable_vpc_endpoints ? 1 : 0
  alarm_name          = "vpc-endpoint-packets-dropped"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "PacketDropCount"
  namespace           = "AWS/VPC"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "This metric monitors VPC endpoint packet drops"
  alarm_actions       = [var.sns_topic_arn]

  dimensions = {
    VpcEndpointId = aws_vpc_endpoint.lambda[0].id
  }

  tags = {
    Name        = "vpc-endpoint-packets-dropped-alarm"
    Environment = var.environment
  }
}

# Network ACL rules for additional security (optional)
# Note: Default VPC doesn't expose main_network_acl_id directly
# These rules would need to be applied to specific Network ACLs

# Get the default network ACL for the VPC
data "aws_network_acls" "default" {
  count  = var.enable_enhanced_security ? 1 : 0
  vpc_id = data.aws_vpc.default.id

  filter {
    name   = "default"
    values = ["true"]
  }
}

resource "aws_network_acl_rule" "deny_rdp" {
  count          = var.enable_enhanced_security ? 1 : 0
  network_acl_id = data.aws_network_acls.default[0].ids[0] # Use first Network ACL ID
  rule_number    = 100
  protocol       = "tcp"
  rule_action    = "deny"
  from_port      = 3389
  to_port        = 3389
  cidr_block     = "0.0.0.0/0"
}

resource "aws_network_acl_rule" "deny_ssh" {
  count          = var.enable_enhanced_security ? 1 : 0
  network_acl_id = data.aws_network_acls.default[0].ids[0] # Use first Network ACL ID
  rule_number    = 101
  protocol       = "tcp"
  rule_action    = "deny"
  from_port      = 22
  to_port        = 22
  cidr_block     = "0.0.0.0/0"
}

# Flow Logs for network monitoring (optional)
resource "aws_flow_log" "vpc_flow_log" {
  count           = var.enable_flow_logs ? 1 : 0
  iam_role_arn    = aws_iam_role.flow_log[0].arn
  log_destination = aws_cloudwatch_log_group.vpc_flow_log[0].arn
  traffic_type    = "ALL"
  vpc_id          = data.aws_vpc.default.id

  tags = {
    Name        = "${var.project_name}-vpc-flow-log"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "vpc_flow_log" {
  count             = var.enable_flow_logs ? 1 : 0
  name              = "/aws/vpc/flowlogs"
  retention_in_days = 30

  tags = {
    Name        = "${var.project_name}-vpc-flow-log-group"
    Environment = var.environment
  }
}

resource "aws_iam_role" "flow_log" {
  count = var.enable_flow_logs ? 1 : 0
  name  = "${var.project_name}-flow-log-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "vpc-flow-logs.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.project_name}-flow-log-role"
    Environment = var.environment
  }
}

resource "aws_iam_role_policy" "flow_log" {
  count = var.enable_flow_logs ? 1 : 0
  name  = "${var.project_name}-flow-log-policy"
  role  = aws_iam_role.flow_log[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}