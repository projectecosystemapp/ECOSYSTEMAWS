'use client';

import { Download, Image, FileText, AlertCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Message, formatMessageTime, formatFullMessageTime } from '@/lib/types';

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
                  message.messageType === 'SYSTEM'
                    ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                    : isOwnMessage
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {/* Message content */}
                <p className="text-sm whitespace-pre-wrap break-words">
                  {message.content}
                </p>
                
                {/* Attachments */}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {message.attachments.map((attachment, attachmentIndex) => (
                      <AttachmentPreview
                        key={attachmentIndex}
                        url={attachment}
                        isOwnMessage={isOwnMessage}
                      />
                    ))}
                  </div>
                )}
                
                {/* System message styling */}
                {message.messageType === 'SYSTEM' && (
                  <div className="flex items-center gap-1 text-xs opacity-75">
                    <AlertCircle className="h-3 w-3" />
                    <span>System message</span>
                  </div>
                )}
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

// Attachment preview component
interface AttachmentPreviewProps {
  url: string;
  isOwnMessage: boolean;
}

function AttachmentPreview({ url, isOwnMessage }: AttachmentPreviewProps) {
  const fileName = url.split('/').pop() || 'file';
  const isPlaceholder = url.startsWith('placeholder://');
  const actualFileName = isPlaceholder ? url.replace('placeholder://', '') : fileName;
  
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(actualFileName);
  
  if (isImage && !isPlaceholder) {
    return (
      <div className="max-w-[200px]">
        <img 
          src={url} 
          alt="Attachment" 
          className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90"
          onClick={() => window.open(url, '_blank')}
        />
        <div className="text-xs mt-1 opacity-70">{actualFileName}</div>
      </div>
    );
  }
  
  return (
    <div className={`flex items-center gap-2 p-2 rounded border ${
      isOwnMessage 
        ? 'bg-white/10 border-white/20 text-white' 
        : 'bg-white border-gray-200'
    }`}>
      {isImage ? (
        <Image className="h-4 w-4 flex-shrink-0" />
      ) : (
        <FileText className="h-4 w-4 flex-shrink-0" />
      )}
      
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium truncate">
          {actualFileName}
        </div>
        {isPlaceholder && (
          <div className="text-xs opacity-60">
            File upload pending
          </div>
        )}
      </div>
      
      {!isPlaceholder && (
        <Button
          variant="ghost"
          size="sm"
          className={`h-6 w-6 p-0 ${
            isOwnMessage 
              ? 'text-white hover:bg-white/10' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
          onClick={() => window.open(url, '_blank')}
        >
          <Download className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}