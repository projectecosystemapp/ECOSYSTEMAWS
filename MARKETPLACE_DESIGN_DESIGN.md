# Production-Ready Implementation Prompt: Ecosystem Platform Core Marketplace Loop

## Context and Requirements

You are implementing the core marketplace loop for the Ecosystem platform, a globally-capable service marketplace built with:
- **Next.js 14** with App Router (TypeScript)
- **AWS Amplify Gen2** (TypeScript-first approach)
- **Tailwind CSS** with shadcn/ui components
- **Deployment**: AWS Amplify Hosting at https://ecosystem-app.com

The MVP must support BOTH in-person/local services AND online/virtual services from day one. This is a critical strategic requirement.

## Part 1: Data Model Implementation (amplify/data/resource.ts)

### Update the existing schema with the following models:

```typescript
import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  // Existing ProviderProfile model - extend with service management fields
  ProviderProfile: a.model({
    id: a.id(),
    userId: a.string().required(),
    businessName: a.string().required(),
    email: a.string().required(),
    phone: a.string(),
    description: a.string(),
    verified: a.boolean().default(false),
    rating: a.float(),
    totalBookings: a.integer().default(0),
    profileImageKey: a.string(),
    // Add timezone for provider's business hours
    timezone: a.string().default('America/New_York'),
    // Relationships
    services: a.hasMany('ServiceListing', 'providerId'),
    bookings: a.hasMany('Booking', 'providerId'),
    availability: a.hasMany('AvailabilitySlot', 'providerId'),
  })
  .authorization(allow => [
    allow.owner().to(['create', 'read', 'update']),
    allow.authenticated().to(['read']),
    allow.groups(['admin']).to(['create', 'read', 'update', 'delete'])
  ]),

  // NEW: ServiceListing model with location type support
  ServiceListing: a.model({
    id: a.id(),
    title: a.string().required(),
    description: a.string().required(),
    category: a.ref('ServiceCategory'),
    locationType: a.ref('LocationType'), // CRITICAL: PRIMARY DIFFERENTIATOR
    
    // Pricing fields
    price: a.float().required(),
    priceUnit: a.ref('PriceUnit'),
    currency: a.string().default('USD'),
    duration: a.integer(), // in minutes
    
    // Location fields (conditional based on locationType)
    address: a.customType({
      street: a.string(),
      city: a.string(),
      state: a.string(),
      zipCode: a.string(),
      country: a.string(),
      coordinates: a.customType({
        lat: a.float(),
        lng: a.float(),
      }),
    }),
    serviceRadius: a.integer(), // in miles, only for in-person
    travelFee: a.float(),
    
    // Service details
    imageKeys: a.string().array(),
    tags: a.string().array(),
    isActive: a.boolean().default(true),
    instantBooking: a.boolean().default(false),
    cancellationPolicy: a.string(),
    
    // Relationships
    providerId: a.id().required(),
    provider: a.belongsTo('ProviderProfile', 'providerId'),
    bookings: a.hasMany('Booking', 'serviceId'),
  })
  .secondaryIndexes(index => [
    index('category').partitionKey('category').sortKey('createdAt'),
    index('locationType').partitionKey('locationType').sortKey('rating'),
  ])
  .authorization(allow => [
    allow.owner().to(['create', 'read', 'update', 'delete']),
    allow.authenticated().to(['read']),
    allow.groups(['admin']).to(['create', 'read', 'update', 'delete'])
  ]),

  // NEW: Booking model with timezone support
  Booking: a.model({
    id: a.id(),
    // Time fields - all stored in UTC
    scheduledStartUTC: a.datetime().required(),
    scheduledEndUTC: a.datetime().required(),
    // Store local time info for reference
    customerTimezone: a.string().required(),
    providerTimezone: a.string().required(),
    
    status: a.ref('BookingStatus'),
    locationType: a.ref('LocationType'),
    totalPrice: a.float().required(),
    currency: a.string().required(),
    
    // Communication fields
    notes: a.string(),
    meetingLink: a.string(), // For virtual services
    customerAddress: a.string(), // For services at customer location
    
    // Relationships
    customerId: a.id().required(),
    serviceId: a.id().required(),
    providerId: a.id().required(),
    service: a.belongsTo('ServiceListing', 'serviceId'),
    provider: a.belongsTo('ProviderProfile', 'providerId'),
  })
  .authorization(allow => [
    allow.owner().to(['create', 'read', 'update']),
    allow.ownerDefinedIn('providerId').to(['read', 'update']),
    allow.groups(['admin']).to(['create', 'read', 'update', 'delete'])
  ]),

  // NEW: Availability management
  AvailabilitySlot: a.model({
    id: a.id(),
    providerId: a.id().required(),
    dayOfWeek: a.integer().required(), // 0-6 (Sunday-Saturday)
    startTime: a.string().required(), // "09:00" in provider's timezone
    endTime: a.string().required(), // "17:00" in provider's timezone
    isRecurring: a.boolean().default(true),
    provider: a.belongsTo('ProviderProfile', 'providerId'),
  })
  .authorization(allow => [
    allow.ownerDefinedIn('providerId').to(['create', 'read', 'update', 'delete']),
    allow.authenticated().to(['read']),
  ]),

  // Enum definitions
  LocationType: a.enum([
    'IN_PERSON',      // Provider travels to customer
    'VIRTUAL',        // Online/video service
    'PROVIDER_LOCATION', // Customer comes to provider
  ]),

  ServiceCategory: a.enum([
    'HOME_SERVICES',
    'BEAUTY_WELLNESS',
    'TUTORING',
    'CONSULTING',
    'FITNESS',
    'EVENTS',
    'TECHNOLOGY',
    'CREATIVE',
  ]),

  PriceUnit: a.enum([
    'HOUR',
    'SESSION',
    'PROJECT',
    'DAY',
    'WEEK',
  ]),

  BookingStatus: a.enum([
    'PENDING',
    'CONFIRMED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
    'NO_SHOW',
  ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
```

## Part 2: Provider's Service Management Flow

### 2A. Service Creation Wizard Component Structure

Create the following file structure:
```
app/
  dashboard/
    services/
      new/
        page.tsx                 # Server Component - entry point
        components/
          ServiceWizard.tsx      # Client Component - main wizard
          StepServiceType.tsx    # Step 1: Type selection
          StepBasicInfo.tsx      # Step 2: Basic information
          StepLocation.tsx       # Step 3: Location (conditional)
          StepPricing.tsx        # Step 4: Pricing & availability
          StepReview.tsx         # Step 5: Review & submit
```

### 2B. Main Service Wizard Implementation

**app/dashboard/services/new/page.tsx** (Server Component):
```tsx
import { ServiceWizard } from './components/ServiceWizard';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';

export default async function NewServicePage() {
  // Can fetch provider profile data server-side if needed
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6">Create New Service</h1>
      <ServiceWizard />
    </div>
  );
}
```

**app/dashboard/services/new/components/ServiceWizard.tsx** (Client Component):
```tsx
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { StepServiceType } from './StepServiceType';
import { StepBasicInfo } from './StepBasicInfo';
import { StepLocation } from './StepLocation';
import { StepPricing } from './StepPricing';
import { StepReview } from './StepReview';

const client = generateClient<Schema>();

interface ServiceFormData {
  locationType: 'IN_PERSON' | 'VIRTUAL' | 'PROVIDER_LOCATION' | null;
  title: string;
  description: string;
  category: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    coordinates?: { lat: number; lng: number };
  };
  serviceRadius?: number;
  travelFee?: number;
  price: number;
  priceUnit: string;
  duration?: number;
  instantBooking: boolean;
  cancellationPolicy: string;
  imageKeys: string[];
}

const STEPS = [
  { id: 'type', title: 'Service Type', component: StepServiceType },
  { id: 'basic', title: 'Basic Info', component: StepBasicInfo },
  { id: 'location', title: 'Location', component: StepLocation, conditional: true },
  { id: 'pricing', title: 'Pricing', component: StepPricing },
  { id: 'review', title: 'Review', component: StepReview },
];

export function ServiceWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<ServiceFormData>({
    locationType: null,
    title: '',
    description: '',
    category: '',
    price: 0,
    priceUnit: 'HOUR',
    instantBooking: false,
    cancellationPolicy: '',
    imageKeys: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Skip location step for virtual services
  const getActiveSteps = useCallback(() => {
    if (formData.locationType === 'VIRTUAL') {
      return STEPS.filter(step => step.id !== 'location');
    }
    return STEPS;
  }, [formData.locationType]);

  const activeSteps = getActiveSteps();
  const CurrentStepComponent = activeSteps[currentStep].component;
  const progress = ((currentStep + 1) / activeSteps.length) * 100;

  const updateFormData = (data: Partial<ServiceFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const handleNext = () => {
    if (currentStep < activeSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Get provider ID from auth context
      const providerId = await getCurrentProviderId(); // Implement this based on your auth

      const { data, errors } = await client.models.ServiceListing.create({
        ...formData,
        providerId,
        isActive: true,
      });

      if (errors) {
        console.error('Service creation failed:', errors);
        // Handle errors with toast notification
        return;
      }

      // Redirect to service management page
      router.push(`/dashboard/services/${data.id}`);
    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            {activeSteps.map((step, index) => (
              <span
                key={step.id}
                className={index <= currentStep ? 'text-primary font-medium' : ''}
              >
                {step.title}
              </span>
            ))}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Content */}
        <CurrentStepComponent
          formData={formData}
          updateFormData={updateFormData}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onSubmit={handleSubmit}
          isFirstStep={currentStep === 0}
          isLastStep={currentStep === activeSteps.length - 1}
          isSubmitting={isSubmitting}
        />
      </CardContent>
    </Card>
  );
}
```

### 2C. Step Components Implementation

**StepServiceType.tsx** (CRITICAL - Primary service type selection):
```tsx
'use client';

import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { MapPin, Monitor, Home } from 'lucide-react';

export function StepServiceType({ formData, updateFormData, onNext }) {
  const handleLocationTypeChange = (value: string) => {
    updateFormData({ locationType: value });
    
    // Clear location data if switching to virtual
    if (value === 'VIRTUAL') {
      updateFormData({
        address: undefined,
        serviceRadius: undefined,
        travelFee: undefined,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">How will you deliver this service?</h2>
        <p className="text-gray-600">This helps customers find the right type of service</p>
      </div>

      <RadioGroup
        value={formData.locationType || ''}
        onValueChange={handleLocationTypeChange}
        className="space-y-4"
      >
        <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
          <RadioGroupItem value="IN_PERSON" id="in-person" />
          <Label htmlFor="in-person" className="flex-1 cursor-pointer">
            <div className="flex items-center mb-1">
              <MapPin className="h-5 w-5 mr-2 text-blue-600" />
              <span className="font-medium">In-Person Service</span>
            </div>
            <p className="text-sm text-gray-600">
              I travel to customers' locations within a service area
            </p>
          </Label>
        </div>

        <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
          <RadioGroupItem value="VIRTUAL" id="virtual" />
          <Label htmlFor="virtual" className="flex-1 cursor-pointer">
            <div className="flex items-center mb-1">
              <Monitor className="h-5 w-5 mr-2 text-green-600" />
              <span className="font-medium">Online/Virtual Service</span>
            </div>
            <p className="text-sm text-gray-600">
              I provide services online via video call, phone, or messaging
            </p>
          </Label>
        </div>

        <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
          <RadioGroupItem value="PROVIDER_LOCATION" id="provider-location" />
          <Label htmlFor="provider-location" className="flex-1 cursor-pointer">
            <div className="flex items-center mb-1">
              <Home className="h-5 w-5 mr-2 text-purple-600" />
              <span className="font-medium">At My Location</span>
            </div>
            <p className="text-sm text-gray-600">
              Customers come to my business location or studio
            </p>
          </Label>
        </div>
      </RadioGroup>

      <div className="flex justify-end">
        <Button
          onClick={onNext}
          disabled={!formData.locationType}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
```

**StepLocation.tsx** (Conditional - only shown for in-person services):
```tsx
'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

export function StepLocation({ formData, updateFormData, onNext, onPrevious }) {
  const [radius, setRadius] = useState(formData.serviceRadius || 10);

  // Skip this step if service is virtual
  useEffect(() => {
    if (formData.locationType === 'VIRTUAL') {
      onNext();
    }
  }, [formData.locationType, onNext]);

  if (formData.locationType === 'VIRTUAL') {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Service Location</h2>
        <p className="text-gray-600">
          {formData.locationType === 'IN_PERSON' 
            ? 'Where are you based? We\'ll show customers within your service area.'
            : 'Where should customers come for your service?'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label htmlFor="street">Street Address</Label>
          <Input
            id="street"
            value={formData.address?.street || ''}
            onChange={(e) => updateFormData({
              address: { ...formData.address, street: e.target.value }
            })}
            required
          />
        </div>

        <div>
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={formData.address?.city || ''}
            onChange={(e) => updateFormData({
              address: { ...formData.address, city: e.target.value }
            })}
            required
          />
        </div>

        <div>
          <Label htmlFor="state">State/Province</Label>
          <Input
            id="state"
            value={formData.address?.state || ''}
            onChange={(e) => updateFormData({
              address: { ...formData.address, state: e.target.value }
            })}
            required
          />
        </div>

        <div>
          <Label htmlFor="zipCode">ZIP/Postal Code</Label>
          <Input
            id="zipCode"
            value={formData.address?.zipCode || ''}
            onChange={(e) => updateFormData({
              address: { ...formData.address, zipCode: e.target.value }
            })}
            required
          />
        </div>

        <div>
          <Label htmlFor="country">Country</Label>
          <Input
            id="country"
            value={formData.address?.country || ''}
            onChange={(e) => updateFormData({
              address: { ...formData.address, country: e.target.value }
            })}
            required
          />
        </div>
      </div>

      {formData.locationType === 'IN_PERSON' && (
        <>
          <div className="space-y-2">
            <Label>Service Radius</Label>
            <div className="flex items-center space-x-4">
              <Slider
                value={[radius]}
                onValueChange={([value]) => {
                  setRadius(value);
                  updateFormData({ serviceRadius: value });
                }}
                max={50}
                min={1}
                step={1}
                className="flex-1"
              />
              <span className="w-20 text-right font-medium">{radius} miles</span>
            </div>
            <p className="text-sm text-gray-600">
              How far are you willing to travel for this service?
            </p>
          </div>

          <div>
            <Label htmlFor="travelFee">Travel Fee (optional)</Label>
            <Input
              id="travelFee"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.travelFee || ''}
              onChange={(e) => updateFormData({ travelFee: parseFloat(e.target.value) })}
            />
            <p className="text-sm text-gray-600 mt-1">
              Additional fee for traveling to customer location
            </p>
          </div>
        </>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious}>
          Previous
        </Button>
        <Button onClick={onNext}>
          Continue
        </Button>
      </div>
    </div>
  );
}
```

## Part 3: Customer's Service Discovery & Booking Flow

### 3A. Search Page Implementation

**app/search/page.tsx** (Server Component):
```tsx
import { Suspense } from 'react';
import { SearchFilters } from './components/SearchFilters';
import { SearchResults } from './components/SearchResults';
import { SearchSkeleton } from './components/SearchSkeleton';

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    type?: 'in-person' | 'online';
    category?: string;
    lat?: string;
    lng?: string;
    radius?: string;
    sort?: string;
    page?: string;
  }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Header */}
      <div className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <SearchFilters initialParams={params} />
        </div>
      </div>

      {/* Search Results */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Suspense fallback={<SearchSkeleton />}>
          <SearchResults searchParams={params} />
        </Suspense>
      </div>
    </div>
  );
}
```

### 3B. Search Filters Component

**app/search/components/SearchFilters.tsx** (Client Component):
```tsx
'use client';

import { useState, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import { Search, MapPin, Globe, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

export function SearchFilters({ initialParams }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [serviceType, setServiceType] = useState(initialParams.type || 'in-person');
  const [showLocationFields, setShowLocationFields] = useState(serviceType === 'in-person');
  const [radius, setRadius] = useState(parseInt(initialParams.radius || '10'));

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams);
    if (term) {
      params.set('q', term);
    } else {
      params.delete('q');
    }
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  }, 300);

  const handleServiceTypeChange = (value: string) => {
    if (!value) return;
    
    setServiceType(value);
    setShowLocationFields(value === 'in-person');
    
    const params = new URLSearchParams(searchParams);
    params.set('type', value);
    
    // Clear location params when switching to online
    if (value === 'online') {
      params.delete('lat');
      params.delete('lng');
      params.delete('radius');
    }
    
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleLocationSearch = async () => {
    // Implement geolocation or address geocoding
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const params = new URLSearchParams(searchParams);
          params.set('lat', position.coords.latitude.toString());
          params.set('lng', position.coords.longitude.toString());
          params.set('radius', radius.toString());
          router.push(`${pathname}?${params.toString()}`);
        },
        (error) => {
          console.error('Geolocation error:', error);
          // Show error toast
        }
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* Service Type Toggle */}
      <div className="flex justify-center">
        <ToggleGroup
          type="single"
          value={serviceType}
          onValueChange={handleServiceTypeChange}
          className="bg-gray-100 p-1 rounded-lg"
        >
          <ToggleGroupItem value="in-person" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>In-Person</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="online" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <span>Online</span>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder={serviceType === 'online' 
              ? "Search for online services..." 
              : "Search for local services..."}
            className="pl-10"
            defaultValue={searchParams.get('q')?.toString()}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        {/* Location Controls for In-Person */}
        {showLocationFields && (
          <>
            <Button
              variant="outline"
              onClick={handleLocationSearch}
              className="flex items-center gap-2"
            >
              <MapPin className="h-4 w-4" />
              Use My Location
            </Button>
            
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Location Filters</SheetTitle>
                </SheetHeader>
                <div className="space-y-6 mt-6">
                  <div>
                    <label className="text-sm font-medium">
                      Search Radius: {radius} miles
                    </label>
                    <Slider
                      value={[radius]}
                      onValueChange={([value]) => setRadius(value)}
                      max={50}
                      min={1}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </>
        )}

        {/* Category Filter */}
        <Select
          value={searchParams.get('category')?.toString() || ''}
          onValueChange={(value) => {
            const params = new URLSearchParams(searchParams);
            if (value) {
              params.set('category', value);
            } else {
              params.delete('category');
            }
            router.push(`${pathname}?${params.toString()}`);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Categories</SelectItem>
            <SelectItem value="HOME_SERVICES">Home Services</SelectItem>
            <SelectItem value="BEAUTY_WELLNESS">Beauty & Wellness</SelectItem>
            <SelectItem value="TUTORING">Tutoring</SelectItem>
            <SelectItem value="CONSULTING">Consulting</SelectItem>
            <SelectItem value="FITNESS">Fitness</SelectItem>
            <SelectItem value="TECHNOLOGY">Technology</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
```

### 3C. Service Card Component

**app/search/components/ServiceCard.tsx**:
```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DateTime } from 'luxon';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, MapPin, Globe, Clock, DollarSign } from 'lucide-react';

interface ServiceCardProps {
  service: {
    id: string;
    title: string;
    description: string;
    locationType: 'IN_PERSON' | 'VIRTUAL' | 'PROVIDER_LOCATION';
    price: number;
    priceUnit: string;
    currency: string;
    duration?: number;
    rating?: number;
    totalReviews?: number;
    provider: {
      businessName: string;
      profileImageKey?: string;
      timezone: string;
    };
    address?: {
      city: string;
      state: string;
    };
    serviceRadius?: number;
    imageKeys?: string[];
    instantBooking: boolean;
  };
  userTimezone?: string;
}

export function ServiceCard({ service, userTimezone = 'America/New_York' }: ServiceCardProps) {
  const router = useRouter();
  const [imageError, setImageError] = useState(false);

  const getLocationBadge = () => {
    switch (service.locationType) {
      case 'IN_PERSON':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {service.address ? `${service.address.city}, ${service.address.state}` : 'Local'}
            {service.serviceRadius && ` • ${service.serviceRadius} mi`}
          </Badge>
        );
      case 'VIRTUAL':
        return (
          <Badge variant="secondary" className="flex items-center gap-1 bg-green-100 text-green-800">
            <Globe className="h-3 w-3" />
            Online Service
          </Badge>
        );
      case 'PROVIDER_LOCATION':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            Provider Location
          </Badge>
        );
    }
  };

  const formatPrice = () => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: service.currency || 'USD',
    });
    
    const priceText = formatter.format(service.price);
    const unitText = service.priceUnit === 'HOUR' ? '/hr' : 
                     service.priceUnit === 'SESSION' ? '/session' : 
                     service.priceUnit === 'PROJECT' ? ' total' : '';
    
    return `${priceText}${unitText}`;
  };

  const handleBookingClick = () => {
    router.push(`/services/${service.id}/book`);
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200">
      {/* Service Image */}
      {service.imageKeys?.[0] && (
        <div className="aspect-video relative overflow-hidden bg-gray-100">
          {!imageError ? (
            <img
              src={`/api/images/${service.imageKeys[0]}`}
              alt={service.title}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No image available
            </div>
          )}
          {service.instantBooking && (
            <Badge className="absolute top-2 right-2 bg-blue-600">
              Instant Booking
            </Badge>
          )}
        </div>
      )}

      <CardContent className="p-4">
        {/* Location Badge */}
        <div className="mb-2">
          {getLocationBadge()}
        </div>

        {/* Title and Provider */}
        <h3 className="font-semibold text-lg line-clamp-2 mb-1">
          {service.title}
        </h3>
        <p className="text-sm text-gray-600 mb-2">
          by {service.provider.businessName}
        </p>

        {/* Description */}
        <p className="text-sm text-gray-700 line-clamp-2 mb-3">
          {service.description}
        </p>

        {/* Rating */}
        {service.rating && (
          <div className="flex items-center gap-1 mb-3">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="font-medium text-sm">{service.rating.toFixed(1)}</span>
            <span className="text-sm text-gray-600">
              ({service.totalReviews} reviews)
            </span>
          </div>
        )}

        {/* Duration */}
        {service.duration && (
          <div className="flex items-center gap-1 text-sm text-gray-600 mb-3">
            <Clock className="h-4 w-4" />
            <span>{service.duration} minutes</span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <DollarSign className="h-4 w-4 text-gray-600" />
            <span className="text-lg font-bold">{formatPrice()}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button 
          className="w-full" 
          onClick={handleBookingClick}
        >
          {service.instantBooking ? 'Book Now' : 'View Details'}
        </Button>
      </CardFooter>
    </Card>
  );
}
```

## Part 4: Timezone Handling Implementation

### 4A. Timezone Utilities

**lib/timezone.ts**:
```tsx
import { DateTime } from 'luxon';

export class TimezoneManager {
  /**
   * Get user's timezone from various sources
   */
  static getUserTimezone(): string {
    // 1. Check stored preference
    const stored = localStorage.getItem('userTimezone');
    if (stored && this.isValidTimezone(stored)) {
      return stored;
    }

    // 2. Detect from browser
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected && this.isValidTimezone(detected)) {
        this.setUserTimezone(detected);
        return detected;
      }
    } catch (e) {
      console.error('Timezone detection failed:', e);
    }

    // 3. Default fallback
    return 'UTC';
  }

  /**
   * Store user's timezone preference
   */
  static setUserTimezone(timezone: string): void {
    if (this.isValidTimezone(timezone)) {
      localStorage.setItem('userTimezone', timezone);
    }
  }

  /**
   * Validate timezone string
   */
  static isValidTimezone(timezone: string): boolean {
    try {
      DateTime.local().setZone(timezone);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Convert UTC to user's local time
   */
  static utcToLocal(utcTime: string, timezone?: string): DateTime {
    const tz = timezone || this.getUserTimezone();
    return DateTime.fromISO(utcTime, { zone: 'utc' }).setZone(tz);
  }

  /**
   * Convert local time to UTC
   */
  static localToUtc(localTime: string, timezone?: string): DateTime {
    const tz = timezone || this.getUserTimezone();
    return DateTime.fromISO(localTime, { zone: tz }).toUTC();
  }

  /**
   * Format time for display with timezone indicator
   */
  static formatWithTimezone(
    utcTime: string,
    timezone?: string,
    format: string = 'fff'
  ): string {
    const tz = timezone || this.getUserTimezone();
    return this.utcToLocal(utcTime, tz).toFormat(format);
  }

  /**
   * Get available time slots considering timezone
   */
  static getAvailableSlots(
    providerSlots: Array<{ start: string; end: string }>,
    providerTimezone: string,
    userTimezone?: string,
    duration: number = 60 // minutes
  ): Array<{ start: DateTime; end: DateTime; display: string }> {
    const userTz = userTimezone || this.getUserTimezone();
    
    return providerSlots.map(slot => {
      const start = DateTime.fromISO(slot.start, { zone: providerTimezone })
        .setZone(userTz);
      const end = start.plus({ minutes: duration });
      
      return {
        start,
        end,
        display: `${start.toFormat('h:mm a')} - ${end.toFormat('h:mm a ZZZZ')}`,
      };
    });
  }

  /**
   * Handle DST transitions
   */
  static handleDSTTransition(
    localTime: string,
    timezone: string
  ): { valid: boolean; suggestion?: DateTime } {
    try {
      const dt = DateTime.fromISO(localTime, { zone: timezone });
      
      if (!dt.isValid) {
        // Suggest alternative times
        const oneHourLater = DateTime.fromISO(localTime)
          .plus({ hours: 1 })
          .setZone(timezone);
        
        return {
          valid: false,
          suggestion: oneHourLater.isValid ? oneHourLater : undefined,
        };
      }
      
      return { valid: true };
    } catch {
      return { valid: false };
    }
  }
}
```

### 4B. Booking Calendar Component

**components/LiveBookingCalendar.tsx**:
```tsx
'use client';

import { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import { DateTime } from 'luxon';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TimezoneManager } from '@/lib/timezone';
import { Clock, Globe, MapPin } from 'lucide-react';

const client = generateClient<Schema>();

interface LiveBookingCalendarProps {
  serviceId: string;
  providerId: string;
  providerTimezone: string;
  serviceDuration: number; // minutes
  servicePrice: number;
  serviceCurrency: string;
  locationType: 'IN_PERSON' | 'VIRTUAL' | 'PROVIDER_LOCATION';
  onBookingComplete?: (bookingId: string) => void;
}

export function LiveBookingCalendar({
  serviceId,
  providerId,
  providerTimezone,
  serviceDuration,
  servicePrice,
  serviceCurrency,
  locationType,
  onBookingComplete,
}: LiveBookingCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [availableSlots, setAvailableSlots] = useState<Array<{
    start: string;
    end: string;
    display: string;
  }>>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [userTimezone, setUserTimezone] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(false);

  // Initialize user timezone
  useEffect(() => {
    const tz = TimezoneManager.getUserTimezone();
    setUserTimezone(tz);
  }, []);

  // Fetch available slots when date changes
  useEffect(() => {
    if (!selectedDate) return;

    const fetchSlots = async () => {
      setLoading(true);
      try {
        // Convert selected date to provider's timezone for querying
        const dateInProviderTz = DateTime.fromJSDate(selectedDate)
          .setZone(providerTimezone)
          .startOf('day');

        // Query provider's availability
        const { data } = await client.models.AvailabilitySlot.list({
          filter: {
            providerId: { eq: providerId },
            dayOfWeek: { eq: dateInProviderTz.weekday % 7 }, // Convert to 0-6
          },
        });

        if (!data || data.length === 0) {
          setAvailableSlots([]);
          return;
        }

        // Generate time slots for the selected day
        const slots: typeof availableSlots = [];
        
        data.forEach(availability => {
          const startTime = DateTime.fromFormat(
            `${dateInProviderTz.toISODate()} ${availability.startTime}`,
            'yyyy-MM-dd HH:mm',
            { zone: providerTimezone }
          );
          
          const endTime = DateTime.fromFormat(
            `${dateInProviderTz.toISODate()} ${availability.endTime}`,
            'yyyy-MM-dd HH:mm',
            { zone: providerTimezone }
          );

          // Generate slots based on service duration
          let current = startTime;
          while (current.plus({ minutes: serviceDuration }) <= endTime) {
            const slotEnd = current.plus({ minutes: serviceDuration });
            
            // Convert to user's timezone for display
            const userStart = current.setZone(userTimezone);
            const userEnd = slotEnd.setZone(userTimezone);
            
            slots.push({
              start: current.toISO(),
              end: slotEnd.toISO(),
              display: `${userStart.toFormat('h:mm a')} - ${userEnd.toFormat('h:mm a')}`,
            });
            
            current = current.plus({ minutes: 30 }); // 30-minute intervals
          }
        });

        // Filter out past slots and already booked slots
        const now = DateTime.now();
        const validSlots = slots.filter(slot => 
          DateTime.fromISO(slot.start) > now
        );

        // TODO: Query existing bookings and filter out booked slots

        setAvailableSlots(validSlots);
      } catch (error) {
        console.error('Failed to fetch availability:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSlots();
  }, [selectedDate, providerId, providerTimezone, serviceDuration, userTimezone]);

  const handleBooking = async () => {
    if (!selectedSlot || !selectedDate) return;

    setBooking(true);
    try {
      const slot = availableSlots.find(s => s.start === selectedSlot);
      if (!slot) return;

      const { data, errors } = await client.models.Booking.create({
        serviceId,
        providerId,
        scheduledStartUTC: slot.start,
        scheduledEndUTC: slot.end,
        customerTimezone: userTimezone,
        providerTimezone: providerTimezone,
        status: 'PENDING',
        locationType,
        totalPrice: servicePrice,
        currency: serviceCurrency,
        customerId: await getCurrentUserId(), // Implement based on your auth
      });

      if (errors) {
        console.error('Booking failed:', errors);
        // Show error toast
        return;
      }

      if (data && onBookingComplete) {
        onBookingComplete(data.id);
      }
    } catch (error) {
      console.error('Booking error:', error);
    } finally {
      setBooking(false);
    }
  };

  const handleTimezoneChange = () => {
    // Open timezone selection modal
    // Implementation depends on your UI library
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Select Date & Time</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleTimezoneChange}
            className="text-sm font-normal"
          >
            <Globe className="h-4 w-4 mr-1" />
            {userTimezone}
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Service Type Indicator */}
        <div className="flex items-center gap-2">
          {locationType === 'VIRTUAL' ? (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <Globe className="h-3 w-3 mr-1" />
              Online Service - Times shown in your timezone
            </Badge>
          ) : (
            <Badge variant="secondary">
              <MapPin className="h-3 w-3 mr-1" />
              In-Person Service
            </Badge>
          )}
        </div>

        {/* Calendar */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => 
                date < new Date() || 
                date > new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days ahead
              }
              className="rounded-md border"
            />
          </div>

          {/* Time Slots */}
          <div className="space-y-2">
            <h3 className="font-medium text-sm">Available Times</h3>
            
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                Loading available times...
              </div>
            ) : availableSlots.length === 0 ? (
              <Alert>
                <AlertDescription>
                  No available times for this date. Please select another date.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
                {availableSlots.map(slot => (
                  <Button
                    key={slot.start}
                    variant={selectedSlot === slot.start ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedSlot(slot.start)}
                    className="text-xs"
                  >
                    {slot.display}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Booking Summary */}
        {selectedSlot && (
          <div className="border-t pt-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Service Duration:</span>
              <span className="font-medium">{serviceDuration} minutes</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Price:</span>
              <span className="font-bold text-lg">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: serviceCurrency,
                }).format(servicePrice)}
              </span>
            </div>
            
            <Button
              className="w-full"
              onClick={handleBooking}
              disabled={booking}
            >
              {booking ? 'Booking...' : 'Confirm Booking'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

## Part 5: Integration Requirements

### 5A. Environment Configuration

**amplify/backend.ts**:
```typescript
import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';

const backend = defineBackend({
  auth,
  data,
  storage,
});

// Add custom business logic
backend.addOutput({
  custom: {
    defaultCurrency: 'USD',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD'],
    defaultTimezone: 'America/New_York',
  },
});
```

### 5B. Next.js Configuration

**next.config.js**:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
      },
    ],
  },
};

module.exports = nextConfig;
```

### 5C. Package Dependencies

**package.json** additions:
```json
{
  "dependencies": {
    "@aws-amplify/backend": "latest",
    "@aws-amplify/backend-cli": "latest",
    "aws-amplify": "latest",
    "luxon": "^3.4.4",
    "@types/luxon": "^3.3.7",
    "use-debounce": "^10.0.0",
    "@radix-ui/react-toggle-group": "^1.0.4",
    "lucide-react": "latest"
  }
}
```

## Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] Set up AWS Amplify Gen2 data models
- [ ] Configure authentication and authorization rules
- [ ] Implement basic service creation wizard with location type selection
- [ ] Create search page with service type toggle

### Phase 2: Core Features (Week 2)
- [ ] Implement timezone handling with Luxon
- [ ] Build LiveBookingCalendar component
- [ ] Add real-time subscription for booking updates
- [ ] Implement service card variations for different location types

### Phase 3: Enhancement (Week 3)
- [ ] Add image upload to S3 for services
- [ ] Implement advanced search filters
- [ ] Add provider availability management
- [ ] Create booking confirmation and notification system

### Phase 4: Polish (Week 4)
- [ ] Mobile responsiveness testing and optimization
- [ ] Accessibility audit and improvements
- [ ] Performance optimization (lazy loading, code splitting)
- [ ] Error handling and edge case management

## Testing Strategy

### Unit Tests
- Timezone conversion functions
- Price calculation logic
- Availability slot generation

### Integration Tests
- Service creation flow
- Booking flow with timezone conversion
- Search and filter functionality

### E2E Tests
- Complete provider onboarding
- Customer search and booking journey
- Cross-timezone booking scenarios

## Monitoring and Analytics

Implement tracking for:
- Service creation completion rates
- Search-to-booking conversion
- Most popular service categories
- Geographic distribution of services
- Peak booking times across timezones

This implementation provides a production-ready, globally-capable marketplace platform that seamlessly handles both in-person and online services with proper timezone management, following AWS Amplify Gen2 and Next.js 14 best practices.