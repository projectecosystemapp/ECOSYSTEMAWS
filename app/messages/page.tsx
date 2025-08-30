'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from 'aws-amplify/auth';
import ConversationList from '@/components/messaging/ConversationList';
import ChatWindow from '@/components/messaging/ChatWindow';
import { Card } from '@/components/ui/card';
import { messageApi, getOtherParticipant } from '@/lib/api';
import { Conversation, Message } from '@/lib/types';
import { MessageCircle } from 'lucide-react';

export default function MessagesPage() {
  const router = useRouter();
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [conversationsLoading, setConversationsLoading] = useState(true);

  // Get current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await getCurrentUser();
        setCurrentUserEmail(user.signInDetails?.loginId || '');
      } catch (error) {
        console.error('Error getting current user:', error);
        router.push('/auth/login');
      }
    };

    fetchUser();
  }, [router]);

  // Load conversations
  useEffect(() => {
    const loadConversations = async () => {
      if (!currentUserEmail) return;

      try {
        setConversationsLoading(true);
        const userConversations = await messageApi.getUserConversations(currentUserEmail);
        
        // Transform into Conversation objects with unread counts
        const conversationData: Conversation[] = await Promise.all(
          userConversations.map(async (lastMessage: Message) => {
            const otherParticipant = getOtherParticipant(lastMessage.conversationId, currentUserEmail);
            
            // Get unread count for this conversation
            const allMessages = await messageApi.getConversationMessages(lastMessage.conversationId);
            const unreadCount = allMessages.filter(
              msg => !msg.read && msg.recipientEmail === currentUserEmail
            ).length;

            return {
              id: lastMessage.conversationId,
              conversationId: lastMessage.conversationId,
              participants: [currentUserEmail, otherParticipant],
              lastMessage,
              unreadCount,
              otherParticipant,
              otherParticipantName: otherParticipant.split('@')[0]
            };
          })
        );

        setConversations(conversationData);
      } catch (error) {
        console.error('Error loading conversations:', error);
      } finally {
        setConversationsLoading(false);
        setLoading(false);
      }
    };

    loadConversations();
  }, [currentUserEmail]);

  // Subscribe to unread count changes
  useEffect(() => {
    if (!currentUserEmail) return;

    const subscription = messageApi.subscribeToUnreadCount(currentUserEmail, () => {
      // Reload conversations when unread count changes
      const loadConversations = async () => {
        try {
          const userConversations = await messageApi.getUserConversations(currentUserEmail);
          
          const conversationData: Conversation[] = await Promise.all(
            userConversations.map(async (lastMessage: Message) => {
              const otherParticipant = getOtherParticipant(lastMessage.conversationId, currentUserEmail);
              
              const allMessages = await messageApi.getConversationMessages(lastMessage.conversationId);
              const unreadCount = allMessages.filter(
                msg => !msg.read && msg.recipientEmail === currentUserEmail
              ).length;

              return {
                id: lastMessage.conversationId,
                conversationId: lastMessage.conversationId,
                participants: [currentUserEmail, otherParticipant],
                lastMessage,
                unreadCount,
                otherParticipant,
                otherParticipantName: otherParticipant.split('@')[0]
              };
            })
          );

          setConversations(conversationData);
        } catch (error) {
          console.error('Error reloading conversations:', error);
        }
      };

      loadConversations();
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [currentUserEmail]);

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
  };

  const handleBackToList = () => {
    setSelectedConversationId('');
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

  const selectedConversation = conversations.find(
    conv => conv.conversationId === selectedConversationId
  );

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <p className="text-gray-600 mt-1">
          Communicate with your customers and providers
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)]">
        {/* Conversation List - Hidden on mobile when conversation is selected */}
        <div className={`lg:col-span-4 ${selectedConversationId ? 'hidden lg:block' : ''}`}>
          <ConversationList
            conversations={conversations}
            currentUserEmail={currentUserEmail}
            selectedConversationId={selectedConversationId}
            onSelectConversation={handleSelectConversation}
            loading={conversationsLoading}
          />
        </div>

        {/* Chat Window */}
        <div className={`lg:col-span-8 ${!selectedConversationId ? 'hidden lg:block' : ''}`}>
          {selectedConversation ? (
            <ChatWindow
              conversationId={selectedConversation.conversationId}
              currentUserEmail={currentUserEmail}
              otherParticipantEmail={selectedConversation.otherParticipant}
              otherParticipantName={selectedConversation.otherParticipantName}
              bookingId={selectedConversation.lastMessage?.bookingId}
              serviceId={selectedConversation.lastMessage?.serviceId}
              onBack={handleBackToList}
            />
          ) : (
            <Card className="h-full flex items-center justify-center">
              <div className="text-center text-gray-500">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select a conversation
                </h3>
                <p className="text-sm">
                  Choose a conversation from the list to start messaging
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}