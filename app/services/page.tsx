'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import SearchBar from '@/components/search/SearchBar';
import FilterSidebar from '@/components/search/FilterSidebar';
import SearchResults from '@/components/search/SearchResults';
import SortDropdown from '@/components/search/SortDropdown';
import { refactoredApi } from '@/lib/api/refactored';
import { 
  SlidersHorizontal, 
  X,
  MapPin,
  Filter,
  Grid,
  List
} from 'lucide-react';

export interface SearchFilters {
  query: string;
  categories: string[];
  minPrice: number;
  maxPrice: number;
  location: string;
  minRating: number;
  sortBy: 'price-asc' | 'price-desc' | 'newest' | 'rating' | 'popular';
}

// Using the Service type from our domain model
import type { ServiceWithRating } from '@/lib/types';

const CATEGORIES = [
  'Home Services',
  'Business', 
  'Events',
  'Fitness',
  'Creative',
  'Automotive',
  'Health',
  'Photography'
];

export default function ServicesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // State
  const [services, setServices] = useState<ServiceWithRating[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  // Initialize filters from URL params
  const [filters, setFilters] = useState<SearchFilters>({
    query: searchParams.get('q') || '',
    categories: searchParams.get('category') ? [searchParams.get('category')!] : [],
    minPrice: Number(searchParams.get('min')) || 0,
    maxPrice: Number(searchParams.get('max')) || 5000,
    location: searchParams.get('location') || '',
    minRating: Number(searchParams.get('rating')) || 0,
    sortBy: (searchParams.get('sort') as SearchFilters['sortBy']) || 'popular'
  });

  // Update URL when filters change
  const updateURL = (newFilters: SearchFilters) => {
    const params = new URLSearchParams();
    
    if (newFilters.query) params.set('q', newFilters.query);
    if (newFilters.categories.length > 0) {
      newFilters.categories.forEach(cat => params.append('category', cat));
    }
    if (newFilters.minPrice > 0) params.set('min', newFilters.minPrice.toString());
    if (newFilters.maxPrice < 5000) params.set('max', newFilters.maxPrice.toString());
    if (newFilters.location) params.set('location', newFilters.location);
    if (newFilters.minRating > 0) params.set('rating', newFilters.minRating.toString());
    if (newFilters.sortBy !== 'popular') params.set('sort', newFilters.sortBy);
    
    const newURL = params.toString() ? `/services?${params.toString()}` : '/services';
    router.replace(newURL, { scroll: false });
  };

  // Search services based on filters
  const searchServices = async (searchFilters: SearchFilters) => {
    setLoading(true);
    try {
      // Build filter object for API
      const apiFilter: any = {
        active: { eq: true }
      };

      // Add text search filter
      if (searchFilters.query) {
        apiFilter.or = [
          { title: { contains: searchFilters.query } },
          { description: { contains: searchFilters.query } }
        ];
      }

      // Add category filter
      if (searchFilters.categories.length > 0) {
        if (searchFilters.categories.length === 1) {
          apiFilter.category = { eq: searchFilters.categories[0] };
        } else {
          apiFilter.category = { 
            or: searchFilters.categories.map(cat => ({ eq: cat }))
          };
        }
      }

      // Add price range filter
      if (searchFilters.minPrice > 0 || searchFilters.maxPrice < 5000) {
        apiFilter.price = {};
        if (searchFilters.minPrice > 0) {
          apiFilter.price.gte = searchFilters.minPrice;
        }
        if (searchFilters.maxPrice < 5000) {
          apiFilter.price.lte = searchFilters.maxPrice;
        }
      }

      const results = await refactoredApi.service.searchWithRatings(
        searchFilters.query,
        searchFilters.categories[0] // For now, using first category
      );
      
      // Filter by rating client-side
      let filteredResults = [...(results || [])];
      if (searchFilters.minRating > 0) {
        filteredResults = filteredResults.filter(service => 
          (service.rating || 0) >= searchFilters.minRating
        );
      }
      
      // Additional filtering for price range
      if (searchFilters.minPrice > 0 || searchFilters.maxPrice < 5000) {
        filteredResults = filteredResults.filter(service => {
          if (searchFilters.minPrice > 0 && service.price < searchFilters.minPrice) return false;
          if (searchFilters.maxPrice < 5000 && service.price > searchFilters.maxPrice) return false;
          return true;
        });
      }
      
      // Sort results client-side (since AWS AppSync doesn't support all sorting options)
      let sortedResults = [...filteredResults];
      
      switch (searchFilters.sortBy) {
        case 'price-asc':
          sortedResults.sort((a, b) => a.price - b.price);
          break;
        case 'price-desc':
          sortedResults.sort((a, b) => b.price - a.price);
          break;
        case 'newest':
          sortedResults.sort((a, b) => 
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          );
          break;
        case 'rating':
          sortedResults.sort((a, b) => (b.rating || 0) - (a.rating || 0));
          break;
        case 'popular':
        default:
          // Keep default order or sort by some popularity metric
          break;
      }
      
      // No more 'as any' - sortedResults is already properly typed!
      setServices(sortedResults);
      setTotalCount(sortedResults.length);
      
    } catch (error) {
      console.error('Error searching services:', error);
      setServices([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Handle filter changes
  const handleFilterChange = (newFilters: SearchFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
    updateURL(newFilters);
  };

  // Clear all filters
  const clearFilters = () => {
    const clearedFilters: SearchFilters = {
      query: '',
      categories: [],
      minPrice: 0,
      maxPrice: 5000,
      location: '',
      minRating: 0,
      sortBy: 'popular'
    };
    handleFilterChange(clearedFilters);
  };

  // Check if any filters are active
  const hasActiveFilters = filters.query || 
    filters.categories.length > 0 || 
    filters.minPrice > 0 || 
    filters.maxPrice < 5000 ||
    filters.location ||
    filters.minRating > 0 ||
    filters.sortBy !== 'popular';

  // Search effect
  useEffect(() => {
    searchServices(filters);
  }, [filters]);

  // Pagination
  const paginatedServices = services.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  
  const totalPages = Math.ceil(services.length / ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-xl font-bold text-primary">
                Ecosystem
              </Link>
              <span className="text-gray-500">/</span>
              <span className="text-gray-900">Services</span>
            </div>
            
            <div className="flex items-center gap-4">
              {/* View Mode Toggle */}
              <div className="hidden md:flex items-center bg-gray-100 rounded-lg p-1">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="h-8"
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="h-8"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>

              {/* Mobile Filter Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="md:hidden"
              >
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <SearchBar
            initialQuery={filters.query}
            onSearch={(query) => handleFilterChange({ ...filters, query })}
            placeholder="Search for services..."
            showLocation={true}
            location={filters.location}
            onLocationChange={(location) => handleFilterChange({ ...filters, location })}
          />
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Filter Sidebar */}
          <div className={`${showFilters ? 'block' : 'hidden'} md:block w-full md:w-80 flex-shrink-0`}>
            <div className="sticky top-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Filter className="w-5 h-5" />
                      Filters
                    </h3>
                    {hasActiveFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="text-red-600 hover:text-red-700"
                      >
                        Clear All
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowFilters(false)}
                      className="md:hidden"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <FilterSidebar
                    categories={CATEGORIES}
                    filters={filters}
                    onChange={handleFilterChange}
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold">
                  {filters.query ? `Results for "${filters.query}"` : 'All Services'}
                </h1>
                <Badge variant="secondary">
                  {totalCount} service{totalCount !== 1 ? 's' : ''} found
                </Badge>
              </div>
              
              <SortDropdown
                value={filters.sortBy}
                onChange={(sortBy) => handleFilterChange({ ...filters, sortBy })}
              />
            </div>

            {/* Active Filters */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 mb-6 flex-wrap">
                <span className="text-sm font-medium">Active filters:</span>
                {filters.query && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Search: {filters.query}
                    <X 
                      className="w-3 h-3 cursor-pointer" 
                      onClick={() => handleFilterChange({ ...filters, query: '' })}
                    />
                  </Badge>
                )}
                {filters.categories.map(category => (
                  <Badge key={category} variant="secondary" className="flex items-center gap-1">
                    {category}
                    <X 
                      className="w-3 h-3 cursor-pointer" 
                      onClick={() => handleFilterChange({ 
                        ...filters, 
                        categories: filters.categories.filter(c => c !== category) 
                      })}
                    />
                  </Badge>
                ))}
                {(filters.minPrice > 0 || filters.maxPrice < 5000) && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    ${filters.minPrice} - ${filters.maxPrice}
                    <X 
                      className="w-3 h-3 cursor-pointer" 
                      onClick={() => handleFilterChange({ ...filters, minPrice: 0, maxPrice: 5000 })}
                    />
                  </Badge>
                )}
                {filters.minRating > 0 && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    {filters.minRating}+ stars
                    <X 
                      className="w-3 h-3 cursor-pointer" 
                      onClick={() => handleFilterChange({ ...filters, minRating: 0 })}
                    />
                  </Badge>
                )}
                {filters.location && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {filters.location}
                    <X 
                      className="w-3 h-3 cursor-pointer" 
                      onClick={() => handleFilterChange({ ...filters, location: '' })}
                    />
                  </Badge>
                )}
              </div>
            )}

            {/* Search Results */}
            <SearchResults
              services={paginatedServices}
              loading={loading}
              viewMode={viewMode}
              onServiceClick={(id) => router.push(`/services/${id}`)}
              onBookService={(id) => router.push(`/services/${id}/book`)}
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <Button
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {[...Array(totalPages)].map((_, i) => {
                    const page = i + 1;
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 2 && page <= currentPage + 2)
                    ) {
                      return (
                        <Button
                          key={page}
                          variant={page === currentPage ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="w-10 h-10"
                        >
                          {page}
                        </Button>
                      );
                    } else if (page === currentPage - 3 || page === currentPage + 3) {
                      return <span key={page} className="px-2">...</span>;
                    }
                    return null;
                  })}
                </div>
                
                <Button
                  variant="outline"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Next
                </Button>
              </div>
            )}

            {/* No Results */}
            {!loading && services.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold mb-2">No services found</h3>
                <p className="text-gray-600 mb-4">
                  Try adjusting your search criteria or browse all categories
                </p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                  <Link href="/">
                    <Button>Browse Categories</Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}