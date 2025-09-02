'use client';

import { MessageCircle, Send, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { messageApi } from '@/lib/api';

interface QuickMessageProps {
  isOpen: boolean;
  onClose: () => void;
  senderEmail: string;
  recipientEmail: string;
  recipientName?: string;
  context?: {
    bookingId?: string;
    serviceId?: string;
    serviceName?: string;
  };
}

export default function QuickMessage({
  isOpen,
  onClose,
  senderEmail,
  recipientEmail,
  recipientName,
  context
}: QuickMessageProps) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!message.trim()) return;

    setSending(true);
    setError(null);

    try {
      await messageApi.sendMessage({
        senderEmail,
        recipientEmail,
        content: message.trim(),
        bookingId: context?.bookingId,
        serviceId: context?.serviceId
      });

      // Show success notification
      console.log('✅ Message sent successfully', {
        recipient: recipientEmail,
        context: context?.serviceName || context?.bookingId
      });

      // Close modal and optionally redirect to full chat
      onClose();
      setMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleOpenFullChat = () => {
    const conversationId = [senderEmail, recipientEmail].sort().join('_');
    router.push(`/messages/${conversationId}`);
    onClose();
  };

  if (!isOpen) return null;

  const displayName = recipientName || recipientEmail.split('@')[0];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold">Send Message</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Send a message to <span className="font-medium">{displayName}</span>
            </p>
            {context?.serviceName && (
              <p className="text-xs text-blue-600 mt-1">
                About: {context.serviceName}
              </p>
            )}
            {context?.bookingId && (
              <p className="text-xs text-green-600 mt-1">
                Related to your booking
              </p>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <Textarea
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[100px] mb-4"
            disabled={sending}
          />

          <div className="flex gap-2 justify-between">
            <Button
              variant="outline"
              onClick={handleOpenFullChat}
              className="text-blue-600 border-blue-600"
            >
              Open Full Chat
            </Button>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={sending}>
                Cancel
              </Button>
              <Button onClick={handleSend} disabled={!message.trim() || sending}>
                {sending ? (
                  <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}