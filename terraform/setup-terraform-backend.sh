#!/bin/bash

# Setup script for Terraform backend infrastructure
# Creates S3 bucket and DynamoDB table for Terraform state management

set -e  # Exit on any error

# Configuration
BUCKET_NAME="ecosystemcl-terraform-state"
DYNAMODB_TABLE="terraform-state-lock"
AWS_REGION="us-west-2"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if AWS CLI is installed and configured
check_aws_cli() {
    print_status "Checking AWS CLI configuration..."
    
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS CLI is not configured or credentials are invalid."
        print_error "Please run 'aws configure' to set up your credentials."
        exit 1
    fi
    
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    print_success "AWS CLI configured. Account ID: $ACCOUNT_ID"
}

# Check if S3 bucket exists
check_s3_bucket() {
    print_status "Checking if S3 bucket '$BUCKET_NAME' exists..."
    
    if aws s3api head-bucket --bucket "$BUCKET_NAME" --region "$AWS_REGION" 2>/dev/null; then
        print_warning "S3 bucket '$BUCKET_NAME' already exists."
        return 0
    else
        print_status "S3 bucket '$BUCKET_NAME' does not exist."
        return 1
    fi
}

# Create S3 bucket
create_s3_bucket() {
    print_status "Creating S3 bucket '$BUCKET_NAME' in region '$AWS_REGION'..."
    
    # Create bucket
    if [ "$AWS_REGION" = "us-east-1" ]; then
        # us-east-1 doesn't need LocationConstraint
        aws s3api create-bucket --bucket "$BUCKET_NAME" --region "$AWS_REGION"
    else
        aws s3api create-bucket \
            --bucket "$BUCKET_NAME" \
            --region "$AWS_REGION" \
            --create-bucket-configuration LocationConstraint="$AWS_REGION"
    fi
    
    print_success "S3 bucket '$BUCKET_NAME' created successfully."
}

# Configure S3 bucket
configure_s3_bucket() {
    print_status "Configuring S3 bucket settings..."
    
    # Enable versioning
    print_status "Enabling versioning on bucket..."
    aws s3api put-bucket-versioning \
        --bucket "$BUCKET_NAME" \
        --versioning-configuration Status=Enabled
    
    # Enable encryption
    print_status "Enabling server-side encryption on bucket..."
    aws s3api put-bucket-encryption \
        --bucket "$BUCKET_NAME" \
        --server-side-encryption-configuration '{
            "Rules": [
                {
                    "ApplyServerSideEncryptionByDefault": {
                        "SSEAlgorithm": "AES256"
                    }
                }
            ]
        }'
    
    # Block public access
    print_status "Blocking public access on bucket..."
    aws s3api put-public-access-block \
        --bucket "$BUCKET_NAME" \
        --public-access-block-configuration \
            BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
    
    print_success "S3 bucket configured successfully."
}

# Check if DynamoDB table exists
check_dynamodb_table() {
    print_status "Checking if DynamoDB table '$DYNAMODB_TABLE' exists..."
    
    if aws dynamodb describe-table --table-name "$DYNAMODB_TABLE" --region "$AWS_REGION" &>/dev/null; then
        print_warning "DynamoDB table '$DYNAMODB_TABLE' already exists."
        return 0
    else
        print_status "DynamoDB table '$DYNAMODB_TABLE' does not exist."
        return 1
    fi
}

# Create DynamoDB table
create_dynamodb_table() {
    print_status "Creating DynamoDB table '$DYNAMODB_TABLE'..."
    
    aws dynamodb create-table \
        --table-name "$DYNAMODB_TABLE" \
        --attribute-definitions AttributeName=LockID,AttributeType=S \
        --key-schema AttributeName=LockID,KeyType=HASH \
        --billing-mode PAY_PER_REQUEST \
        --region "$AWS_REGION"
    
    print_status "Waiting for DynamoDB table to become active..."
    aws dynamodb wait table-exists \
        --table-name "$DYNAMODB_TABLE" \
        --region "$AWS_REGION"
    
    print_success "DynamoDB table '$DYNAMODB_TABLE' created successfully."
}

# Main execution
main() {
    echo "=========================================="
    echo "  Terraform Backend Infrastructure Setup"
    echo "=========================================="
    echo ""
    print_status "Setting up infrastructure for Terraform remote state management"
    print_status "Bucket: $BUCKET_NAME"
    print_status "DynamoDB Table: $DYNAMODB_TABLE"
    print_status "Region: $AWS_REGION"
    echo ""
    
    # Check AWS CLI
    check_aws_cli
    echo ""
    
    # Handle S3 bucket
    if check_s3_bucket; then
        print_status "Skipping S3 bucket creation."
        configure_s3_bucket
    else
        create_s3_bucket
        configure_s3_bucket
    fi
    echo ""
    
    # Handle DynamoDB table
    if check_dynamodb_table; then
        print_status "Skipping DynamoDB table creation."
    else
        create_dynamodb_table
    fi
    echo ""
    
    print_success "Terraform backend infrastructure setup completed!"
    echo ""
    print_status "You can now run 'terraform init' to initialize your Terraform backend."
    print_status "State will be stored in: s3://$BUCKET_NAME/ecosystem/terraform.tfstate"
    print_status "State locking will use DynamoDB table: $DYNAMODB_TABLE"
}

# Run main function
main "$@"