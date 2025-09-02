'use client';

import { getCurrentUser } from 'aws-amplify/auth';
import { 
  ArrowLeft,
  Heart,
  User,
  Star,
  MapPin,
  DollarSign,
  Search,
  Calendar,
  MessageCircle,
  Clock,
  Filter,
  Grid,
  List,
  BookmarkX
} from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { refactoredApi } from '@/lib/api/refactored';
import type { Service, ServiceWithRating, UserProfile } from '@/lib/types';


interface SavedProvider {
  id: string;
  providerId: string;
  providerName: string;
  providerEmail: string;
  businessName?: string;
  city?: string;
  state?: string;
  averageRating: number;
  reviewCount: number;
  services: ServiceWithRating[];
  savedAt: string;
}

export default function SavedProvidersPage() {
  const [savedProviders, setSavedProviders] = useState<SavedProvider[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<SavedProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'recent' | 'rating' | 'name'>('recent');

  useEffect(() => {
    loadSavedProviders();
  }, []);

  useEffect(() => {
    filterAndSortProviders();
  }, [savedProviders, searchQuery, sortBy]);

  const loadSavedProviders = async () => {
    try {
      const user = await getCurrentUser();
      const email = user.signInDetails?.loginId;
      
      if (email) {
        // TODO: Implement actual saved providers API
        // For now, we'll create mock data based on available services
        const services = await refactoredApi.service.searchWithRatings('');
        
        // Create mock saved providers from the first few services
        const mockSavedProviders: SavedProvider[] = services?.slice(0, 4).map((service, index) => ({
          id: `saved-${index + 1}`,
          providerId: `provider-${index + 1}`,
          providerName: service.providerName,
          providerEmail: service.providerEmail,
          businessName: `${service.providerName} Services`,
          city: service.serviceCity,
          state: service.serviceState,
          averageRating: service.rating,
          reviewCount: service.reviewCount,
          services: [service], // In reality, this would be all services from this provider
          savedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
        })) || [];

        setSavedProviders(mockSavedProviders);
      }
    } catch (error) {
      console.error('Error loading saved providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortProviders = () => {
    let filtered = [...savedProviders];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(provider =>
        provider.providerName.toLowerCase().includes(query) ||
        provider.businessName?.toLowerCase().includes(query) ||
        provider.city?.toLowerCase().includes(query) ||
        provider.services.some(service => 
          service.title.toLowerCase().includes(query) ||
          service.category.toLowerCase().includes(query)
        )
      );
    }

    // Sort providers
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.averageRating - a.averageRating;
        case 'name':
          return a.providerName.localeCompare(b.providerName);
        case 'recent':
        default:
          return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
      }
    });

    setFilteredProviders(filtered);
  };

  const handleRemoveProvider = async (providerId: string) => {
    if (!window.confirm('Are you sure you want to remove this provider from your saved list?')) {
      return;
    }

    // TODO: Implement actual remove saved provider API
    setSavedProviders(prev => prev.filter(p => p.id !== providerId));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const ProviderCard = ({ provider }: { provider: SavedProvider }) => (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{provider.businessName || provider.providerName}</CardTitle>
            <CardDescription className="mt-1 flex items-center">
              <User className="h-4 w-4 mr-1" />
              {provider.providerName}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleRemoveProvider(provider.id)}
            className="text-red-500 hover:text-red-700"
          >
            <BookmarkX className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Rating and Reviews */}
          {provider.averageRating > 0 && (
            <div className="flex items-center">
              <div className="flex items-center mr-2">
                <Star className="h-4 w-4 text-yellow-400 fill-current mr-1" />
                <span className="font-medium">{provider.averageRating.toFixed(1)}</span>
              </div>
              <span className="text-sm text-gray-500">
                ({provider.reviewCount} reviews)
              </span>
            </div>
          )}

          {/* Location */}
          {(provider.city || provider.state) && (
            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="h-4 w-4 mr-1" />
              {provider.city}{provider.city && provider.state && ', '}{provider.state}
            </div>
          )}

          {/* Services */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Services:</p>
            <div className="flex flex-wrap gap-1">
              {provider.services.slice(0, 3).map((service) => (
                <Badge key={service.id} variant="outline" className="text-xs">
                  {service.category}
                </Badge>
              ))}
              {provider.services.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{provider.services.length - 3} more
                </Badge>
              )}
            </div>
          </div>

          {/* Sample Service */}
          {provider.services[0] && (
            <div className="bg-gray-50 p-3 rounded-md">
              <h4 className="font-medium text-sm">{provider.services[0].title}</h4>
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                {provider.services[0].description}
              </p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm font-semibold">${provider.services[0].price}</span>
                <Link href={`/services/${provider.services[0].id}`}>
                  <Button size="sm" variant="outline">
                    View Service
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-2 pt-2">
            <Button size="sm" className="flex-1">
              <MessageCircle className="h-4 w-4 mr-1" />
              Message
            </Button>
            <Button size="sm" variant="outline" className="flex-1">
              <Calendar className="h-4 w-4 mr-1" />
              Book Now
            </Button>
          </div>

          {/* Saved Date */}
          <p className="text-xs text-gray-500">
            Saved on {formatDate(provider.savedAt)}
          </p>
        </div>
      </CardContent>
    </Card>
  );

  const ProviderListItem = ({ provider }: { provider: SavedProvider }) => (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start space-x-4">
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg">
                  {provider.businessName || provider.providerName}
                </h3>
                <p className="text-sm text-gray-600 flex items-center mt-1">
                  <User className="h-4 w-4 mr-1" />
                  {provider.providerName}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveProvider(provider.id)}
                className="text-red-500 hover:text-red-700"
              >
                <BookmarkX className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
              {provider.averageRating > 0 && (
                <div className="flex items-center">
                  <Star className="h-4 w-4 text-yellow-400 fill-current mr-1" />
                  <span className="font-medium">{provider.averageRating.toFixed(1)}</span>
                  <span className="text-gray-500 ml-1">({provider.reviewCount})</span>
                </div>
              )}
              
              {(provider.city || provider.state) && (
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {provider.city}{provider.city && provider.state && ', '}{provider.state}
                </div>
              )}

              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                Saved {formatDate(provider.savedAt)}
              </div>
            </div>

            {/* Services */}
            <div className="mt-3">
              <div className="flex flex-wrap gap-1 mb-2">
                {provider.services.slice(0, 4).map((service) => (
                  <Badge key={service.id} variant="outline" className="text-xs">
                    {service.category}
                  </Badge>
                ))}
                {provider.services.length > 4 && (
                  <Badge variant="outline" className="text-xs">
                    +{provider.services.length - 4} more
                  </Badge>
                )}
              </div>
              
              {provider.services[0] && (
                <p className="text-sm text-gray-600">
                  Featured: {provider.services[0].title} - ${provider.services[0].price}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex flex-col space-y-2">
            <Button size="sm">
              <MessageCircle className="h-4 w-4 mr-1" />
              Message
            </Button>
            <Button size="sm" variant="outline">
              <Calendar className="h-4 w-4 mr-1" />
              Book Now
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Link href="/customer/dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Saved Providers</h1>
          <p className="text-gray-600 mt-2">
            Your favorite service providers for quick booking
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search saved providers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="recent">Recently Saved</option>
              <option value="rating">Highest Rated</option>
              <option value="name">Name A-Z</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-gray-600">
            {filteredProviders.length} saved providers
          </p>
        </div>

        {/* Providers List */}
        {filteredProviders.length === 0 ? (
          <Card className="p-12 text-center">
            <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {savedProviders.length === 0 ? "No saved providers yet" : "No providers found"}
            </h3>
            <p className="text-gray-500 mb-4">
              {savedProviders.length === 0 
                ? "Save your favorite providers for quick access and easy booking"
                : "Try adjusting your search to find saved providers"}
            </p>
            {savedProviders.length === 0 && (
              <Link href="/services">
                <Button>
                  Browse Services
                </Button>
              </Link>
            )}
          </Card>
        ) : (
          <div className={
            viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-4'
          }>
            {filteredProviders.map((provider) => (
              viewMode === 'grid' ? (
                <ProviderCard key={provider.id} provider={provider} />
              ) : (
                <ProviderListItem key={provider.id} provider={provider} />
              )
            ))}
          </div>
        )}

        {/* Tips */}
        <div className="mt-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tips for Managing Saved Providers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Quick Booking</h4>
                  <p>Save providers you've worked with before for faster rebooking</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Compare Services</h4>
                  <p>Save multiple providers in the same category to compare prices and services</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Stay Updated</h4>
                  <p>Get notifications when your saved providers offer new services or promotions</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Build Relationships</h4>
                  <p>Regular customers often get priority booking and special rates</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}