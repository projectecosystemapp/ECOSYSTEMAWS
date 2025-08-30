'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ServiceCard from '@/components/services/ServiceCard';
import SearchBar from '@/components/search/SearchBar';
import { 
  Search, 
  MapPin, 
  Calendar, 
  Users, 
  Shield, 
  Zap, 
  TrendingUp,
  Star,
  ChevronRight,
  Home,
  Briefcase,
  Music,
  Dumbbell,
  Palette,
  Car,
  Heart,
  Camera
} from 'lucide-react';

// Mock data for demonstration
const categories = [
  { id: '1', name: 'Home Services', icon: Home, count: 245, color: 'bg-blue-500' },
  { id: '2', name: 'Business', icon: Briefcase, count: 189, color: 'bg-purple-500' },
  { id: '3', name: 'Events', icon: Music, count: 156, color: 'bg-pink-500' },
  { id: '4', name: 'Fitness', icon: Dumbbell, count: 134, color: 'bg-green-500' },
  { id: '5', name: 'Creative', icon: Palette, count: 98, color: 'bg-yellow-500' },
  { id: '6', name: 'Automotive', icon: Car, count: 87, color: 'bg-red-500' },
  { id: '7', name: 'Health', icon: Heart, count: 76, color: 'bg-indigo-500' },
  { id: '8', name: 'Photography', icon: Camera, count: 65, color: 'bg-gray-500' },
];

const featuredServices = [
  {
    id: '1',
    title: 'Professional Home Cleaning',
    description: 'Thorough cleaning service for your home with eco-friendly products',
    shortDescription: 'Eco-friendly home cleaning service',
    price: 80,
    priceType: 'FIXED' as const,
    duration: 120,
    maxGroupSize: 1,
    images: [],
    rating: 4.8,
    reviewCount: 124,
    instantBooking: true,
    featured: true,
    provider: {
      id: '1',
      businessName: 'Sparkle Clean Co.',
      verified: true,
      rating: 4.9,
      completedBookings: 342,
    },
    category: {
      name: 'Home Services',
      slug: 'home-services',
    },
  },
  {
    id: '2',
    title: 'Personal Training Session',
    description: 'One-on-one fitness training tailored to your goals',
    shortDescription: 'Customized fitness training',
    price: 65,
    priceType: 'HOURLY' as const,
    duration: 60,
    maxGroupSize: 1,
    images: [],
    rating: 4.9,
    reviewCount: 89,
    instantBooking: false,
    featured: true,
    provider: {
      id: '2',
      businessName: 'FitLife Trainers',
      verified: true,
      rating: 4.8,
      completedBookings: 256,
    },
    category: {
      name: 'Fitness',
      slug: 'fitness',
    },
  },
  {
    id: '3',
    title: 'Wedding Photography Package',
    description: 'Complete wedding photography coverage with editing',
    shortDescription: 'Professional wedding photography',
    price: 2500,
    priceType: 'PROJECT' as const,
    duration: 480,
    maxGroupSize: 1,
    images: [],
    rating: 5.0,
    reviewCount: 67,
    instantBooking: false,
    featured: false,
    provider: {
      id: '3',
      businessName: 'Moments Captured Studio',
      verified: true,
      rating: 5.0,
      completedBookings: 128,
    },
    category: {
      name: 'Photography',
      slug: 'photography',
    },
  },
];

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('');
  const router = useRouter();

  const handleSearch = (query: string) => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (location) params.set('location', location);
    
    const searchURL = params.toString() ? `/services?${params.toString()}` : '/services';
    router.push(searchURL);
  };

  const handleCategoryClick = (categoryName: string) => {
    const params = new URLSearchParams();
    params.set('category', categoryName);
    router.push(`/services?${params.toString()}`);
  };

  return (
    <div className="min-h-screen">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Ecosystem
              </Link>
              <Badge variant="secondary" className="ml-2">Beta</Badge>
            </div>
            <nav className="hidden md:flex space-x-8">
              <Link href="/dashboard" className="text-gray-700 hover:text-blue-600 transition-colors">Dashboard</Link>
              <Link href="/services" className="text-gray-700 hover:text-blue-600 transition-colors">Browse Services</Link>
              <Link href="/provider/onboarding" className="text-gray-700 hover:text-blue-600 transition-colors">For Providers</Link>
            </nav>
            <div className="flex items-center space-x-4">
              <Link href="/auth/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/auth/register">
                <Button>Join Now</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-background pt-20 pb-32">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-4" variant="secondary">
              <Zap className="w-3 h-3 mr-1" />
              8% Commission Rate for Early Providers
            </Badge>
            <h1 className="text-5xl font-bold mb-4">
              Find & Book Local Services
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Connect with trusted providers for all your service needs. 
              From home services to events, we've got you covered.
            </p>
          </div>

          {/* Enhanced Search Bar */}
          <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-4">
            <SearchBar
              initialQuery={searchQuery}
              onSearch={handleSearch}
              placeholder="What service are you looking for?"
              showLocation={true}
              location={location}
              onLocationChange={setLocation}
              className="w-full"
            />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold">10K+</div>
              <div className="text-sm text-muted-foreground">Active Providers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">50K+</div>
              <div className="text-sm text-muted-foreground">Happy Customers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">4.8</div>
              <div className="text-sm text-muted-foreground">Average Rating</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">24/7</div>
              <div className="text-sm text-muted-foreground">Support Available</div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">Browse Categories</h2>
              <p className="text-muted-foreground">Find the perfect service for your needs</p>
            </div>
            <Link href="/services">
              <Button variant="outline">
                View All Categories
                <ChevronRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <Card 
                  key={category.id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => handleCategoryClick(category.name)}
                >
                  <CardContent className="p-4 text-center">
                    <div className={`w-12 h-12 ${category.color} rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-sm mb-1">{category.name}</h3>
                    <p className="text-xs text-muted-foreground">{category.count} services</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Services */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">Featured Services</h2>
              <p className="text-muted-foreground">Hand-picked services by our team</p>
            </div>
            <Link href="/services">
              <Button variant="outline">
                View All Services
                <ChevronRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredServices.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onBook={(id) => console.log('Book:', id)}
                onViewDetails={(id) => console.log('View:', id)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Book services in just a few simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">1. Search</h3>
              <p className="text-sm text-muted-foreground">
                Find the perfect service provider in your area
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">2. Book</h3>
              <p className="text-sm text-muted-foreground">
                Choose your preferred date and time
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">3. Pay Securely</h3>
              <p className="text-sm text-muted-foreground">
                Safe payment through our platform
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">4. Rate & Review</h3>
              <p className="text-sm text-muted-foreground">
                Share your experience with others
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4">
            Ready to Grow Your Business?
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Join thousands of providers already using our platform. 
            Lock in our special 8% commission rate today!
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" variant="secondary">
              Become a Provider
            </Button>
            <Button size="lg" variant="outline" className="bg-transparent text-white border-white hover:bg-white hover:text-primary">
              Learn More
            </Button>
          </div>
          <div className="mt-8 flex items-center justify-center gap-8 text-sm opacity-80">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              <span>Verified Providers</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              <span>Grow Your Business</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <span>Reach More Customers</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}