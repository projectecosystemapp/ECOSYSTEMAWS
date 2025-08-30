'use client';

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, MessageCircle } from 'lucide-react';
import { 
  Message, 
  Conversation, 
  formatMessageTime, 
  truncateMessage 
} from '@/lib/types';
import { getOtherParticipant } from '@/lib/api';

interface ConversationListProps {
  conversations: Conversation[];
  currentUserEmail: string;
  selectedConversationId?: string;
  onSelectConversation: (conversationId: string) => void;
  loading?: boolean;
}

export default function ConversationList({
  conversations,
  currentUserEmail,
  selectedConversationId,
  onSelectConversation,
  loading = false
}: ConversationListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredConversations(conversations);
    } else {
      const filtered = conversations.filter(conversation => {
        const otherParticipant = getOtherParticipant(conversation.conversationId, currentUserEmail);
        const lastMessageContent = conversation.lastMessage?.content || '';
        
        return (
          otherParticipant.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lastMessageContent.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
      setFilteredConversations(filtered);
    }
  }, [conversations, searchTerm, currentUserEmail]);

  if (loading) {
    return (
      <Card className="h-full">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Messages</h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold mb-3">Messages</h2>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-gray-500">
            <MessageCircle className="h-12 w-12 mb-3 text-gray-300" />
            <p className="text-center">
              {searchTerm.trim() ? 'No conversations found' : 'No messages yet'}
            </p>
            <p className="text-sm text-center mt-1">
              {!searchTerm.trim() && 'Messages will appear here when you start chatting with providers or customers'}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredConversations.map((conversation) => {
              const otherParticipant = getOtherParticipant(conversation.conversationId, currentUserEmail);
              const isSelected = selectedConversationId === conversation.conversationId;
              const hasUnread = conversation.unreadCount > 0;

              return (
                <div
                  key={conversation.conversationId}
                  onClick={() => onSelectConversation(conversation.conversationId)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    isSelected ? 'bg-blue-50 border-r-2 border-blue-600' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {otherParticipant.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className={`font-medium truncate ${
                          hasUnread ? 'text-gray-900' : 'text-gray-700'
                        }`}>
                          {conversation.otherParticipantName || otherParticipant}
                        </h3>
                        <div className="flex items-center gap-1">
                          {hasUnread && (
                            <Badge variant="default" className="h-5 w-5 text-xs p-0 flex items-center justify-center">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                          <span className="text-xs text-gray-400">
                            {formatMessageTime(conversation.lastMessage?.createdAt || '')}
                          </span>
                        </div>
                      </div>
                      
                      <p className={`text-sm truncate ${
                        hasUnread ? 'text-gray-900 font-medium' : 'text-gray-500'
                      }`}>
                        {conversation.lastMessage?.senderEmail === currentUserEmail && 'You: '}
                        {truncateMessage(conversation.lastMessage?.content || '', 60)}
                      </p>

                      {/* Context badges */}
                      <div className="flex gap-1 mt-2">
                        {conversation.lastMessage?.bookingId && (
                          <Badge variant="outline" className="text-xs">
                            Booking
                          </Badge>
                        )}
                        {conversation.lastMessage?.serviceId && (
                          <Badge variant="outline" className="text-xs">
                            Service
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}