# HCP Terraform + AWS Service Catalog Integration

This optional integration lets your team deploy pre-approved Terraform configurations directly from the AWS Service Catalog UI, while still enforcing HCP Terraform guardrails (policies, state, RBAC). It’s ideal when you want one‑click, self‑service environments with governance.

## What You Already Have
- HCP Terraform backend configured in `terraform/backend.tf` (organization: ECOSYSTEMGLOBALSOLUTIONSINC).
- A production-ready Terraform stack (monitoring, security, cost controls, payment cryptography, networking).

## What This Adds
- AWS Service Catalog “Terraform products” backed by HCP Terraform.
- One-click provisioning for your pre-approved modules (e.g., Monitoring Stack, Security Baseline, Cost Controls).
- Governance via HCP Terraform policies and teams.

## Prerequisites
- HCP Terraform organization: `ECOSYSTEMGLOBALSOLUTIONSINC`
- HCP Terraform plan with Team Management (Essentials/Standard/Premium)
- HCP Terraform API token with sufficient permissions
- AWS account with permissions to set up AWS Service Catalog integration
- Terraform >= 1.3 and AWS CLI configured
- Recommended: Dedicated AWS profile/role for provisioning the engine

## Quick Start (Recommended)
1) Create your local env file
- Copy and edit:
  cp terraform/service-catalog.env.example terraform/service-catalog.env
  nano terraform/service-catalog.env

- Fill in:
  - TFC_ORGANIZATION=ECOSYSTEMGLOBALSOLUTIONSINC
  - AWS_REGION=us-west-2 (or your region)
  - Provide your token via TF_TOKEN_app_terraform_io or ~/.terraformrc

2) Run the setup script
- Make executable:
  chmod +x terraform/setup-service-catalog.sh

- Execute:
  ./terraform/setup-service-catalog.sh

What the script does:
- Clones the official engine: hashicorp/aws-service-catalog-engine-for-tfc
- Uses your env to initialize and apply the engine Terraform
- Prints next steps for creating products in AWS Service Catalog

## Verification
- In AWS Console: Service Catalog → Administration → Check for Terraform engine availability.
- In HCP Terraform: Verify any created workspaces/projects the engine relies on (depending on Engine version).
- Confirm IAM roles, CloudWatch, and related resources deployed by the engine exist in your AWS account.

## Creating Products for Your Team
Once the engine is installed:
1) Go to AWS Service Catalog → Administration.
2) Create a Portfolio (e.g., “ECOSYSTEM Platform”).
3) Create a Product of type “Terraform”:
   - Use your HCP Terraform-backed configuration as the product template.
   - Point to your code (e.g., your repository/module path) or reference an HCP Terraform workspace as required by the engine workflow.
4) Add product constraints, approvals, and tags as needed.
5) Grant access to teams (IAM users/roles) who can launch the product.

Suggested products to expose:
- Payment Observability Stack (module: `terraform/modules/monitoring`)
- Security Baseline (module: `terraform/modules/security`)
- Cost Controls Baseline (module: `terraform/modules/cost-controls`)
- Payment Cryptography Starter (module: `terraform/modules/payment-cryptography`)

Tip: Keep variables minimal and opinionated to keep products “one-click”. Put guardrails in HCP Terraform policies.

## Operations
- Updates: Pull latest engine changes and re-apply if HashiCorp updates the engine.
- Governance: Manage teams & policy sets in HCP Terraform. Service Catalog users only see approved products.
- Environments: Create separate products for dev/staging/prod, or parameterize environment in product inputs.

## Security & Tokens
- Do not commit tokens. Use TF_TOKEN_app_terraform_io env var or ~/.terraformrc credentials.
- The setup script and env example are designed to keep secrets local and untracked.

## Uninstall / Cleanup
- To remove the engine infrastructure: run `terraform destroy` within the cloned engine directory.
- Remove any Service Catalog products and IAM roles created for the integration.

## Troubleshooting
- Engine Apply Fails
  - Ensure your token is exported (TF_TOKEN_app_terraform_io) or set in ~/.terraformrc.
  - Validate AWS credentials and region match your target account.
- Product Creation Issues
  - Ensure the engine shows Terraform as a provisioning engine in Service Catalog.
  - Confirm you’re in a region where AWS Service Catalog supports Terraform.
- Permissions
  - HCP Terraform team management must be enabled on your plan.
  - Ensure AWS roles used by Service Catalog can reach HCP Terraform and provision.

Links:
- Engine repo: https://github.com/hashicorp/aws-service-catalog-engine-for-tfc
- AWS Service Catalog Admin Guide: https://docs.aws.amazon.com/servicecatalog/latest/adminguide/what-is_service_catalog.html
- HCP Terraform Docs: https://developer.hashicorp.com/terraform/cloud-docs
