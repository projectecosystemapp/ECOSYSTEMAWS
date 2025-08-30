'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getCurrentUser } from 'aws-amplify/auth';
import ChatWindow from '@/components/messaging/ChatWindow';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { messageApi, getOtherParticipant } from '@/lib/api';
import { ArrowLeft, MessageCircle } from 'lucide-react';

export default function ConversationPage() {
  const router = useRouter();
  const params = useParams();
  const conversationId = params.conversationId as string;
  
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [otherParticipantEmail, setOtherParticipantEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canMessage, setCanMessage] = useState(false);

  // Get current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await getCurrentUser();
        const userEmail = user.signInDetails?.loginId || '';
        setCurrentUserEmail(userEmail);
        
        // Extract other participant from conversation ID
        const otherEmail = getOtherParticipant(conversationId, userEmail);
        setOtherParticipantEmail(otherEmail);
        
        // Check if user can message this person
        const canMsg = await messageApi.canMessage(userEmail, otherEmail);
        setCanMessage(canMsg);
        
        if (!canMsg) {
          setError('You can only message providers or customers you have bookings with.');
        }
      } catch (error) {
        console.error('Error getting current user:', error);
        router.push('/auth/login');
      } finally {
        setLoading(false);
      }
    };

    if (conversationId) {
      fetchUser();
    }
  }, [conversationId, router]);

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

  if (error || !canMessage) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={handleBack} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Messages
          </Button>
        </div>

        <Card className="p-8 text-center">
          <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Cannot Access Conversation
          </h2>
          <p className="text-gray-600 mb-4">
            {error || 'You can only message providers or customers you have bookings with.'}
          </p>
          <Button onClick={handleBack}>
            Return to Messages
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button variant="ghost" onClick={handleBack} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Messages
        </Button>
      </div>

      <div className="h-[calc(100vh-200px)]">
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
  );
}