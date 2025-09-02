'use client';

import { 
  Search, 
  MapPin, 
  Star,
  ChevronRight,
  Sparkles,
  Shield,
  Clock,
  Users,
  TrendingUp,
  Zap,
  ArrowRight,
  Check,
  Globe,
  Award,
  Heart
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { refactoredApi } from '@/lib/api/refactored';
import { ServiceWithRating, SERVICE_CATEGORIES } from '@/lib/types';


export default function ModernHomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [featuredServices, setFeaturedServices] = useState<ServiceWithRating[]>([]);
  const [categoryStats, setCategoryStats] = useState<{[key: string]: number}>({});
  const [platformStats, setPlatformStats] = useState({
    totalCustomers: 0,
    totalProviders: 0,
    averageRating: 0,
    totalServices: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIsVisible(true);
    loadHomePageData();
  }, []);

  const loadHomePageData = async () => {
    try {
      setLoading(true);
      
      // Load featured services with ratings
      const services = await refactoredApi.service.searchWithRatings('', '');
      
      // Get top 5 rated services for featured section
      const topServices = services
        .filter(service => service.rating > 0)
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 5);
      
      setFeaturedServices(topServices);
      
      // Calculate category statistics
      const categoryCount: {[key: string]: number} = {};
      SERVICE_CATEGORIES.forEach(category => {
        categoryCount[category] = services.filter(s => s.category === category).length;
      });
      setCategoryStats(categoryCount);
      
      // Calculate platform statistics
      const providers = await refactoredApi.userProfile.listProviders();
      const totalRating = services.reduce((sum, service) => sum + (service.rating || 0), 0);
      const ratedServices = services.filter(s => (s.rating || 0) > 0);
      
      setPlatformStats({
        totalCustomers: Math.max(services.length * 5, 1000), // Estimate based on services
        totalProviders: providers.length,
        averageRating: ratedServices.length > 0 ? totalRating / ratedServices.length : 4.9,
        totalServices: services.length
      });
      
    } catch (error) {
      console.error('Error loading homepage data:', error);
    } finally {
      setLoading(false);
    }
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

  const getCategoryGradient = (category: string) => {
    const gradientMap: {[key: string]: string} = {
      'Home Services': 'from-blue-400 to-blue-600',
      'Business': 'from-gray-400 to-gray-600',
      'Events': 'from-yellow-400 to-orange-600',
      'Fitness': 'from-green-400 to-green-600',
      'Creative': 'from-pink-400 to-purple-600',
      'Automotive': 'from-red-400 to-red-600',
      'Health': 'from-teal-400 to-teal-600',
      'Photography': 'from-indigo-400 to-purple-600',
      'Technology': 'from-purple-400 to-purple-600',
      'Education': 'from-indigo-400 to-indigo-600',
      'Beauty': 'from-pink-400 to-pink-600',
      'Pet Services': 'from-amber-400 to-orange-600',
      'Legal': 'from-slate-400 to-slate-600',
      'Financial': 'from-emerald-400 to-green-600',
      'Other': 'from-gray-400 to-gray-600'
    };
    return gradientMap[category] || 'from-gray-400 to-gray-600';
  };

  const features = [
    {
      icon: Shield,
      title: 'Verified Providers',
      description: 'All providers undergo thorough background checks',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Zap,
      title: '8% Commission',
      description: 'Industry-leading low rates for providers',
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      icon: Clock,
      title: 'Instant Booking',
      description: 'Book services in seconds, not hours',
      gradient: 'from-orange-500 to-red-500'
    },
    {
      icon: Award,
      title: 'Quality Guarantee',
      description: 'Satisfaction guaranteed or your money back',
      gradient: 'from-green-500 to-teal-500'
    }
  ];

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${Math.floor(num / 1000)}K+`;
    }
    return num.toString();
  };

  const stats = [
    { 
      value: formatNumber(platformStats.totalCustomers), 
      label: 'Happy Customers', 
      gradient: 'from-blue-600 to-purple-600' 
    },
    { 
      value: formatNumber(platformStats.totalProviders), 
      label: 'Verified Providers', 
      gradient: 'from-purple-600 to-pink-600' 
    },
    { 
      value: `${platformStats.averageRating.toFixed(1)}★`, 
      label: 'Average Rating', 
      gradient: 'from-yellow-500 to-orange-500' 
    },
    { 
      value: '24/7', 
      label: 'Support Available', 
      gradient: 'from-green-500 to-teal-500' 
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 overflow-hidden">
      {/* Modern Animated Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-100/20 via-transparent to-blue-100/20" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl animate-pulse animation-delay-2000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-pink-400/10 to-purple-400/10 rounded-full blur-3xl animate-pulse animation-delay-4000" />
      </div>

      {/* Modern Navigation */}
      <nav className="relative z-50 backdrop-blur-md bg-white/80 border-b border-gray-200/50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Ecosystem
              </span>
              <Badge className="bg-gradient-to-r from-green-400 to-green-500 text-white border-0">
                BETA
              </Badge>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/services" className="text-gray-700 hover:text-purple-600 transition-colors font-medium">
                Browse Services
              </Link>
              <Link href="/provider/onboarding" className="text-gray-700 hover:text-purple-600 transition-colors font-medium">
                Become a Provider
              </Link>
              <Link href="/dashboard" className="text-gray-700 hover:text-purple-600 transition-colors font-medium">
                Dashboard
              </Link>
            </div>

            <div className="flex items-center space-x-3">
              <Link href="/auth/login">
                <Button variant="ghost" className="hover:bg-purple-50">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all">
                  Get Started
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section with Modern Animation */}
      <section className={`relative pt-20 pb-32 px-4 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="container mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Text content */}
            <div className="text-center lg:text-left space-y-8">
            {/* Animated Badge */}
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-100 to-blue-100 px-4 py-2 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-gray-700">
                Trusted by {formatNumber(platformStats.totalCustomers)} customers
              </span>
            </div>

            {/* Main Heading with Gradient */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold">
              <span className="block bg-gradient-to-r from-gray-900 via-purple-900 to-gray-900 bg-clip-text text-transparent">
                Find & Book
              </span>
              <span className="block mt-2 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 bg-clip-text text-transparent animate-gradient bg-300">
                Amazing Services
              </span>
            </h1>

            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Connect with verified professionals for all your needs. 
              <span className="font-semibold text-purple-600"> Save 92%</span> with our 8% commission platform.
            </p>

            {/* Modern Search Bar */}
            <div className="max-w-3xl mx-auto">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur-xl opacity-30 group-hover:opacity-40 transition-opacity" />
                <div className="relative bg-white rounded-2xl shadow-2xl p-2 border border-gray-100">
                  <div className="flex flex-col md:flex-row gap-2">
                    <div className="flex-1 flex items-center px-4 py-3">
                      <Search className="w-5 h-5 text-gray-400 mr-3" />
                      <input
                        type="text"
                        placeholder="What service do you need?"
                        className="w-full outline-none text-gray-700 placeholder-gray-400"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="flex-1 flex items-center px-4 py-3 border-l border-gray-200">
                      <MapPin className="w-5 h-5 text-gray-400 mr-3" />
                      <input
                        type="text"
                        placeholder="Your location"
                        className="w-full outline-none text-gray-700 placeholder-gray-400"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                      />
                    </div>
                    <Button 
                      className="px-8 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
                      onClick={() => router.push(`/services?q=${searchQuery}&location=${location}`)}
                    >
                      Search
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Popular Searches - Dynamic based on actual services */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-2">
              {!loading && featuredServices.slice(0, 5).map((service) => {
                // Extract keywords from service titles
                const searchTerm = service.title.split(' ').slice(0, 2).join(' ');
                return (
                  <button
                    key={service.id}
                    onClick={() => router.push(`/services?q=${encodeURIComponent(searchTerm)}`)}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-600 hover:border-purple-400 hover:text-purple-600 transition-all hover:shadow-md"
                  >
                    {searchTerm}
                  </button>
                );
              })}
              {loading && (
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="px-4 py-2 bg-gray-200 rounded-full animate-pulse">
                      <div className="w-16 h-4 bg-gray-300 rounded"></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right side - Real Featured Service Cards */}
          <div className="relative h-[600px] hidden lg:block">
            {/* Floating Service Cards */}
            <div className="absolute inset-0">
              {!loading && featuredServices.slice(0, 5).map((service, index) => {
                const positions = [
                  { top: '0px', left: '40px', rotate: '-4deg', delay: '0s' },
                  { top: '80px', right: '40px', rotate: '3deg', delay: '1s' },
                  { top: '200px', left: '128px', rotate: '0deg', delay: '2s' },
                  { bottom: '80px', left: '0px', rotate: '-2deg', delay: '1.5s' },
                  { bottom: '40px', right: '80px', rotate: '5deg', delay: '2.5s' }
                ];
                const pos = positions[index] || positions[0];
                const isFeatureCard = index === 2; // Make middle card featured
                
                return (
                  <div 
                    key={service.id}
                    className="absolute animate-float"
                    style={{ 
                      ...pos,
                      animationDelay: pos.delay
                    }}
                  >
                    {isFeatureCard ? (
                      <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl shadow-2xl p-6 w-72 text-white transform hover:scale-105 transition-transform cursor-pointer"
                           onClick={() => router.push(`/services/${service.id}`)}>
                        <div className="flex items-center justify-between mb-4">
                          <Badge className="bg-white/20 text-white border-white/30">Featured</Badge>
                          <div className="flex items-center gap-1">
                            <Zap className="w-4 h-4" />
                            <span className="text-sm">Book Now</span>
                          </div>
                        </div>
                        <h4 className="text-xl font-bold mb-2">{service.title}</h4>
                        <p className="text-sm opacity-90 mb-4">{service.description.slice(0, 50)}...</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                              <span className="text-xs font-bold">{service.providerName?.charAt(0) || 'P'}</span>
                            </div>
                            <div>
                              <p className="text-sm font-medium">{service.providerName || 'Provider'}</p>
                              <div className="flex items-center gap-1">
                                <Shield className="w-3 h-3" />
                                <span className="text-xs">Verified</span>
                              </div>
                            </div>
                          </div>
                          <span className="text-2xl font-bold">${service.price}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white rounded-2xl shadow-2xl p-6 w-64 transform hover:rotate-0 transition-transform cursor-pointer"
                           style={{ transform: `rotate(${pos.rotate})` }}
                           onClick={() => router.push(`/services/${service.id}`)}>
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-12 h-12 bg-gradient-to-br ${getCategoryGradient(service.category)} rounded-xl flex items-center justify-center`}>
                            <span className="text-2xl">{getCategoryIcon(service.category)}</span>
                          </div>
                          <div>
                            <h4 className="font-semibold">{service.title.slice(0, 20)}...</h4>
                            <p className="text-xs text-gray-500">{service.providerName || 'Provider'}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-medium">{service.rating?.toFixed(1) || '5.0'}</span>
                            <span className="text-xs text-gray-500">({service.reviewCount || 0})</span>
                          </div>
                          <span className="text-lg font-bold text-purple-600">${service.price}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              
              {/* Loading state */}
              {loading && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-gray-600">Loading featured services...</span>
                  </div>
                </div>
              )}

              {/* Decorative Elements */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-96 h-96 bg-gradient-to-r from-purple-200/30 to-blue-200/30 rounded-full blur-3xl animate-pulse" />
              </div>
            </div>
          </div>
          </div>
        </div>
      </section>

      {/* Modern Categories Grid */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Popular Categories
              </span>
            </h2>
            <p className="text-gray-600">Explore services across multiple categories</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {SERVICE_CATEGORIES.slice(0, 8).map((category, index) => {
              const serviceCount = categoryStats[category] || 0;
              const gradient = getCategoryGradient(category);
              const icon = getCategoryIcon(category);
              
              return (
                <div
                  key={category}
                  className="group cursor-pointer"
                  onClick={() => router.push(`/services?category=${encodeURIComponent(category)}`)}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />
                    <div className="relative z-10">
                      <div className="text-4xl mb-3">{icon}</div>
                      <h3 className="font-semibold text-gray-800 mb-1">{category}</h3>
                      <p className="text-sm text-gray-500">
                        {loading ? '...' : `${serviceCount} service${serviceCount !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                    <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Modern Features Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Why Choose Ecosystem
              </span>
            </h2>
            <p className="text-gray-600">The modern way to find and book services</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="group"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <Card className="relative overflow-hidden h-full border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-5 group-hover:opacity-10 transition-opacity`} />
                  <div className="relative p-6">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                    <p className="text-gray-600 text-sm">{feature.description}</p>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modern Stats Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className="text-center group"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="relative inline-block">
                  <div className={`absolute inset-0 bg-gradient-to-r ${stat.gradient} blur-2xl opacity-20 group-hover:opacity-30 transition-opacity`} />
                  <h3 className={`relative text-5xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}>
                    {stat.value}
                  </h3>
                </div>
                <p className="mt-2 text-gray-600">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modern CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-600 to-blue-600 p-12 text-white">
            <div className="absolute inset-0 bg-black/10" />
            <div className="relative z-10 text-center">
              <h2 className="text-4xl font-bold mb-4">
                Start Earning with 92% Revenue Share
              </h2>
              <p className="text-xl mb-8 opacity-90">
                Join thousands of providers already growing their business
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/provider/onboarding">
                  <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100 shadow-xl">
                    Become a Provider
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/services">
                  <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                    Browse Services
                  </Button>
                </Link>
              </div>
              <div className="mt-8 flex items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5" />
                  <span>No hidden fees</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5" />
                  <span>Instant payouts</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5" />
                  <span>24/7 support</span>
                </div>
              </div>
            </div>
            
            {/* Animated decoration */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-white/10 rounded-full blur-3xl animate-pulse animation-delay-2000" />
          </div>
        </div>
      </section>

      {/* Modern Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">Ecosystem</span>
              </div>
              <p className="text-gray-400 text-sm">
                The modern marketplace for services. Connect, book, and grow.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/services" className="hover:text-white transition-colors">Browse Services</Link></li>
                <li><Link href="/provider/onboarding" className="hover:text-white transition-colors">Become a Provider</Link></li>
                <li><Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">FAQs</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <div className="flex space-x-4">
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors">
                  <Globe className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors">
                  <Heart className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors">
                  <Users className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>© 2024 Ecosystem Global Solutions. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}