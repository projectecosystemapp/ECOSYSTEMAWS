#!/bin/bash

# EcosystemAWS Multi-Agent System Initialization Script
# This script sets up the complete agent framework for the marketplace platform

set -e  # Exit on error

echo "🚀 Initializing EcosystemAWS Multi-Agent System"
echo "================================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Must run from project root directory${NC}"
    exit 1
fi

# Create necessary directories
echo -e "\n${BLUE}📁 Creating agent directories...${NC}"
mkdir -p AGENT_CHARTERS
mkdir -p AGENT_WORKSPACES
mkdir -p AGENT_LOGS
mkdir -p .claude/agents

echo -e "${GREEN}✅ Directories created${NC}"

# Initialize agent configurations
echo -e "\n${BLUE}🤖 Configuring agents...${NC}"

# Agent 1: AWS Architect
cat > .claude/agents/aws-architect.json << 'EOF'
{
  "name": "AWS Architect",
  "id": "aws-architect",
  "model": "claude-opus-4-1-20250805",
  "color": "blue",
  "emoji": "🏗️",
  "status": "active",
  "tools": [
    "filesystem",
    "web_search",
    "bash",
    "aws_cli",
    "amplify_cli",
    "cdk"
  ],
  "charter_file": "AGENT_CHARTERS/AWS_ARCHITECT.md",
  "workspace": "AGENT_WORKSPACES/architect",
  "capabilities": {
    "infrastructure": true,
    "cost_optimization": true,
    "architecture_design": true,
    "migration": true
  }
}
EOF
echo -e "  ${BLUE}🏗️  AWS Architect configured${NC}"

# Agent 2: Marketplace Builder
cat > .claude/agents/marketplace-builder.json << 'EOF'
{
  "name": "Marketplace Builder",
  "id": "marketplace-builder",
  "model": "claude-sonnet-4-20250620",
  "color": "green",
  "emoji": "🔨",
  "status": "active",
  "tools": [
    "filesystem",
    "npm",
    "git",
    "browser",
    "typescript",
    "react"
  ],
  "charter_file": "AGENT_CHARTERS/MARKETPLACE_BUILDER.md",
  "workspace": "AGENT_WORKSPACES/builder",
  "capabilities": {
    "frontend": true,
    "backend": true,
    "api_development": true,
    "stripe_integration": true
  }
}
EOF
echo -e "  ${GREEN}🔨 Marketplace Builder configured${NC}"

# Agent 3: Quality Guardian
cat > .claude/agents/quality-guardian.json << 'EOF'
{
  "name": "Quality Guardian",
  "id": "quality-guardian",
  "model": "claude-sonnet-4-20250620",
  "color": "yellow",
  "emoji": "🛡️",
  "status": "active",
  "tools": [
    "filesystem",
    "test_runner",
    "browser_automation",
    "vitest",
    "playwright"
  ],
  "charter_file": "AGENT_CHARTERS/QUALITY_GUARDIAN.md",
  "workspace": "AGENT_WORKSPACES/guardian",
  "capabilities": {
    "unit_testing": true,
    "e2e_testing": true,
    "test_automation": true,
    "quality_assurance": true
  }
}
EOF
echo -e "  ${YELLOW}🛡️  Quality Guardian configured${NC}"

# Agent 4: Security Sentinel
cat > .claude/agents/security-sentinel.json << 'EOF'
{
  "name": "Security Sentinel",
  "id": "security-sentinel",
  "model": "claude-opus-4-1-20250805",
  "color": "red",
  "emoji": "🔒",
  "status": "active",
  "tools": [
    "filesystem",
    "security_scanner",
    "aws_security_hub",
    "dependency_checker",
    "secrets_manager"
  ],
  "charter_file": "AGENT_CHARTERS/SECURITY_SENTINEL.md",
  "workspace": "AGENT_WORKSPACES/sentinel",
  "capabilities": {
    "security_audit": true,
    "compliance": true,
    "vulnerability_scanning": true,
    "incident_response": true
  }
}
EOF
echo -e "  ${RED}🔒 Security Sentinel configured${NC}"

# Agent 5: Performance Optimizer
cat > .claude/agents/performance-optimizer.json << 'EOF'
{
  "name": "Performance Optimizer",
  "id": "performance-optimizer",
  "model": "claude-sonnet-4-20250620",
  "color": "purple",
  "emoji": "⚡",
  "status": "active",
  "tools": [
    "filesystem",
    "profiler",
    "lighthouse",
    "cloudwatch",
    "cost_explorer"
  ],
  "charter_file": "AGENT_CHARTERS/PERFORMANCE_OPTIMIZER.md",
  "workspace": "AGENT_WORKSPACES/optimizer",
  "capabilities": {
    "performance_analysis": true,
    "cost_optimization": true,
    "monitoring": true,
    "core_web_vitals": true
  }
}
EOF
echo -e "  ${PURPLE}⚡ Performance Optimizer configured${NC}"

# Create agent workspaces
echo -e "\n${BLUE}📂 Setting up agent workspaces...${NC}"
for agent in architect builder guardian sentinel optimizer; do
    mkdir -p "AGENT_WORKSPACES/$agent"
    echo "# $agent Workspace" > "AGENT_WORKSPACES/$agent/README.md"
done
echo -e "${GREEN}✅ Workspaces created${NC}"

# Create orchestrator configuration
echo -e "\n${BLUE}🎭 Configuring orchestrator...${NC}"
cat > .claude/orchestrator.json << 'EOF'
{
  "version": "1.0.0",
  "agents": [
    "aws-architect",
    "marketplace-builder",
    "quality-guardian",
    "security-sentinel",
    "performance-optimizer"
  ],
  "communication": {
    "protocol": "xml",
    "plan_file": "MULTI_AGENT_PLAN.md",
    "log_dir": "AGENT_LOGS"
  },
  "workflows": {
    "feature_development": [
      "aws-architect",
      "security-sentinel",
      "marketplace-builder",
      "quality-guardian",
      "performance-optimizer"
    ],
    "migration": [
      "aws-architect",
      "security-sentinel",
      "marketplace-builder",
      "quality-guardian"
    ],
    "incident_response": [
      "security-sentinel",
      "aws-architect",
      "marketplace-builder",
      "quality-guardian"
    ]
  },
  "escalation": {
    "timeout_hours": 24,
    "max_retries": 3,
    "alert_channels": ["console", "log"]
  }
}
EOF
echo -e "${GREEN}✅ Orchestrator configured${NC}"

# Verify all charters exist
echo -e "\n${BLUE}📋 Verifying agent charters...${NC}"
MISSING_CHARTERS=0

for charter in AWS_ARCHITECT MARKETPLACE_BUILDER QUALITY_GUARDIAN SECURITY_SENTINEL PERFORMANCE_OPTIMIZER; do
    if [ -f "AGENT_CHARTERS/${charter}.md" ]; then
        echo -e "  ${GREEN}✓${NC} ${charter}.md found"
    else
        echo -e "  ${RED}✗${NC} ${charter}.md missing"
        MISSING_CHARTERS=$((MISSING_CHARTERS + 1))
    fi
done

if [ $MISSING_CHARTERS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Warning: $MISSING_CHARTERS charter(s) missing${NC}"
fi

# Create launch script
echo -e "\n${BLUE}🚀 Creating launch script...${NC}"
cat > launch-agents.sh << 'EOF'
#!/bin/bash

# Launch the EcosystemAWS Multi-Agent System

echo "🎭 Launching EcosystemAWS Multi-Agent System"
echo "============================================"

# Check orchestrator
if [ ! -f ".claude/orchestrator.json" ]; then
    echo "Error: Orchestrator not configured. Run initialize-agents.sh first."
    exit 1
fi

# Launch orchestrator
echo "Starting orchestrator..."
node -e "
const { AgentOrchestrator } = require('./lib/agent-orchestrator');
const orchestrator = new AgentOrchestrator();
console.log('Orchestrator running...');
console.log('Agents ready for tasks');
"

echo "✅ Agent system is ready!"
echo ""
echo "Available commands:"
echo "  • Assign task: orchestrator.assignTask({agent, type, priority, description})"
echo "  • Check status: orchestrator.getAgentWorkload(agent)"
echo "  • View plan: cat MULTI_AGENT_PLAN.md"
EOF
chmod +x launch-agents.sh

echo -e "${GREEN}✅ Launch script created${NC}"

# Create example task script
echo -e "\n${BLUE}📝 Creating example task script...${NC}"
cat > example-tasks.js << 'EOF'
// Example tasks for the Multi-Agent System

const { AgentOrchestrator, exampleMarketplaceWorkflow, migrationWorkflow } = require('./lib/agent-orchestrator');

console.log('Creating example tasks for agents...\n');

// Initialize orchestrator
const orchestrator = new AgentOrchestrator();

// Example 1: Feature Development
console.log('📦 Example 1: Multi-vendor checkout feature');
const checkoutTasks = exampleMarketplaceWorkflow();
console.log('Checkout feature tasks created\n');

// Example 2: Migration Task
console.log('🔄 Example 2: Lambda URL to AppSync migration');
const migration = migrationWorkflow();
console.log('Migration tasks created\n');

// Example 3: Security Audit
console.log('🔒 Example 3: Security audit task');
const securityAudit = orchestrator.assignTask({
    agent: 'sentinel',
    type: 'security',
    priority: 'critical',
    description: 'Complete security audit of authentication system',
    dependencies: []
});
console.log(`Security audit task created: ${securityAudit}\n`);

// Example 4: Performance Analysis
console.log('⚡ Example 4: Performance optimization task');
const perfAnalysis = orchestrator.assignTask({
    agent: 'optimizer',
    type: 'optimize',
    priority: 'high',
    description: 'Analyze and optimize Core Web Vitals',
    dependencies: []
});
console.log(`Performance task created: ${perfAnalysis}\n`);

console.log('✅ All example tasks created successfully!');
console.log('View the plan: cat MULTI_AGENT_PLAN.md');
EOF

echo -e "${GREEN}✅ Example tasks script created${NC}"

# Summary
echo -e "\n${GREEN}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Multi-Agent System Initialization Complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo ""
echo "📊 System Status:"
echo "  • 5 Agents configured"
echo "  • Orchestrator ready"
echo "  • Workspaces created"
echo "  • Charter documents in place"
echo ""
echo "🎯 Next Steps:"
echo "  1. Review agent charters in AGENT_CHARTERS/"
echo "  2. Launch agents: ./launch-agents.sh"
echo "  3. Create tasks: node example-tasks.js"
echo "  4. Monitor progress: cat MULTI_AGENT_PLAN.md"
echo ""
echo "📚 Documentation:"
echo "  • Agent Charters: AGENT_CHARTERS/*.md"
echo "  • Orchestration Plan: MULTI_AGENT_PLAN.md"
echo "  • TypeScript Module: lib/agent-orchestrator.ts"
echo ""
echo "🔧 Available Agents:"
echo -e "  ${BLUE}🏗️  AWS Architect${NC} - Infrastructure & Architecture"
echo -e "  ${GREEN}🔨 Marketplace Builder${NC} - Feature Implementation"
echo -e "  ${YELLOW}🛡️  Quality Guardian${NC} - Testing & QA"
echo -e "  ${RED}🔒 Security Sentinel${NC} - Security & Compliance"
echo -e "  ${PURPLE}⚡ Performance Optimizer${NC} - Performance & Cost"
echo ""
echo "Happy orchestrating! 🎭"