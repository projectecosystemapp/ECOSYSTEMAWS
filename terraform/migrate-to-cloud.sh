#!/bin/bash

# Script to migrate Terraform state to Terraform Cloud

echo "Migrating Terraform state to Terraform Cloud..."
echo ""
echo "This will copy your existing S3 state to Terraform Cloud."
echo ""

# Use expect or a here document to handle the interactive prompts
# Since expect might not be installed, we'll use a different approach

# Create a temporary expect script
cat > /tmp/terraform_migrate.exp <<'EOF'
#!/usr/bin/expect -f
set timeout 30
spawn terraform init
expect "Enter a value:" 
send "yes\r"
expect "Enter a value:"
send "yes\r"
expect eof
EOF

# Check if expect is installed
if command -v expect &> /dev/null; then
    chmod +x /tmp/terraform_migrate.exp
    /tmp/terraform_migrate.exp
    rm /tmp/terraform_migrate.exp
else
    echo "Expect not installed. Please run manually:"
    echo "  terraform init"
    echo "  Answer 'yes' to both prompts"
    exit 1
fi

# Check if migration was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully migrated to Terraform Cloud!"
    echo ""
    echo "Your state is now stored in:"
    echo "  Organization: ECOSYSTEMGLOBALSOLUTIONSINC"
    echo "  Workspace: ecosystemdev"
    echo ""
    echo "You can view it at: https://app.terraform.io/app/ECOSYSTEMGLOBALSOLUTIONSINC/workspaces/ecosystemdev"
else
    echo "❌ Migration failed. Please check the error messages above."
fi