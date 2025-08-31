import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from 'aws-amplify/auth/server';
import { cookies } from 'next/headers';
import { runWithAmplifyServerContext } from '@/lib/amplify-server-utils';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';

const client = generateClient<Schema>();

export async function GET(request: NextRequest) {
  try {
    // Get current user for authentication
    const user = await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: (contextSpec) => getCurrentUser(contextSpec)
    });

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true';
    const userId = url.searchParams.get('userId') || user.userId;

    // Get user notifications
    let filter: any = {
      userId: { eq: userId }
    };

    if (unreadOnly) {
      filter.read = { eq: false };
    }

    const response = await client.models.Notification.list({
      filter,
      limit: 50
    });

    const notifications = response.data || [];

    // Sort by creation date (newest first)
    notifications.sort((a, b) => {
      return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
    });

    return NextResponse.json({
      notifications,
      unreadCount: notifications.filter(n => !n.read).length
    });

  } catch (error) {
    console.error('Notifications API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    // Get current user for authentication
    const user = await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: (contextSpec) => getCurrentUser(contextSpec)
    });

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    switch (action) {
      case 'MARK_READ': {
        const { notificationId } = data;
        
        // Verify notification belongs to user
        const notification = await client.models.Notification.get({
          id: notificationId
        });

        if (!notification.data) {
          return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
        }

        if (notification.data.userId !== user.userId) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const updatedNotification = await client.models.Notification.update({
          id: notificationId,
          read: true,
          readAt: new Date().toISOString()
        });

        return NextResponse.json({ notification: updatedNotification.data });
      }

      case 'MARK_ALL_READ': {
        const userId = user.userId;
        
        // Get all unread notifications for user
        const unreadResponse = await client.models.Notification.list({
          filter: {
            userId: { eq: userId },
            read: { eq: false }
          }
        });

        const unreadNotifications = unreadResponse.data || [];
        
        // Mark all as read
        const updatePromises = unreadNotifications.map(notification =>
          client.models.Notification.update({
            id: notification.id,
            read: true,
            readAt: new Date().toISOString()
          })
        );

        await Promise.all(updatePromises);

        return NextResponse.json({ 
          markedCount: unreadNotifications.length 
        });
      }

      case 'CREATE': {
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

        const notification = await client.models.Notification.create(notificationData);

        return NextResponse.json({ notification: notification.data });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Notifications POST API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}