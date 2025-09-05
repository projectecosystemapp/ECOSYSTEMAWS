'use client';

import { useFormContext } from 'react-hook-form';

import { SERVICE_CATEGORIES, MAX_CATEGORIES } from '@/app/constants/service-categories';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';

import { ProfileFormData } from '../page';


export default function Step4Services() {
  const { control, watch } = useFormContext<ProfileFormData>();
  const selectedCategories = watch('serviceCategories') || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Service Categories</h2>
        <p className="text-muted-foreground">
          Select the categories that best describe your services (max {MAX_CATEGORIES})
        </p>
      </div>

      {/* Selected Count */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <span className="text-sm font-medium">
          Selected: {selectedCategories.length} / {MAX_CATEGORIES}
        </span>
        {selectedCategories.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {selectedCategories.map(cat => {
              const category = SERVICE_CATEGORIES.find(c => c.value === cat);
              return category ? (
                <Badge key={cat} variant="secondary" className="text-xs">
                  {category.label}
                </Badge>
              ) : null;
            })}
          </div>
        )}
      </div>

      {/* Categories Grid */}
      <FormField
        control={control}
        name="serviceCategories"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Categories *</FormLabel>
            <FormControl>
              <div className="grid grid-cols-2 gap-4">
                {SERVICE_CATEGORIES.map((category) => {
                  const isChecked = field.value?.includes(category.value) || false;
                  const isDisabled = !isChecked && field.value?.length >= MAX_CATEGORIES;

                  return (
                    <label
                      key={category.value}
                      className={`flex items-start space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        isChecked 
                          ? 'bg-primary/5 border-primary' 
                          : isDisabled
                          ? 'opacity-50 cursor-not-allowed bg-gray-50'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <Checkbox
                        checked={isChecked}
                        disabled={isDisabled}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            field.onChange([...(field.value || []), category.value]);
                          } else {
                            field.onChange(field.value?.filter(v => v !== category.value) || []);
                          }
                        }}
                      />
                      <span className={`text-sm ${isDisabled ? 'text-gray-400' : ''}`}>
                        {category.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Category Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Selection Tips:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Choose categories that accurately represent your main services</li>
          <li>• More specific categories help customers find you easier</li>
          <li>• You can update these categories later as your business evolves</li>
          <li>• Consider what customers would search for to find your services</li>
        </ul>
      </div>
    </div>
  );
}