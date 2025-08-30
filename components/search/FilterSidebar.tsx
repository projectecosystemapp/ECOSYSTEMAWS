'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  ChevronDown, 
  ChevronUp, 
  DollarSign,
  Hash,
  MapPin,
  Star,
  Filter
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

interface FilterSidebarProps {
  categories: string[];
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
  className?: string;
}

interface FilterSection {
  id: string;
  title: string;
  icon: React.ElementType;
  expanded: boolean;
}

export default function FilterSidebar({
  categories,
  filters,
  onChange,
  className = ''
}: FilterSidebarProps) {
  // Track which filter sections are expanded
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    categories: true,
    price: true,
    rating: false,
    features: false
  });

  // Price range state for sliders
  const [priceRange, setPriceRange] = useState({
    min: filters.minPrice,
    max: filters.maxPrice
  });

  // Toggle section expansion
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Handle category selection
  const handleCategoryChange = (category: string, checked: boolean) => {
    const newCategories = checked
      ? [...filters.categories, category]
      : filters.categories.filter(c => c !== category);
    
    onChange({
      ...filters,
      categories: newCategories
    });
  };

  // Handle price range change
  const handlePriceChange = (type: 'min' | 'max', value: number) => {
    const newPriceRange = {
      ...priceRange,
      [type]: value
    };
    
    // Ensure min doesn't exceed max and vice versa
    if (type === 'min' && value > priceRange.max) {
      newPriceRange.max = value;
    }
    if (type === 'max' && value < priceRange.min) {
      newPriceRange.min = value;
    }
    
    setPriceRange(newPriceRange);
    
    onChange({
      ...filters,
      minPrice: newPriceRange.min,
      maxPrice: newPriceRange.max
    });
  };

  // Quick price ranges
  const quickPriceRanges = [
    { label: 'Under $50', min: 0, max: 50 },
    { label: '$50 - $100', min: 50, max: 100 },
    { label: '$100 - $250', min: 100, max: 250 },
    { label: '$250 - $500', min: 250, max: 500 },
    { label: '$500+', min: 500, max: 5000 }
  ];

  // Handle quick price range selection
  const handleQuickPriceRange = (min: number, max: number) => {
    setPriceRange({ min, max });
    onChange({
      ...filters,
      minPrice: min,
      maxPrice: max
    });
  };

  // Get category counts (mock data - would come from API)
  const getCategoryCount = (category: string): number => {
    const counts: Record<string, number> = {
      'Home Services': 245,
      'Business': 189,
      'Events': 156,
      'Fitness': 134,
      'Creative': 98,
      'Automotive': 87,
      'Health': 76,
      'Photography': 65
    };
    return counts[category] || 0;
  };

  // Filter sections configuration
  const filterSections: FilterSection[] = [
    { id: 'categories', title: 'Categories', icon: Hash, expanded: expandedSections.categories },
    { id: 'price', title: 'Price Range', icon: DollarSign, expanded: expandedSections.price },
    { id: 'rating', title: 'Rating', icon: Star, expanded: expandedSections.rating },
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Categories Filter */}
      <div className="space-y-2">
        <button
          onClick={() => toggleSection('categories')}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4" />
            <span className="font-medium">Categories</span>
          </div>
          {expandedSections.categories ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
        
        {expandedSections.categories && (
          <div className="space-y-2 pl-6">
            {categories.map((category) => (
              <div key={category} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={category}
                    checked={filters.categories.includes(category)}
                    onCheckedChange={(checked) => 
                      handleCategoryChange(category, checked as boolean)
                    }
                  />
                  <Label 
                    htmlFor={category}
                    className="text-sm font-normal cursor-pointer flex-1"
                  >
                    {category}
                  </Label>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {getCategoryCount(category)}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Price Range Filter */}
      <div className="space-y-2">
        <button
          onClick={() => toggleSection('price')}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            <span className="font-medium">Price Range</span>
          </div>
          {expandedSections.price ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
        
        {expandedSections.price && (
          <div className="space-y-4 pl-6">
            {/* Quick Price Ranges */}
            <div className="space-y-2">
              {quickPriceRanges.map((range, index) => (
                <Button
                  key={index}
                  variant={
                    filters.minPrice === range.min && filters.maxPrice === range.max
                      ? "default"
                      : "ghost"
                  }
                  size="sm"
                  onClick={() => handleQuickPriceRange(range.min, range.max)}
                  className="w-full justify-start text-left h-8"
                >
                  {range.label}
                </Button>
              ))}
            </div>

            {/* Custom Range Inputs */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Custom Range</div>
              <div className="flex items-center space-x-2">
                <div className="flex-1">
                  <Label htmlFor="min-price" className="sr-only">Minimum price</Label>
                  <Input
                    id="min-price"
                    type="number"
                    placeholder="Min"
                    value={priceRange.min || ''}
                    onChange={(e) => handlePriceChange('min', Number(e.target.value) || 0)}
                    className="h-8"
                    min="0"
                    max="5000"
                  />
                </div>
                <span className="text-gray-500">to</span>
                <div className="flex-1">
                  <Label htmlFor="max-price" className="sr-only">Maximum price</Label>
                  <Input
                    id="max-price"
                    type="number"
                    placeholder="Max"
                    value={priceRange.max || ''}
                    onChange={(e) => handlePriceChange('max', Number(e.target.value) || 5000)}
                    className="h-8"
                    min="0"
                    max="5000"
                  />
                </div>
              </div>
              
              {/* Price Range Slider */}
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="range"
                    min="0"
                    max="5000"
                    step="25"
                    value={priceRange.min}
                    onChange={(e) => handlePriceChange('min', Number(e.target.value))}
                    className="absolute w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb-primary"
                  />
                  <input
                    type="range"
                    min="0"
                    max="5000"
                    step="25"
                    value={priceRange.max}
                    onChange={(e) => handlePriceChange('max', Number(e.target.value))}
                    className="absolute w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb-primary"
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-6">
                  <span>$0</span>
                  <span>$5000+</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Rating Filter */}
      <div className="space-y-2">
        <button
          onClick={() => toggleSection('rating')}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4" />
            <span className="font-medium">Rating</span>
          </div>
          {expandedSections.rating ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
        
        {expandedSections.rating && (
          <div className="space-y-2 pl-6">
            {[5, 4, 3, 2, 1].map((rating) => (
              <Button
                key={rating}
                variant={filters.minRating === rating ? "default" : "ghost"}
                size="sm"
                className="w-full justify-start text-left h-8"
                onClick={() => {
                  onChange({
                    ...filters,
                    minRating: rating === filters.minRating ? 0 : rating
                  });
                }}
              >
                <div className="flex items-center space-x-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${
                          i < rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm">
                    {rating === 5 ? 'Excellent (5★+)' :
                     rating === 4 ? 'Very Good (4★+)' :
                     rating === 3 ? 'Good (3★+)' :
                     rating === 2 ? 'Fair (2★+)' : 'Any (1★+)'}
                  </span>
                </div>
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Service Features Filter */}
      <div className="space-y-2">
        <button
          onClick={() => toggleSection('features')}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <span className="font-medium">Features</span>
          </div>
          {expandedSections.features ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
        
        {expandedSections.features && (
          <div className="space-y-2 pl-6">
            {[
              'Instant Booking',
              'Verified Provider',
              'Same Day Service',
              'Mobile Service',
              'Free Consultation',
              'Money Back Guarantee'
            ].map((feature) => (
              <div key={feature} className="flex items-center space-x-2">
                <Checkbox id={feature} />
                <Label 
                  htmlFor={feature}
                  className="text-sm font-normal cursor-pointer"
                >
                  {feature}
                </Label>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Clear Filters Button */}
      {(filters.categories.length > 0 || 
        filters.minPrice > 0 || 
        filters.maxPrice < 5000 ||
        filters.minRating > 0) && (
        <div className="pt-4">
          <Button
            variant="outline"
            onClick={() => {
              setPriceRange({ min: 0, max: 5000 });
              onChange({
                ...filters,
                categories: [],
                minPrice: 0,
                maxPrice: 5000,
                minRating: 0
              });
            }}
            className="w-full"
          >
            Clear All Filters
          </Button>
        </div>
      )}

      {/* Active Filters Summary */}
      {(filters.categories.length > 0 || 
        filters.minPrice > 0 || 
        filters.maxPrice < 5000 ||
        filters.minRating > 0) && (
        <div className="pt-4 border-t">
          <div className="text-sm font-medium mb-2">Active Filters:</div>
          <div className="space-y-1">
            {filters.categories.length > 0 && (
              <div className="text-xs text-gray-600">
                Categories: {filters.categories.length} selected
              </div>
            )}
            {(filters.minPrice > 0 || filters.maxPrice < 5000) && (
              <div className="text-xs text-gray-600">
                Price: ${filters.minPrice} - ${filters.maxPrice}
              </div>
            )}
            {filters.minRating > 0 && (
              <div className="text-xs text-gray-600">
                Minimum Rating: {filters.minRating} stars
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}