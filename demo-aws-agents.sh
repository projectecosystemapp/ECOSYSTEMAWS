#!/bin/bash

# AWS Agents Demo Script
# Demonstrates the parallel agent orchestration system

set -e

echo "🚀 AWS Agent Orchestra Demo"
echo "================================"

# Initialize the system
echo "1. Initializing AWS Agent Orchestra..."
./aws-agent-orchestrator.sh init

echo ""
echo "2. Checking system status..."
./aws-agent-orchestrator.sh status

echo ""
echo "3. Running full-stack development workflow..."
./claude-agent-runner.sh full-stack DemoEcommerceApp

echo ""
echo "4. Checking outputs..."
if [[ -d ".aws-agent-logs/outputs" ]]; then
    echo "Generated outputs:"
    ls -la .aws-agent-logs/outputs/
    echo ""
    echo "Sample architect output:"
    head -20 .aws-agent-logs/outputs/architect-output.md || echo "Output file not found"
fi

echo ""
echo "5. Workflow summary:"
if [[ -f ".aws-agent-logs/workflow-summary.md" ]]; then
    cat .aws-agent-logs/workflow-summary.md
fi

echo ""
echo "✅ Demo completed!"
echo "Check .aws-agent-logs/ for detailed outputs"
echo "Check MULTI_AGENT_PLAN.md for workflow coordination"