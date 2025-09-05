#!/usr/bin/env bash
set -euo pipefail

# AWS Service Catalog Engine for HCP Terraform bootstrapper
# This script clones the official engine and applies it with your org/region settings.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
ENGINE_DIR="${ROOT_DIR}/terraform/hcp-service-catalog-engine"
ENV_FILE="${ROOT_DIR}/terraform/service-catalog.env"

REPO_URL="https://github.com/hashicorp/aws-service-catalog-engine-for-tfc.git"

echo "=== HCP Terraform + AWS Service Catalog Engine Setup ==="

# Load env if present
if [[ -f "${ENV_FILE}" ]]; then
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  echo "Loaded environment from ${ENV_FILE}"
else
  echo "No ${ENV_FILE} found. Create it from service-catalog.env.example if needed."
fi

# Check dependencies
command -v git >/dev/null 2>&1 || { echo "git is required"; exit 1; }
command -v terraform >/dev/null 2>&1 || { echo "terraform is required"; exit 1; }
command -v aws >/dev/null 2>&1 || { echo "aws CLI is required"; exit 1; }

# Required envs
: "${TFC_ORGANIZATION:?Set TFC_ORGANIZATION in ${ENV_FILE} or your shell}"
: "${AWS_REGION:?Set AWS_REGION in ${ENV_FILE} or your shell}"

# Optional host (defaults to app.terraform.io)
TFC_HOSTNAME="${TFC_HOSTNAME:-app.terraform.io}"

# Check token (either env var or ~/.terraformrc)
if [[ -z "${TF_TOKEN_app_terraform_io:-}" && ! -f "${HOME}/.terraformrc" ]]; then
  cat <<EOF
WARNING: No Terraform Cloud token detected.
Provide a token via:
  export TF_TOKEN_app_terraform_io=<your-token>
or configure ~/.terraformrc credentials.

Continuing anyway; you may be prompted during 'terraform init/apply'.
EOF
fi

# Clone or update engine
if [[ ! -d "${ENGINE_DIR}/.git" ]]; then
  echo "Cloning engine into ${ENGINE_DIR} ..."
  git clone "${REPO_URL}" "${ENGINE_DIR}"
else
  echo "Engine already cloned. Pulling latest changes ..."
  (cd "${ENGINE_DIR}" && git pull --ff-only)
fi

echo "Initializing Terraform in engine directory ..."
(
  cd "${ENGINE_DIR}"
  terraform init -upgrade
)

echo "Applying engine (this may prompt for additional variables depending on engine version) ..."
(
  cd "${ENGINE_DIR}"
  # We pass common env context; actual variable names are managed by the engine module.
  # If the engine prompts for other inputs, provide them interactively.
  TFC_ORGANIZATION="${TFC_ORGANIZATION}" \
  TFC_HOSTNAME="${TFC_HOSTNAME}" \
  AWS_REGION="${AWS_REGION}" \
  terraform apply
)

cat <<'EOS'

==========================================================
HCP Terraform + AWS Service Catalog Engine installation complete.

Next steps:
1) In the AWS Console -> Service Catalog -> Administration
   - Confirm Terraform appears as a provisioning engine.
   - Create a Portfolio (e.g., "ECOSYSTEM Platform").
   - Create Products of type "Terraform" for your approved stacks.

2) Suggested products from this repo:
   - Monitoring Stack: terraform/modules/monitoring
   - Security Baseline: terraform/modules/security
   - Cost Controls: terraform/modules/cost-controls
   - Payment Cryptography: terraform/modules/payment-cryptography

3) Governance:
   - Manage teams and policy sets in HCP Terraform (organization: ECOSYSTEMGLOBALSOLUTIONSINC).

If you need detailed guidance, see:
docs/HCP-TERRAFORM-SERVICE-CATALOG.md
==========================================================
EOS
