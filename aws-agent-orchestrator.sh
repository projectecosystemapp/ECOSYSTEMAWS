#!/bin/bash

# AWS Agent Orchestrator Script
# Deploys and coordinates specialized AWS agents for parallel execution
# Usage: ./aws-agent-orchestrator.sh [command] [options]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AGENTS_DIR="$HOME/.aws-agents"
WORK_DIR="$(pwd)"
LOG_DIR="$WORK_DIR/.aws-agent-logs"
PLAN_FILE="$WORK_DIR/MULTI_AGENT_PLAN.md"

# Agent definitions
declare -A AGENTS=(
    ["architect"]="claude-3-5-sonnet-20241022"
    ["migration"]="claude-3-5-sonnet-20241022" 
    ["security"]="claude-3-5-sonnet-20241022"
    ["amplify"]="claude-3-5-sonnet-20241022"
    ["cicd"]="claude-3-5-sonnet-20241022"
    ["cost-optimizer"]="claude-3-5-sonnet-20241022"
)

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Initialize environment
init_environment() {
    log "Initializing AWS Agent Orchestra environment..."
    
    # Create necessary directories
    mkdir -p "$AGENTS_DIR" "$LOG_DIR"
    
    # Check if claude command is available
    if ! command -v claude &> /dev/null; then
        error "Claude Code CLI not found. Please install it first."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials not configured. Run 'aws configure' first."
        exit 1
    fi
    
    success "Environment initialized"
}

# Deploy a single agent
deploy_agent() {
    local agent_name=$1
    local model=${AGENTS[${agent_name}]}
    local prompt_file="$AGENTS_DIR/${agent_name}-prompt.txt"
    
    log "Deploying ${agent_name} agent with model ${model}..."
    
    # Create agent prompt file
    create_agent_prompt "$agent_name" "$prompt_file"
    
    # Deploy via Claude Code (this would be the manual step in practice)
    # For automation, we create the configuration files
    cat > "$AGENTS_DIR/${agent_name}-config.json" <<EOF
{
  "name": "aws-${agent_name}",
  "model": "${model}",
  "system_prompt_file": "${prompt_file}",
  "tools": ["bash", "filesystem", "web_search", "mcp"],
  "color": "$(get_agent_color "$agent_name")",
  "scope": "project"
}
EOF
    
    success "Agent ${agent_name} configuration created"
}

# Get agent color based on role
get_agent_color() {
    case $1 in
        "architect") echo "blue" ;;
        "migration") echo "yellow" ;;
        "security") echo "red" ;;
        "amplify") echo "green" ;;
        "cicd") echo "purple" ;;
        "cost-optimizer") echo "cyan" ;;
        *) echo "white" ;;
    esac
}

# Create agent prompt files
create_agent_prompt() {
    local agent_name=$1
    local prompt_file=$2
    
    case $agent_name in
        "architect")
            cat > "$prompt_file" <<'EOF'
You are the AWS Architect Agent - a Principal Cloud Architect with 20+ years designing serverless, event-driven systems on AWS. Your mission is to enforce the ECOSYSTEMAWS AppSync-Only mandate while delivering Well-Architected solutions.

CORE RESPONSIBILITIES:
1. Design GraphQL schemas that define the API contract
2. Create AppSync resolver configurations with Lambda integrations  
3. Architect DynamoDB single-table designs optimized for GraphQL patterns
4. Design Cognito User Pool authentication flows with fine-grained authorization
5. Plan Amplify Gen 2 infrastructure as code implementations

ARCHITECTURAL MANDATES (NON-NEGOTIABLE):
✅ REQUIRED:
- ALL backend logic MUST flow through AWS AppSync GraphQL
- ALL Lambda functions MUST be invoked via AppSync resolvers
- Schema-first development - GraphQL schema defines API contract
- Amplify Gen 2 for all infrastructure as code
- TypeScript strongly typed throughout
- Cognito User Pools for authentication
- Single-table DynamoDB design

❌ PROHIBITED:
- NO Lambda Function URLs (completely forbidden)
- NO direct API Gateway + Lambda
- NO REST APIs where GraphQL is appropriate
- NO direct database access outside AppSync
- NO untyped APIs

COMMUNICATION PROTOCOL:
- Present reasoning in <thinking> blocks
- Provide GraphQL schema definitions
- Generate Amplify Gen 2 resource configurations
- Include security and authorization patterns
- Output structured Markdown with clear sections

CONSTRAINTS:
- Solutions must be secure, scalable, and cost-optimized
- Follow AWS Well-Architected principles
- Justify all architectural decisions
- Ensure backward compatibility during migrations
EOF
            ;;
        "migration")
            cat > "$prompt_file" <<'EOF'
You are the AWS Migration Agent - a specialist in modernizing legacy AWS architectures to the ECOSYSTEMAWS AppSync-Only pattern. You excel at zero-downtime migrations with comprehensive rollback strategies.

CORE RESPONSIBILITIES:
1. Migrate Lambda Function URLs to AppSync resolvers
2. Implement feature flag patterns for gradual rollouts
3. Design backward-compatible migration strategies
4. Create comprehensive rollback procedures
5. Maintain service availability during transitions

MIGRATION PATTERNS:
- Feature flags for traffic routing between old/new systems
- Blue-green deployment strategies
- Database schema evolution techniques  
- API versioning and deprecation strategies
- Monitoring and alerting during migrations

CONSTRAINTS:
- Zero-downtime requirement for production systems
- Must maintain backward compatibility
- All changes must be reversible
- Comprehensive testing at each migration phase
- Clear rollback triggers and procedures

COMMUNICATION PROTOCOL:
- Provide step-by-step migration plans
- Include rollback procedures for each step
- Define success/failure criteria
- Specify monitoring requirements
- Generate feature flag configurations
EOF
            ;;
        "security")
            cat > "$prompt_file" <<'EOF'
You are the AWS Security Agent - a cybersecurity expert specializing in AWS serverless security, IAM least-privilege, and AppSync authorization patterns.

CORE RESPONSIBILITIES:
1. Design IAM policies with least-privilege access
2. Configure Cognito User Pool security settings
3. Implement GraphQL field-level authorization
4. Audit serverless function security
5. Scan for hardcoded secrets and vulnerabilities

SECURITY REQUIREMENTS:
- Cognito User Pools with MFA for production
- Fine-grained GraphQL authorization with @aws_cognito_user_pools
- IAM roles with resource-specific permissions
- No hardcoded secrets or API keys
- Encrypted data at rest and in transit
- VPC configurations for sensitive workloads

ANALYSIS PATTERNS:
- OWASP Top 10 vulnerability assessment
- AWS Config compliance rules
- CloudTrail log analysis for suspicious activity
- Dependency vulnerability scanning
- Infrastructure as Code security review

COMMUNICATION PROTOCOL:
- Severity classification (Critical, High, Medium, Low)
- Provide specific remediation steps
- Include code examples for fixes
- Reference AWS security best practices
- Generate IAM policy examples
EOF
            ;;
        "amplify")
            cat > "$prompt_file" <<'EOF'
You are the AWS Amplify Agent - a full-stack developer expert in Amplify Gen 2, TypeScript, and modern frontend-backend integration patterns.

CORE RESPONSIBILITIES:
1. Initialize Amplify Gen 2 projects with ECOSYSTEMAWS best practices
2. Generate type-safe GraphQL client code
3. Implement authentication flows with Cognito integration
4. Configure storage and file upload patterns
5. Set up local development environments

AMPLIFY PATTERNS:
- Schema-first development with generated TypeScript types
- Authentication with useAuthenticator hook
- DataStore for offline-first applications
- Storage with S3 integration
- Hosting with CI/CD pipelines

FRONTEND INTEGRATION:
- React/Next.js with TypeScript
- Generated GraphQL client with type safety  
- Authentication state management
- Error boundary and loading state patterns
- Responsive design with accessibility

COMMUNICATION PROTOCOL:
- Provide complete, runnable code examples
- Include package.json dependencies
- Generate Amplify resource configurations
- Show frontend component implementations
- Include environment setup instructions
EOF
            ;;
        "cicd")
            cat > "$prompt_file" <<'EOF'
You are the AWS CI/CD Agent - a DevOps engineer specializing in GitHub Actions, AWS deployment pipelines, and infrastructure automation.

CORE RESPONSIBILITIES:
1. Generate GitHub Actions workflows for Amplify Gen 2 projects
2. Create multi-environment deployment strategies
3. Implement automated testing and security scanning
4. Configure infrastructure as code pipelines
5. Set up monitoring and alerting automation

PIPELINE PATTERNS:
- GitHub Actions with AWS credential management
- Multi-stage deployments (dev → staging → production)
- Automated testing (unit, integration, e2e)
- Security scanning with AWS security tools
- Infrastructure drift detection

DEPLOYMENT STRATEGIES:
- Blue-green deployments for zero downtime
- Feature branch deployments for testing
- Rollback automation with health checks
- Database migration automation
- Cache invalidation strategies

COMMUNICATION PROTOCOL:
- Generate complete workflow files
- Include environment variable configurations
- Provide deployment scripts and commands
- Document manual intervention points
- Include monitoring and alerting setup
EOF
            ;;
        "cost-optimizer")
            cat > "$prompt_file" <<'EOF'
You are the AWS Cost Optimizer Agent - a cloud financial management expert focused on serverless cost optimization and AWS resource right-sizing.

CORE RESPONSIBILITIES:
1. Analyze Lambda memory allocation and execution costs
2. Optimize DynamoDB capacity modes and indexing strategies
3. Review S3 storage classes and lifecycle policies
4. Implement CloudFront caching strategies
5. Monitor and optimize data transfer costs

OPTIMIZATION PATTERNS:
- Lambda: ARM64 architecture for 20% savings, optimal memory sizing
- DynamoDB: On-demand vs provisioned capacity analysis
- S3: Intelligent tiering and lifecycle policies
- CloudFront: Cache optimization and compression
- Data transfer: VPC endpoints and regional optimization

ANALYSIS TECHNIQUES:
- AWS Cost Explorer integration
- CloudWatch metrics analysis
- AWS Trusted Advisor recommendations
- Resource utilization monitoring
- Cost anomaly detection

COMMUNICATION PROTOCOL:
- Provide cost impact estimates
- Generate optimization recommendations
- Include implementation steps
- Show before/after projections
- Create monitoring dashboards
EOF
            ;;
    esac
}

# Create multi-agent plan template
create_multi_agent_plan() {
    local project_name=$1
    
    cat > "$PLAN_FILE" <<EOF
# Multi-Agent AWS Development Plan: $project_name

## Project Overview
**Objective**: Implement $project_name following ECOSYSTEMAWS AppSync-Only architecture
**Start Date**: $(date +'%Y-%m-%d')
**Status**: Planning

## Agent Assignments

| Agent | Status | Current Task | Next Task | Blocked By |
|-------|--------|-------------|-----------|------------|
| Architect | Ready | - | Initial system design | - |
| Migration | Ready | - | Legacy system analysis | Architect completion |
| Security | Ready | - | Security requirements review | - |
| Amplify | Ready | - | Project initialization | Architect schema |
| CI/CD | Ready | - | Pipeline design | Architect + Amplify setup |
| Cost Optimizer | Ready | - | Resource planning | Architect design |

## Task Dependencies

\`\`\`mermaid
graph TD
    A[Architect: System Design] --> B[Amplify: Project Init]
    A --> C[Migration: Legacy Analysis]
    A --> D[Security: Requirements]
    B --> E[CI/CD: Pipeline Setup]
    D --> F[Security: Implementation]
    C --> G[Migration: Execution]
    E --> H[Deploy to Dev]
    F --> H
    G --> H
\`\`\`

## Communication Channels
- **Plan Updates**: This file (MULTI_AGENT_PLAN.md)
- **Logs**: .aws-agent-logs/
- **Artifacts**: Output in respective directories

## Success Criteria
- [ ] AppSync-Only architecture implemented
- [ ] Zero-downtime migration completed  
- [ ] Security requirements satisfied
- [ ] CI/CD pipeline operational
- [ ] Cost optimization targets met
- [ ] All tests passing

---
*Last Updated*: $(date +'%Y-%m-%d %H:%M:%S')
EOF
    
    success "Multi-agent plan created: $PLAN_FILE"
}

# Parallel agent execution
execute_parallel_workflow() {
    local workflow_type=$1
    local project_name=${2:-"AWS-Project"}
    
    log "Starting parallel workflow: $workflow_type for project: $project_name"
    
    # Create the plan
    create_multi_agent_plan "$project_name"
    
    case $workflow_type in
        "full-stack-app")
            execute_full_stack_workflow "$project_name"
            ;;
        "migration")
            execute_migration_workflow "$project_name"
            ;;
        "security-audit")
            execute_security_workflow "$project_name"
            ;;
        "cost-optimization")
            execute_cost_optimization_workflow "$project_name"
            ;;
        *)
            error "Unknown workflow type: $workflow_type"
            exit 1
            ;;
    esac
}

# Full-stack application workflow
execute_full_stack_workflow() {
    local project_name=$1
    
    log "Executing full-stack application workflow..."
    
    # Phase 1: Architecture & Planning (Parallel)
    {
        log "Phase 1: Starting Architect agent for system design..."
        echo "Task: Design GraphQL schema and AppSync architecture for $project_name" > "$LOG_DIR/architect-task.txt"
        # In practice: claude --agent aws-architect < architect-task.txt > architect-output.md
    } &
    
    {
        log "Phase 1: Starting Security agent for requirements analysis..."
        echo "Task: Define security requirements and authentication patterns for $project_name" > "$LOG_DIR/security-task.txt"
        # In practice: claude --agent aws-security < security-task.txt > security-requirements.md
    } &
    
    {
        log "Phase 1: Starting Cost Optimizer for resource planning..."
        echo "Task: Plan cost-optimized AWS resource allocation for $project_name" > "$LOG_DIR/cost-task.txt"
        # In practice: claude --agent aws-cost-optimizer < cost-task.txt > cost-plan.md
    } &
    
    wait # Wait for Phase 1 completion
    
    # Phase 2: Implementation (Parallel)
    {
        log "Phase 2: Starting Amplify agent for project setup..."
        echo "Task: Initialize Amplify Gen 2 project with TypeScript based on architect's schema" > "$LOG_DIR/amplify-task.txt"
        # In practice: claude --agent aws-amplify < amplify-task.txt
    } &
    
    {
        log "Phase 2: Starting CI/CD agent for pipeline creation..."
        echo "Task: Create GitHub Actions workflow for multi-environment deployment" > "$LOG_DIR/cicd-task.txt"
        # In practice: claude --agent aws-cicd < cicd-task.txt
    } &
    
    wait # Wait for Phase 2 completion
    
    # Phase 3: Validation & Deployment
    {
        log "Phase 3: Final security validation..."
        echo "Task: Audit implemented code and infrastructure for security compliance" > "$LOG_DIR/security-audit-task.txt"
    } &
    
    {
        log "Phase 3: Cost validation..."
        echo "Task: Review deployed resources and optimize for cost efficiency" > "$LOG_DIR/cost-audit-task.txt"
    } &
    
    wait
    
    success "Full-stack workflow completed for $project_name"
}

# Migration-focused workflow
execute_migration_workflow() {
    local project_name=$1
    
    log "Executing migration-focused workflow..."
    
    # Phase 1: Analysis (Parallel)
    {
        log "Starting Architecture analysis..."
        echo "Task: Analyze current architecture and design AppSync-based replacement" > "$LOG_DIR/architect-migration-task.txt"
    } &
    
    {
        log "Starting Migration planning..."
        echo "Task: Create detailed migration plan with feature flags and rollback strategy" > "$LOG_DIR/migration-task.txt"
    } &
    
    {
        log "Starting Security assessment..."
        echo "Task: Assess current security posture and plan improvements" > "$LOG_DIR/security-migration-task.txt"
    } &
    
    wait
    
    # Phase 2: Implementation (Sequential for safety)
    log "Phase 2: Implementing migration steps..."
    echo "Task: Execute migration phase 1 - set up parallel systems" > "$LOG_DIR/migration-phase1-task.txt"
    
    log "Phase 3: Validation and cutover..."
    echo "Task: Validate new system and execute traffic cutover" > "$LOG_DIR/migration-phase2-task.txt"
    
    success "Migration workflow completed for $project_name"
}

# Security audit workflow
execute_security_workflow() {
    local project_name=$1
    
    log "Executing security audit workflow..."
    
    # Parallel security analysis
    {
        log "Starting comprehensive security audit..."
        echo "Task: Perform full security audit of AWS resources and code" > "$LOG_DIR/security-comprehensive-task.txt"
    } &
    
    {
        log "Starting cost impact analysis for security improvements..."
        echo "Task: Analyze cost implications of recommended security enhancements" > "$LOG_DIR/cost-security-task.txt"
    } &
    
    {
        log "Starting CI/CD security integration..."
        echo "Task: Integrate security scanning into deployment pipeline" > "$LOG_DIR/cicd-security-task.txt"
    } &
    
    wait
    
    success "Security workflow completed for $project_name"
}

# Cost optimization workflow
execute_cost_optimization_workflow() {
    local project_name=$1
    
    log "Executing cost optimization workflow..."
    
    # Parallel cost analysis
    {
        log "Starting Lambda cost optimization..."
        echo "Task: Analyze and optimize Lambda function costs" > "$LOG_DIR/cost-lambda-task.txt"
    } &
    
    {
        log "Starting DynamoDB cost optimization..."
        echo "Task: Optimize DynamoDB capacity and indexing costs" > "$LOG_DIR/cost-dynamodb-task.txt"
    } &
    
    {
        log "Starting storage cost optimization..."
        echo "Task: Implement S3 lifecycle policies and CloudFront optimization" > "$LOG_DIR/cost-storage-task.txt"
    } &
    
    wait
    
    success "Cost optimization workflow completed for $project_name"
}

# Deploy all agents
deploy_all_agents() {
    log "Deploying all AWS agents..."
    
    for agent in "${!AGENTS[@]}"; do
        deploy_agent "$agent" &
    done
    
    wait
    success "All agents deployed successfully"
}

# Status check
status_check() {
    log "Checking agent status..."
    
    if [[ -f "$PLAN_FILE" ]]; then
        echo -e "\n${GREEN}Current Multi-Agent Plan:${NC}"
        head -20 "$PLAN_FILE"
        echo "..."
    else
        warn "No active multi-agent plan found"
    fi
    
    if [[ -d "$LOG_DIR" ]]; then
        echo -e "\n${GREEN}Recent Agent Activity:${NC}"
        find "$LOG_DIR" -name "*.txt" -mtime -1 | head -5
    fi
}

# Main command dispatcher
main() {
    case ${1:-""} in
        "init")
            init_environment
            deploy_all_agents
            ;;
        "deploy")
            deploy_all_agents
            ;;
        "run")
            shift
            execute_parallel_workflow "$@"
            ;;
        "status")
            status_check
            ;;
        "clean")
            rm -rf "$LOG_DIR" "$PLAN_FILE"
            success "Cleaned up agent logs and plans"
            ;;
        *)
            cat <<EOF
AWS Agent Orchestrator

Usage: $0 [command] [options]

Commands:
  init                     Initialize environment and deploy all agents
  deploy                   Deploy all agent configurations
  run [type] [name]       Execute parallel workflow
    - full-stack-app      Complete application development
    - migration           Legacy system migration
    - security-audit      Security analysis and remediation
    - cost-optimization   Resource cost optimization
  status                   Check current agent status and plans
  clean                    Clean up logs and temporary files

Examples:
  $0 init
  $0 run full-stack-app MyEcommerceApp
  $0 run migration LegacyToAppSync
  $0 status

For more details, see: ~/.aws-agents/
EOF
            ;;
    esac
}

# Execute main function
main "$@"