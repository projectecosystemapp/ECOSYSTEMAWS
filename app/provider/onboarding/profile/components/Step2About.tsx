'use client';

import { Sparkles, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

import { ProfileFormData } from '../page';


export default function Step2About() {
  const { control, setValue, watch } = useFormContext<ProfileFormData>();
  const { toast } = useToast();
  const [keywords, setKeywords] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const bio = watch('bio');
  const characterCount = bio?.length || 0;
  const minCharacters = 50;
  const maxCharacters = 1500;

  const generateBio = async () => {
    if (!keywords.trim()) {
      toast({
        title: 'Keywords required',
        description: 'Please enter some keywords about your business',
        variant: 'destructive'
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai/generate-bio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: keywords.trim() })
      });

      if (!response.ok) throw new Error('Failed to generate bio');

      const data = await response.json();
      setValue('bio', data.bio, { shouldValidate: true });
      
      toast({
        title: 'Bio generated!',
        description: 'Feel free to edit it to match your style'
      });
    } catch (error) {
      console.error('Error generating bio:', error);
      toast({
        title: 'Generation failed',
        description: 'Please try again or write your bio manually',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">About Your Business</h2>
        <p className="text-muted-foreground">
          Tell customers what makes your business special
        </p>
      </div>

      {/* AI Bio Generation */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <h3 className="font-medium">AI Bio Generator</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Enter keywords about your services, expertise, and values
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="e.g., yoga instructor, 10 years experience, mindfulness, flexibility"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            disabled={isGenerating}
          />
          <Button
            type="button"
            onClick={generateBio}
            disabled={isGenerating}
            variant="secondary"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Bio Textarea */}
      <FormField
        control={control}
        name="bio"
        render={({ field }) => (
          <FormItem>
            <div className="flex justify-between items-end">
              <FormLabel>Your Bio *</FormLabel>
              <span className={`text-sm ${
                characterCount < minCharacters 
                  ? 'text-red-500' 
                  : characterCount > maxCharacters
                  ? 'text-red-500'
                  : 'text-muted-foreground'
              }`}>
                {characterCount} / {maxCharacters} characters
                {characterCount < minCharacters && ` (minimum ${minCharacters})`}
              </span>
            </div>
            <FormControl>
              <Textarea
                placeholder="Write about your experience, what you offer, and what makes you unique..."
                className="min-h-[200px] resize-none"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Writing Tips */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h4 className="font-medium text-amber-900 mb-2">Writing Tips:</h4>
        <ul className="text-sm text-amber-800 space-y-1">
          <li>• Start with your years of experience and qualifications</li>
          <li>• Describe your approach and what makes you unique</li>
          <li>• Mention the types of clients you work best with</li>
          <li>• End with a call to action or invitation to book</li>
          <li>• Keep it professional but personable</li>
        </ul>
      </div>
    </div>
  );
}