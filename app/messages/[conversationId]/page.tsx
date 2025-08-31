'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getCurrentUser } from 'aws-amplify/auth';
import ChatWindow from '@/components/messaging/ChatWindow';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { messageApi, getOtherParticipant } from '@/lib/api';
import { Message } from '@/lib/types';

export default function ConversationPage() {
  const router = useRouter();
  const params = useParams();
  const conversationId = params.conversationId as string;

  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [otherParticipantEmail, setOtherParticipantEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await getCurrentUser();
        const userEmail = user.signInDetails?.loginId || '';
        setCurrentUserEmail(userEmail);

        // Extract other participant from conversation ID
        if (conversationId && userEmail) {
          const otherParticipant = getOtherParticipant(conversationId, userEmail);
          setOtherParticipantEmail(otherParticipant);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error getting current user:', error);
        router.push('/auth/login');
      }
    };

    fetchUser();
  }, [router, conversationId]);

  // Validate conversation access
  useEffect(() => {
    const validateAccess = async () => {
      if (!currentUserEmail || !conversationId) return;

      try {
        // Check if conversation exists by trying to load messages
        const messages = await messageApi.getConversationMessages(conversationId);
        
        if (messages.length === 0) {
          // No messages found, user might not have permission or conversation doesn't exist
          setError('Conversation not found or you don\'t have access to it.');
        }
      } catch (error) {
        console.error('Error validating conversation access:', error);
        setError('Unable to access this conversation.');
      }
    };

    if (currentUserEmail) {
      validateAccess();
    }
  }, [currentUserEmail, conversationId]);

  const handleBack = () => {
    router.push('/messages');
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-4">
          <Button variant="ghost" onClick={handleBack} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Messages
          </Button>
        </div>

        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Conversation Unavailable
            </h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={handleBack}>
              Return to Messages
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!otherParticipantEmail) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Invalid Conversation
            </h2>
            <p className="text-gray-600 mb-4">
              Unable to determine conversation participants.
            </p>
            <Button onClick={handleBack}>
              Return to Messages
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Mobile header */}
      <div className="md:hidden bg-white border-b p-4">
        <Button variant="ghost" onClick={handleBack} size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Messages
        </Button>
      </div>

      {/* Chat window */}
      <div className="flex-1 overflow-hidden">
        <div className="container mx-auto h-full p-6">
          <ChatWindow
            conversationId={conversationId}
            currentUserEmail={currentUserEmail}
            otherParticipantEmail={otherParticipantEmail}
            otherParticipantName={otherParticipantEmail.split('@')[0]}
            onBack={handleBack}
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
}