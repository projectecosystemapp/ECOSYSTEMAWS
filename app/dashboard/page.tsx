'use client';

import { getCurrentUser, signOut } from 'aws-amplify/auth';
import { MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { serviceApi, bookingApi, messageApi } from '@/lib/api';


export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      await loadData(currentUser.signInDetails?.loginId || '');
    } catch (error) {
      router.push('/auth/login');
    } finally {
      setLoading(false);
    }
  };

  const loadData = async (email: string) => {
    try {
      // Load services
      const servicesData = await serviceApi.list();
      setServices((servicesData || []) as any);

      // Load bookings for the user
      const bookingsData = await bookingApi.listByCustomer(email);
      setBookings((bookingsData || []) as any);

      // Load unread message count
      const unreadMessages = await messageApi.getUnreadCount(email);
      setUnreadCount(unreadMessages);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  // Subscribe to unread count changes
  useEffect(() => {
    if (!user) return;

    const userEmail = user.signInDetails?.loginId || '';
    const subscription = messageApi.subscribeToUnreadCount(userEmail, setUnreadCount);

    return () => {
      subscription?.unsubscribe();
    };
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Available Services</CardTitle>
                <CardDescription>Browse marketplace services</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{services.length}</div>
                <p className="text-sm text-gray-500 mt-1">Total services</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Your Bookings</CardTitle>
                <CardDescription>Active and past bookings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{bookings.length}</div>
                <p className="text-sm text-gray-500 mt-1">Total bookings</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Commission Rate</CardTitle>
                <CardDescription>Platform fee for providers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">8%</div>
                <p className="text-sm text-gray-500 mt-1">Industry low!</p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-medium mb-4">Recent Services</h2>
            <div className="bg-white shadow rounded-lg">
              {services.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {services.slice(0, 5).map((service: any) => (
                    <li key={service.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <Link href={`/services/${service.id}`} className="block">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 hover:text-blue-600">
                              {service.title}
                            </p>
                            <p className="text-sm text-gray-500">{service.description}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              by {service.providerName}
                            </p>
                          </div>
                          <div className="flex flex-col items-end">
                            <div className="text-sm font-semibold text-gray-900">${service.price}</div>
                            <div className="text-xs text-blue-600">View & Book →</div>
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-4 text-center text-gray-500">
                  No services available yet
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}