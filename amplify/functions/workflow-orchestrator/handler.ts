import type { AppSyncResolverEvent } from 'aws-lambda';
import { SFNClient, StartExecutionCommand, DescribeExecutionCommand, StopExecutionCommand } from '@aws-sdk/client-sfn';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { nullableToString, nullableToNumber } from '@/lib/type-utils';

const sfnClient = new SFNClient({ region: process.env.AWS_REGION });
const eventBridgeClient = new EventBridgeClient({ region: process.env.AWS_REGION });

interface WorkflowRequest {
  workflowType: 'BOOKING_LIFECYCLE' | 'PAYMENT_PROCESSING' | 'DISPUTE_RESOLUTION' | 'PROVIDER_ONBOARDING';
  action?: 'START' | 'STOP' | 'STATUS';
  executionArn?: string;
  input?: any;
  executionName?: string;
  // For EventBridge operations
  source?: string;
  detailType?: string;
  detail?: any;
}

interface WorkflowResponse {
  success: boolean;
  executionArn?: string;
  status?: string;
  output?: any;
  error?: string;
}

/**
 * AWS Step Functions Workflow Orchestrator
 * 
 * This Lambda function manages the lifecycle of Step Functions workflows
 * in the Ecosystem Marketplace platform.
 * 
 * SUPPORTED WORKFLOWS:
 * 1. BOOKING_LIFECYCLE - Complete booking process from creation to completion
 * 2. PAYMENT_PROCESSING - Payment intent, processing, and settlement
 * 3. DISPUTE_RESOLUTION - Automated dispute handling with escalation
 * 4. PROVIDER_ONBOARDING - New provider registration and Stripe Connect setup
 * 
 * ACTIONS:
 * - START: Begin a new workflow execution
 * - STOP: Terminate a running workflow
 * - STATUS: Get current status of an execution
 * 
 * INTEGRATION:
 * - Integrated via AppSync custom mutations
 * - Events published to EventBridge for downstream processing
 * - Comprehensive logging and error handling
 */
export const handler = async (
  event: AppSyncResolverEvent<WorkflowRequest>
): Promise<WorkflowResponse> => {
  console.log('🔧 Workflow Orchestrator - Processing request:', JSON.stringify(event, null, 2));
  
  const { workflowType, action, executionArn, input, executionName, source, detailType, detail } = event.arguments;
  
  try {
    // Handle different GraphQL operations based on field name
    const fieldName = event.info.fieldName;
    
    switch (fieldName) {
      case 'startWorkflow':
        const stateMachineArn = getStateMachineArn(workflowType);
        if (!stateMachineArn) {
          throw new Error(`Invalid workflow type: ${workflowType}`);
        }
        return await startWorkflow(stateMachineArn, input, executionName);
        
      case 'stopWorkflow':
        if (!executionArn) {
          throw new Error('executionArn is required for stopWorkflow');
        }
        return await stopWorkflow(executionArn);
        
      case 'getWorkflowStatus':
        if (!executionArn) {
          throw new Error('executionArn is required for getWorkflowStatus');
        }
        return await getWorkflowStatus(executionArn);
        
      case 'publishEvent':
        if (!source || !detailType || !detail) {
          throw new Error('source, detailType, and detail are required for publishEvent');
        }
        return await publishEvent(source, detailType, detail);
        
      // Legacy support for action-based calls
      default:
        if (action) {
          const stateMachineArn = getStateMachineArn(workflowType);
          if (!stateMachineArn) {
            throw new Error(`Invalid workflow type: ${workflowType}`);
          }
          
          switch (action) {
            case 'START':
              return await startWorkflow(stateMachineArn, input, executionName);
            case 'STOP':
              if (!executionArn) {
                throw new Error('executionArn is required for STOP action');
              }
              return await stopWorkflow(executionArn);
            case 'STATUS':
              if (!executionArn) {
                throw new Error('executionArn is required for STATUS action');
              }
              return await getWorkflowStatus(executionArn);
          }
        }
        
        throw new Error(`Unsupported operation: ${fieldName}`);
    }
  } catch (error) {
    console.error('❌ Workflow Orchestrator Error:', error);
    
    // Publish error event
    await publishWorkflowEvent({
      source: 'marketplace.workflow',
      detailType: 'Workflow Error',
      detail: {
        workflowType,
        action: action || fieldName,
        error: nullableToString(error.message),
        timestamp: new Date().toISOString(),
      },
    });
    
    return {
      success: false,
      error: nullableToString(error.message),
    };
  }
};

/**
 * Start a new workflow execution
 */
async function startWorkflow(
  stateMachineArn: string, 
  input: any, 
  executionName?: string
): Promise<WorkflowResponse> {
  const command = new StartExecutionCommand({
    stateMachineArn,
    input: JSON.stringify(input || {}),
    name: executionName || `execution-${Date.now()}`,
  });
  
  const response = await sfnClient.send(command);
  
  console.log('✅ Workflow started:', {
    executionArn: nullableToString(response.executionArn),
    startDate: nullableToString(response.startDate),
  });
  
  // Publish workflow started event
  await publishWorkflowEvent({
    source: 'marketplace.workflow',
    detailType: 'Workflow Started',
    detail: {
      executionArn: nullableToString(response.executionArn),
      stateMachineArn,
      input,
      timestamp: new Date().toISOString(),
    },
  });
  
  return {
    success: true,
    executionArn: nullableToString(response.executionArn),
    status: 'RUNNING',
  };
}

/**
 * Stop a running workflow execution
 */
async function stopWorkflow(executionArn: string): Promise<WorkflowResponse> {
  const command = new StopExecutionCommand({
    executionArn,
    cause: 'User requested termination',
    error: 'MANUAL_TERMINATION',
  });
  
  const response = await sfnClient.send(command);
  
  console.log('🛑 Workflow stopped:', {
    executionArn,
    stopDate: nullableToString(response.stopDate),
  });
  
  // Publish workflow stopped event
  await publishWorkflowEvent({
    source: 'marketplace.workflow',
    detailType: 'Workflow Stopped',
    detail: {
      executionArn,
      cause: 'User requested termination',
      timestamp: new Date().toISOString(),
    },
  });
  
  return {
    success: true,
    executionArn,
    status: 'ABORTED',
  };
}

/**
 * Get the current status of a workflow execution
 */
async function getWorkflowStatus(executionArn: string): Promise<WorkflowResponse> {
  const command = new DescribeExecutionCommand({
    executionArn,
  });
  
  const response = await sfnClient.send(command);
  
  console.log('📊 Workflow status:', {
    executionArn,
    status: nullableToString(response.status),
    startDate: nullableToString(response.startDate),
    stopDate: nullableToString(response.stopDate),
  });
  
  let output;
  try {
    output = response.output ? JSON.parse(response.output) : null;
  } catch (error) {
    console.warn('⚠️ Failed to parse workflow output:', error);
    output = response.output;
  }
  
  return {
    success: true,
    executionArn,
    status: nullableToString(response.status),
    output,
  };
}

/**
 * Get the state machine ARN based on workflow type
 */
function getStateMachineArn(workflowType: string): string | null {
  const arnMap = {
    'BOOKING_LIFECYCLE': nullableToString(process.env.BOOKING_STATE_MACHINE_ARN),
    'PAYMENT_PROCESSING': nullableToString(process.env.PAYMENT_STATE_MACHINE_ARN),
    'DISPUTE_RESOLUTION': nullableToString(process.env.DISPUTE_STATE_MACHINE_ARN),
    'PROVIDER_ONBOARDING': nullableToString(process.env.ONBOARDING_STATE_MACHINE_ARN),
  };
  
  return arnMap[workflowType] || null;
}

/**
 * Publish a custom event to EventBridge (for GraphQL publishEvent mutation)
 */
async function publishEvent(source: string, detailType: string, detail: any): Promise<WorkflowResponse> {
  try {
    const command = new PutEventsCommand({
      Entries: [{
        Source: source,
        DetailType: detailType,
        Detail: JSON.stringify(detail),
        EventBusName: nullableToString(process.env.MARKETPLACE_EVENT_BUS_ARN),
        Time: new Date(),
      }],
    });
    
    const response = await eventBridgeClient.send(command);
    console.log('📡 Custom event published:', { source, detailType, failedEntryCount: response.FailedEntryCount });
    
    if (response.FailedEntryCount && response.FailedEntryCount > 0) {
      throw new Error(`Failed to publish ${response.FailedEntryCount} event(s)`);
    }
    
    return {
      success: true,
      output: {
        source,
        detailType,
        timestamp: new Date().toISOString(),
        eventId: response.Entries?.[0]?.EventId,
      },
    };
  } catch (error) {
    console.error('❌ Failed to publish custom event:', error);
    throw error;
  }
}

/**
 * Publish an event to EventBridge (internal helper)
 */
async function publishWorkflowEvent(eventData: {
  source: string;
  detailType: string;
  detail: any;
}): Promise<void> {
  try {
    const command = new PutEventsCommand({
      Entries: [{
        Source: nullableToString(eventData.source),
        DetailType: nullableToString(eventData.detailType),
        Detail: JSON.stringify(eventData.detail),
        EventBusName: nullableToString(process.env.MARKETPLACE_EVENT_BUS_ARN),
      }],
    });
    
    await eventBridgeClient.send(command);
    console.log('📡 Event published:', eventData.detailType);
  } catch (error) {
    console.error('❌ Failed to publish event:', error);
    // Don't throw - event publishing failure shouldn't fail the main operation
  }
}

/**
 * Event-driven workflow triggers
 * 
 * This function can also be invoked directly by EventBridge rules
 * to automatically start workflows based on domain events.
 */
export const eventHandler = async (event: any): Promise<void> => {
  console.log('📡 Event-driven workflow trigger:', JSON.stringify(event, null, 2));
  
  const { source, 'detail-type': detailType, detail } = event;
  
  try {
    // Auto-trigger workflows based on domain events
    switch (`${source}:${detailType}`) {
      case 'marketplace.booking:Booking Created':
        await startWorkflow(
          process.env.BOOKING_STATE_MACHINE_ARN!,
          {
            action: 'CREATE',
            ...detail,
          },
          `booking-${detail.bookingId}-${Date.now()}`
        );
        break;
        
      case 'marketplace.payment:Payment Intent Created':
        await startWorkflow(
          process.env.PAYMENT_STATE_MACHINE_ARN!,
          {
            paymentType: 'DIRECT',
            ...detail,
          },
          `payment-${detail.paymentIntentId}-${Date.now()}`
        );
        break;
        
      case 'marketplace.dispute:Dispute Filed':
        await startWorkflow(
          process.env.DISPUTE_STATE_MACHINE_ARN!,
          {
            disputeType: nullableToString(detail.disputeType),
            ...detail,
          },
          `dispute-${detail.disputeId}-${Date.now()}`
        );
        break;
        
      case 'marketplace.provider:Registration Completed':
        await startWorkflow(
          process.env.ONBOARDING_STATE_MACHINE_ARN!,
          {
            ...detail,
          },
          `onboarding-${detail.providerId}-${Date.now()}`
        );
        break;
        
      default:
        console.log('🔄 No workflow trigger configured for event:', `${source}:${detailType}`);
    }
  } catch (error) {
    console.error('❌ Event-driven workflow error:', error);
    throw error; // Let EventBridge handle retries
  }
};