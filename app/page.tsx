'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

export default function ModernHomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const categories = [
    { name: 'Home Services', icon: '🏠', gradient: 'from-blue-400 to-blue-600', services: 245 },
    { name: 'Fitness', icon: '💪', gradient: 'from-green-400 to-green-600', services: 134 },
    { name: 'Beauty', icon: '✨', gradient: 'from-pink-400 to-pink-600', services: 189 },
    { name: 'Tech', icon: '💻', gradient: 'from-purple-400 to-purple-600', services: 98 },
    { name: 'Events', icon: '🎉', gradient: 'from-yellow-400 to-orange-600', services: 156 },
    { name: 'Education', icon: '📚', gradient: 'from-indigo-400 to-indigo-600', services: 87 },
  ];

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

  const stats = [
    { value: '50K+', label: 'Happy Customers', gradient: 'from-blue-600 to-purple-600' },
    { value: '10K+', label: 'Verified Providers', gradient: 'from-purple-600 to-pink-600' },
    { value: '4.9★', label: 'Average Rating', gradient: 'from-yellow-500 to-orange-500' },
    { value: '24/7', label: 'Support Available', gradient: 'from-green-500 to-teal-500' },
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
              <span className="text-sm font-medium text-gray-700">Trusted by 50,000+ customers</span>
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

            {/* Popular Searches */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-2">
              {['House Cleaning', 'Personal Training', 'Web Design', 'Photography', 'Tutoring'].map((term) => (
                <button
                  key={term}
                  onClick={() => router.push(`/services?q=${term}`)}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-600 hover:border-purple-400 hover:text-purple-600 transition-all hover:shadow-md"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>

          {/* Right side - Animated Service Cards */}
          <div className="relative h-[600px] hidden lg:block">
            {/* Floating Service Cards */}
            <div className="absolute inset-0">
              {/* Card 1 - Top Left */}
              <div className="absolute top-0 left-10 animate-float" style={{ animationDelay: '0s' }}>
                <div className="bg-white rounded-2xl shadow-2xl p-6 w-64 transform rotate-[-4deg] hover:rotate-0 transition-transform">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                      <span className="text-2xl">🏠</span>
                    </div>
                    <div>
                      <h4 className="font-semibold">Home Cleaning</h4>
                      <p className="text-xs text-gray-500">Sarah M.</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">4.9</span>
                      <span className="text-xs text-gray-500">(127)</span>
                    </div>
                    <span className="text-lg font-bold text-purple-600">$80</span>
                  </div>
                </div>
              </div>

              {/* Card 2 - Top Right */}
              <div className="absolute top-20 right-10 animate-float" style={{ animationDelay: '1s' }}>
                <div className="bg-white rounded-2xl shadow-2xl p-6 w-64 transform rotate-[3deg] hover:rotate-0 transition-transform">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                      <span className="text-2xl">💪</span>
                    </div>
                    <div>
                      <h4 className="font-semibold">Personal Training</h4>
                      <p className="text-xs text-gray-500">Mike T.</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">5.0</span>
                      <span className="text-xs text-gray-500">(89)</span>
                    </div>
                    <span className="text-lg font-bold text-green-600">$65/hr</span>
                  </div>
                </div>
              </div>

              {/* Card 3 - Middle */}
              <div className="absolute top-52 left-32 animate-float" style={{ animationDelay: '2s' }}>
                <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl shadow-2xl p-6 w-72 text-white transform hover:scale-105 transition-transform">
                  <div className="flex items-center justify-between mb-4">
                    <Badge className="bg-white/20 text-white border-white/30">Featured</Badge>
                    <div className="flex items-center gap-1">
                      <Zap className="w-4 h-4" />
                      <span className="text-sm">Instant Book</span>
                    </div>
                  </div>
                  <h4 className="text-xl font-bold mb-2">Wedding Photography</h4>
                  <p className="text-sm opacity-90 mb-4">Capture your special moments</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img src="https://ui-avatars.com/api/?name=Emma&background=white&color=purple" className="w-8 h-8 rounded-full" alt="Provider" />
                      <div>
                        <p className="text-sm font-medium">Emma Studios</p>
                        <div className="flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          <span className="text-xs">Verified</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-2xl font-bold">$2.5k</span>
                  </div>
                </div>
              </div>

              {/* Card 4 - Bottom Left */}
              <div className="absolute bottom-20 left-0 animate-float" style={{ animationDelay: '1.5s' }}>
                <div className="bg-white rounded-2xl shadow-2xl p-6 w-64 transform rotate-[-2deg] hover:rotate-0 transition-transform">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center">
                      <span className="text-2xl">✨</span>
                    </div>
                    <div>
                      <h4 className="font-semibold">Beauty Services</h4>
                      <p className="text-xs text-gray-500">Lisa Beauty</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">4.8</span>
                      <span className="text-xs text-gray-500">(203)</span>
                    </div>
                    <span className="text-lg font-bold text-pink-600">$120</span>
                  </div>
                </div>
              </div>

              {/* Card 5 - Bottom Right */}
              <div className="absolute bottom-10 right-20 animate-float" style={{ animationDelay: '2.5s' }}>
                <div className="bg-white rounded-2xl shadow-2xl p-6 w-64 transform rotate-[5deg] hover:rotate-0 transition-transform">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                      <span className="text-2xl">🎉</span>
                    </div>
                    <div>
                      <h4 className="font-semibold">Event Planning</h4>
                      <p className="text-xs text-gray-500">Party Pro</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">4.7</span>
                      <span className="text-xs text-gray-500">(156)</span>
                    </div>
                    <span className="text-lg font-bold text-orange-600">$500</span>
                  </div>
                </div>
              </div>

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
            {categories.map((category, index) => (
              <div
                key={category.name}
                className="group cursor-pointer"
                onClick={() => router.push(`/services?category=${category.name}`)}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                  <div className={`absolute inset-0 bg-gradient-to-br ${category.gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />
                  <div className="relative z-10">
                    <div className="text-4xl mb-3">{category.icon}</div>
                    <h3 className="font-semibold text-gray-800 mb-1">{category.name}</h3>
                    <p className="text-sm text-gray-500">{category.services} services</p>
                  </div>
                  <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${category.gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform`} />
                </div>
              </div>
            ))}
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