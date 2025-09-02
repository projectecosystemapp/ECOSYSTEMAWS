import type { Schema } from '../../data/resource';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { SFNClient, StartExecutionCommand, DescribeExecutionCommand } from '@aws-sdk/client-sfn';

type Handler = Schema['initiateDispute']['functionHandler'] | 
              Schema['submitEvidence']['functionHandler'] | 
              Schema['getDisputeStatus']['functionHandler'];

const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const stepFunctions = new SFNClient({});

export const handler: Handler = async (event) => {
  const { fieldName, arguments: args } = event;
  const userId = event.identity?.sub;
  const userEmail = event.identity?.claims?.email;

  if (!userId) {
    throw new Error('Authentication required');
  }

  try {
    if (fieldName === 'initiateDispute') {
      const { bookingId, reason, description, amount } = args;
      
      // Get booking details
      const booking = await dynamodb.send(new GetCommand({
        TableName: process.env.BOOKING_TABLE_NAME,
        Key: { id: bookingId },
      }));

      if (!booking.Item) {
        throw new Error('Booking not found');
      }

      // Verify user is part of this booking
      if (booking.Item.customerId !== userId && booking.Item.providerId !== userId) {
        throw new Error('Unauthorized to dispute this booking');
      }

      const disputeId = `dispute_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days

      // Create dispute record
      const dispute = {
        id: disputeId,
        bookingId,
        customerId: booking.Item.customerId,
        providerId: booking.Item.providerId,
        initiatedBy: userId,
        reason,
        description,
        amount: amount || booking.Item.amount,
        status: 'INITIATED',
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        owner: userId,
      };

      await dynamodb.send(new PutCommand({
        TableName: process.env.DISPUTE_TABLE_NAME,
        Item: dispute,
      }));

      // Start Step Functions workflow
      const workflowInput = {
        disputeId,
        bookingId,
        customerId: booking.Item.customerId,
        providerId: booking.Item.providerId,
        amount: dispute.amount,
        reason,
      };

      const execution = await stepFunctions.send(new StartExecutionCommand({
        stateMachineArn: process.env.STEP_FUNCTIONS_ARN,
        name: `dispute-${disputeId}`,
        input: JSON.stringify(workflowInput),
      }));

      // Update dispute with workflow ARN
      await dynamodb.send(new UpdateCommand({
        TableName: process.env.DISPUTE_TABLE_NAME,
        Key: { id: disputeId },
        UpdateExpression: 'SET workflowExecutionArn = :arn, #status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':arn': execution.executionArn,
          ':status': 'EVIDENCE_COLLECTION',
        },
      }));

      return {
        success: true,
        disputeId,
        status: 'EVIDENCE_COLLECTION',
        message: 'Dispute initiated. Both parties have 3 days to submit evidence.',
      };
    }

    if (fieldName === 'submitEvidence') {
      const { disputeId, evidenceType, description, fileUrl } = args;
      
      // Verify dispute exists and user can submit evidence
      const dispute = await dynamodb.send(new GetCommand({
        TableName: process.env.DISPUTE_TABLE_NAME,
        Key: { id: disputeId },
      }));

      if (!dispute.Item) {
        throw new Error('Dispute not found');
      }

      if (dispute.Item.customerId !== userId && dispute.Item.providerId !== userId) {
        throw new Error('Unauthorized to submit evidence for this dispute');
      }

      if (dispute.Item.status !== 'EVIDENCE_COLLECTION') {
        throw new Error('Evidence collection period has ended');
      }

      // Create evidence record
      const evidenceId = `evidence_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const evidence = {
        id: evidenceId,
        disputeId,
        submittedBy: userId,
        evidenceType,
        description,
        fileUrl,
        metadata: { userEmail },
        createdAt: new Date().toISOString(),
        owner: userId,
      };

      await dynamodb.send(new PutCommand({
        TableName: process.env.DISPUTEEVIDENCE_TABLE_NAME,
        Item: evidence,
      }));

      return {
        success: true,
        evidenceId,
        message: 'Evidence submitted successfully',
      };
    }

    if (fieldName === 'getDisputeStatus') {
      const { disputeId } = args;
      
      const dispute = await dynamodb.send(new GetCommand({
        TableName: process.env.DISPUTE_TABLE_NAME,
        Key: { id: disputeId },
      }));

      if (!dispute.Item) {
        throw new Error('Dispute not found');
      }

      // Verify user can view this dispute
      if (dispute.Item.customerId !== userId && dispute.Item.providerId !== userId) {
        throw new Error('Unauthorized to view this dispute');
      }

      // Get workflow status if available
      let workflowStatus = null;
      if (dispute.Item.workflowExecutionArn) {
        try {
          const execution = await stepFunctions.send(new DescribeExecutionCommand({
            executionArn: dispute.Item.workflowExecutionArn,
          }));
          workflowStatus = {
            status: execution.status,
            startDate: execution.startDate,
            stopDate: execution.stopDate,
          };
        } catch (error) {
          console.warn('Could not get workflow status:', error);
        }
      }

      return {
        dispute: dispute.Item,
        workflowStatus,
        timeRemaining: dispute.Item.expiresAt ? 
          Math.max(0, new Date(dispute.Item.expiresAt).getTime() - Date.now()) : null,
      };
    }

    throw new Error(`Unknown field: ${fieldName}`);
  } catch (error) {
    console.error('Dispute workflow error:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to process dispute');
  }
};