'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { generateConversationId } from '@/lib/api';

interface MessageProviderButtonProps {
  providerEmail: string;
  providerName?: string;
  currentUserEmail?: string;
  serviceId?: string;
  bookingId?: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'secondary';
  className?: string;
}

export default function MessageProviderButton({
  providerEmail,
  providerName,
  currentUserEmail,
  serviceId,
  bookingId,
  size = 'default',
  variant = 'outline',
  className
}: MessageProviderButtonProps) {
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  const handleMessageProvider = async () => {
    if (!currentUserEmail) {
      // Redirect to login if not authenticated
      router.push('/auth/login');
      return;
    }

    if (currentUserEmail === providerEmail) {
      // Can't message yourself
      return;
    }

    setIsCreating(true);

    try {
      // Create conversation thread if it doesn't exist
      const response = await fetch('/api/messaging', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_CONVERSATION_THREAD',
          data: {
            participantEmails: [currentUserEmail, providerEmail],
            bookingId,
            serviceId
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        const conversationId = result.conversationId || generateConversationId(currentUserEmail, providerEmail);
        
        // Navigate to messages page with conversation selected
        router.push(`/messages?conversation=${conversationId}`);
      } else {
        const error = await response.json();
        console.error('Failed to create conversation:', error);
        
        // If it's a permission error, still try to navigate to messages
        if (response.status === 403) {
          alert('You need to have a booking with this provider to send messages.');
        }
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      // Fallback: still navigate to messages page
      const conversationId = generateConversationId(currentUserEmail, providerEmail);
      router.push(`/messages?conversation=${conversationId}`);
    } finally {
      setIsCreating(false);
    }
  };

  const displayName = providerName || providerEmail.split('@')[0];

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleMessageProvider}
      disabled={isCreating || currentUserEmail === providerEmail}
      className={className}
    >
      {isCreating ? (
        <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
      ) : (
        <MessageCircle className="h-4 w-4 mr-2" />
      )}
      Message {size === 'sm' ? '' : displayName}
    </Button>
  );
}