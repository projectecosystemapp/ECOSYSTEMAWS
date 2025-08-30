'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ChevronDown, 
  Check,
  ArrowUpDown,
  DollarSign,
  Calendar,
  Star,
  TrendingUp,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

export type SortOption = 'price-asc' | 'price-desc' | 'newest' | 'rating' | 'popular';

interface SortDropdownProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
  className?: string;
}

interface SortConfig {
  value: SortOption;
  label: string;
  description: string;
  icon: React.ElementType;
}

const sortOptions: SortConfig[] = [
  {
    value: 'popular',
    label: 'Most Popular',
    description: 'Trending services and top-rated providers',
    icon: TrendingUp
  },
  {
    value: 'price-asc',
    label: 'Price: Low to High',
    description: 'Most affordable services first',
    icon: ArrowUp
  },
  {
    value: 'price-desc',
    label: 'Price: High to Low',
    description: 'Premium services first',
    icon: ArrowDown
  },
  {
    value: 'rating',
    label: 'Highest Rated',
    description: 'Best reviewed services first',
    icon: Star
  },
  {
    value: 'newest',
    label: 'Newest First',
    description: 'Recently added services',
    icon: Calendar
  }
];

export default function SortDropdown({
  value,
  onChange,
  className = ''
}: SortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentSort = sortOptions.find(option => option.value === value) || sortOptions[0];
  const CurrentIcon = currentSort.icon;

  const handleOptionClick = (sortValue: SortOption) => {
    onChange(sortValue);
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Sort Button */}
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 min-w-[180px] justify-between"
      >
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4" />
          <span className="hidden sm:inline">Sort by:</span>
          <span className="font-medium">{currentSort.label}</span>
        </div>
        <ChevronDown 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </Button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black bg-opacity-25 md:hidden"
            onClick={handleBackdropClick}
          />
          
          {/* Dropdown Content */}
          <Card className="absolute right-0 top-full mt-2 z-50 w-80 shadow-lg border">
            <CardContent className="p-2">
              <div className="space-y-1">
                {sortOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = option.value === value;
                  
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleOptionClick(option.value)}
                      className={`w-full text-left p-3 rounded-md hover:bg-gray-50 transition-colors flex items-start gap-3 ${
                        isSelected ? 'bg-primary/5 border border-primary/20' : ''
                      }`}
                    >
                      <div className={`p-1 rounded ${
                        isSelected ? 'text-primary' : 'text-gray-500'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`font-medium ${
                            isSelected ? 'text-primary' : 'text-gray-900'
                          }`}>
                            {option.label}
                          </span>
                          {isSelected && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-0.5">
                          {option.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
              
              {/* Additional Sort Info */}
              <div className="mt-3 pt-3 border-t">
                <div className="text-xs text-gray-500 px-3">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-3 h-3" />
                    <span className="font-medium">Popular</span>
                    <span>- Based on bookings, ratings, and search trends</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-3 h-3" />
                    <span className="font-medium">Highest Rated</span>
                    <span>- Minimum 10 reviews required</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// Compact version for mobile
export function SortDropdownCompact({
  value,
  onChange,
  className = ''
}: SortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentSort = sortOptions.find(option => option.value === value) || sortOptions[0];

  return (
    <div className={`relative ${className}`}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1"
      >
        <ArrowUpDown className="w-4 h-4" />
        <span className="sr-only sm:not-sr-only">Sort</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black bg-opacity-25"
            onClick={() => setIsOpen(false)}
          />
          
          <Card className="absolute right-0 top-full mt-1 z-50 w-48 shadow-lg">
            <CardContent className="p-1">
              {sortOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = option.value === value;
                
                return (
                  <button
                    key={option.value}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left p-2 rounded hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm ${
                      isSelected ? 'bg-primary/5 text-primary' : ''
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{option.label}</span>
                    {isSelected && <Check className="w-4 h-4 ml-auto" />}
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}