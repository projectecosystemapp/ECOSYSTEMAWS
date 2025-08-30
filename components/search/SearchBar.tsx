'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, MapPin, X, Clock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { refactoredApi } from '@/lib/api/refactored';

interface SearchBarProps {
  initialQuery?: string;
  onSearch: (query: string) => void;
  placeholder?: string;
  showLocation?: boolean;
  location?: string;
  onLocationChange?: (location: string) => void;
  className?: string;
}

interface SearchSuggestion {
  id: string;
  title: string;
  category: string;
  price: number;
  providerName: string;
}

export default function SearchBar({
  initialQuery = '',
  onSearch,
  placeholder = 'What service are you looking for?',
  showLocation = false,
  location = '',
  onLocationChange,
  className = ''
}: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [locationValue, setLocationValue] = useState(location);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load search history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ecosystem-search-history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSearchHistory(parsed.slice(0, 5)); // Keep only last 5
        setRecentSearches(parsed.slice(0, 3)); // Show only last 3
      } catch (e) {
        console.error('Error parsing search history:', e);
      }
    }
  }, []);

  // Save search history to localStorage
  const saveToHistory = (searchQuery: string) => {
    if (!searchQuery.trim() || searchHistory.includes(searchQuery)) return;
    
    const newHistory = [searchQuery, ...searchHistory.filter(h => h !== searchQuery)].slice(0, 5);
    setSearchHistory(newHistory);
    setRecentSearches(newHistory.slice(0, 3));
    localStorage.setItem('ecosystem-search-history', JSON.stringify(newHistory));
  };

  // Debounced search for suggestions
  const debouncedGetSuggestions = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setSuggestions([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const filter = {
          active: { eq: true },
          or: [
            { title: { contains: searchQuery } },
            { description: { contains: searchQuery } },
            { category: { contains: searchQuery } }
          ]
        };
        
        const results = await refactoredApi.service.list(filter);
        
        // Transform to suggestions format - no 'as any' needed!
        const searchSuggestions: SearchSuggestion[] = (results || [])
          .slice(0, 6)
          .map((service) => ({
            id: service.id!,
            title: service.title!,
            category: service.category!,
            price: service.price!,
            providerName: service.providerName
          }));
          
        setSuggestions(searchSuggestions);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    []
  );

  // Handle input change
  const handleInputChange = (value: string) => {
    setQuery(value);
    setShowSuggestions(true);
    
    if (value.trim()) {
      debouncedGetSuggestions(value);
    } else {
      setSuggestions([]);
      setIsLoading(false);
    }
  };

  // Handle search submission
  const handleSearch = (searchQuery?: string) => {
    const finalQuery = searchQuery || query;
    if (finalQuery.trim()) {
      saveToHistory(finalQuery);
      onSearch(finalQuery);
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  // Handle location change
  const handleLocationChange = (value: string) => {
    setLocationValue(value);
    onLocationChange?.(value);
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.title);
    handleSearch(suggestion.title);
  };

  // Handle recent search click
  const handleRecentSearchClick = (search: string) => {
    setQuery(search);
    handleSearch(search);
  };

  // Clear search history
  const clearSearchHistory = () => {
    setSearchHistory([]);
    setRecentSearches([]);
    localStorage.removeItem('ecosystem-search-history');
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Popular categories for empty search
  const popularCategories = [
    'Home Services',
    'Fitness', 
    'Photography',
    'Business',
    'Events'
  ];

  const shouldShowDropdown = showSuggestions && (
    query.length >= 2 || 
    (query.length === 0 && (recentSearches.length > 0 || popularCategories.length > 0))
  );

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <div className="flex flex-col md:flex-row gap-3">
        {/* Search Input */}
        <div className="flex-1 relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
            <input
              ref={inputRef}
              type="text"
              placeholder={placeholder}
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearch();
                }
                if (e.key === 'Escape') {
                  setShowSuggestions(false);
                  inputRef.current?.blur();
                }
              }}
              className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-gray-900 placeholder-gray-500"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  setSuggestions([]);
                  inputRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Location Input */}
        {showLocation && (
          <div className="flex-1 relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
            <input
              type="text"
              placeholder="Location"
              value={locationValue}
              onChange={(e) => handleLocationChange(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-gray-900 placeholder-gray-500"
            />
          </div>
        )}

        {/* Search Button */}
        <Button 
          onClick={() => handleSearch()}
          className="px-8 py-3 whitespace-nowrap"
          size="lg"
        >
          Search
        </Button>
      </div>

      {/* Suggestions Dropdown */}
      {shouldShowDropdown && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 shadow-lg border">
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              {/* Loading State */}
              {isLoading && (
                <div className="p-4 text-center text-gray-500">
                  <div className="animate-pulse">Searching...</div>
                </div>
              )}

              {/* Recent Searches */}
              {!isLoading && query.length === 0 && recentSearches.length > 0 && (
                <div className="border-b">
                  <div className="px-4 py-2 bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Clock className="w-4 h-4" />
                      Recent Searches
                    </div>
                    <button
                      onClick={clearSearchHistory}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Clear
                    </button>
                  </div>
                  {recentSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => handleRecentSearchClick(search)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100 last:border-b-0"
                    >
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-900">{search}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Popular Categories */}
              {!isLoading && query.length === 0 && (
                <div className="border-b">
                  <div className="px-4 py-2 bg-gray-50">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <TrendingUp className="w-4 h-4" />
                      Popular Categories
                    </div>
                  </div>
                  {popularCategories.map((category, index) => (
                    <button
                      key={index}
                      onClick={() => handleRecentSearchClick(category)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100 last:border-b-0"
                    >
                      <TrendingUp className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-900">{category}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Search Suggestions */}
              {!isLoading && suggestions.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-gray-50">
                    <div className="text-sm font-medium text-gray-700">Services</div>
                  </div>
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {suggestion.title}
                          </div>
                          <div className="text-sm text-gray-600 flex items-center gap-2">
                            <span>{suggestion.providerName}</span>
                            <span>•</span>
                            <Badge variant="secondary" className="text-xs">
                              {suggestion.category}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-sm font-medium text-gray-900 ml-4">
                          ${suggestion.price}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* No Results */}
              {!isLoading && query.length >= 2 && suggestions.length === 0 && (
                <div className="p-4 text-center text-gray-500">
                  <div className="text-4xl mb-2">🔍</div>
                  <div className="font-medium">No services found</div>
                  <div className="text-sm">Try a different search term</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Utility function for debouncing
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}