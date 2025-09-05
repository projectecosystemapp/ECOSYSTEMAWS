output "vpc_id" {
  description = "Default VPC ID"
  value       = data.aws_vpc.default.id
}

output "vpc_cidr_block" {
  description = "VPC CIDR block"
  value       = data.aws_vpc.default.cidr_block
}

output "subnet_ids" {
  description = "Default subnet IDs"
  value       = data.aws_subnets.default.ids
}

output "s3_vpc_endpoint_id" {
  description = "S3 VPC endpoint ID"
  value       = var.enable_vpc_endpoints ? aws_vpc_endpoint.s3[0].id : null
}

output "dynamodb_vpc_endpoint_id" {
  description = "DynamoDB VPC endpoint ID"
  value       = var.enable_vpc_endpoints ? aws_vpc_endpoint.dynamodb[0].id : null
}

output "lambda_vpc_endpoint_id" {
  description = "Lambda VPC endpoint ID"
  value       = var.enable_vpc_endpoints ? aws_vpc_endpoint.lambda[0].id : null
}

output "vpc_endpoints_security_group_id" {
  description = "VPC endpoints security group ID"
  value       = var.enable_vpc_endpoints ? aws_security_group.vpc_endpoints[0].id : null
}

output "flow_log_id" {
  description = "VPC Flow Log ID"
  value       = var.enable_flow_logs ? aws_flow_log.vpc_flow_log[0].id : null
}