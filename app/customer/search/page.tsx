'use client';
export const dynamic = 'force-dynamic';

import { 
  Search, 
  MapPin, 
  Star, 
  DollarSign, 
  Filter,
  Grid,
  List,
  Clock,
  Heart,
  User,
  Bookmark
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { refactoredApi } from '@/lib/api/refactored';
import type { Service, ServiceWithRating } from '@/lib/types';
import { SERVICE_CATEGORIES } from '@/lib/types';

interface SearchFilters {
  query: string;
  category: string;
  minPrice: number;
  maxPrice: number;
  location: string;
  minRating: number;
  sortBy: 'price-asc' | 'price-desc' | 'rating' | 'distance';
}

export default function CustomerSearchPage() {
  const searchParams = useSearchParams();
  const [services, setServices] = useState<ServiceWithRating[]>([]);
  const [filteredServices, setFilteredServices] = useState<ServiceWithRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [savedServices, setSavedServices] = useState<string[]>([]);
  
  const [filters, setFilters] = useState<SearchFilters>({
    query: searchParams?.get('q') || '',
    category: searchParams?.get('category') || '',
    minPrice: 0,
    maxPrice: 1000,
    location: '',
    minRating: 0,
    sortBy: 'rating'
  });

  useEffect(() => {
    loadServices();
    loadSavedServices();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [services, filters]);

  const loadServices = async () => {
    try {
      setLoading(true);
      const data = await refactoredApi.service.searchWithRatings('');
      setServices(data || []);
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSavedServices = async () => {
    // TODO: Implement saved services API
    setSavedServices([]);
  };

  const applyFilters = () => {
    let filtered = [...services];

    // Text search
    if (filters.query.trim()) {
      const query = filters.query.toLowerCase();
      filtered = filtered.filter(service => 
        service.title.toLowerCase().includes(query) ||
        service.description.toLowerCase().includes(query) ||
        service.providerName.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (filters.category) {
      filtered = filtered.filter(service => service.category === filters.category);
    }

    // Price range
    filtered = filtered.filter(service => 
      service.price >= filters.minPrice && service.price <= filters.maxPrice
    );

    // Location filter
    if (filters.location.trim()) {
      const location = filters.location.toLowerCase();
      filtered = filtered.filter(service =>
        service.serviceCity?.toLowerCase().includes(location) ||
        service.serviceState?.toLowerCase().includes(location)
      );
    }

    // Rating filter
    if (filters.minRating > 0) {
      filtered = filtered.filter(service => service.rating >= filters.minRating);
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'rating':
          return b.rating - a.rating;
        default:
          return 0;
      }
    });

    setFilteredServices(filtered);
  };

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveService = async (serviceId: string) => {
    // TODO: Implement save service API
    if (savedServices.includes(serviceId)) {
      setSavedServices(prev => prev.filter(id => id !== serviceId));
    } else {
      setSavedServices(prev => [...prev, serviceId]);
    }
  };

  const ServiceCard = ({ service }: { service: ServiceWithRating }) => (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg line-clamp-1">{service.title}</CardTitle>
            <CardDescription className="text-sm text-gray-600 mt-1 flex items-center">
              <User className="h-4 w-4 mr-1" />
              {service.providerName}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSaveService(service.id)}
            className="ml-2"
          >
            <Heart 
              className={`h-4 w-4 ${savedServices.includes(service.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} 
            />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
          {service.description}
        </p>
        
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center text-sm text-gray-600">
            <DollarSign className="h-4 w-4 mr-1" />
            <span className="font-semibold">${service.price}</span>
            <span className="mx-2">•</span>
            <Clock className="h-4 w-4 mr-1" />
            <span>{service.duration || 60}min</span>
          </div>
          
          {service.rating > 0 && (
            <div className="flex items-center text-sm">
              <Star className="h-4 w-4 text-yellow-400 fill-current mr-1" />
              <span className="font-medium">{service.rating.toFixed(1)}</span>
              <span className="text-gray-500 ml-1">({service.reviewCount})</span>
            </div>
          )}
        </div>

        {service.serviceCity && (
          <div className="flex items-center text-sm text-gray-500 mb-3">
            <MapPin className="h-4 w-4 mr-1" />
            {service.serviceCity}{service.serviceState && `, ${service.serviceState}`}
          </div>
        )}

        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs">
            {service.category}
          </Badge>
          
          <div className="flex space-x-2">
            <Link href={`/services/${service.id}`}>
              <Button size="sm">View Details</Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const ServiceListItem = ({ service }: { service: ServiceWithRating }) => (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start space-x-4">
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg">{service.title}</h3>
                <p className="text-sm text-gray-600 flex items-center mt-1">
                  <User className="h-4 w-4 mr-1" />
                  {service.providerName}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSaveService(service.id)}
              >
                <Heart 
                  className={`h-4 w-4 ${savedServices.includes(service.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} 
                />
              </Button>
            </div>
            
            <p className="text-sm text-gray-600 mt-2 line-clamp-2">
              {service.description}
            </p>
            
            <div className="flex items-center space-x-4 mt-3 text-sm text-gray-600">
              <div className="flex items-center">
                <DollarSign className="h-4 w-4 mr-1" />
                <span className="font-semibold">${service.price}</span>
              </div>
              
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                <span>{service.duration || 60}min</span>
              </div>
              
              {service.rating > 0 && (
                <div className="flex items-center">
                  <Star className="h-4 w-4 text-yellow-400 fill-current mr-1" />
                  <span className="font-medium">{service.rating.toFixed(1)}</span>
                  <span className="text-gray-500 ml-1">({service.reviewCount})</span>
                </div>
              )}
              
              {service.serviceCity && (
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {service.serviceCity}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-col items-end space-y-2">
            <Badge variant="outline" className="text-xs">
              {service.category}
            </Badge>
            <Link href={`/services/${service.id}`}>
              <Button size="sm">View Details</Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Suspense fallback={null}>
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Search Services</h1>
          <p className="text-gray-600 mt-2">
            Discover and book amazing services from local providers
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search services, providers, or keywords..."
                value={filters.query}
                onChange={(e) => handleFilterChange('query', e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {SERVICE_CATEGORIES.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            {/* Location Input */}
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Location"
                value={filters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                className="pl-10 w-40"
              />
            </div>

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

          {/* Advanced Filters */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Price Range</label>
                <div className="flex items-center space-x-2 mt-1">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.minPrice}
                    onChange={(e) => handleFilterChange('minPrice', Number(e.target.value))}
                    className="w-20"
                  />
                  <span>-</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.maxPrice}
                    onChange={(e) => handleFilterChange('maxPrice', Number(e.target.value))}
                    className="w-20"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Minimum Rating</label>
                <select
                  value={filters.minRating}
                  onChange={(e) => handleFilterChange('minRating', Number(e.target.value))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={0}>Any Rating</option>
                  <option value={4}>4+ Stars</option>
                  <option value={4.5}>4.5+ Stars</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Sort By</label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="rating">Highest Rated</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="distance">Distance</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-gray-600">
            {loading ? 'Loading...' : `${filteredServices.length} services found`}
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mt-2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredServices.length === 0 ? (
          <Card className="p-12 text-center">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No services found</h3>
            <p className="text-gray-500 mb-4">
              Try adjusting your search criteria or browse all categories
            </p>
            <Button onClick={() => {
              setFilters({
                query: '',
                category: '',
                minPrice: 0,
                maxPrice: 1000,
                location: '',
                minRating: 0,
                sortBy: 'rating'
              });
            }}>
              Clear Filters
            </Button>
          </Card>
        ) : (
          <div className={
            viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-4'
          }>
            {filteredServices.map((service) => (
              viewMode === 'grid' ? (
                <ServiceCard key={service.id} service={service} />
              ) : (
                <ServiceListItem key={service.id} service={service} />
              )
            ))}
          </div>
        )}
      </div>
    </div>
    </Suspense>
  );
}
