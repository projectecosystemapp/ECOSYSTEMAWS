'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { getCurrentUser } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import { ArrowLeft, ArrowRight, Save, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { z } from 'zod';

import type { Schema } from '@/amplify/data/resource';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';


// Import step components
import Step1Basics from './components/Step1Basics';
import Step2About from './components/Step2About';
import Step3Photos from './components/Step3Photos';
import Step4Services from './components/Step4Services';
import Step5Location from './components/Step5Location';
import Step6Review from './components/Step6Review';

const client = generateClient<Schema>();

// Form validation schema
const profileSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters').max(100),
  publicEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  phoneNumber: z.string()
    .regex(/^\+?1?\d{10,14}$/, 'Invalid phone number')
    .optional()
    .or(z.literal('')),
  bio: z.string().min(50, 'Bio must be at least 50 characters').max(1500),
  profileImageUrl: z.string().url('Invalid URL').optional(),
  bannerImageUrl: z.string().url('Invalid URL').optional(),
  serviceCategories: z.array(z.string()).min(1, 'Select at least one category').max(5),
  location: z.object({
    address: z.string().min(1, 'Address is required'),
    city: z.string().min(1, 'City is required'),
    province: z.string().min(1, 'Province is required'),
    postalCode: z.string().regex(/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/, 'Invalid postal code'),
    lat: z.number().optional(),
    lng: z.number().optional()
  }),
  serviceRadius: z.number().min(1).max(500)
});

export type ProfileFormData = z.infer<typeof profileSchema>;

const STEPS = [
  { id: 1, name: 'Basics', component: Step1Basics },
  { id: 2, name: 'About You', component: Step2About },
  { id: 3, name: 'Photos', component: Step3Photos },
  { id: 4, name: 'Services', component: Step4Services },
  { id: 5, name: 'Location', component: Step5Location },
  { id: 6, name: 'Review', component: Step6Review }
];

export default function ProfileCreationWizard() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const methods = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    mode: 'onChange',
    defaultValues: {
      businessName: '',
      publicEmail: '',
      phoneNumber: '',
      bio: '',
      profileImageUrl: '',
      bannerImageUrl: '',
      serviceCategories: [],
      location: {
        address: '',
        city: '',
        province: '',
        postalCode: '',
        lat: undefined,
        lng: undefined
      },
      serviceRadius: 10
    }
  });

  const { watch, handleSubmit, formState: { errors } } = methods;

  // Load existing draft profile on mount
  useEffect(() => {
    loadProfile();
  }, []);

  // Warn user about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Watch for form changes
  useEffect(() => {
    const subscription = watch(() => {
      setHasUnsavedChanges(true);
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const user = await getCurrentUser();
      setUserId(user.userId);

      // Check for existing profile
      const { data: profiles } = await client.models.ProviderProfile.list({
        filter: { ownerId: { eq: user.userId } }
      });

      if (profiles && profiles.length > 0) {
        const profile = profiles[0];
        setProfileId(profile.id);
        
        // Populate form with existing data
        methods.reset({
          businessName: profile.businessName || '',
          publicEmail: profile.publicEmail || '',
          phoneNumber: profile.phoneNumber || '',
          bio: profile.bio || '',
          profileImageUrl: profile.profileImageUrl || '',
          bannerImageUrl: profile.bannerImageUrl || '',
          serviceCategories: profile.serviceCategories || [],
          location: profile.location ? JSON.parse(profile.location) : {
            address: '',
            city: '',
            province: '',
            postalCode: '',
            lat: undefined,
            lng: undefined
          },
          serviceRadius: profile.serviceRadius || 10
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your profile',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveDraft = async (data: ProfileFormData) => {
    if (!userId) return;

    try {
      setIsSaving(true);
      
      const profileData = {
        ownerId: userId,
        businessName: data.businessName,
        bio: data.bio || '',
        publicEmail: data.publicEmail || null,
        phoneNumber: data.phoneNumber || null,
        profileImageUrl: data.profileImageUrl || null,
        bannerImageUrl: data.bannerImageUrl || null,
        serviceCategories: data.serviceCategories,
        serviceRadius: data.serviceRadius,
        location: JSON.stringify(data.location),
        status: 'DRAFT' as const,
        updatedAt: new Date().toISOString()
      };

      if (profileId) {
        // Update existing profile
        await client.models.ProviderProfile.update({
          id: profileId,
          ...profileData
        });
      } else {
        // Create new profile
        const { data: newProfile } = await client.models.ProviderProfile.create(profileData);
        if (newProfile) {
          setProfileId(newProfile.id);
        }
      }

      setHasUnsavedChanges(false);
      toast({
        title: 'Draft saved',
        description: 'Your progress has been saved'
      });
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: 'Error',
        description: 'Failed to save your progress',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const publishProfile = async (data: ProfileFormData) => {
    if (!userId || !profileId) return;

    try {
      setIsLoading(true);
      
      await client.models.ProviderProfile.update({
        id: profileId,
        status: 'PUBLISHED' as const,
        profileComplete: true,
        updatedAt: new Date().toISOString()
      });

      toast({
        title: 'Profile published!',
        description: 'Your profile is now live and visible to customers'
      });

      router.push('/provider/dashboard');
    } catch (error) {
      console.error('Error publishing profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to publish your profile',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = async () => {
    // Validate current step fields
    let isValid = true;
    
    // Step-specific validation
    switch (currentStep) {
      case 1:
        isValid = await methods.trigger(['businessName', 'publicEmail', 'phoneNumber']);
        break;
      case 2:
        isValid = await methods.trigger('bio');
        break;
      case 3:
        // Photos are optional
        break;
      case 4:
        isValid = await methods.trigger('serviceCategories');
        break;
      case 5:
        isValid = await methods.trigger(['location', 'serviceRadius']);
        break;
    }

    if (!isValid) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors before proceeding',
        variant: 'destructive'
      });
      return;
    }

    // Save draft before moving to next step
    const formData = methods.getValues();
    await saveDraft(formData);

    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    if (currentStep === STEPS.length) {
      await publishProfile(data);
    } else {
      await handleNext();
    }
  };

  const progressPercentage = (currentStep / STEPS.length) * 100;

  const CurrentStepComponent = STEPS[currentStep - 1].component;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create Your Provider Profile</h1>
        <p className="text-muted-foreground">
          Complete your profile to start accepting bookings from customers
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {STEPS.map((step) => (
            <div
              key={step.id}
              className={`text-sm font-medium ${
                step.id === currentStep
                  ? 'text-primary'
                  : step.id < currentStep
                  ? 'text-green-600'
                  : 'text-muted-foreground'
              }`}
            >
              {step.name}
            </div>
          ))}
        </div>
        <Progress value={progressPercentage} className="h-2" />
      </div>

      {/* Form */}
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Card className="p-6 mb-6">
            <CurrentStepComponent />
          </Card>

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            <div className="flex gap-2">
              {hasUnsavedChanges && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => saveDraft(methods.getValues())}
                  disabled={isSaving}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Draft'}
                </Button>
              )}

              {currentStep === STEPS.length ? (
                <Button type="submit" disabled={isLoading}>
                  <Eye className="mr-2 h-4 w-4" />
                  {isLoading ? 'Publishing...' : 'Publish Profile'}
                </Button>
              ) : (
                <Button type="button" onClick={handleNext}>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </form>
      </FormProvider>
    </div>
  );
}