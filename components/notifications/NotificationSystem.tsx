'use client';

import { useAuthenticator } from '@aws-amplify/ui-react';
import { 
  Bell, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Calendar,
  User,
  DollarSign
} from 'lucide-react';
import { useState, useEffect } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { refactoredApi } from '@/lib/api/refactored';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  type: 'booking_confirmed' | 'booking_cancelled' | 'booking_completed' | 'payment_received' | 'reminder';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  bookingId?: string;
}

interface NotificationSystemProps {
  className?: string;
}

export default function NotificationSystem({ className }: NotificationSystemProps) {
  const { user } = useAuthenticator((context) => [context.user]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [lastCheck, setLastCheck] = useState(new Date());

  useEffect(() => {
    if (user) {
      loadNotifications();
      
      // Set up periodic check for new notifications every 30 seconds
      const interval = setInterval(() => {
        checkForNewNotifications();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;

    try {
      const email = user.signInDetails?.loginId || '';
      
      // Load recent bookings to generate notifications
      const bookings = await refactoredApi.booking.listByCustomer(email);
      
      // Generate notifications from recent booking activities
      const notificationList: Notification[] = [];
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      bookings?.forEach(booking => {
        const bookingDate = new Date(booking.createdAt || '');
        const scheduledDate = new Date(`${booking.scheduledDate}T${booking.scheduledTime}`);
        
        // Recent booking confirmations
        if (booking.status === 'CONFIRMED' && bookingDate >= twoDaysAgo) {
          notificationList.push({
            id: `booking-confirmed-${booking.id}`,
            type: 'booking_confirmed',
            title: 'Booking Confirmed!',
            message: `Your booking for ${booking.serviceTitle || 'service'} has been confirmed for ${booking.scheduledDate} at ${booking.scheduledTime}`,
            timestamp: bookingDate,
            read: false,
            actionUrl: `/bookings/${booking.id}`,
            bookingId: booking.id
          });
        }

        // Upcoming booking reminders (within 24 hours)
        const timeUntilBooking = scheduledDate.getTime() - now.getTime();
        const hoursUntilBooking = timeUntilBooking / (1000 * 60 * 60);
        
        if (booking.status === 'CONFIRMED' && hoursUntilBooking <= 24 && hoursUntilBooking > 0) {
          notificationList.push({
            id: `reminder-${booking.id}`,
            type: 'reminder',
            title: 'Upcoming Booking Reminder',
            message: `Your booking with ${booking.providerName || booking.providerEmail} is scheduled for ${booking.scheduledTime} tomorrow`,
            timestamp: new Date(now.getTime() - 60 * 60 * 1000), // Show as 1 hour old
            read: false,
            actionUrl: `/bookings/${booking.id}`,
            bookingId: booking.id
          });
        }

        // Completed bookings
        if (booking.status === 'COMPLETED' && booking.completedAt) {
          const completedDate = new Date(booking.completedAt);
          if (completedDate >= twoDaysAgo) {
            notificationList.push({
              id: `booking-completed-${booking.id}`,
              type: 'booking_completed',
              title: 'Service Completed',
              message: `Your booking with ${booking.providerName || booking.providerEmail} has been completed. How was your experience?`,
              timestamp: completedDate,
              read: false,
              actionUrl: `/services/${booking.serviceId}/review?booking=${booking.id}`,
              bookingId: booking.id
            });
          }
        }
      });

      // Sort by timestamp (newest first)
      notificationList.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      setNotifications(notificationList.slice(0, 10)); // Keep latest 10
      
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const checkForNewNotifications = async () => {
    // Simulate real-time updates by checking for new bookings
    const now = new Date();
    const timeSinceLastCheck = now.getTime() - lastCheck.getTime();
    
    // Only check if it's been more than 30 seconds
    if (timeSinceLastCheck > 30000) {
      await loadNotifications();
      setLastCheck(now);
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const removeNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'booking_confirmed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'booking_cancelled':
        return <X className="w-5 h-5 text-red-600" />;
      case 'booking_completed':
        return <CheckCircle className="w-5 h-5 text-blue-600" />;
      case 'payment_received':
        return <DollarSign className="w-5 h-5 text-green-600" />;
      case 'reminder':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!user) return null;

  return (
    <div className={cn("relative", className)}>
      {/* Notification Bell */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 flex items-center justify-center text-xs bg-red-600 text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notifications Dropdown */}
      {showNotifications && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNotifications(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <Bell className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No notifications yet</p>
                <p className="text-xs mt-1">We'll notify you about booking updates</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 hover:bg-gray-50 cursor-pointer transition-colors",
                      !notification.read && "bg-blue-50"
                    )}
                    onClick={() => {
                      markAsRead(notification.id);
                      if (notification.actionUrl) {
                        window.location.href = notification.actionUrl;
                      }
                      setShowNotifications(false);
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <p className="font-medium text-gray-900 text-sm">
                            {notification.title}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeNotification(notification.id);
                            }}
                            className="p-1 h-auto hover:bg-gray-200"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                        
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-gray-500">
                            {getRelativeTime(notification.timestamp)}
                          </p>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-center text-blue-600 hover:text-blue-700"
                onClick={() => {
                  window.location.href = '/customer/bookings';
                  setShowNotifications(false);
                }}
              >
                View all bookings
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}