'use client';

import { getCurrentUser } from 'aws-amplify/auth';
import { 
  Calendar, 
  Clock, 
  Star, 
  MapPin, 
  DollarSign,
  User,
  Plus,
  ArrowRight,
  BookOpen,
  Heart,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { refactoredApi } from '@/lib/api/refactored';
import type { Booking, Service, UserProfile } from '@/lib/types';
import { formatTimeSlot, getStatusColor, getStatusText } from '@/lib/types';

interface DashboardStats {
  totalBookings: number;
  upcomingBookings: number;
  completedBookings: number;
  savedProviders: number;
}

export default function CustomerDashboard() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    upcomingBookings: 0,
    completedBookings: 0,
    savedProviders: 0
  });
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [recommendedServices, setRecommendedServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const currentUser = await getCurrentUser();
      const email = currentUser.signInDetails?.loginId;
      
      if (email) {
        // Load user profile
        const userProfile = await refactoredApi.userProfile.get(email);
        setUser(userProfile);

        // Load bookings
        const bookings = await refactoredApi.booking.listByCustomer(email);
        
        // Calculate stats
        const now = new Date();
        const upcoming = bookings?.filter(booking => {
          const bookingDate = new Date(`${booking.scheduledDate}T${booking.scheduledTime}`);
          return bookingDate >= now && (booking.status === 'CONFIRMED' || booking.status === 'PENDING');
        }) || [];
        
        const completed = bookings?.filter(booking => booking.status === 'COMPLETED') || [];

        setStats({
          totalBookings: bookings?.length || 0,
          upcomingBookings: nullableToString(upcoming.length),
          completedBookings: nullableToString(completed.length),
          savedProviders: 0 // TODO: Implement saved providers
        });

        setUpcomingBookings(upcoming.slice(0, 3));
        setRecentBookings(completed.slice(-3).reverse());

        // Load recommended services (mock for now)
        const services = await refactoredApi.service.list();
        setRecommendedServices(services?.slice(0, 3) || []);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {getGreeting()}{user?.firstName ? `, ${user.firstName}` : ''}!
          </h1>
          <p className="text-gray-600 mt-2">
            Welcome to your customer dashboard. Manage your bookings and discover new services.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalBookings}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.upcomingBookings}</div>
              <p className="text-xs text-muted-foreground">Next 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedBookings}</div>
              <p className="text-xs text-muted-foreground">Services used</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saved Providers</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.savedProviders}</div>
              <p className="text-xs text-muted-foreground">Favorites</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Bookings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upcoming Bookings */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Upcoming Bookings</CardTitle>
                  <Link href="/customer/bookings">
                    <Button variant="outline" size="sm">
                      View All
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {upcomingBookings.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No upcoming bookings</h3>
                    <p className="text-gray-500 mb-4">Discover amazing services to book your next appointment</p>
                    <Link href="/services">
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Browse Services
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingBookings.map((booking) => (
                      <div key={booking.id} className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <Calendar className="h-6 w-6 text-blue-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              Service Booking
                            </p>
                            <Badge className={getStatusColor(booking.status)}>
                              {getStatusText(booking.status)}
                            </Badge>
                          </div>
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <User className="h-4 w-4 mr-1" />
                            {booking.providerEmail}
                            <span className="mx-2">•</span>
                            <span>{formatDate(booking.scheduledDate)} at {booking.scheduledTime}</span>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <Link href={`/bookings/${booking.id}`}>
                            <Button variant="ghost" size="sm">
                              Details
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            {recentBookings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentBookings.map((booking) => (
                      <div key={booking.id} className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            Completed service booking
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDate(booking.scheduledDate)} • ${booking.totalAmount}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <Button variant="ghost" size="sm">
                            <Star className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Quick Actions & Recommendations */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/services" className="block">
                  <Button className="w-full justify-start">
                    <Plus className="mr-2 h-4 w-4" />
                    Book New Service
                  </Button>
                </Link>
                <Link href="/customer/bookings" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="mr-2 h-4 w-4" />
                    View My Bookings
                  </Button>
                </Link>
                <Link href="/customer/profile" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <User className="mr-2 h-4 w-4" />
                    Edit Profile
                  </Button>
                </Link>
                <Link href="/customer/saved" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Heart className="mr-2 h-4 w-4" />
                    Saved Providers
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Recommended Services */}
            <Card>
              <CardHeader>
                <CardTitle>Recommended for You</CardTitle>
                <CardDescription>Popular services in your area</CardDescription>
              </CardHeader>
              <CardContent>
                {recommendedServices.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No recommendations available
                  </p>
                ) : (
                  <div className="space-y-4">
                    {recommendedServices.map((service) => (
                      <div key={service.id} className="border rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{service.title}</h4>
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                              {service.description}
                            </p>
                            <div className="flex items-center mt-2 text-sm text-gray-600">
                              <DollarSign className="h-4 w-4 mr-1" />
                              ${service.price}
                              {service.serviceCity && (
                                <>
                                  <span className="mx-2">•</span>
                                  <MapPin className="h-4 w-4 mr-1" />
                                  {service.serviceCity}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="mt-3">
                          <Link href={`/services/${service.id}`}>
                            <Button size="sm" className="w-full">
                              View Details
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}