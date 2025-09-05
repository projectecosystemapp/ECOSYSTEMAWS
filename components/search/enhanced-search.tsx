'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Filter, MapPin, Star, DollarSign, Clock } from 'lucide-react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const client = generateClient<Schema>();

interface SearchResult {
  id: string;
  type: string;
  score: number;
  source: any;
  highlights?: any;
}

interface SearchFilters {
  category?: string;
  priceRange?: { min: number; max: number };
  rating?: number;
}

export function EnhancedSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [sortBy, setSortBy] = useState('relevance');
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [total, setTotal] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (query.length > 2) {
      loadSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [query]);

  const loadSuggestions = async () => {
    try {
      const { data } = await client.queries.getSearchSuggestions({
        query,
        type: 'all',
      });
      
      const result = data as any;
      setSuggestions(result.suggestions?.map((s: any) => s.text) || []);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  };

  const performSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setShowSuggestions(false);

    try {
      const { data, errors } = await client.queries.searchAll({
        query: query.trim(),
        filters,
        sortBy,
        limit: 20,
        offset: 0,
      });

      if (errors) {
        throw new Error(errors[0].message);
      }

      const result = data as any;
      setResults(result.results || []);
      setTotal(result.total || 0);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    setTimeout(performSearch, 100);
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'services': return '🔧';
      case 'service-requests': return '🔍';
      case 'providers': return '👤';
      default: return '📄';
    }
  };

  const highlightText = (text: string, highlights?: any) => {
    if (!highlights) return text;
    // Simple highlight implementation
    return text;
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchRef}
                  placeholder="Search services, requests, or providers..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && performSearch()}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="pl-10"
                />
                
                {/* Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border rounded-md shadow-lg z-10 mt-1">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        <Search className="inline h-3 w-3 mr-2 text-muted-foreground" />
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <Button onClick={performSearch} disabled={loading}>
                {loading ? <Clock className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mt-4">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="price_low">Price: Low to High</SelectItem>
                  <SelectItem value="price_high">Price: High to Low</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
                  <SelectItem value="distance">Distance</SelectItem>
                </SelectContent>
              </Select>

              <Select 
                value={filters.category || ''} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, category: value || undefined }))}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  <SelectItem value="Home Services">Home Services</SelectItem>
                  <SelectItem value="Professional Services">Professional Services</SelectItem>
                  <SelectItem value="Health & Wellness">Health & Wellness</SelectItem>
                  <SelectItem value="Technology">Technology</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {total > 0 && (
        <div className="text-sm text-muted-foreground">
          Found {total.toLocaleString()} results for "{query}"
        </div>
      )}

      <div className="space-y-4">
        {results.map((result) => (
          <Card key={result.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getResultIcon(result.type)}</span>
                  <div>
                    <CardTitle className="text-lg">
                      {highlightText(result.source.title, result.highlights?.title)}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{result.type.replace('-', ' ')}</Badge>
                      <Badge variant="secondary">{result.source.category}</Badge>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {result.source.price && (
                    <div className="flex items-center gap-1 text-green-600 font-semibold">
                      <DollarSign className="h-4 w-4" />
                      {result.source.price}
                    </div>
                  )}
                  {result.source.rating && (
                    <div className="flex items-center gap-1 text-yellow-600">
                      <Star className="h-4 w-4 fill-current" />
                      {result.source.rating}
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-3">
                {highlightText(result.source.description, result.highlights?.description)}
              </p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {result.source.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {result.source.location}
                    </div>
                  )}
                  <div>Score: {result.score.toFixed(2)}</div>
                </div>
                
                <Button size="sm">
                  {result.type === 'services' ? 'Book Now' : 
                   result.type === 'service-requests' ? 'Send Offer' : 'View Profile'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {results.length === 0 && query && !loading && (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">
              No results found for "{query}". Try different keywords or check your spelling.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}