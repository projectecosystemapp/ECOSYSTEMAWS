'use client';

import { useState, useEffect } from 'react';
import { Target, Clock, DollarSign, MapPin, MessageSquare } from 'lucide-react';
import { generateClient } from 'aws-amplify/data';
import { getCurrentUser } from 'aws-amplify/auth';
import type { Schema } from '@/amplify/data/resource';
import { RealtimeChat } from '@/components/messaging/realtime-chat';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const client = generateClient<Schema>();

interface Match {
  id: string;
  title: string;
  description: string;
  category: string;
  budget?: number;
  desiredDate?: string;
  location?: string;
  similarity: number;
  customerEmail: string;
  createdAt: string;
}

interface ProviderMatchesProps {
  providerId: string;
}

interface ChatState {
  isOpen: boolean;
  conversationId: string;
  recipientId: string;
  requestId: string;
  title: string;
}

export function ProviderMatches({ providerId }: ProviderMatchesProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chat, setChat] = useState<ChatState | null>(null);

  useEffect(() => {
    loadMatches();
  }, [providerId]);

  const loadMatches = async () => {
    try {
      setLoading(true);
      const { data, errors } = await client.queries.findMatchingRequests({
        providerId,
        maxResults: 20,
      });

      if (errors) {
        throw new Error(errors[0].message);
      }

      const result = data as any;
      setMatches(result.matches || []);
    } catch (err) {
      console.error('Error loading matches:', err);
      setError(err instanceof Error ? err.message : 'Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.8) return 'bg-green-500';
    if (similarity >= 0.6) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getSimilarityLabel = (similarity: number) => {
    if (similarity >= 0.8) return 'Excellent Match';
    if (similarity >= 0.6) return 'Good Match';
    return 'Potential Match';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Loading Matches...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Error Loading Matches</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const openChat = (match: Match) => {
    const conversationId = `req_${match.id}_${providerId}`;
    setChat({
      isOpen: true,
      conversationId,
      recipientId: match.customerId || 'customer',
      requestId: nullableToString(match.id),
      title: `Offer for: ${match.title}`,
    });
  };

  const closeChat = () => {
    setChat(null);
  };

  if (chat) {
    return (
      <div className="space-y-4">
        <Button onClick={closeChat} variant="outline">
          ← Back to Matches
        </Button>
        <RealtimeChat
          conversationId={chat.conversationId}
          recipientId={chat.recipientId}
          requestId={chat.requestId}
          title={chat.title}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-green-500" />
            Service Requests Matching Your Skills
          </CardTitle>
          <CardDescription>
            AI-powered matches based on your services and expertise
          </CardDescription>
        </CardHeader>
      </Card>

      {matches.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">
              No matching requests found. Check back later or update your services to improve matches.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {matches.map((match) => (
            <Card key={match.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{match.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {match.description}
                    </CardDescription>
                  </div>
                  <Badge 
                    className={`${getSimilarityColor(match.similarity)} text-white`}
                  >
                    {getSimilarityLabel(match.similarity)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="outline">{match.category}</Badge>
                  </div>
                  
                  {match.budget && (
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span>${match.budget}</span>
                    </div>
                  )}
                  
                  {match.desiredDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span>{new Date(match.desiredDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  
                  {match.location && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-red-600" />
                      <span>{match.location}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Posted {new Date(match.createdAt).toLocaleDateString()}
                  </div>
                  
                  <Button 
                    size="sm" 
                    className="flex items-center gap-2"
                    onClick={() => openChat(match)}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Send Offer
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}