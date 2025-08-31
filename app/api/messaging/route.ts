import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from 'aws-amplify/auth/server';
import { cookies } from 'next/headers';
import { runWithAmplifyServerContext } from '@/lib/amplify-server-utils';

// AWS Lambda client would be configured here
// import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data, userEmail } = body;

    return await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: async (contextSpec) => {
        const user = await getCurrentUser(contextSpec);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const currentUserEmail = user.signInDetails?.loginId;
        if (
          currentUserEmail !== userEmail &&
          !['CREATE_CONVERSATION_THREAD', 'SEARCH_MESSAGES'].includes(action)
        ) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const result = await handleMessagingOperation(action, data, userEmail);
        return NextResponse.json(result);
      },
    });
  } catch (error) {
    console.error('Messaging API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// Direct implementation for development (would be replaced by Lambda invocation)
async function handleMessagingOperation(action: string, data: any, userEmail: string) {
  const { messageApi, generateConversationId } = await import('@/lib/api');

  switch (action) {
    case 'SEND_MESSAGE': {
      const conversationId = generateConversationId(data.senderEmail, data.recipientEmail);
      
      // Generate IDs for sender and recipient
      const senderId = data.senderEmail.replace('@', '_at_').replace(/[^a-zA-Z0-9_]/g, '_');
      const recipientId = data.recipientEmail.replace('@', '_at_').replace(/[^a-zA-Z0-9_]/g, '_');

      const messageData = {
        conversationId,
        senderId,
        senderEmail: data.senderEmail,
        recipientId,
        recipientEmail: data.recipientEmail,
        content: data.content,
        messageType: data.messageType || 'TEXT',
        attachments: data.attachments || [],
        read: false,
        createdAt: new Date().toISOString(),
        ...(data.bookingId && { bookingId: data.bookingId }),
        ...(data.serviceId && { serviceId: data.serviceId }),
      };

      const message = await messageApi.create(messageData);
      
      // Trigger notification
      await triggerNotification(message);
      
      return { message };
    }

    case 'MARK_MESSAGES_READ': {
      await messageApi.markAsRead(data.conversationId, data.userEmail);
      return { success: true };
    }

    case 'SEARCH_MESSAGES': {
      const messages = await messageApi.list({
        and: [
          {
            or: [
              { senderEmail: { eq: userEmail } },
              { recipientEmail: { eq: userEmail } }
            ]
          },
          { content: { contains: data.query } },
          ...(data.conversationId ? [{ conversationId: { eq: data.conversationId } }] : [])
        ]
      });

      return { messages: messages?.slice(0, 50) || [], query: data.query };
    }

    case 'CREATE_CONVERSATION_THREAD': {
      const { participantEmails, bookingId, serviceId } = data;
      
      if (participantEmails.length !== 2) {
        throw new Error('Conversation must have exactly 2 participants');
      }

      const conversationId = generateConversationId(participantEmails[0], participantEmails[1]);
      
      // Check if conversation already exists
      const existingMessages = await messageApi.list({
        filter: { conversationId: { eq: conversationId } }
      });

      if (existingMessages && existingMessages.length > 0) {
        return { conversationId, existing: true };
      }

      // Create initial system message
      const systemMessage = {
        conversationId,
        senderId: 'system',
        senderEmail: 'system@marketplace.com',
        recipientId: 'system',
        recipientEmail: participantEmails[0],
        content: 'Conversation started',
        messageType: 'SYSTEM',
        read: false,
        createdAt: new Date().toISOString(),
        ...(bookingId && { bookingId }),
        ...(serviceId && { serviceId }),
      };

      const message = await messageApi.create(systemMessage);
      
      return { conversationId, message };
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

// Trigger notification for new message
async function triggerNotification(message: any) {
  try {
    // Create in-app notification
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'CREATE',
        data: {
          userId: message.recipientId,
          type: 'MESSAGE_RECEIVED',
          title: `New message from ${message.senderEmail.split('@')[0]}`,
          message: message.content.length > 50 
            ? message.content.substring(0, 50) + '...'
            : message.content,
          senderId: message.senderId,
          actionUrl: `/messages?conversation=${message.conversationId}`,
          actionText: 'View Message'
        }
      })
    });

    console.log('Notification created for message:', message.id);
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}
