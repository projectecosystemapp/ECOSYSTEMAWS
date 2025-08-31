import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from 'aws-amplify/auth/server';
import { cookies } from 'next/headers';
import { runWithAmplifyServerContext } from '@/lib/amplify-server-utils';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';

export async function GET(request: NextRequest) {
  try {
    return await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: async (contextSpec) => {
        const user = await getCurrentUser(contextSpec);
        if (!user) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const url = new URL(request.url);
        const unreadOnly = url.searchParams.get('unreadOnly') === 'true';
        const userId = url.searchParams.get('userId') || user.userId;

        let filter: any = { userId: { eq: userId } };
        if (unreadOnly) filter.read = { eq: false };

        const client = generateClient<Schema>();
        const response = await client.models.Notification.list({ filter, limit: 50 });
        const notifications = response.data || [];
        notifications.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());

        return NextResponse.json({
          notifications,
          unreadCount: notifications.filter((n) => !n.read).length,
        });
      },
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

    return await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: async (contextSpec) => {
        const user = await getCurrentUser(contextSpec);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const client = generateClient<Schema>();
        switch (action) {
          case 'MARK_READ': {
            const { notificationId } = data;
            const notification = await client.models.Notification.get({ id: notificationId });
            if (!notification.data) return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
            if (notification.data.userId !== user.userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            const updatedNotification = await client.models.Notification.update({
              id: notificationId,
              read: true,
              readAt: new Date().toISOString(),
            });
            return NextResponse.json({ notification: updatedNotification.data });
          }
          case 'MARK_ALL_READ': {
            const userId = user.userId;
            const unreadResponse = await client.models.Notification.list({
              filter: { userId: { eq: userId }, read: { eq: false } },
            });
            const unreadNotifications = unreadResponse.data || [];
            await Promise.all(
              unreadNotifications.map((notification) =>
                client.models.Notification.update({
                  id: notification.id,
                  read: true,
                  readAt: new Date().toISOString(),
                })
              )
            );
            return NextResponse.json({ markedCount: unreadNotifications.length });
          }
          case 'CREATE': {
            const { userId, type, title, message, bookingId, serviceId, senderId, actionUrl, actionText } = data;
            const notificationData = {
              userId,
              type,
              title,
              message,
              read: false,
              createdAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
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
      },
    });
  } catch (error) {
    console.error('Notifications POST API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
