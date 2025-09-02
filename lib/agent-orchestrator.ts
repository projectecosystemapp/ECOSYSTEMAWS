/**
 * EcosystemAWS Multi-Agent Orchestrator
 * Coordinates work between specialized agents for the marketplace platform
 * @architecture AppSync-integrated
 */

import { writeFileSync } from 'fs';

export type AgentType = 'architect' | 'builder' | 'guardian' | 'sentinel' | 'optimizer';
export type TaskType =
  | 'feature'
  | 'fix'
  | 'review'
  | 'optimize'
  | 'security'
  | 'test'
  | 'migration';
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'in-progress' | 'review' | 'completed' | 'blocked';

export interface AgentTask {
  id: string;
  agent: AgentType;
  type: TaskType;
  priority: TaskPriority;
  description: string;
  dependencies: string[];
  status: TaskStatus;
  assignedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  handoffTo?: AgentType;
  handoffContext?: string;
  output?: string;
  blockedReason?: string;
  artifacts?: string[];
}

export interface AgentCapabilities {
  architect: {
    skills: ['infrastructure', 'architecture', 'aws', 'amplify', 'cdk', 'cost-optimization'];
    taskTypes: ['feature', 'migration', 'optimize'];
  };
  builder: {
    skills: ['frontend', 'backend', 'api', 'react', 'nextjs', 'typescript'];
    taskTypes: ['feature', 'fix'];
  };
  guardian: {
    skills: ['testing', 'quality', 'automation', 'vitest', 'playwright'];
    taskTypes: ['test', 'review'];
  };
  sentinel: {
    skills: ['security', 'compliance', 'vulnerability', 'pci-dss', 'gdpr'];
    taskTypes: ['security', 'review'];
  };
  optimizer: {
    skills: ['performance', 'cost', 'monitoring', 'metrics', 'optimization'];
    taskTypes: ['optimize', 'review'];
  };
}

export class AgentOrchestrator {
  private tasks: Map<string, AgentTask> = new Map();
  private planFile = 'MULTI_AGENT_PLAN.md';
  private capabilities: AgentCapabilities = {
    architect: {
      skills: ['infrastructure', 'architecture', 'aws', 'amplify', 'cdk', 'cost-optimization'],
      taskTypes: ['feature', 'migration', 'optimize'],
    },
    builder: {
      skills: ['frontend', 'backend', 'api', 'react', 'nextjs', 'typescript'],
      taskTypes: ['feature', 'fix'],
    },
    guardian: {
      skills: ['testing', 'quality', 'automation', 'vitest', 'playwright'],
      taskTypes: ['test', 'review'],
    },
    sentinel: {
      skills: ['security', 'compliance', 'vulnerability', 'pci-dss', 'gdpr'],
      taskTypes: ['security', 'review'],
    },
    optimizer: {
      skills: ['performance', 'cost', 'monitoring', 'metrics', 'optimization'],
      taskTypes: ['optimize', 'review'],
    },
  };

  constructor() {
    this.loadExistingTasks();
  }

  /**
   * Assigns a task to an agent based on capability matching
   */
  assignTask(task: Omit<AgentTask, 'id' | 'status' | 'assignedAt'>): string {
    const taskId = this.generateTaskId();
    const newTask: AgentTask = {
      ...task,
      id: taskId,
      status: 'pending',
      assignedAt: new Date(),
    };

    // Validate agent can handle this task type
    const agentCaps = this.capabilities[task.agent];
    if (!agentCaps.taskTypes.includes(task.type as never)) {
      throw new Error(
        `Agent ${task.agent} cannot handle task type ${task.type}. ` +
          `Capable of: ${agentCaps.taskTypes.join(', ')}`
      );
    }

    this.tasks.set(taskId, newTask);
    this.updatePlanFile();
    this.notifyAgent(newTask.agent, newTask);

    return taskId;
  }

  /**
   * Starts work on a task
   */
  startTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (task == null) throw new Error(`Task ${taskId} not found`);

    // Check dependencies
    const blockedBy = this.checkDependencies(task);
    if (blockedBy.length > 0) {
      task.status = 'blocked';
      task.blockedReason = `Waiting for: ${blockedBy.join(', ')}`;
    } else {
      task.status = 'in-progress';
      task.startedAt = new Date();
    }

    this.updatePlanFile();
  }

  /**
   * Completes a task
   */
  completeTask(taskId: string, output: string, artifacts?: string[]): void {
    const task = this.tasks.get(taskId);
    if (task == null) throw new Error(`Task ${taskId} not found`);

    task.status = 'completed';
    task.completedAt = new Date();
    task.output = output;
    task.artifacts = artifacts;

    // Check if any blocked tasks can now proceed
    this.unblockDependentTasks(taskId);

    this.updatePlanFile();
  }

  /**
   * Handles task handoff between agents
   */
  handoffTask(taskId: string, fromAgent: AgentType, toAgent: AgentType, context: string): string {
    const oldTask = this.tasks.get(taskId);
    if (oldTask == null) throw new Error(`Task ${taskId} not found`);
    if (oldTask.agent !== fromAgent) {
      throw new Error(`Task ${taskId} is not assigned to ${fromAgent}`);
    }

    // Create new task for receiving agent
    const newTaskId = this.assignTask({
      agent: toAgent,
      type: 'review',
      priority: oldTask.priority,
      description: `Review: ${oldTask.description}`,
      dependencies: [taskId],
    });

    const newTask = this.tasks.get(newTaskId)!;
    newTask.handoffContext = context;

    this.updatePlanFile();
    this.notifyAgent(toAgent, newTask);

    return newTaskId;
  }

  /**
   * Escalates a blocked task
   */
  escalateTask(taskId: string, reason: string): void {
    const task = this.tasks.get(taskId);
    if (task == null) throw new Error(`Task ${taskId} not found`);

    console.error(`⚠️ ESCALATION: Task ${taskId} requires human intervention`);
    console.error(`Reason: ${reason}`);
    console.error(`Task: ${task.description}`);
    console.error(`Assigned to: ${task.agent}`);

    // In a real system, this would trigger alerts
    this.createCriticalAlert({
      severity: 'critical',
      issue: `Task ${taskId} escalated: ${reason}`,
      impact: task.description,
      requiredAgents: [task.agent],
    });
  }

  /**
   * Gets current workload for an agent
   */
  getAgentWorkload(agent: AgentType): AgentTask[] {
    return Array.from(this.tasks.values()).filter(
      (t) => t.agent === agent && t.status === 'in-progress'
    );
  }

  /**
   * Gets task recommendations based on skills
   */
  recommendAgent(taskType: TaskType, skills: string[]): AgentType {
    let bestMatch: AgentType | null = null;
    let maxScore = 0;

    for (const [agent, caps] of Object.entries(this.capabilities)) {
      const agentCaps = caps as AgentCapabilities[AgentType];
      if (!agentCaps.taskTypes.includes(taskType as never)) continue;

      const score = skills.filter((s) => agentCaps.skills.includes(s as never)).length;
      if (score > maxScore) {
        maxScore = score;
        bestMatch = agent as AgentType;
      }
    }

    if (bestMatch == null) {
      throw new Error(`No agent found for task type ${taskType} with skills ${skills.join(', ')}`);
    }

    return bestMatch;
  }

  /**
   * Private helper methods
   */

  private generateTaskId(): string {
    return `TASK-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private checkDependencies(task: AgentTask): string[] {
    return task.dependencies.filter((depId) => {
      const dep = this.tasks.get(depId);
      return dep != null && dep.status !== 'completed';
    });
  }

  private unblockDependentTasks(completedTaskId: string): void {
    const tasks = Array.from(this.tasks.values());
    for (const task of tasks) {
      if (task.status === 'blocked' && task.dependencies.includes(completedTaskId)) {
        const blockedBy = this.checkDependencies(task);
        if (blockedBy.length === 0) {
          task.status = 'pending';
          task.blockedReason = undefined;
          this.notifyAgent(task.agent, task);
        }
      }
    }
  }

  private loadExistingTasks(): void {
    // In a real implementation, this would load from persistent storage
    // Loading existing tasks from plan file...
  }

  private updatePlanFile(): void {
    const content = this.generatePlanContent();
    writeFileSync(this.planFile, content);
  }

  private generatePlanContent(): string {
    const pending = Array.from(this.tasks.values()).filter((t) => t.status === 'pending');
    const inProgress = Array.from(this.tasks.values()).filter((t) => t.status === 'in-progress');
    const blocked = Array.from(this.tasks.values()).filter((t) => t.status === 'blocked');
    const completed = Array.from(this.tasks.values()).filter((t) => t.status === 'completed');

    const content = `# EcosystemAWS Multi-Agent Plan

## Current Sprint Status
Updated: ${new Date().toISOString()}

### In Progress (${inProgress.length})
${inProgress.length > 0 ? inProgress.map((t) => `- [${t.agent}] ${t.description} (${t.id})`).join('\n') : 'None'}

### Pending (${pending.length})
${pending.length > 0 ? pending.map((t) => `- [${t.agent}] ${t.description} (${t.id}) Priority: ${t.priority}`).join('\n') : 'None'}

### Blocked (${blocked.length})
${blocked.length > 0 ? blocked.map((t) => `- [${t.agent}] ${t.description} (${t.id}) - ${t.blockedReason ?? ''}`).join('\n') : 'None'}

### Completed This Sprint (${completed.length})
${completed.length > 0 ? completed.map((t) => `- [${t.agent}] ${t.description} (${t.id}) ✅`).join('\n') : 'None'}

## Agent Workload
${Object.keys(this.capabilities)
  .map((agent) => {
    const workload = this.getAgentWorkload(agent as AgentType);
    return `### ${agent.charAt(0).toUpperCase() + agent.slice(1)}
Active Tasks: ${workload.length}
${workload.length > 0 ? workload.map((t) => `  - ${t.description}`).join('\n') : '  - None'}`;
  })
  .join('\n\n')}
`;

    return content;
  }

  private notifyAgent(_agent: AgentType, _task: AgentTask): void {
    // Notifying agent of task
    // In a real implementation, this would trigger the actual agent
  }

  private createCriticalAlert(alert: {
    severity: 'critical' | 'high';
    issue: string;
    impact: string;
    requiredAgents: AgentType[];
  }): void {
    const alertXml = `
<critical_alert>
  <severity>${alert.severity}</severity>
  <issue>${alert.issue}</issue>
  <impact>${alert.impact}</impact>
  <required_agents>${alert.requiredAgents.join(', ')}</required_agents>
  <timestamp>${new Date().toISOString()}</timestamp>
</critical_alert>`;

    // CRITICAL ALERT
    void alertXml; // Log would go here
    // In a real system, this would trigger notifications
  }
}
