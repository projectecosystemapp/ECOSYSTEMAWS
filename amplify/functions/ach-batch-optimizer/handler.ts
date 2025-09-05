import { type ScheduledEvent, type Context } from 'aws-lambda';
import { getDynamoDBClient, trackConnectionMetrics } from '../utils/connection-optimizer';
// Note: AWS does not provide a direct ACH SDK client
// ACH processing would typically be done through partner services
// or AWS services like AWS Payment Cryptography for card processing
import { ScanCommand, UpdateCommand, BatchWriteCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

/**
 * ACH Batch Optimizer Handler
 * 
 * Automatically optimizes ACH transfers for cost efficiency:
 * - Batches pending transfers to minimize processing costs
 * - Schedules transfers during optimal ACH processing windows
 * - Prioritizes urgent transfers while maximizing batch savings
 * - Tracks cost savings and optimization metrics
 */

interface PendingTransfer {
  id: string;
  providerId: string;
  amountCents: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  requestedAt: string;
  maxDelayHours: number;
  transferType: 'standard' | 'same-day';
  bankAccountId: string;
}

interface BatchOptimization {
  batchId: string;
  transferIds: string[];
  totalAmountCents: number;
  estimatedCostCents: number;
  estimatedSavingsCents: number;
  scheduledSubmissionTime: string;
  achProcessingWindow: 'standard' | 'same-day';
  status: 'planned' | 'submitted' | 'processing' | 'completed';
}

interface OptimizationMetrics {
  totalTransfersProcessed: number;
  totalBatchesCreated: number;
  totalSavingsCents: number;
  averageBatchSize: number;
  costPerTransfer: number;
  optimizationEfficiency: number;
}

const dynamoDb = getDynamoDBClient();

export const handler = async (
  event: ScheduledEvent,
  context: Context
): Promise<{ 
  batchesCreated: number; 
  transfersProcessed: number; 
  estimatedSavings: number 
}> => {
  const startTime = Date.now();
  const isColdStart = !global.isWarm;
  global.isWarm = true;

  try {
    console.log('Starting ACH batch optimization process');
    
    // Get all pending transfers
    const pendingTransfers = await getPendingTransfers();
    
    if (pendingTransfers.length === 0) {
      console.log('No pending transfers found');
      return { batchesCreated: 0, transfersProcessed: 0, estimatedSavings: 0 };
    }
    
    // Optimize transfer batching
    const optimizations = await optimizeTransferBatching(pendingTransfers);
    
    // Submit optimized batches
    const results = await submitOptimizedBatches(optimizations);
    
    // Track optimization metrics
    await trackOptimizationMetrics(results);
    
    // Track performance metrics
    trackConnectionMetrics('ach-batch-optimizer', {
      connectionTime: 100, // Connection pooled
      requestTime: Date.now() - startTime,
      coldStart: isColdStart,
      architecture: 'arm64',
      memorySize: 512,
    });
    
    const totalSavings = results.reduce((sum, batch) => sum + batch.estimatedSavingsCents, 0);
    
    console.log(`ACH optimization completed`, {
      batchesCreated: results.length,
      transfersProcessed: results.reduce((sum, batch) => sum + batch.transferIds.length, 0),
      estimatedSavings: totalSavings / 100, // Convert to dollars
    });
    
    return {
      batchesCreated: results.length,
      transfersProcessed: results.reduce((sum, batch) => sum + batch.transferIds.length, 0),
      estimatedSavings: totalSavings,
    };
    
  } catch (error) {
    console.error('ACH batch optimization error:', error);
    throw error;
  }
};

async function getPendingTransfers(): Promise<PendingTransfer[]> {
  const command = new ScanCommand({
    TableName: process.env.ACH_TRANSFER_TABLE || 'AchTransfer',
    FilterExpression: '#status = :status',
    ExpressionAttributeNames: {
      '#status': 'status',
    },
    ExpressionAttributeValues: {
      ':status': 'initiated',
    },
  });
  const result = await dynamoDb.send(command);
  
  const transfers: PendingTransfer[] = (result.Items || []).map((item: any) => ({
    id: item.id,
    providerId: item.providerId,
    amountCents: item.amountCents,
    priority: calculateTransferPriority(item),
    requestedAt: item.createdAt,
    maxDelayHours: item.maxDelayHours || 24,
    transferType: item.transferType || 'standard',
    bankAccountId: item.bankAccountId,
  }));
  
  return transfers.sort((a, b) => {
    // Sort by priority first, then by requested time
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    
    if (priorityDiff !== 0) return priorityDiff;
    
    return new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime();
  });
}

function calculateTransferPriority(transfer: any): 'low' | 'medium' | 'high' | 'urgent' {
  const amountCents = transfer.amountCents;
  const requestedAt = new Date(transfer.requestedAt);
  const hoursAgo = (Date.now() - requestedAt.getTime()) / (1000 * 60 * 60);
  
  // Urgent: High amount or time-sensitive
  if (amountCents >= 50000 || hoursAgo >= 20) return 'urgent';
  
  // High: Significant amount or overdue
  if (amountCents >= 20000 || hoursAgo >= 12) return 'high';
  
  // Medium: Moderate amount or aging
  if (amountCents >= 5000 || hoursAgo >= 6) return 'medium';
  
  // Low: Small amount and recent
  return 'low';
}

async function optimizeTransferBatching(transfers: PendingTransfer[]): Promise<BatchOptimization[]> {
  const optimizations: BatchOptimization[] = [];
  const maxBatchSize = parseInt(process.env.MAX_BATCH_SIZE || '2500');
  const minBatchSize = parseInt(process.env.MIN_BATCH_SIZE || '5');
  const batchCost = parseInt(process.env.BATCH_PROCESSING_FEE_CENTS || '25');
  
  // Separate urgent transfers (no batching delay)
  const urgentTransfers = transfers.filter(t => t.priority === 'urgent');
  const batchableTransfers = transfers.filter(t => t.priority !== 'urgent');
  
  // Process urgent transfers immediately (same-day ACH)
  for (const urgentTransfer of urgentTransfers) {
    const batch: BatchOptimization = {
      batchId: `urgent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      transferIds: [urgentTransfer.id],
      totalAmountCents: urgentTransfer.amountCents,
      estimatedCostCents: batchCost, // Same cost whether 1 or 1000 transfers
      estimatedSavingsCents: 0, // No savings for single urgent transfers
      scheduledSubmissionTime: new Date().toISOString(), // Submit immediately
      achProcessingWindow: 'same-day',
      status: 'planned',
    };
    
    optimizations.push(batch);
  }
  
  // Optimize batchable transfers
  const currentTime = new Date();
  const standardCutoffHour = parseInt(process.env.STANDARD_ACH_CUTOFF_HOUR || '16');
  
  // Group transfers by bank routing number for optimal batching
  const transfersByBank = groupTransfersByBank(batchableTransfers);
  
  for (const [bankRouting, bankTransfers] of Object.entries(transfersByBank)) {
    if (bankTransfers.length < minBatchSize) {
      // Not enough transfers to justify batching, schedule individually
      for (const transfer of bankTransfers) {
        optimizations.push(createSingleTransferBatch(transfer, batchCost));
      }
      continue;
    }
    
    // Create optimally-sized batches
    const batches = createOptimalBatches(bankTransfers, maxBatchSize, minBatchSize);
    
    for (const batch of batches) {
      const batchCost = 25; // Fixed batch cost
      const individualCost = batch.transferIds.length * batchCost; // Cost if processed individually
      const savings = individualCost - batchCost;
      
      const optimization: BatchOptimization = {
        batchId: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        transferIds: batch.transferIds,
        totalAmountCents: batch.totalAmountCents,
        estimatedCostCents: batchCost,
        estimatedSavingsCents: savings,
        scheduledSubmissionTime: calculateOptimalSubmissionTime(currentTime, standardCutoffHour),
        achProcessingWindow: 'standard',
        status: 'planned',
      };
      
      optimizations.push(optimization);
    }
  }
  
  return optimizations;
}

function groupTransfersByBank(transfers: PendingTransfer[]): Record<string, PendingTransfer[]> {
  const groups: Record<string, PendingTransfer[]> = {};
  
  // In a real implementation, you would look up bank routing numbers
  // For now, we'll group by bankAccountId prefix as a proxy
  for (const transfer of transfers) {
    const bankGroup = transfer.bankAccountId.substring(0, 4); // First 4 characters as grouping key
    
    if (!groups[bankGroup]) {
      groups[bankGroup] = [];
    }
    
    groups[bankGroup].push(transfer);
  }
  
  return groups;
}

function createOptimalBatches(
  transfers: PendingTransfer[], 
  maxBatchSize: number, 
  minBatchSize: number
): Array<{ transferIds: string[]; totalAmountCents: number }> {
  const batches = [];
  let currentBatch: PendingTransfer[] = [];
  let currentBatchAmount = 0;
  
  for (const transfer of transfers) {
    if (currentBatch.length >= maxBatchSize) {
      // Current batch is full, start a new one
      batches.push({
        transferIds: currentBatch.map(t => t.id),
        totalAmountCents: currentBatchAmount,
      });
      
      currentBatch = [transfer];
      currentBatchAmount = transfer.amountCents;
    } else {
      currentBatch.push(transfer);
      currentBatchAmount += transfer.amountCents;
    }
  }
  
  // Add the final batch if it has enough transfers
  if (currentBatch.length >= minBatchSize) {
    batches.push({
      transferIds: currentBatch.map(t => t.id),
      totalAmountCents: currentBatchAmount,
    });
  } else if (currentBatch.length > 0) {
    // Not enough for a batch, process individually
    for (const transfer of currentBatch) {
      batches.push({
        transferIds: [transfer.id],
        totalAmountCents: transfer.amountCents,
      });
    }
  }
  
  return batches;
}

function createSingleTransferBatch(transfer: PendingTransfer, cost: number): BatchOptimization {
  return {
    batchId: `single_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    transferIds: [transfer.id],
    totalAmountCents: transfer.amountCents,
    estimatedCostCents: cost,
    estimatedSavingsCents: 0,
    scheduledSubmissionTime: new Date().toISOString(),
    achProcessingWindow: transfer.transferType,
    status: 'planned',
  };
}

function calculateOptimalSubmissionTime(currentTime: Date, cutoffHour: number): string {
  const submissionTime = new Date(currentTime);
  
  // If it's past the cutoff time, schedule for next business day
  if (submissionTime.getHours() >= cutoffHour) {
    submissionTime.setDate(submissionTime.getDate() + 1);
    submissionTime.setHours(9, 0, 0, 0); // 9 AM next day
    
    // Skip weekends
    if (submissionTime.getDay() === 6) { // Saturday
      submissionTime.setDate(submissionTime.getDate() + 2); // Monday
    } else if (submissionTime.getDay() === 0) { // Sunday
      submissionTime.setDate(submissionTime.getDate() + 1); // Monday
    }
  } else {
    // Schedule for today at optimal time (2 hours before cutoff)
    submissionTime.setHours(cutoffHour - 2, 0, 0, 0);
  }
  
  return submissionTime.toISOString();
}

async function submitOptimizedBatches(optimizations: BatchOptimization[]): Promise<BatchOptimization[]> {
  const results = [];
  
  for (const optimization of optimizations) {
    try {
      // Update transfer statuses to 'processing'
      await updateTransferStatuses(optimization.transferIds, 'processing', optimization.batchId);
      
      // Store batch optimization record
      await storeBatchOptimization(optimization);
      
      // In a real implementation, you would submit to the actual ACH processor here
      console.log(`Batch ${optimization.batchId} planned for submission at ${optimization.scheduledSubmissionTime}`);
      
      optimization.status = 'submitted';
      results.push(optimization);
      
    } catch (error) {
      console.error(`Error processing batch ${optimization.batchId}:`, error);
      
      // Revert transfer statuses on error
      await updateTransferStatuses(optimization.transferIds, 'initiated');
    }
  }
  
  return results;
}

async function updateTransferStatuses(
  transferIds: string[], 
  status: string, 
  batchId?: string
): Promise<void> {
  const updatePromises = transferIds.map(id => {
    const command = new UpdateCommand({
      TableName: process.env.ACH_TRANSFER_TABLE || 'AchTransfer',
      Key: { id },
      UpdateExpression: 'SET #status = :status' + (batchId ? ', batchId = :batchId' : ''),
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': status,
        ...(batchId && { ':batchId': batchId }),
      },
    });
    return dynamoDb.send(command);
  });
  
  await Promise.all(updatePromises);
}

async function storeBatchOptimization(optimization: BatchOptimization): Promise<void> {
  const command = new PutCommand({
    TableName: process.env.BATCH_OPTIMIZATION_TABLE || 'BatchOptimization',
    Item: {
      id: optimization.batchId,
      ...optimization,
      createdAt: new Date().toISOString(),
    },
  });
  await dynamoDb.send(command);
}

async function trackOptimizationMetrics(optimizations: BatchOptimization[]): Promise<void> {
  const totalTransfers = optimizations.reduce((sum, batch) => sum + batch.transferIds.length, 0);
  const totalSavings = optimizations.reduce((sum, batch) => sum + batch.estimatedSavingsCents, 0);
  const totalBatches = optimizations.length;
  
  const metrics: OptimizationMetrics = {
    totalTransfersProcessed: totalTransfers,
    totalBatchesCreated: totalBatches,
    totalSavingsCents: totalSavings,
    averageBatchSize: totalTransfers / totalBatches,
    costPerTransfer: (optimizations.reduce((sum, batch) => sum + batch.estimatedCostCents, 0)) / totalTransfers,
    optimizationEfficiency: (totalSavings / (totalTransfers * 25)) * 100, // Percentage of maximum possible savings
  };
  
  console.log('Optimization metrics:', JSON.stringify(metrics));
  
  // Store metrics for reporting
  const command = new PutCommand({
    TableName: process.env.BATCH_OPTIMIZATION_TABLE || 'BatchOptimization',
    Item: {
      id: `metrics_${new Date().toISOString().split('T')[0]}`, // Daily metrics
      type: 'daily_metrics',
      ...metrics,
      reportDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    },
  });
  await dynamoDb.send(command);
}

// Global variable to track warm starts
declare global {
  var isWarm: boolean;
}