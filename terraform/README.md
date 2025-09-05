# ECOSYSTEM AWS - Terraform Infrastructure

This Terraform configuration provides supporting infrastructure for the AWS Amplify ECOSYSTEM application. It manages monitoring, security, cost controls, and networking resources that complement your Amplify deployment.

## 🚨 Important Notes

- **This Terraform configuration does NOT manage your core Amplify resources** (Lambda functions, AppSync API, DynamoDB tables, etc.)
- It only creates supporting infrastructure for monitoring, security, and cost control
- Your Amplify resources remain fully managed by AWS Amplify

## 📋 Prerequisites

1. **Terraform** >= 1.0
2. **AWS CLI** configured with appropriate credentials
3. **Existing AWS Amplify application** deployed and running
4. **S3 bucket** for Terraform state storage (create manually or modify backend configuration)
5. **DynamoDB table** for state locking (create manually or modify backend configuration)

## 🏗️ Architecture Overview

This configuration creates:

### 🔍 Monitoring Module
- CloudWatch Dashboard with Lambda, AppSync, and DynamoDB metrics
- CloudWatch Alarms for error rates and function duration
- Centralized monitoring for all your Amplify functions

### 🔒 Security Module
- WAF Web ACL with rate limiting (2000 requests/5min per IP)
- AWS Managed Rules for SQL injection, XSS, and known bad inputs
- Stripe webhook IP allowlist
- Security alerts via SNS

### 💰 Cost Controls Module
- Monthly budget alerts ($5000 default)
- Lambda-specific budget ($1000 default)
- CloudWatch alarms for service cost thresholds
- Email notifications for budget overruns

### 🌐 Networking Module (Optional)
- VPC endpoints for S3, DynamoDB, Lambda, CloudWatch Logs
- Enhanced security rules via Network ACLs
- VPC Flow Logs for network monitoring

## 🚀 Quick Start

### 1. Configure Your Resource Names

First, update `/terraform/terraform.tfvars` with your actual Amplify resource names:

```hcl
# Get these values from your AWS Console -> Amplify -> Your App -> Backend environments
appsync_api_id = "abcdef123456789" # AppSync API ID from console
user_profile_table_name = "UserProfile-your-actual-table-name"
service_table_name = "Service-your-actual-table-name"
# ... update other resource names
```

### 2. Set Up State Storage

Either create the required S3 bucket and DynamoDB table manually, or update `backend.tf`:

```bash
# Create S3 bucket for state
aws s3 mb s3://ecosystemcl-terraform-state --region us-west-2

# Create DynamoDB table for locking
aws dynamodb create-table \
    --table-name terraform-state-lock \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH \
    --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
    --region us-west-2
```

### 3. Configure Email Alerts

Update your email addresses in `terraform.tfvars`:

```hcl
security_alert_emails = ["admin@yourdomain.com"]
cost_alert_emails     = ["admin@yourdomain.com", "finance@yourdomain.com"]
```

### 4. Deploy

```bash
# Initialize Terraform
terraform init

# Review the plan
terraform plan

# Apply the configuration
terraform apply
```

## 📊 What Gets Created

With default settings, this creates:

- **1** CloudWatch Dashboard
- **10** CloudWatch Alarms (5 error rate + 5 duration)
- **1** WAF Web ACL with multiple rules
- **2** Budget alerts (overall + Lambda-specific)
- **2** SNS topics (security + cost alerts)
- **0** VPC endpoints (disabled by default)

## 💡 Feature Flags

Control what gets deployed using these variables in `terraform.tfvars`:

```hcl
# Core features
enable_detailed_monitoring = true   # CloudWatch dashboard and alarms
enable_waf_protection     = true   # WAF protection for APIs

# Optional features (disabled by default)
enable_vpc_endpoints      = false  # VPC endpoints for AWS services
enable_enhanced_security  = false  # Network ACL rules
enable_vpc_flow_logs     = false  # VPC network monitoring
enable_cloudtrail_logging = false  # API audit logging

# Cost controls (only enabled if email addresses provided)
cost_alert_emails = ["your-email@domain.com"]
```

## 🔧 Customization

### Adjusting Budgets and Thresholds

```hcl
monthly_budget_limit = "5000"  # Total monthly budget
lambda_budget_limit  = "1000"  # Lambda-specific budget

# CloudWatch alarm thresholds
lambda_cost_threshold   = 500  # USD
dynamodb_cost_threshold = 200  # USD
s3_cost_threshold      = 100  # USD
```

### Adding More Resources to Monitor

To monitor additional Lambda functions, update:

1. Add function name variables in `variables.tf`
2. Add the variables to `terraform.tfvars`
3. Update monitoring module to include new functions

## 🚨 Troubleshooting

### "Resource not found" errors
- Ensure your Amplify app is deployed and resource names in `terraform.tfvars` match exactly
- Check AWS Console for actual resource names

### Permission denied errors
- Verify AWS credentials have appropriate permissions
- Ensure IAM user/role can read existing Amplify resources and create new ones

### State locking errors
- Ensure DynamoDB table `terraform-state-lock` exists
- Check that the table has a primary key named `LockID`

### Validation errors
```bash
# Run these commands to check for issues:
terraform fmt     # Format code
terraform validate # Check syntax
terraform plan    # Preview changes
```

## 📈 Accessing Your Monitoring

After deployment:

1. **CloudWatch Dashboard**: Go to CloudWatch Console → Dashboards → "ecosystem-production-health"
2. **WAF Logs**: CloudWatch Console → Log Groups → "/aws/wafv2/ecosystem-api-shield"
3. **Budgets**: AWS Billing Console → Budgets
4. **Cost Anomaly Detection**: AWS Cost Management Console

## 🏷️ Resource Naming

All resources follow this pattern:
- **Monitoring**: `ecosystem-production-health`
- **Security**: `ecosystem-api-shield`
- **Budgets**: `ecosystemaws-monthly-budget`
- **Tags**: All resources tagged with Project, Environment, ManagedBy

## 🔄 Updates and Maintenance

### Updating Resource Names
If you rename Amplify resources, update `terraform.tfvars` and run `terraform plan` to see changes.

### Scaling Budgets
Adjust budget limits in `terraform.tfvars` and run `terraform apply`.

### Adding New Regions
This configuration is designed for single-region deployment. For multi-region, duplicate the setup with region-specific configurations.

## 🧹 Cleanup

To remove all Terraform-managed resources:

```bash
terraform destroy
```

**Note**: This will NOT affect your Amplify application - only the supporting infrastructure.

## 📞 Support

This infrastructure supports your Amplify application by providing:
- **Observability** into your application's performance
- **Security** for your APIs and endpoints  
- **Cost Control** to prevent unexpected charges
- **Networking** optimization (when enabled)

For issues with this Terraform configuration, check the troubleshooting section above. For issues with your Amplify application itself, use the standard Amplify debugging tools.

---

## Optional: HCP Terraform + AWS Service Catalog Integration

If you want one‑click, self‑service provisioning of pre-approved Terraform stacks via the AWS Console, you can install the AWS Service Catalog Engine for HCP Terraform. This keeps HCP Terraform policies and guardrails in place while enabling teams to launch products easily.

Quick start:
1) Copy and edit env example: