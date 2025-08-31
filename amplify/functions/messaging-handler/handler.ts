import type { Handler } from 'aws-lambda';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../data/resource.js';

// Configure Amplify for Lambda environment
Amplify.configure(
  {
    API: {
      GraphQL: {
        endpoint: process.env.GRAPHQL_ENDPOINT || '',
        region: process.env.AWS_REGION || 'us-east-1',
        defaultAuthMode: 'iam',
      },
    },
  },
  {
    ssr: true,
  }
);

const client = generateClient<Schema>();

interface MessageEvent {
  action: string;
  data: any;
  userEmail: string;
}

interface ConversationThreadData {
  participantEmails: string[];
  bookingId?: string;
  serviceId?: string;
}

interface SendMessageData {
  senderEmail: string;
  recipientEmail: string;
  content: string;
  messageType?: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
  bookingId?: string;
  serviceId?: string;
  attachments?: string[];
}

interface MarkReadData {
  conversationId: string;
  userEmail: string;
}

export const handler: Handler = async (event) => {
  console.log('Messaging handler event:', JSON.stringify(event, null, 2));

  const { action, data, userEmail }: MessageEvent = event;

  try {
    switch (action) {
      case 'CREATE_CONVERSATION_THREAD':
        return await createConversationThread(data as ConversationThreadData);
      
      case 'SEND_MESSAGE':
        return await sendMessage(data as SendMessageData);
      
      case 'MARK_MESSAGES_READ':
        return await markMessagesRead(data as MarkReadData);
      
      case 'GET_CONVERSATION_MESSAGES':
        return await getConversationMessages(data.conversationId, userEmail);
      
      case 'GET_USER_CONVERSATIONS':
        return await getUserConversations(userEmail);
      
      case 'GET_UNREAD_COUNT':
        return await getUnreadCount(userEmail);
      
      case 'VALIDATE_MESSAGE_PERMISSION':
        return await validateMessagePermission(data.senderEmail, data.recipientEmail);
      
      case 'SEARCH_MESSAGES':
        return await searchMessages(userEmail, data.query, data.conversationId);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('Error in messaging handler:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    };
  }
};

// Generate consistent conversation ID from participant emails
function generateConversationId(email1: string, email2: string): string {
  const emails = [email1, email2].sort();
  return `conv_${emails[0]}_${emails[1]}`.replace(/[^a-zA-Z0-9_]/g, '_');
}

// Create a conversation thread between participants
async function createConversationThread(data: ConversationThreadData) {
  const { participantEmails, bookingId, serviceId } = data;
  
  if (participantEmails.length !== 2) {
    throw new Error('Conversation must have exactly 2 participants');
  }

  const [email1, email2] = participantEmails;
  const conversationId = generateConversationId(email1, email2);

  // Check if users can message each other (have booking history)
  const canMessage = await validateMessagePermission(email1, email2);
  if (!canMessage.allowed) {
    throw new Error(canMessage.reason || 'Users cannot message each other');
  }

  // Create system message to initialize conversation
  const systemMessage = {
    conversationId,
    senderId: 'system',
    senderEmail: 'system@marketplace.com',
    recipientId: 'system',
    recipientEmail: participantEmails[0], // Will be filtered by auth
    content: 'Conversation started',
    messageType: 'SYSTEM' as const,
    read: false,
    createdAt: new Date().toISOString(),
    ...(bookingId && { bookingId }),
    ...(serviceId && { serviceId }),
  };

  const response = await client.models.Message.create(systemMessage as any);

  return {
    statusCode: 200,
    body: JSON.stringify({
      conversationId,
      message: response.data
    })
  };
}

// Send a new message
async function sendMessage(data: SendMessageData) {
  const {
    senderEmail,
    recipientEmail,
    content,
    messageType = 'TEXT',
    bookingId,
    serviceId,
    attachments = []
  } = data;

  // Validate message permission
  const canMessage = await validateMessagePermission(senderEmail, recipientEmail);
  if (!canMessage.allowed) {
    throw new Error(canMessage.reason || 'Cannot send message to this user');
  }

  // Validate content
  if (!content || content.trim().length === 0) {
    throw new Error('Message content cannot be empty');
  }

  if (content.length > 2000) {
    throw new Error('Message content cannot exceed 2000 characters');
  }

  const conversationId = generateConversationId(senderEmail, recipientEmail);

  // Get sender and recipient IDs (for now using email as ID placeholder)
  const senderId = senderEmail.replace('@', '_at_').replace(/[^a-zA-Z0-9_]/g, '_');
  const recipientId = recipientEmail.replace('@', '_at_').replace(/[^a-zA-Z0-9_]/g, '_');

  const messageData = {
    conversationId,
    senderId,
    senderEmail,
    recipientId,
    recipientEmail,
    content: content.trim(),
    messageType,
    attachments,
    read: false,
    createdAt: new Date().toISOString(),
    ...(bookingId && { bookingId }),
    ...(serviceId && { serviceId }),
  };

  const response = await client.models.Message.create(messageData as any);

  // Trigger notification (would normally be handled by EventBridge)
  await triggerMessageNotification(response.data);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: response.data
    })
  };
}

// Mark messages as read in a conversation
async function markMessagesRead(data: MarkReadData) {
  const { conversationId, userEmail } = data;

  // Get unread messages for this user in this conversation
  const unreadMessages = await client.models.Message.list({
    filter: {
      conversationId: { eq: conversationId },
      recipientEmail: { eq: userEmail },
      read: { eq: false as any }
    } as any
  });

  if (!unreadMessages.data || unreadMessages.data.length === 0) {
    return {
      statusCode: 200,
      body: JSON.stringify({ markedCount: 0 })
    };
  }

  // Update all unread messages to read
  const updatePromises = unreadMessages.data.map(message =>
    client.models.Message.update({
      id: message.id,
      read: true as any,
      readAt: [new Date().toISOString()]
    } as any)
  );

  const results = await Promise.all(updatePromises);

  return {
    statusCode: 200,
    body: JSON.stringify({
      markedCount: results.length,
      messages: results.map(r => r.data)
    })
  };
}

// Get messages for a conversation
async function getConversationMessages(conversationId: string, userEmail: string) {
  // Verify user is participant in this conversation
  const [email1, email2] = conversationId.replace('conv_', '').split('_');
  const cleanEmail1 = email1.replace(/_/g, '@');
  const cleanEmail2 = email2.replace(/_/g, '@');
  
  if (userEmail !== cleanEmail1 && userEmail !== cleanEmail2) {
    throw new Error('User is not a participant in this conversation');
  }

  const response = await client.models.Message.list({
    filter: { conversationId: { eq: conversationId } }
  });

  const messages = response.data || [];
  
  // Sort messages by creation time
  messages.sort((a, b) => {
    const timeA = new Date(a.createdAt || '').getTime();
    const timeB = new Date(b.createdAt || '').getTime();
    return timeA - timeB;
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      messages,
      count: messages.length
    })
  };
}

// Get user's conversations with latest message preview
async function getUserConversations(userEmail: string) {
  // Get all messages where user is sender or recipient
  const [sentMessages, receivedMessages] = await Promise.all([
    client.models.Message.list({
      filter: { senderEmail: { eq: userEmail } }
    }),
    client.models.Message.list({
      filter: { recipientEmail: { eq: userEmail } }
    })
  ]);

  const allMessages = [
    ...(sentMessages.data || []),
    ...(receivedMessages.data || [])
  ];

  // Group by conversation and get latest message
  const conversationMap = new Map();
  
  allMessages.forEach(message => {
    const existing = conversationMap.get(message.conversationId);
    if (!existing || new Date(message.createdAt || '') > new Date(existing.createdAt || '')) {
      conversationMap.set(message.conversationId, message);
    }
  });

  const conversations = Array.from(conversationMap.values());
  
  // Sort by latest message time
  conversations.sort((a, b) => {
    const timeA = new Date(a.createdAt || '').getTime();
    const timeB = new Date(b.createdAt || '').getTime();
    return timeB - timeA;
  });

  // Add unread counts for each conversation
  const conversationsWithUnread = await Promise.all(
    conversations.map(async (lastMessage) => {
      const unreadCount = await getConversationUnreadCount(
        lastMessage.conversationId, 
        userEmail
      );
      
      return {
        ...lastMessage,
        unreadCount
      };
    })
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      conversations: conversationsWithUnread,
      count: conversationsWithUnread.length
    })
  };
}

// Get unread message count for user
async function getUnreadCount(userEmail: string) {
  const response = await client.models.Message.list({
    filter: {
      recipientEmail: { eq: userEmail },
      read: { eq: false as any }
    } as any
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      count: response.data?.length || 0
    })
  };
}

// Get unread count for specific conversation
async function getConversationUnreadCount(conversationId: string, userEmail: string) {
  const response = await client.models.Message.list({
    filter: {
      conversationId: { eq: conversationId },
      recipientEmail: { eq: userEmail },
      read: { eq: false as any }
    } as any
  });

  return response.data?.length || 0;
}

// Validate if users can message each other
async function validateMessagePermission(email1: string, email2: string) {
  try {
    // Check if there's any booking between these users
    const [bookings1, bookings2] = await Promise.all([
      client.models.Booking.list({
        filter: {
          customerEmail: { eq: email1 },
          providerEmail: { eq: email2 }
        }
      }),
      client.models.Booking.list({
        filter: {
          customerEmail: { eq: email2 },
          providerEmail: { eq: email1 }
        }
      })
    ]);

    const hasBookingHistory = 
      (bookings1.data?.length || 0) > 0 || 
      (bookings2.data?.length || 0) > 0;

    if (hasBookingHistory) {
      return { allowed: true };
    }

    // Check if there's an existing conversation (allows continued messaging)
    const conversationId = generateConversationId(email1, email2);
    const existingMessages = await client.models.Message.list({
      filter: { conversationId: { eq: conversationId } }
    });

    if (existingMessages.data && existingMessages.data.length > 0) {
      return { allowed: true };
    }

    return { 
      allowed: false, 
      reason: 'No booking history found between users' 
    };

  } catch (error) {
    console.error('Error validating message permission:', error);
    return { 
      allowed: false, 
      reason: 'Error checking message permissions' 
    };
  }
}

// Search messages for a user
async function searchMessages(userEmail: string, query: string, conversationId?: string) {
  if (!query || query.trim().length < 2) {
    throw new Error('Search query must be at least 2 characters');
  }

  let filter: any = {
    or: [
      { senderEmail: { eq: userEmail } },
      { recipientEmail: { eq: userEmail } }
    ],
    content: { contains: query.trim() }
  };

  if (conversationId) {
    filter.conversationId = { eq: conversationId };
  }

  const response = await client.models.Message.list({ filter });

  const messages = response.data || [];
  
  // Sort by relevance (exact matches first, then by date)
  messages.sort((a, b) => {
    const aExact = a.content?.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
    const bExact = b.content?.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
    
    if (aExact !== bExact) {
      return bExact - aExact;
    }
    
    return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      messages: messages.slice(0, 50), // Limit results
      query,
      count: messages.length
    })
  };
}

// Trigger notification for new message (placeholder)
async function triggerMessageNotification(message: any) {
  // This would normally trigger:
  // 1. Push notification
  // 2. Email notification
  // 3. In-app notification badge update
  // 4. WebSocket real-time update
  
  console.log('Triggering notification for message:', message.id);
  
  // For now, just log the notification
  // In production, this would publish to SNS/SQS for async processing
  return Promise.resolve();
}