'use client';

import { useFormContext } from 'react-hook-form';

import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

import { ProfileFormData } from '../page';

export default function Step1Basics() {
  const { control } = useFormContext<ProfileFormData>();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Basic Information</h2>
        <p className="text-muted-foreground">
          Let's start with your business details that customers will see
        </p>
      </div>

      <FormField
        control={control}
        name="businessName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Business Name *</FormLabel>
            <FormControl>
              <Input 
                placeholder="Enter your business name" 
                {...field} 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="publicEmail"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Public Email (Optional)</FormLabel>
            <FormControl>
              <Input 
                type="email"
                placeholder="contact@yourbusiness.com" 
                {...field} 
              />
            </FormControl>
            <p className="text-sm text-muted-foreground mt-1">
              This email will be visible to customers for inquiries
            </p>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="phoneNumber"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Phone Number (Optional)</FormLabel>
            <FormControl>
              <Input 
                type="tel"
                placeholder="+1 (555) 123-4567" 
                {...field} 
              />
            </FormControl>
            <p className="text-sm text-muted-foreground mt-1">
              Include country code for international numbers
            </p>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Tip:</strong> A complete business profile with contact information 
          helps build trust with potential customers and increases booking rates.
        </p>
      </div>
    </div>
  );
}