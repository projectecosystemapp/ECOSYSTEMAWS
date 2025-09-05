'use client';

import { useState } from 'react';

import AdminLayout from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { logger } from '@/lib/logger';

interface PlatformSettings {
  commissionRate: number;
  categories: string[];
  emailTemplates: {
    welcome: string;
    bookingConfirmation: string;
    paymentReceived: string;
  };
  featureFlags: {
    maintenanceMode: boolean;
    newRegistrations: boolean;
    stripePayments: boolean;
    messaging: boolean;
    reviews: boolean;
  };
  announcements: Array<{
    id: string;
    title: string;
    content: string;
    active: boolean;
    targetRole: 'ALL' | 'CUSTOMERS' | 'PROVIDERS';
    createdAt: string;
  }>;
}

export default function PlatformSettings(): JSX.Element {
  const [settings, setSettings] = useState<PlatformSettings>({
    commissionRate: 8,
    categories: [
      'Home Cleaning', 'Plumbing', 'Electrical', 'Gardening', 
      'Pet Care', 'Tutoring', 'Photography', 'Event Planning',
      'Auto Repair', 'Computer Repair', 'Personal Training', 'Other'
    ],
    emailTemplates: {
      welcome: 'Welcome to Ecosystem Global Solutions! We are excited to have you join our service marketplace.',
      bookingConfirmation: 'Your booking has been confirmed. We will send you a reminder 24 hours before your scheduled service.',
      paymentReceived: 'Payment received successfully. Thank you for using our platform!'
    },
    featureFlags: {
      maintenanceMode: false,
      newRegistrations: true,
      stripePayments: true,
      messaging: true,
      reviews: true
    },
    announcements: [
      {
        id: '1',
        title: 'Platform Update',
        content: 'We have updated our platform with new features and improvements.',
        active: true,
        targetRole: 'ALL',
        createdAt: new Date().toISOString()
      }
    ]
  });

  const [newCategory, setNewCategory] = useState('');
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    targetRole: 'ALL' as 'ALL' | 'CUSTOMERS' | 'PROVIDERS'
  });

  const handleSaveSettings = async (): Promise<void> => {
    try {
      // TODO: Implement actual settings save to database
      alert('Settings saved successfully! (This would be saved to a Settings model in production)');
    } catch (error) {
      logger.error('Error saving settings', error as Error);
    }
  };

  const handleAddCategory = (): void => {
    if (newCategory.trim() && !settings.categories.includes(newCategory.trim())) {
      setSettings(prev => ({
        ...prev,
        categories: [...prev.categories, newCategory.trim()]
      }));
      setNewCategory('');
    }
  };

  const handleRemoveCategory = (category: string): void => {
    setSettings(prev => ({
      ...prev,
      categories: prev.categories.filter(c => c !== category)
    }));
  };

  const handleAddAnnouncement = (): void => {
    if (newAnnouncement.title.trim() && newAnnouncement.content.trim()) {
      const announcement = {
        id: Date.now().toString(),
        ...newAnnouncement,
        active: true,
        createdAt: new Date().toISOString()
      };
      
      setSettings(prev => ({
        ...prev,
        announcements: [announcement, ...prev.announcements]
      }));
      
      setNewAnnouncement({
        title: '',
        content: '',
        targetRole: 'ALL'
      });
    }
  };

  const handleToggleAnnouncement = (id: string): void => {
    setSettings(prev => ({
      ...prev,
      announcements: prev.announcements.map(ann => 
        ann.id === id ? { ...ann, active: !ann.active } : ann
      )
    }));
  };

  const handleDeleteAnnouncement = (id: string): void => {
    setSettings(prev => ({
      ...prev,
      announcements: prev.announcements.filter(ann => ann.id !== id)
    }));
  };

  return (
    <AdminLayout title="Platform Settings">
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="emails">Email Templates</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="commission">Platform Commission Rate (%)</Label>
                <Input
                  id="commission"
                  type="number"
                  min="1"
                  max="20"
                  step="0.1"
                  value={settings.commissionRate}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    commissionRate: parseFloat(e.target.value) || 8
                  }))}
                  className="w-32"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Current: {settings.commissionRate}% (Providers keep {100 - settings.commissionRate}%)
                </p>
              </div>

              <div className="pt-4">
                <Button onClick={handleSaveSettings}>
                  Save General Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories */}
        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Service Categories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="newCategory">Add New Category</Label>
                <div className="flex space-x-2">
                  <Input
                    id="newCategory"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Enter category name"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                  />
                  <Button onClick={handleAddCategory}>Add</Button>
                </div>
              </div>

              <div>
                <Label>Current Categories</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {settings.categories.map((category) => (
                    <Badge
                      key={category}
                      variant="outline"
                      className="flex items-center space-x-1"
                    >
                      <span>{category}</span>
                      <button
                        onClick={() => handleRemoveCategory(category)}
                        className="ml-1 text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                <Button onClick={handleSaveSettings}>
                  Save Categories
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feature Flags */}
        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle>Feature Flags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(settings.featureFlags).map(([feature, enabled]) => (
                <div key={feature} className="flex items-center justify-between">
                  <div>
                    <Label className="capitalize">
                      {feature.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </Label>
                    <p className="text-sm text-gray-500">
                      {feature === 'maintenanceMode' && 'Put platform in maintenance mode'}
                      {feature === 'newRegistrations' && 'Allow new user registrations'}
                      {feature === 'stripePayments' && 'Enable Stripe payment processing'}
                      {feature === 'messaging' && 'Enable messaging between users'}
                      {feature === 'reviews' && 'Enable review and rating system'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant="outline"
                      className={enabled ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'}
                    >
                      {enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        featureFlags: {
                          ...prev.featureFlags,
                          [feature]: e.target.checked
                        }
                      }))}
                      className="rounded"
                    />
                  </div>
                </div>
              ))}

              <div className="pt-4">
                <Button onClick={handleSaveSettings}>
                  Save Feature Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Templates */}
        <TabsContent value="emails">
          <Card>
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(settings.emailTemplates).map(([template, content]) => (
                <div key={template}>
                  <Label htmlFor={template} className="capitalize">
                    {template.replace(/([A-Z])/g, ' $1').toLowerCase()} Email
                  </Label>
                  <Textarea
                    id={template}
                    value={content}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      emailTemplates: {
                        ...prev.emailTemplates,
                        [template]: e.target.value
                      }
                    }))}
                    rows={3}
                    className="mt-1"
                  />
                </div>
              ))}

              <div className="pt-4">
                <Button onClick={handleSaveSettings}>
                  Save Email Templates
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Announcements */}
        <TabsContent value="announcements">
          <Card>
            <CardHeader>
              <CardTitle>System Announcements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add New Announcement */}
              <div className="space-y-4 p-4 border border-gray-200 rounded-lg">
                <h4 className="font-medium">Create New Announcement</h4>
                <div>
                  <Label htmlFor="announcementTitle">Title</Label>
                  <Input
                    id="announcementTitle"
                    value={newAnnouncement.title}
                    onChange={(e) => setNewAnnouncement(prev => ({
                      ...prev,
                      title: e.target.value
                    }))}
                    placeholder="Announcement title"
                  />
                </div>
                <div>
                  <Label htmlFor="announcementContent">Content</Label>
                  <Textarea
                    id="announcementContent"
                    value={newAnnouncement.content}
                    onChange={(e) => setNewAnnouncement(prev => ({
                      ...prev,
                      content: e.target.value
                    }))}
                    placeholder="Announcement content"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="targetRole">Target Audience</Label>
                  <select
                    id="targetRole"
                    value={newAnnouncement.targetRole}
                    onChange={(e) => setNewAnnouncement(prev => ({
                      ...prev,
                      targetRole: e.target.value as 'ALL' | 'CUSTOMERS' | 'PROVIDERS'
                    }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="ALL">All Users</option>
                    <option value="CUSTOMERS">Customers Only</option>
                    <option value="PROVIDERS">Providers Only</option>
                  </select>
                </div>
                <Button onClick={handleAddAnnouncement}>
                  Create Announcement
                </Button>
              </div>

              {/* Existing Announcements */}
              <div className="space-y-4">
                <h4 className="font-medium">Active Announcements</h4>
                {settings.announcements.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No announcements</p>
                ) : (
                  settings.announcements.map((announcement) => (
                    <div key={announcement.id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900">{announcement.title}</h5>
                          <p className="text-sm text-gray-600 mt-1">{announcement.content}</p>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <Badge 
                            variant="outline"
                            className={announcement.active ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100'}
                          >
                            {announcement.active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Badge variant="outline">
                            {announcement.targetRole}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          Created: {new Date(announcement.createdAt).toLocaleDateString()}
                        </span>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleAnnouncement(announcement.id)}
                          >
                            {announcement.active ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteAnnouncement(announcement.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-4">
                <Button onClick={handleSaveSettings}>
                  Save Announcements
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Security Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Security & Audit</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Two-Factor Authentication</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Admin 2FA Required</span>
                  <Badge variant="outline" className="text-green-600 bg-green-100">
                    Enabled
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Provider 2FA Required</span>
                  <Badge variant="outline" className="text-yellow-600 bg-yellow-100">
                    Optional
                  </Badge>
                </div>
                <Button variant="outline" size="sm">
                  Configure 2FA Settings
                </Button>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-4">Audit Logging</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Admin Actions</span>
                  <Badge variant="outline" className="text-green-600 bg-green-100">
                    Enabled
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">User Actions</span>
                  <Badge variant="outline" className="text-green-600 bg-green-100">
                    Enabled
                  </Badge>
                </div>
                <Button variant="outline" size="sm">
                  View Audit Logs
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}