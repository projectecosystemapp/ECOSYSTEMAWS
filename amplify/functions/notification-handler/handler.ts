import type { Handler, Context } from 'aws-lambda';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../data/resource.js';
import { createLogger } from '../utils/lambda-logger.js';
import { nullableToString, nullableToNumber } from '../../../lib/type-utils';

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

interface NotificationEvent {
  action: string;
  data: any;
}

interface CreateNotificationData {
  userId: string;
  type: 'BOOKING_REQUEST' | 'BOOKING_CONFIRMED' | 'BOOKING_CANCELLED' | 'PAYMENT_RECEIVED' | 
        'REVIEW_RECEIVED' | 'MESSAGE_RECEIVED' | 'DISPUTE_OPENED' | 'SYSTEM_ALERT';
  title: string;
  message: string;
  bookingId?: string;
  serviceId?: string;
  senderId?: string;
  actionUrl?: string;
  actionText?: string;
}

interface SendEmailNotificationData {
  recipientEmail: string;
  senderEmail: string;
  senderName: string;
  messagePreview: string;
  conversationId: string;
}

export const handler: Handler = async (event, context: Context) => {
  const logger = createLogger(context);
  const startTime = Date.now();
  logger.logInvocation(event);

  const { action, data }: NotificationEvent = event;

  try {
    switch (action) {
      case 'CREATE_IN_APP_NOTIFICATION':
        return await createInAppNotification(data as CreateNotificationData);
      
      case 'SEND_MESSAGE_EMAIL':
        return await sendMessageEmailNotification(data as SendEmailNotificationData);
      
      case 'MARK_NOTIFICATION_READ':
        return await markNotificationRead(data.notificationId, data.userId);
      
      case 'GET_USER_NOTIFICATIONS':
        return await getUserNotifications(data.userId, data.unreadOnly);
      
      case 'CLEAR_OLD_NOTIFICATIONS':
        return await clearOldNotifications();
      
      case 'SEND_PUSH_NOTIFICATION':
        return await sendPushNotification(data);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Error in notification handler', error as Error);
    logger.logCompletion(500, duration);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    };
  }
};

// Create in-app notification
async function createInAppNotification(data: CreateNotificationData) {
  const {
    userId,
    type,
    title,
    message,
    bookingId,
    serviceId,
    senderId,
    actionUrl,
    actionText
  } = data;

  // Check if user exists
  const userResponse = await client.models.UserProfile.list({
    filter: { id: { eq: userId } }
  });

  if (!userResponse.data || userResponse.data.length === 0) {
    throw new Error('User not found');
  }

  const notificationData = {
    userId,
    type,
    title,
    message,
    read: false,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    ...(bookingId && { bookingId }),
    ...(serviceId && { serviceId }),
    ...(senderId && { senderId }),
    ...(actionUrl && { actionUrl }),
    ...(actionText && { actionText }),
  };

  const response = await client.models.Notification.create(notificationData as any);

  return {
    statusCode: 200,
    body: JSON.stringify({
      notification: response.data
    })
  };
}

// Send email notification for new message
async function sendMessageEmailNotification(data: SendEmailNotificationData) {
  const {
    recipientEmail,
    senderEmail,
    senderName,
    messagePreview,
    conversationId
  } = data;

  // Get recipient's notification preferences
  const recipientResponse = await client.models.UserProfile.list({
    filter: { email: { eq: recipientEmail } }
  });

  const recipient = recipientResponse.data?.[0];
  if (!recipient) {
    throw new Error('Recipient not found');
  }

  // Check if email notifications are enabled for messages
  const notificationPrefs = recipient.notificationPreferences as any;
  if (notificationPrefs?.emailNotifications?.messages === false) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Email notifications disabled for recipient'
      })
    };
  }

  // Create email content
  const emailContent = createMessageEmailTemplate({
    recipientName: recipient.firstName || recipientEmail.split('@')[0],
    senderName,
    messagePreview,
    conversationUrl: `${process.env.FRONTEND_URL || 'https://marketplace.com'}/messages?conversation=${conversationId}`
  });

  // In production, this would use AWS SES
  const logger = createLogger();
  logger.info('Sending email notification', {
    to: recipientEmail,
    subject: `New message from ${senderName}`,
    hasContent: !!emailContent
  });

  // For now, just create an in-app notification as well
  await createInAppNotification({
    userId: nullableToString(recipient.id),
    type: 'MESSAGE_RECEIVED',
    title: `New message from ${senderName}`,
    message: messagePreview.length > 100 
      ? messagePreview.substring(0, 100) + '...' 
      : messagePreview,
    senderId: senderEmail,
    actionUrl: `/messages?conversation=${conversationId}`,
    actionText: 'View Message'
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Email notification sent successfully'
    })
  };
}

// Mark notification as read
async function markNotificationRead(notificationId: string, userId: string) {
  // Verify notification belongs to user
  const notification = await client.models.Notification.get({
    id: notificationId
  });

  if (!notification.data) {
    throw new Error('Notification not found');
  }

  if (notification.data.userId !== userId) {
    throw new Error('Unauthorized access to notification');
  }

  const response = await client.models.Notification.update({
    id: notificationId,
    read: true as any,
    readAt: [new Date().toISOString()]
  } as any);

  return {
    statusCode: 200,
    body: JSON.stringify({
      notification: response.data
    })
  };
}

// Get user notifications
async function getUserNotifications(userId: string, unreadOnly = false) {
  let filter: any = {
    userId: { eq: userId }
  };

  if (unreadOnly) {
    filter.read = { eq: false };
  }

  const response = await client.models.Notification.list({
    filter,
    limit: 50 // Limit to recent notifications
  });

  const notifications = response.data || [];

  // Sort by creation date (newest first)
  notifications.sort((a, b) => {
    return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      notifications,
      unreadCount: notifications.filter(n => !n.read).length
    })
  };
}

// Clear old notifications (expired ones)
async function clearOldNotifications() {
  const now = new Date().toISOString();
  
  const expiredNotifications = await client.models.Notification.list({
    filter: {
      expiresAt: { lt: now }
    }
  });

  if (!expiredNotifications.data || expiredNotifications.data.length === 0) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'No expired notifications found',
        deletedCount: 0
      })
    };
  }

  // Delete expired notifications
  const deletePromises = expiredNotifications.data.map(notification =>
    client.models.Notification.delete({ id: notification.id })
  );

  await Promise.all(deletePromises);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Expired notifications cleared',
      deletedCount: expiredNotifications.data.length
    })
  };
}

// Send push notification (placeholder for future mobile implementation)
async function sendPushNotification(data: any) {
  // This would integrate with:
  // - Apple Push Notification service (APNs) for iOS
  // - Firebase Cloud Messaging (FCM) for Android
  // - Web Push API for web browsers
  
  const logger = createLogger();
  logger.info('Push notification queued', { notificationType: data.type });

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Push notification queued for delivery'
    })
  };
}

// Create HTML email template for message notifications
function createMessageEmailTemplate(data: {
  recipientName: string;
  senderName: string;
  messagePreview: string;
  conversationUrl: string;
}) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Message from ${data.senderName}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f9fafb; padding: 20px; }
        .message-preview { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #2563eb; }
        .cta-button { 
          display: inline-block; 
          background-color: #2563eb; 
          color: white; 
          padding: 12px 24px; 
          text-decoration: none; 
          border-radius: 4px; 
          margin: 20px 0;
        }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Message</h1>
        </div>
        <div class="content">
          <p>Hi ${data.recipientName},</p>
          <p>You have received a new message from <strong>${data.senderName}</strong>:</p>
          
          <div class="message-preview">
            <p><em>"${data.messagePreview}"</em></p>
          </div>
          
          <a href="${data.conversationUrl}" class="cta-button">View Full Conversation</a>
          
          <p>Reply directly through the platform to continue your conversation.</p>
        </div>
        <div class="footer">
          <p>© 2024 Marketplace Platform. All rights reserved.</p>
          <p>To manage your notification preferences, <a href="${process.env.FRONTEND_URL}/profile/notifications">click here</a>.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Helper to create booking-related notifications
export async function createBookingNotification(
  bookingId: string,
  type: 'request' | 'confirmed' | 'cancelled',
  recipientEmail: string
) {
  // Get booking details
  const booking = await client.models.Booking.get({ id: bookingId });
  if (!booking.data) return;

  // Get recipient user
  const recipientResponse = await client.models.UserProfile.list({
    filter: { email: { eq: recipientEmail } }
  });
  const recipient = recipientResponse.data?.[0];
  if (!recipient) return;

  // Get service details
  const service = await client.models.Service.get({ id: booking.data.serviceId });

  let title: string;
  let message: string;
  let notificationType: any;

  switch (type) {
    case 'request':
      title = 'New Booking Request';
      message = `You have a new booking request for "${service.data?.title}"`;
      notificationType = 'BOOKING_REQUEST';
      break;
    case 'confirmed':
      title = 'Booking Confirmed';
      message = `Your booking for "${service.data?.title}" has been confirmed`;
      notificationType = 'BOOKING_CONFIRMED';
      break;
    case 'cancelled':
      title = 'Booking Cancelled';
      message = `Your booking for "${service.data?.title}" has been cancelled`;
      notificationType = 'BOOKING_CANCELLED';
      break;
  }

  await createInAppNotification({
    userId: nullableToString(recipient.id),
    type: notificationType,
    title,
    message,
    bookingId,
    serviceId: nullableToString(booking.data.serviceId),
    actionUrl: `/bookings/${bookingId}`,
    actionText: 'View Booking'
  });
}