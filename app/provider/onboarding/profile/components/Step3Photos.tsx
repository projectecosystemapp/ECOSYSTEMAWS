'use client';

import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import ImageUploader from '@/components/ImageUploader';
import { ProfileFormData } from '../page';
import { Camera, Image } from 'lucide-react';

export default function Step3Photos() {
  const { control, watch } = useFormContext<ProfileFormData>();
  
  const profileImageUrl = watch('profileImageUrl');
  const bannerImageUrl = watch('bannerImageUrl');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Profile Photos</h2>
        <p className="text-muted-foreground">
          Add photos to make your profile stand out and build trust
        </p>
      </div>

      {/* Profile Image */}
      <FormField
        control={control}
        name="profileImageUrl"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Profile Photo</FormLabel>
            <FormControl>
              <ImageUploader
                value={field.value || ''}
                onChange={field.onChange}
                maxSizeMB={5}
                aspectRatio="square"
                uploadPath="profile"
              />
            </FormControl>
            <p className="text-sm text-muted-foreground mt-2">
              Recommended: Square image, at least 400x400px
            </p>
          </FormItem>
        )}
      />

      {/* Banner Image */}
      <FormField
        control={control}
        name="bannerImageUrl"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Banner Image</FormLabel>
            <FormControl>
              <ImageUploader
                value={field.value || ''}
                onChange={field.onChange}
                maxSizeMB={10}
                aspectRatio="banner"
                uploadPath="banner"
              />
            </FormControl>
            <p className="text-sm text-muted-foreground mt-2">
              Recommended: Wide image, 1600x400px for best results
            </p>
          </FormItem>
        )}
      />

      {/* Photo Tips */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
          <Camera className="h-4 w-4" />
          Photo Tips:
        </h4>
        <ul className="text-sm text-green-800 space-y-1">
          <li>• Use high-quality, professional photos</li>
          <li>• Profile photo should clearly show your face or logo</li>
          <li>• Banner image can showcase your workspace or services</li>
          <li>• Ensure good lighting and clear focus</li>
          <li>• Avoid blurry, dark, or pixelated images</li>
        </ul>
      </div>

      {/* Preview Section */}
      {(profileImageUrl || bannerImageUrl) && (
        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Image className="h-4 w-4" />
            Preview
          </h4>
          <div className="space-y-4">
            {bannerImageUrl && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Banner:</p>
                <img 
                  src={bannerImageUrl} 
                  alt="Banner preview" 
                  className="w-full h-32 object-cover rounded-lg"
                />
              </div>
            )}
            {profileImageUrl && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Profile:</p>
                <img 
                  src={profileImageUrl} 
                  alt="Profile preview" 
                  className="w-24 h-24 object-cover rounded-full"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}