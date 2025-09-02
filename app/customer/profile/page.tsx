'use client';

import { getCurrentUser } from 'aws-amplify/auth';
import { 
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Edit,
  Save,
  X,
  Camera,
  Shield,
  Bell,
  CreditCard,
  Settings,
  Star,
  Calendar,
  DollarSign
} from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { refactoredApi } from '@/lib/api/refactored';
import type { UserProfile } from '@/lib/types';


interface ProfileFormData {
  firstName: string;
  lastName: string;
  phone: string;
  bio: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

interface NotificationPreferences {
  email: {
    bookingConfirmations: boolean;
    bookingReminders: boolean;
    providerMessages: boolean;
    promotions: boolean;
  };
  sms: {
    bookingConfirmations: boolean;
    bookingReminders: boolean;
    providerMessages: boolean;
  };
}

export default function CustomerProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  
  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: '',
    lastName: '',
    phone: '',
    bio: '',
    city: '',
    state: '',
    country: 'United States',
    postalCode: ''
  });

  const [notifications, setNotifications] = useState<NotificationPreferences>({
    email: {
      bookingConfirmations: true,
      bookingReminders: true,
      providerMessages: true,
      promotions: false
    },
    sms: {
      bookingConfirmations: true,
      bookingReminders: true,
      providerMessages: false
    }
  });

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const currentUser = await getCurrentUser();
      const email = currentUser.signInDetails?.loginId;
      
      if (email) {
        const userProfile = await refactoredApi.userProfile.get(email);
        
        if (userProfile) {
          setUser(userProfile);
          setFormData({
            firstName: userProfile.firstName || '',
            lastName: userProfile.lastName || '',
            phone: userProfile.phone || '',
            bio: userProfile.bio || '',
            city: userProfile.city || '',
            state: userProfile.state || '',
            country: userProfile.country || 'United States',
            postalCode: userProfile.postalCode || ''
          });
          
          // Load notification preferences
          if (userProfile.notificationPreferences) {
            setNotifications(userProfile.notificationPreferences);
          }
        } else {
          // Create a basic profile if one doesn't exist
          const newProfile: Partial<UserProfile> = {
            email,
            firstName: '',
            lastName: '',
            role: 'CUSTOMER',
            active: true
          };
          
          const createdProfile = await refactoredApi.userProfile.create(newProfile);
          if (createdProfile) {
            setUser(createdProfile);
          }
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      setSaving(true);
      
      const updatedProfile = await refactoredApi.userProfile.update({
        id: user.id,
        ...formData,
        notificationPreferences: notifications
      });

      if (updatedProfile) {
        setUser(updatedProfile);
        setEditing(false);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNotificationChange = (
    category: 'email' | 'sms',
    setting: string,
    value: boolean
  ) => {
    setNotifications(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: value
      }
    }));
  };

  const getFullName = () => {
    const first = user?.firstName || formData.firstName;
    const last = user?.lastName || formData.lastName;
    return first || last ? `${first} ${last}`.trim() : 'Customer';
  };

  const getLocation = () => {
    const city = user?.city || formData.city;
    const state = user?.state || formData.state;
    return city && state ? `${city}, ${state}` : city || state || '';
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Link href="/customer/dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-2">
            Manage your personal information and preferences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Profile Summary Card */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="relative inline-block">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      {user?.profilePicture ? (
                        <img
                          src={user.profilePicture}
                          alt="Profile"
                          className="w-20 h-20 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-10 w-10 text-blue-600" />
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0"
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <h3 className="font-semibold text-lg">{getFullName()}</h3>
                  <p className="text-sm text-gray-600">{user?.email}</p>
                  
                  {getLocation() && (
                    <div className="flex items-center justify-center mt-2 text-sm text-gray-500">
                      <MapPin className="h-4 w-4 mr-1" />
                      {getLocation()}
                    </div>
                  )}

                  <Badge variant="outline" className="mt-3">
                    Customer
                  </Badge>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Member Since</div>
                    <div className="font-medium">
                      {user?.createdAt 
                        ? new Date(user.createdAt).toLocaleDateString('en-US', {
                            month: 'long',
                            year: 'numeric'
                          })
                        : 'Recently'
                      }
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs defaultValue={activeTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="preferences">Preferences</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
              </TabsList>

              {/* Profile Tab */}
              <TabsContent value="profile" className="mt-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Personal Information</CardTitle>
                        <CardDescription>
                          Update your personal details and contact information
                        </CardDescription>
                      </div>
                      {!editing ? (
                        <Button onClick={() => setEditing(true)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      ) : (
                        <div className="flex space-x-2">
                          <Button onClick={() => setEditing(false)} variant="outline">
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                          <Button onClick={handleSaveProfile} disabled={saving}>
                            <Save className="h-4 w-4 mr-2" />
                            {saving ? 'Saving...' : 'Save'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={formData.firstName}
                          onChange={(e) => handleInputChange('firstName', e.target.value)}
                          disabled={!editing}
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={formData.lastName}
                          onChange={(e) => handleInputChange('lastName', e.target.value)}
                          disabled={!editing}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        value={user?.email || ''}
                        disabled
                        className="bg-gray-50"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Email cannot be changed
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        disabled={!editing}
                        placeholder="(555) 123-4567"
                      />
                    </div>

                    <div>
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={formData.bio}
                        onChange={(e) => handleInputChange('bio', e.target.value)}
                        disabled={!editing}
                        placeholder="Tell us a bit about yourself..."
                        rows={3}
                      />
                    </div>

                    {/* Location Info */}
                    <div className="space-y-4">
                      <h4 className="font-medium">Location</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="city">City</Label>
                          <Input
                            id="city"
                            value={formData.city}
                            onChange={(e) => handleInputChange('city', e.target.value)}
                            disabled={!editing}
                          />
                        </div>
                        <div>
                          <Label htmlFor="state">State</Label>
                          <Input
                            id="state"
                            value={formData.state}
                            onChange={(e) => handleInputChange('state', e.target.value)}
                            disabled={!editing}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="country">Country</Label>
                          <Input
                            id="country"
                            value={formData.country}
                            onChange={(e) => handleInputChange('country', e.target.value)}
                            disabled={!editing}
                          />
                        </div>
                        <div>
                          <Label htmlFor="postalCode">Postal Code</Label>
                          <Input
                            id="postalCode"
                            value={formData.postalCode}
                            onChange={(e) => handleInputChange('postalCode', e.target.value)}
                            disabled={!editing}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Preferences Tab */}
              <TabsContent value="preferences" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Notification Preferences</CardTitle>
                    <CardDescription>
                      Choose how you want to be notified about your bookings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Email Notifications */}
                    <div>
                      <div className="flex items-center space-x-2 mb-4">
                        <Mail className="h-5 w-5" />
                        <h4 className="font-medium">Email Notifications</h4>
                      </div>
                      <div className="space-y-3 pl-7">
                        {Object.entries(notifications.email).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between">
                            <span className="text-sm capitalize">
                              {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                            </span>
                            <input
                              type="checkbox"
                              checked={value}
                              onChange={(e) => handleNotificationChange('email', key, e.target.checked)}
                              className="rounded"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* SMS Notifications */}
                    <div>
                      <div className="flex items-center space-x-2 mb-4">
                        <Phone className="h-5 w-5" />
                        <h4 className="font-medium">SMS Notifications</h4>
                      </div>
                      <div className="space-y-3 pl-7">
                        {Object.entries(notifications.sms).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between">
                            <span className="text-sm capitalize">
                              {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                            </span>
                            <input
                              type="checkbox"
                              checked={value}
                              onChange={(e) => handleNotificationChange('sms', key, e.target.checked)}
                              className="rounded"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4">
                      <Button onClick={handleSaveProfile} disabled={saving}>
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? 'Saving...' : 'Save Preferences'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Security Tab */}
              <TabsContent value="security" className="mt-6">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Account Security</CardTitle>
                      <CardDescription>
                        Manage your account security and privacy settings
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between py-3">
                        <div>
                          <h4 className="font-medium">Password</h4>
                          <p className="text-sm text-gray-500">
                            Last updated 30 days ago
                          </p>
                        </div>
                        <Button variant="outline">
                          Change Password
                        </Button>
                      </div>

                      <div className="flex items-center justify-between py-3">
                        <div>
                          <h4 className="font-medium">Two-Factor Authentication</h4>
                          <p className="text-sm text-gray-500">
                            Add an extra layer of security to your account
                          </p>
                        </div>
                        <Button variant="outline">
                          Enable 2FA
                        </Button>
                      </div>

                      <div className="flex items-center justify-between py-3">
                        <div>
                          <h4 className="font-medium">Login Sessions</h4>
                          <p className="text-sm text-gray-500">
                            Manage your active sessions
                          </p>
                        </div>
                        <Button variant="outline">
                          View Sessions
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Privacy Settings</CardTitle>
                      <CardDescription>
                        Control your privacy and data sharing preferences
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Profile Visibility</h4>
                          <p className="text-sm text-gray-500">
                            Allow providers to see your profile
                          </p>
                        </div>
                        <input type="checkbox" defaultChecked className="rounded" />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Data Analytics</h4>
                          <p className="text-sm text-gray-500">
                            Help us improve our service with anonymous data
                          </p>
                        </div>
                        <input type="checkbox" defaultChecked className="rounded" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-red-600">Danger Zone</CardTitle>
                      <CardDescription>
                        Irreversible and destructive actions
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between py-3">
                        <div>
                          <h4 className="font-medium">Delete Account</h4>
                          <p className="text-sm text-gray-500">
                            Permanently delete your account and all data
                          </p>
                        </div>
                        <Button variant="destructive">
                          Delete Account
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}