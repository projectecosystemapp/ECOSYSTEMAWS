'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, MoreVertical, Phone, Video } from 'lucide-react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { Message } from '@/lib/types';
import { messageApi, getOtherParticipant } from '@/lib/api';

interface ChatWindowProps {
  conversationId: string;
  currentUserEmail: string;
  otherParticipantEmail: string;
  otherParticipantName?: string;
  bookingId?: string;
  serviceId?: string;
  onBack?: () => void;
  className?: string;
}

export default function ChatWindow({
  conversationId,
  currentUserEmail,
  otherParticipantEmail,
  otherParticipantName,
  bookingId,
  serviceId,
  onBack,
  className
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load conversation messages
  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const conversationMessages = await messageApi.getConversationMessages(conversationId);
      setMessages(conversationMessages as any);
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  // Mark messages as read
  const handleMarkAsRead = useCallback(async () => {
    try {
      await messageApi.markAsRead(conversationId, currentUserEmail);
      // Update local state to reflect read status
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.recipientEmail === currentUserEmail 
            ? { ...msg, read: true }
            : msg
        )
      );
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [conversationId, currentUserEmail]);

  // Send message
  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    setSending(true);
    try {
      const newMessage = await messageApi.sendMessage({
        senderEmail: currentUserEmail,
        recipientEmail: otherParticipantEmail,
        content: content.trim(),
        bookingId,
        serviceId
      });

      if (newMessage) {
        setMessages(prev => [...prev, newMessage as any]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Load messages on mount
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Set up real-time subscription
  useEffect(() => {
    const subscription = messageApi.subscribeToConversation(conversationId, (newMessage) => {
      setMessages(prev => {
        // Check if message already exists to prevent duplicates
        const exists = prev.some(msg => msg.id === newMessage.id);
        if (exists) return prev;
        
        return [...prev, newMessage].sort((a, b) => 
          new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime()
        );
      });
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [conversationId]);

  const displayName = otherParticipantName || otherParticipantEmail.split('@')[0];

  return (
    <Card className={`h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="p-4 border-b bg-white rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                {otherParticipantEmail.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div>
              <h3 className="font-medium text-gray-900">{displayName}</h3>
              <p className="text-xs text-gray-500">{otherParticipantEmail}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Context badges */}
            {bookingId && (
              <Badge variant="outline" className="text-xs">
                Booking
              </Badge>
            )}
            {serviceId && (
              <Badge variant="outline" className="text-xs">
                Service
              </Badge>
            )}
            
            {/* Action buttons */}
            <Button variant="ghost" size="sm">
              <Phone className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Video className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 border-b border-red-200">
          <p className="text-sm text-red-600">{error}</p>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={loadMessages}
            className="text-red-600 p-0 h-auto"
          >
            Try again
          </Button>
        </div>
      )}

      {/* Messages */}
      <MessageList
        messages={messages}
        currentUserEmail={currentUserEmail}
        loading={loading}
        onMarkAsRead={handleMarkAsRead}
      />

      {/* Message Input */}
      <MessageInput
        onSendMessage={handleSendMessage}
        disabled={sending}
        placeholder={`Message ${displayName}...`}
      />
    </Card>
  );
}