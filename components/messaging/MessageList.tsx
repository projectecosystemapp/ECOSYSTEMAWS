'use client';

import { useEffect, useRef } from 'react';
import { Message, formatMessageTime, formatFullMessageTime } from '@/lib/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface MessageListProps {
  messages: Message[];
  currentUserEmail: string;
  loading?: boolean;
  onMarkAsRead?: () => void;
}

export default function MessageList({ 
  messages, 
  currentUserEmail, 
  loading = false,
  onMarkAsRead 
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Mark messages as read when component mounts or messages change
  useEffect(() => {
    if (onMarkAsRead && messages.length > 0) {
      const hasUnreadMessages = messages.some(
        msg => !msg.read && msg.recipientEmail === currentUserEmail
      );
      if (hasUnreadMessages) {
        onMarkAsRead();
      }
    }
  }, [messages, currentUserEmail, onMarkAsRead]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-lg font-medium">No messages yet</p>
          <p className="text-sm mt-1">Start the conversation by sending a message below</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 space-y-4"
    >
      {messages.map((message, index) => {
        const isOwnMessage = message.senderEmail === currentUserEmail;
        const showAvatar = index === 0 || 
          messages[index - 1].senderEmail !== message.senderEmail;
        
        return (
          <div
            key={message.id}
            className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} gap-2`}
          >
            {!isOwnMessage && showAvatar && (
              <Avatar className="h-8 w-8 mt-1">
                <AvatarFallback className="text-xs">
                  {message.senderEmail.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            
            {!isOwnMessage && !showAvatar && (
              <div className="w-8" />
            )}

            <div className={`max-w-[70%] ${isOwnMessage ? 'order-2' : ''}`}>
              <div
                className={`rounded-lg px-3 py-2 ${
                  isOwnMessage
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">
                  {message.content}
                </p>
              </div>
              
              <div className={`flex items-center gap-1 mt-1 text-xs text-gray-500 ${
                isOwnMessage ? 'justify-end' : 'justify-start'
              }`}>
                <span title={formatFullMessageTime(message.createdAt || '')}>
                  {formatMessageTime(message.createdAt || '')}
                </span>
                {isOwnMessage && (
                  <Badge 
                    variant={message.read ? "secondary" : "outline"}
                    className="text-xs py-0 px-1"
                  >
                    {message.read ? 'Read' : 'Sent'}
                  </Badge>
                )}
              </div>
            </div>

            {isOwnMessage && showAvatar && (
              <Avatar className="h-8 w-8 mt-1 order-3">
                <AvatarFallback className="text-xs">
                  {message.senderEmail.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}