'use client';

import { MapPin, Navigation } from 'lucide-react';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';

import { ProfileFormData } from '../page';

const PROVINCES = [
  { value: 'AB', label: 'Alberta' },
  { value: 'BC', label: 'British Columbia' },
  { value: 'MB', label: 'Manitoba' },
  { value: 'NB', label: 'New Brunswick' },
  { value: 'NL', label: 'Newfoundland and Labrador' },
  { value: 'NT', label: 'Northwest Territories' },
  { value: 'NS', label: 'Nova Scotia' },
  { value: 'NU', label: 'Nunavut' },
  { value: 'ON', label: 'Ontario' },
  { value: 'PE', label: 'Prince Edward Island' },
  { value: 'QC', label: 'Quebec' },
  { value: 'SK', label: 'Saskatchewan' },
  { value: 'YT', label: 'Yukon' }
];

export default function Step5Location() {
  const { control, watch, setValue } = useFormContext<ProfileFormData>();
  const { toast } = useToast();
  const [isGeocoding, setIsGeocoding] = useState(false);
  
  const location = watch('location');
  const serviceRadius = watch('serviceRadius') || 10;

  const geocodeAddress = async () => {
    const { address, city, province, postalCode } = location;
    
    if (!address || !city || !province || !postalCode) {
      toast({
        title: 'Complete address required',
        description: 'Please fill in all address fields',
        variant: 'destructive'
      });
      return;
    }

    setIsGeocoding(true);
    try {
      const response = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, city, province, postalCode })
      });

      if (!response.ok) throw new Error('Geocoding failed');

      const data = await response.json();
      setValue('location.lat', data.lat);
      setValue('location.lng', data.lng);
      
      toast({
        title: 'Location verified',
        description: 'Your address has been successfully geocoded'
      });
    } catch (error) {
      console.error('Geocoding error:', error);
      toast({
        title: 'Geocoding failed',
        description: 'Could not verify address. You can still continue.',
        variant: 'destructive'
      });
    } finally {
      setIsGeocoding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Service Location</h2>
        <p className="text-muted-foreground">
          Where do you provide your services?
        </p>
      </div>

      {/* Address Fields */}
      <div className="space-y-4">
        <FormField
          control={control}
          name="location.address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Street Address *</FormLabel>
              <FormControl>
                <Input placeholder="123 Main Street" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={control}
            name="location.city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City *</FormLabel>
                <FormControl>
                  <Input placeholder="Toronto" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="location.province"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Province *</FormLabel>
                <FormControl>
                  <select 
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    {...field}
                  >
                    <option value="">Select Province</option>
                    {PROVINCES.map(prov => (
                      <option key={prov.value} value={prov.value}>
                        {prov.label}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={control}
          name="location.postalCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Postal Code *</FormLabel>
              <FormControl>
                <Input 
                  placeholder="M5V 3A8" 
                  {...field}
                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Verify Location Button */}
        <Button
          type="button"
          variant="outline"
          onClick={geocodeAddress}
          disabled={isGeocoding}
          className="w-full"
        >
          <Navigation className="mr-2 h-4 w-4" />
          {isGeocoding ? 'Verifying...' : 'Verify Location'}
        </Button>

        {location.lat && location.lng && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Location verified: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            </p>
          </div>
        )}
      </div>

      {/* Service Radius */}
      <FormField
        control={control}
        name="serviceRadius"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Service Radius: {serviceRadius} km</FormLabel>
            <FormControl>
              <Slider
                min={1}
                max={100}
                step={1}
                value={[field.value || 10]}
                onValueChange={(values: number[]) => field.onChange(values[0])}
                className="mt-3"
              />
            </FormControl>
            <p className="text-sm text-muted-foreground mt-2">
              How far are you willing to travel to provide services?
            </p>
          </FormItem>
        )}
      />

      {/* Location Tips */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h4 className="font-medium text-amber-900 mb-2">Location Privacy:</h4>
        <ul className="text-sm text-amber-800 space-y-1">
          <li>• Your exact address is never shown to customers</li>
          <li>• Only your general area and service radius are displayed</li>
          <li>• Customers see if they're within your service area</li>
          <li>• You can share specific location details after booking</li>
        </ul>
      </div>
    </div>
  );
}