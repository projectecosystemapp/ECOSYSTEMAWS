'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, X, MessageCircle } from 'lucide-react';
import { formatMessageTime, generateConversationId } from '@/lib/api';

interface SearchResult {
  id: string;
  content: string;
  senderEmail: string;
  recipientEmail: string;
  conversationId: string;
  createdAt: string;
  bookingId?: string;
  serviceId?: string;
}

interface MessageSearchProps {
  currentUserEmail: string;
  onSelectResult?: (conversationId: string) => void;
  className?: string;
}

export default function MessageSearch({ 
  currentUserEmail, 
  onSelectResult,
  className 
}: MessageSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Search messages
  const searchMessages = async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/messaging', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SEARCH_MESSAGES',
          data: { query: searchQuery.trim() },
          userEmail: currentUserEmail
        })
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data.messages || []);
      } else {
        console.error('Search failed');
        setResults([]);
      }
    } catch (error) {
      console.error('Error searching messages:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        searchMessages(query);
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, currentUserEmail]);

  // Handle result selection
  const handleResultClick = (result: SearchResult) => {
    if (onSelectResult) {
      onSelectResult(result.conversationId);
    }
    setIsOpen(false);
    setQuery('');
    setResults([]);
  };

  // Clear search
  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  // Get other participant email
  const getOtherParticipant = (result: SearchResult) => {
    return result.senderEmail === currentUserEmail 
      ? result.recipientEmail 
      : result.senderEmail;
  };

  // Highlight search terms in text
  const highlightText = (text: string, searchTerm: string) => {
    if (!searchTerm.trim()) return text;
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return (
      <>
        {parts.map((part, index) => 
          part.toLowerCase() === searchTerm.toLowerCase() ? (
            <mark key={index} className="bg-yellow-200 px-1 rounded">
              {part}
            </mark>
          ) : part
        )}
      </>
    );
  };

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search messages..."
          className="pl-10 pr-10"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Search Results */}
      {isOpen && (query.trim().length >= 2) && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center">
              <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
              <div className="text-sm text-gray-600 mt-2">Searching messages...</div>
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <div className="text-sm">No messages found for "{query}"</div>
            </div>
          ) : (
            <div className="py-2">
              <div className="px-3 py-2 text-xs text-gray-500 font-medium border-b">
                Found {results.length} message{results.length !== 1 ? 's' : ''}
              </div>
              
              {results.map((result) => {
                const otherParticipant = getOtherParticipant(result);
                const displayName = otherParticipant.split('@')[0];
                
                return (
                  <div
                    key={result.id}
                    onClick={() => handleResultClick(result)}
                    className="px-3 py-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-medium text-sm text-gray-900">
                        {displayName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatMessageTime(result.createdAt)}
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-600 line-clamp-2 mb-2">
                      {highlightText(result.content, query)}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {result.senderEmail === currentUserEmail ? (
                        <Badge variant="outline" className="text-xs">
                          You sent
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Received
                        </Badge>
                      )}
                      
                      {result.bookingId && (
                        <Badge variant="outline" className="text-xs">
                          Booking
                        </Badge>
                      )}
                      
                      {result.serviceId && (
                        <Badge variant="outline" className="text-xs">
                          Service
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}