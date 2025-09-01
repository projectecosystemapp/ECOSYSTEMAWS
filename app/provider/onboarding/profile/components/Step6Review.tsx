'use client';

import { useFormContext } from 'react-hook-form';
import { ProfileFormData } from '../page';
import { SERVICE_CATEGORIES } from '@/app/constants/service-categories';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertCircle } from 'lucide-react';

export default function Step6Review() {
  const { watch } = useFormContext<ProfileFormData>();
  const formData = watch();

  const getCompletionStatus = () => {
    const required = [
      formData.businessName,
      formData.bio && formData.bio.length >= 50,
      formData.serviceCategories && formData.serviceCategories.length > 0,
      formData.location?.address,
      formData.location?.city,
      formData.location?.province,
      formData.location?.postalCode,
      formData.serviceRadius
    ];

    const optional = [
      formData.publicEmail,
      formData.phoneNumber,
      formData.profileImageUrl,
      formData.bannerImageUrl
    ];

    const requiredComplete = required.filter(Boolean).length;
    const optionalComplete = optional.filter(Boolean).length;
    
    const requiredPercentage = (requiredComplete / required.length) * 70;
    const optionalPercentage = (optionalComplete / optional.length) * 30;
    
    return {
      total: Math.round(requiredPercentage + optionalPercentage),
      requiredComplete,
      requiredTotal: required.length,
      optionalComplete,
      optionalTotal: optional.length
    };
  };

  const status = getCompletionStatus();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Review Your Profile</h2>
        <p className="text-muted-foreground">
          Review your information before publishing
        </p>
      </div>

      {/* Completion Status */}
      <Card className={status.total === 100 ? 'border-green-500' : 'border-amber-500'}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status.total === 100 ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                Profile Complete!
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Profile {status.total}% Complete
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm">
              Required fields: {status.requiredComplete}/{status.requiredTotal}
            </p>
            <p className="text-sm">
              Optional fields: {status.optionalComplete}/{status.optionalTotal}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Profile Preview */}
      <div className="space-y-4">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm text-muted-foreground">Business Name:</span>
              <p className="font-medium">{formData.businessName || 'Not provided'}</p>
            </div>
            {formData.publicEmail && (
              <div>
                <span className="text-sm text-muted-foreground">Email:</span>
                <p>{formData.publicEmail}</p>
              </div>
            )}
            {formData.phoneNumber && (
              <div>
                <span className="text-sm text-muted-foreground">Phone:</span>
                <p>{formData.phoneNumber}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bio */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">About</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">
              {formData.bio || 'No bio provided'}
            </p>
          </CardContent>
        </Card>

        {/* Photos */}
        {(formData.profileImageUrl || formData.bannerImageUrl) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Photos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                {formData.profileImageUrl && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Profile:</p>
                    <img 
                      src={formData.profileImageUrl} 
                      alt="Profile" 
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  </div>
                )}
                {formData.bannerImageUrl && (
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-2">Banner:</p>
                    <img 
                      src={formData.bannerImageUrl} 
                      alt="Banner" 
                      className="w-full h-20 rounded-lg object-cover"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Services */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Service Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {formData.serviceCategories?.map(cat => {
                const category = SERVICE_CATEGORIES.find(c => c.value === cat);
                return category ? (
                  <Badge key={cat} variant="secondary">
                    {category.label}
                  </Badge>
                ) : null;
              })}
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Service Area</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {formData.location && (
              <>
                <div>
                  <span className="text-sm text-muted-foreground">Location:</span>
                  <p>
                    {formData.location.city}, {formData.location.province}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Service Radius:</span>
                  <p>{formData.serviceRadius} km</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Publish Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Ready to Publish?</h4>
        <p className="text-sm text-blue-800">
          Once published, your profile will be visible to customers searching for services 
          in your area. You can edit your profile anytime from your dashboard.
        </p>
      </div>
    </div>
  );
}