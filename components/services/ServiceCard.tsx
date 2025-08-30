'use client';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Clock, Users, MapPin, Shield, Zap } from 'lucide-react';

interface ServiceCardProps {
  service: {
    id: string;
    title: string;
    description: string;
    shortDescription?: string;
    price: number;
    priceType?: 'FIXED' | 'HOURLY' | 'DAILY' | 'PROJECT';
    duration?: number;
    maxGroupSize?: number;
    images?: string[];
    rating?: number;
    reviewCount?: number;
    instantBooking?: boolean;
    featured?: boolean;
    // Location fields
    serviceCity?: string;
    serviceState?: string;
    serviceRadius?: number;
    locationType?: 'PROVIDER_LOCATION' | 'CUSTOMER_LOCATION' | 'BOTH';
    location?: string; // fallback for formatted location
    provider?: {
      id: string;
      businessName: string;
      verified: boolean;
      rating: number;
      completedBookings?: number;
      profilePicture?: string;
    };
    category?: {
      name: string;
      slug: string;
    };
  };
  onBook?: (serviceId: string) => void;
  onViewDetails?: (serviceId: string) => void;
  viewMode?: 'grid' | 'list';
}

export default function ServiceCard({ service, onBook, onViewDetails, viewMode = 'grid' }: ServiceCardProps) {
  const formatPrice = (price: number, type?: string) => {
    const formatted = `$${price.toFixed(2)}`;
    switch (type) {
      case 'HOURLY':
        return `${formatted}/hr`;
      case 'DAILY':
        return `${formatted}/day`;
      case 'PROJECT':
        return `Starting at ${formatted}`;
      default:
        return formatted;
    }
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours} hour${hours > 1 ? 's' : ''}`;
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 overflow-hidden">
      {/* Image Section */}
      <div className="relative h-48 overflow-hidden bg-gray-100">
        {service.images && service.images[0] ? (
          <img
            src={service.images[0]}
            alt={service.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
            <span className="text-4xl font-bold text-primary/20">
              {service.title.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-2">
          {service.featured && (
            <Badge className="bg-yellow-500 text-white">
              <Zap className="w-3 h-3 mr-1" />
              Featured
            </Badge>
          )}
          {service.instantBooking && (
            <Badge className="bg-green-500 text-white">
              <Zap className="w-3 h-3 mr-1" />
              Instant Book
            </Badge>
          )}
        </div>

        {/* Category Badge */}
        {service.category && (
          <div className="absolute bottom-2 left-2">
            <Badge variant="secondary" className="bg-white/90 backdrop-blur">
              {service.category.name}
            </Badge>
          </div>
        )}
      </div>

      <CardContent className="p-4">
        {/* Provider Info */}
        {service.provider && (
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-1">
                <span className="font-semibold text-sm">{service.provider.businessName}</span>
                {service.provider.verified && (
                  <Shield className="w-4 h-4 text-blue-500" />
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-0.5">
                  <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                  <span>{service.provider.rating.toFixed(1)}</span>
                </div>
                {service.provider.completedBookings && (
                  <>
                    <span>•</span>
                    <span>{service.provider.completedBookings} bookings</span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Service Title & Description */}
        <h3 className="font-semibold text-lg mb-1 line-clamp-1">{service.title}</h3>
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {service.shortDescription || service.description}
        </p>

        {/* Service Details */}
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-3">
          {service.duration && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{formatDuration(service.duration)}</span>
            </div>
          )}
          {service.maxGroupSize && service.maxGroupSize > 1 && (
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>Max {service.maxGroupSize}</span>
            </div>
          )}
          {/* Location Info */}
          {(service.serviceCity || service.location) && (
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>
                {service.serviceCity && service.serviceState 
                  ? `${service.serviceCity}, ${service.serviceState}`
                  : service.location}
              </span>
            </div>
          )}
          {/* Service Type */}
          {service.locationType && (
            <Badge variant="outline" className="text-xs">
              {service.locationType === 'CUSTOMER_LOCATION' 
                ? `Travel: ${service.serviceRadius || 10} mi`
                : service.locationType === 'BOTH'
                ? 'Flexible Location'
                : 'Provider Location'}
            </Badge>
          )}
        </div>

        {/* Rating */}
        {service.reviewCount && service.reviewCount > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.floor(service.rating || 0)
                      ? 'fill-yellow-500 text-yellow-500'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm">
              {(service.rating || 0).toFixed(1)} ({service.reviewCount || 0} reviews)
            </span>
          </div>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-0 flex items-center justify-between">
        <div>
          <span className="text-2xl font-bold">
            {formatPrice(service.price, service.priceType)}
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails?.(service.id)}
          >
            View Details
          </Button>
          <Button
            size="sm"
            onClick={() => onBook?.(service.id)}
          >
            Book Now
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}