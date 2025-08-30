'use client';

import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Star, 
  Clock, 
  MapPin, 
  Shield, 
  Zap,
  Heart,
  Share,
  Eye,
  Calendar
} from 'lucide-react';

interface Service {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  providerName: string;
  providerEmail: string;
  duration?: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
  rating?: number;
  reviewCount?: number;
}

interface SearchResultsProps {
  services: Service[];
  loading: boolean;
  viewMode: 'grid' | 'list';
  onServiceClick: (serviceId: string) => void;
  onBookService: (serviceId: string) => void;
  className?: string;
}

// Loading skeleton component
const ServiceSkeleton = ({ viewMode }: { viewMode: 'grid' | 'list' }) => {
  if (viewMode === 'list') {
    return (
      <Card className="mb-4">
        <CardContent className="p-6">
          <div className="flex gap-4">
            <Skeleton className="w-32 h-32 rounded-lg" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-16 w-full" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-24" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <div className="relative">
        <Skeleton className="w-full h-48" />
      </div>
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-12 w-full" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between items-center">
        <Skeleton className="h-6 w-20" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-20" />
        </div>
      </CardFooter>
    </Card>
  );
};

// Enhanced Service Card for Grid View
const ServiceGridCard = ({ service, onServiceClick, onBookService }: {
  service: Service;
  onServiceClick: (serviceId: string) => void;
  onBookService: (serviceId: string) => void;
}) => {
  // Use real rating data with fallbacks for demo purposes
  const serviceData = {
    images: [], // No images for now
    rating: service.rating || 0,
    reviewCount: service.reviewCount || 0,
    verified: Math.random() > 0.3, // Keep as mock for now
    instantBooking: Math.random() > 0.5, // Keep as mock for now
    featured: Math.random() > 0.7, // Keep as mock for now
    completedBookings: Math.floor(Math.random() * 500) + 50, // Keep as mock for now
    responseTime: Math.floor(Math.random() * 24) + 1, // Keep as mock for now
    location: 'Local Area' // Keep as mock for now
  };

  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`;
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours} hour${hours > 1 ? 's' : ''}`;
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer h-full flex flex-col">
      {/* Image Section */}
      <div 
        className="relative h-48 overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5"
        onClick={() => onServiceClick(service.id)}
      >
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-4xl font-bold text-primary/20">
            {service.title.charAt(0).toUpperCase()}
          </span>
        </div>
        
        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-2 flex-wrap">
          {serviceData.featured && (
            <Badge className="bg-yellow-500 text-white text-xs">
              <Zap className="w-3 h-3 mr-1" />
              Featured
            </Badge>
          )}
          {serviceData.instantBooking && (
            <Badge className="bg-green-500 text-white text-xs">
              <Zap className="w-3 h-3 mr-1" />
              Instant Book
            </Badge>
          )}
        </div>

        {/* Category Badge */}
        <div className="absolute bottom-2 left-2">
          <Badge variant="secondary" className="bg-white/90 backdrop-blur text-xs">
            {service.category}
          </Badge>
        </div>

        {/* Action Buttons */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="secondary"
            className="w-8 h-8 p-0 bg-white/90 hover:bg-white"
            onClick={(e) => {
              e.stopPropagation();
              // Handle favorite action
            }}
          >
            <Heart className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="w-8 h-8 p-0 bg-white/90 hover:bg-white"
            onClick={(e) => {
              e.stopPropagation();
              // Handle share action
            }}
          >
            <Share className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <CardContent className="p-4 flex-1 flex flex-col">
        {/* Provider Info */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-sm">{service.providerName}</span>
              {serviceData.verified && (
                <Shield className="w-4 h-4 text-blue-500" />
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {serviceData.reviewCount > 0 ? (
                <>
                  <div className="flex items-center gap-0.5">
                    <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                    <span>{serviceData.rating.toFixed(1)}</span>
                  </div>
                  <span>•</span>
                  <span>{serviceData.reviewCount} reviews</span>
                </>
              ) : (
                <span>No reviews yet</span>
              )}
              <span>•</span>
              <span>{serviceData.completedBookings} jobs</span>
              <span>•</span>
              <span>{serviceData.responseTime}h response</span>
            </div>
          </div>
        </div>

        {/* Service Title & Description */}
        <div className="flex-1">
          <h3 
            className="font-semibold text-lg mb-1 line-clamp-2 cursor-pointer hover:text-primary"
            onClick={() => onServiceClick(service.id)}
          >
            {service.title}
          </h3>
          <p className="text-sm text-muted-foreground mb-3 line-clamp-3 flex-1">
            {service.description}
          </p>
        </div>

        {/* Service Details */}
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-3">
          {service.duration && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{formatDuration(service.duration)}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            <span>{serviceData.location}</span>
          </div>
        </div>

        {/* Rating */}
        {serviceData.reviewCount > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.floor(serviceData.rating)
                      ? 'fill-yellow-500 text-yellow-500'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm">
              {serviceData.rating.toFixed(1)} ({serviceData.reviewCount} reviews)
            </span>
          </div>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-0 flex items-center justify-between mt-auto">
        <div>
          <span className="text-2xl font-bold">
            {formatPrice(service.price)}
          </span>
          <span className="text-sm text-muted-foreground ml-1">starting</span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onServiceClick(service.id);
            }}
            className="flex items-center gap-1"
          >
            <Eye className="w-4 h-4" />
            View
          </Button>
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onBookService(service.id);
            }}
            className="flex items-center gap-1"
          >
            <Calendar className="w-4 h-4" />
            Book
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

// Service Card for List View
const ServiceListCard = ({ service, onServiceClick, onBookService }: {
  service: Service;
  onServiceClick: (serviceId: string) => void;
  onBookService: (serviceId: string) => void;
}) => {
  // Use real rating data with fallbacks for demo purposes
  const serviceData = {
    rating: service.rating || 0,
    reviewCount: service.reviewCount || 0,
    verified: Math.random() > 0.3, // Keep as mock for now
    instantBooking: Math.random() > 0.5, // Keep as mock for now
    featured: Math.random() > 0.7, // Keep as mock for now
    completedBookings: Math.floor(Math.random() * 500) + 50, // Keep as mock for now
    responseTime: Math.floor(Math.random() * 24) + 1, // Keep as mock for now
    location: 'Local Area' // Keep as mock for now
  };

  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`;
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours} hour${hours > 1 ? 's' : ''}`;
  };

  return (
    <Card className="mb-4 hover:shadow-lg transition-all duration-300 cursor-pointer">
      <CardContent className="p-6">
        <div className="flex gap-4">
          {/* Image */}
          <div 
            className="w-32 h-32 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg flex items-center justify-center flex-shrink-0"
            onClick={() => onServiceClick(service.id)}
          >
            <span className="text-2xl font-bold text-primary/20">
              {service.title.charAt(0).toUpperCase()}
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 
                    className="font-semibold text-xl hover:text-primary cursor-pointer truncate"
                    onClick={() => onServiceClick(service.id)}
                  >
                    {service.title}
                  </h3>
                  <div className="flex gap-1">
                    {serviceData.featured && (
                      <Badge className="bg-yellow-500 text-white text-xs">Featured</Badge>
                    )}
                    {serviceData.instantBooking && (
                      <Badge className="bg-green-500 text-white text-xs">Instant</Badge>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">{service.providerName}</span>
                    {serviceData.verified && (
                      <Shield className="w-4 h-4 text-blue-500" />
                    )}
                  </div>
                  <span>•</span>
                  <Badge variant="secondary" className="text-xs">
                    {service.category}
                  </Badge>
                </div>
              </div>

              {/* Price */}
              <div className="text-right flex-shrink-0 ml-4">
                <div className="text-2xl font-bold">
                  {formatPrice(service.price)}
                </div>
                <div className="text-sm text-muted-foreground">starting</div>
              </div>
            </div>

            {/* Description */}
            <p className="text-muted-foreground mb-3 line-clamp-2">
              {service.description}
            </p>

            {/* Details */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
              {serviceData.reviewCount > 0 ? (
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                  <span>{serviceData.rating.toFixed(1)} ({serviceData.reviewCount})</span>
                </div>
              ) : (
                <span>No reviews yet</span>
              )}
              {service.duration && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{formatDuration(service.duration)}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{serviceData.location}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>{serviceData.completedBookings} jobs completed</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  Usually responds in {serviceData.responseTime}h
                </span>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onServiceClick(service.id);
                  }}
                  className="flex items-center gap-1"
                >
                  <Eye className="w-4 h-4" />
                  View Details
                </Button>
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onBookService(service.id);
                  }}
                  className="flex items-center gap-1"
                >
                  <Calendar className="w-4 h-4" />
                  Book Now
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function SearchResults({
  services,
  loading,
  viewMode,
  onServiceClick,
  onBookService,
  className = ''
}: SearchResultsProps) {
  // Show loading skeletons
  if (loading) {
    const skeletonCount = 6;
    const skeletons = Array.from({ length: skeletonCount }, (_, i) => (
      <ServiceSkeleton key={i} viewMode={viewMode} />
    ));

    if (viewMode === 'list') {
      return <div className={`space-y-4 ${className}`}>{skeletons}</div>;
    }

    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
        {skeletons}
      </div>
    );
  }

  // Show empty state
  if (!loading && services.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-xl font-semibold mb-2">No services found</h3>
        <p className="text-gray-600 mb-4">
          Try adjusting your search criteria or browse all categories
        </p>
      </div>
    );
  }

  // List view
  if (viewMode === 'list') {
    return (
      <div className={`space-y-4 ${className}`}>
        {services.map((service) => (
          <ServiceListCard
            key={service.id}
            service={service}
            onServiceClick={onServiceClick}
            onBookService={onBookService}
          />
        ))}
      </div>
    );
  }

  // Grid view (default)
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
      {services.map((service) => (
        <ServiceGridCard
          key={service.id}
          service={service}
          onServiceClick={onServiceClick}
          onBookService={onBookService}
        />
      ))}
    </div>
  );
}