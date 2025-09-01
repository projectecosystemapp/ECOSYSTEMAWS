'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCurrentUser } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import { refactoredApi } from '@/lib/api/refactored';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import LoadingSpinner from '@/components/provider/LoadingSpinner';
import { Service, Booking, ProviderStats, LoadingStates } from '@/lib/types';
import { ExternalLink, DollarSign, CreditCard, AlertCircle } from 'lucide-react';

const client = generateClient<Schema>();

export default function ProviderDashboard() {
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stripeAccount, setStripeAccount] = useState<any>(null);
  const [showOnboardingBanner, setShowOnboardingBanner] = useState(false);
  const [stats, setStats] = useState<ProviderStats>({
    totalServices: 0,
    activeServices: 0,
    totalBookings: 0,
    activeBookings: 0,
    totalEarnings: 0,
    monthlyEarnings: 0
  });
  const [loading, setLoading] = useState<LoadingStates>({
    services: true,
    bookings: true,
    stats: true,
    saving: false,
    deleting: false
  });
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const user = await getCurrentUser();
      const email = user.signInDetails?.loginId;

      if (!email) {
        setError('User not authenticated');
        return;
      }

      // Check if provider has completed their profile
      try {
        const { data: users } = await client.models.User.list({
          filter: { ownerId: { eq: user.userId } }
        });
        
        const userRecord = users?.[0];
        
        if (userRecord?.accountType === 'PROVIDER') {
          // Check if ProviderProfile exists
          const { data: providerProfiles } = await client.models.ProviderProfile.list({
            filter: { ownerId: { eq: user.userId } }
          });
          
          if (!providerProfiles || providerProfiles.length === 0) {
            setShowOnboardingBanner(true);
          }
        }
      } catch (error) {
        console.log('Error checking provider profile:', error);
      }

      // Load Stripe account status
      try {
        const stripeResponse = await fetch('/api/stripe/connect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'CHECK_ACCOUNT_STATUS',
            providerId: user.userId,
          }),
        });
        
        if (stripeResponse.ok) {
          const stripeData = await stripeResponse.json();
          setStripeAccount(stripeData);
        }
      } catch (error) {
        console.log('Stripe account not connected yet');
      }

      // Load services
      setLoading(prev => ({ ...prev, services: true }));
      const servicesData = await refactoredApi.service.listByProvider(email);
      setServices(servicesData || []);

      // Load bookings
      setLoading(prev => ({ ...prev, bookings: true }));
      const bookingsData = await refactoredApi.booking.listByProvider(email);
      setBookings(bookingsData || []);

      // Calculate stats
      const totalServices = servicesData?.length || 0;
      const activeServices = servicesData?.filter(s => s.active).length || 0;
      const totalBookings = bookingsData?.length || 0;
      const activeBookings = bookingsData?.filter(b => 
        b.status === 'PENDING' || b.status === 'CONFIRMED'
      ).length || 0;

      // Calculate earnings (simplified - in real app would use payment data)
      const totalEarnings = bookingsData?.reduce((sum, booking: any) => {
        if (booking.status === 'COMPLETED') {
          return sum + (booking.totalAmount || booking.amount || 0);
        }
        return sum;
      }, 0) || 0;

      // Calculate monthly earnings (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const monthlyEarnings = bookingsData?.reduce((sum, booking: any) => {
        if (booking.status === 'COMPLETED' && booking.createdAt) {
          const bookingDate = new Date(booking.createdAt);
          if (bookingDate >= thirtyDaysAgo) {
            return sum + (booking.totalAmount || booking.amount || 0);
          }
        }
        return sum;
      }, 0) || 0;

      setStats({
        totalServices,
        activeServices,
        totalBookings,
        activeBookings,
        totalEarnings,
        monthlyEarnings
      });

    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading({
        services: false,
        bookings: false,
        stats: false,
        saving: false,
        deleting: false
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getRecentServices = () => {
    return services
      .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
      .slice(0, 3);
  };

  const getRecentBookings = () => {
    return bookings
      .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
      .slice(0, 5);
  };

  if (loading.services || loading.bookings) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LoadingSpinner message="Loading dashboard..." className="h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-700">{error}</p>
          <Button onClick={loadDashboardData} className="mt-2">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Onboarding Banner */}
        {showOnboardingBanner && (
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-900">Welcome to Ecosystem!</AlertTitle>
            <AlertDescription className="text-blue-800">
              Complete your public profile to start accepting bookings from customers.
            </AlertDescription>
            <Button className="mt-4" asChild>
              <Link href="/provider/onboarding/profile">Complete Profile</Link>
            </Button>
          </Alert>
        )}

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Provider Dashboard</h1>
          <p className="text-gray-600">Manage your services and track your business</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Services</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.totalServices}</div>
              <p className="text-sm text-gray-500">
                {stats.activeServices} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.activeBookings}</div>
              <p className="text-sm text-gray-500">
                {stats.totalBookings} total bookings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Monthly Earnings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.monthlyEarnings)}
              </div>
              <p className="text-sm text-gray-500">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Earnings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.totalEarnings)}
              </div>
              <p className="text-sm text-green-600">92% after 8% commission</p>
            </CardContent>
          </Card>
        </div>

        {/* Stripe Connect Status */}
        {stripeAccount && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Payment Account Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div>
                    <p className="font-medium">Stripe Connect Account</p>
                    <p className="text-sm text-muted-foreground">ID: {stripeAccount.accountId}</p>
                  </div>
                  <div className="flex space-x-2">
                    <Badge variant={stripeAccount.chargesEnabled ? "default" : "secondary"}>
                      {stripeAccount.chargesEnabled ? "Payments Enabled" : "Payments Disabled"}
                    </Badge>
                    <Badge variant={stripeAccount.payoutsEnabled ? "default" : "secondary"}>
                      {stripeAccount.payoutsEnabled ? "Payouts Enabled" : "Payouts Disabled"}
                    </Badge>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => window.open(`https://dashboard.stripe.com/connect/accounts/${stripeAccount.accountId}`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Stripe Dashboard
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.open('/provider/earnings', '_blank')}
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    View Earnings
                  </Button>
                </div>
              </div>
              
              {stripeAccount.requirements && stripeAccount.requirements.currently_due?.length > 0 && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="font-medium text-yellow-800 mb-2">Action Required</p>
                  <p className="text-sm text-yellow-700">
                    Complete your Stripe onboarding to continue receiving payments.
                  </p>
                  <Button 
                    className="mt-2" 
                    size="sm"
                    onClick={() => window.open('/provider/onboarding?step=stripe', '_blank')}
                  >
                    Complete Setup
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Actions with Prominent Add Service */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          
          {/* Prominent Add Service Card */}
          {services.length === 0 && (
            <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Start Offering Your Services
                    </h3>
                    <p className="text-gray-600">
                      Create your first service listing to start receiving bookings from customers.
                    </p>
                  </div>
                  <Link href="/provider/services/new">
                    <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Create Your First Service
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/provider/services/new" className="block">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-blue-500 bg-blue-50">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-blue-900">Add New Service</h3>
                  <p className="text-sm text-blue-700 mt-1">Create a service listing</p>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/provider/services" className="block">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </div>
                  <h3 className="font-semibold">Manage Services</h3>
                  <p className="text-sm text-gray-500 mt-1">Edit your listings</p>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/provider/bookings" className="block">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold">View Bookings</h3>
                  <p className="text-sm text-gray-500 mt-1">Manage appointments</p>
                </CardContent>
              </Card>
            </Link>
            
            {!stripeAccount && (
              <Link href="/provider/onboarding?step=stripe" className="block">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer border-amber-200 bg-amber-50">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CreditCard className="w-6 h-6 text-amber-600" />
                    </div>
                    <h3 className="font-semibold text-amber-900">Setup Payments</h3>
                    <p className="text-sm text-amber-700 mt-1">Connect Stripe</p>
                  </CardContent>
                </Card>
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Services */}
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Recent Services</span>
                <Link href="/provider/services">
                  <Button variant="outline" size="sm">
                    View All
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {getRecentServices().length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No services yet</p>
                  <Link href="/provider/services/new">
                    <Button>Create Your First Service</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {getRecentServices().map((service) => (
                    <div key={service.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                      <div>
                        <h3 className="font-medium text-gray-900">{service.title}</h3>
                        <p className="text-sm text-gray-500">
                          {formatCurrency(service.price || 0)} • {service.category}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          service.active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {service.active ? 'Active' : 'Inactive'}
                        </span>
                        <Link href={`/provider/services/${service.id}/edit`}>
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Bookings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Recent Bookings</span>
                <Link href="/provider/bookings">
                  <Button variant="outline" size="sm">
                    View All
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {getRecentBookings().length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No bookings yet</p>
                  <p className="text-sm text-gray-400">Bookings will appear here once customers book your services</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {getRecentBookings().map((booking) => (
                    <div key={booking.id} className="p-3 bg-gray-50 rounded-md">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">
                            {booking.customerEmail}
                          </p>
                          <p className="text-sm text-gray-500">
                            {booking.scheduledDate} at {booking.scheduledTime}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">
                            {formatCurrency(booking.totalAmount || 0)}
                          </p>
                          <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                            booking.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
                            booking.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                            booking.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {booking.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
  );
}