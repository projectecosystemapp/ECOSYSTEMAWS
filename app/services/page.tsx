'use client';
export const dynamic = 'force-dynamic';

import { 
  Search, 
  MapPin, 
  Filter, 
  Grid3X3, 
  List, 
  SlidersHorizontal,
  Star,
  DollarSign,
  Clock,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';

import SearchResults from '@/components/search/SearchResults';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { refactoredApi } from '@/lib/api/refactored';
import { ServiceWithRating, SERVICE_CATEGORIES } from '@/lib/types';


interface FilterState {
  category: string;
  minPrice: string;
  maxPrice: string;
  minRating: string;
  sortBy: 'price-asc' | 'price-desc' | 'rating-desc' | 'newest' | 'popular';
}

export default function ServicesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [services, setServices] = useState<ServiceWithRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [location, setLocation] = useState(searchParams.get('location') || '');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    category: searchParams.get('category') || '',
    minPrice: '',
    maxPrice: '',
    minRating: '',
    sortBy: 'newest'
  });
  const [totalResults, setTotalResults] = useState(0);

  useEffect(() => {
    loadServices();
  }, [searchParams]);

  const loadServices = async () => {
    try {
      setLoading(true);
      
      const query = searchParams.get('q') || searchQuery;
      const categoryFilter = searchParams.get('category') || filters.category;
      
      // Get all services with ratings
      const allServices = await refactoredApi.service.searchWithRatings(query, location);
      
      // Apply filters
      let filteredServices = allServices;
      
      // Category filter
      if (categoryFilter) {
        filteredServices = filteredServices.filter(service => 
          service.category === categoryFilter
        );
      }
      
      // Price filters
      if (filters.minPrice) {
        filteredServices = filteredServices.filter(service => 
          service.price >= parseFloat(filters.minPrice)
        );
      }
      
      if (filters.maxPrice) {
        filteredServices = filteredServices.filter(service => 
          service.price <= parseFloat(filters.maxPrice)
        );
      }
      
      // Rating filter
      if (filters.minRating) {
        filteredServices = filteredServices.filter(service => 
          (service.rating || 0) >= parseFloat(filters.minRating)
        );
      }
      
      // Apply sorting
      filteredServices.sort((a, b) => {
        switch (filters.sortBy) {
          case 'price-asc':
            return a.price - b.price;
          case 'price-desc':
            return b.price - a.price;
          case 'rating-desc':
            return (b.rating || 0) - (a.rating || 0);
          case 'popular':
            return (b.reviewCount || 0) - (a.reviewCount || 0);
          case 'newest':
          default:
            return new Date(b.updatedAt || b.createdAt || '').getTime() - 
                   new Date(a.updatedAt || a.createdAt || '').getTime();
        }
      });
      
      setServices(filteredServices);
      setTotalResults(filteredServices.length);
      
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (location) params.set('location', location);
    if (filters.category) params.set('category', filters.category);
    
    router.push(`/services?${params.toString()}`);
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    loadServices();
    setShowFilters(false);
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      minPrice: '',
      maxPrice: '',
      minRating: '',
      sortBy: 'newest'
    });
    setSearchQuery('');
    setLocation('');
    router.push('/services');
  };

  const handleServiceClick = (serviceId: string) => {
    router.push(`/services/${serviceId}`);
  };

  const handleBookService = (serviceId: string) => {
    router.push(`/services/${serviceId}/book`);
  };

  const getCategoryIcon = (category: string) => {
    const iconMap: {[key: string]: string} = {
      'Home Services': '🏠',
      'Business': '💼',
      'Events': '🎉',
      'Fitness': '💪',
      'Creative': '🎨',
      'Automotive': '🚗',
      'Health': '🏥',
      'Photography': '📸',
      'Technology': '💻',
      'Education': '📚',
      'Beauty': '✨',
      'Pet Services': '🐕',
      'Legal': '⚖️',
      'Financial': '💰',
      'Other': '🔧'
    };
    return iconMap[category] || '🔧';
  };

  return (
    <Suspense fallback={null}>
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Home
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <h1 className="text-xl font-semibold text-gray-900">Browse Services</h1>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="Search services..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <div className="flex-1 relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="Location..."
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="pl-10"
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSearch} className="bg-purple-600 hover:bg-purple-700">
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters Panel */}
        {showFilters && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Categories</SelectItem>
                      {SERVICE_CATEGORIES.map(category => (
                        <SelectItem key={category} value={category}>
                          {getCategoryIcon(category)} {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Min Price
                  </label>
                  <Input
                    type="number"
                    placeholder="$0"
                    value={filters.minPrice}
                    onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Price
                  </label>
                  <Input
                    type="number"
                    placeholder="$1000"
                    value={filters.maxPrice}
                    onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                  />
                </div>

                {/* Rating Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Min Rating
                  </label>
                  <Select value={filters.minRating} onValueChange={(value) => handleFilterChange('minRating', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any Rating" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any Rating</SelectItem>
                      <SelectItem value="4">4+ Stars</SelectItem>
                      <SelectItem value="3">3+ Stars</SelectItem>
                      <SelectItem value="2">2+ Stars</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort By */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sort By
                  </label>
                  <Select value={filters.sortBy} onValueChange={(value) => handleFilterChange('sortBy', value as FilterState['sortBy'])}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="popular">Most Popular</SelectItem>
                      <SelectItem value="rating-desc">Highest Rated</SelectItem>
                      <SelectItem value="price-asc">Price: Low to High</SelectItem>
                      <SelectItem value="price-desc">Price: High to Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={clearFilters}>
                  Clear All
                </Button>
                <Button onClick={applyFilters} className="bg-purple-600 hover:bg-purple-700">
                  Apply Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Category Quick Filters */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            <Badge 
              variant={!filters.category ? "default" : "secondary"}
              className="cursor-pointer px-4 py-2"
              onClick={() => {
                setFilters(prev => ({ ...prev, category: '' }));
                loadServices();
              }}
            >
              All Services
            </Badge>
            {SERVICE_CATEGORIES.slice(0, 6).map(category => (
              <Badge
                key={category}
                variant={filters.category === category ? "default" : "secondary"}
                className="cursor-pointer px-4 py-2 hover:bg-purple-100"
                onClick={() => {
                  setFilters(prev => ({ ...prev, category }));
                  loadServices();
                }}
              >
                {getCategoryIcon(category)} {category}
              </Badge>
            ))}
          </div>
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {searchQuery || filters.category ? 'Search Results' : 'All Services'}
            </h2>
            {!loading && (
              <p className="text-gray-600 mt-1">
                {totalResults} service{totalResults !== 1 ? 's' : ''} found
                {searchQuery && ` for "${searchQuery}"`}
                {filters.category && ` in ${filters.category}`}
              </p>
            )}
          </div>
          
          {totalResults > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Sort by:</span>
              <Select value={filters.sortBy} onValueChange={(value) => {
                handleFilterChange('sortBy', value as FilterState['sortBy']);
                loadServices();
              }}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="popular">Popular</SelectItem>
                  <SelectItem value="rating-desc">Highest Rated</SelectItem>
                  <SelectItem value="price-asc">Price ↑</SelectItem>
                  <SelectItem value="price-desc">Price ↓</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Search Results */}
        <SearchResults
          services={services}
          loading={loading}
          viewMode={viewMode}
          onServiceClick={handleServiceClick}
          onBookService={handleBookService}
        />

        {/* Load More / Pagination would go here */}
        {services.length > 0 && !loading && (
          <div className="mt-8 text-center">
            <p className="text-gray-600 mb-4">
              Showing {services.length} of {totalResults} services
            </p>
            <Button
              variant="outline"
              onClick={loadServices}
              disabled={loading}
            >
              Refresh Results
            </Button>
          </div>
        )}
      </div>
    </div>
    </Suspense>
  );
}
