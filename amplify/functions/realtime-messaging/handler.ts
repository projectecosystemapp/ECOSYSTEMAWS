import type { Schema } from '../../data/resource';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { nullableToString, nullableToNumber } from '../../../lib/type-utils';

type Handler = Schema['sendRealtimeMessage']['functionHandler'];

const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler: Handler = async (event) => {
  const { conversationId, recipientId, content, messageType = 'text', requestId } = event.arguments;
  const senderId = event.identity?.sub;
  const senderEmail = event.identity?.claims?.email;

  if (!senderId || !senderEmail) {
    throw new Error('Authentication required');
  }

  try {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    const message = {
      id: messageId,
      conversationId,
      senderId,
      senderEmail,
      recipientId,
      recipientEmail: '', // Will be populated by AppSync
      content,
      messageType,
      read: false,
      readAt: [],
      requestId: requestId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      owner: senderId,
    };

    // Store message in DynamoDB
    await dynamodb.send(new PutCommand({
      TableName: nullableToString(process.env.MESSAGE_TABLE_NAME),
      Item: message,
    }));

    // AppSync will automatically trigger subscriptions for real-time delivery
    return {
      success: true,
      messageId,
      conversationId,
      timestamp: nullableToString(message.createdAt),
    };
  } catch (error) {
    console.error('Real-time messaging error:', error);
    throw new Error('Failed to send message');
  }
};