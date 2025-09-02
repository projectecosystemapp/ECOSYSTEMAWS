'use client';

import { 
  Sparkles, 
  Loader2, 
  Copy, 
  Check,
  Plus,
  X,
  Wand2
} from 'lucide-react';
import { useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';

const client = generateClient<Schema>();

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface BioGeneratorProps {
  onBioGenerated?: (bio: string) => void;
  currentBio?: string;
  providerId?: string;
}

export function BioGenerator({ onBioGenerated, currentBio, providerId }: BioGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [generatedBio, setGeneratedBio] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  
  // Form fields
  const [businessName, setBusinessName] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newSpecialization, setNewSpecialization] = useState('');
  const [newKeyword, setNewKeyword] = useState('');

  const generateBio = async () => {
    if (!businessName) {
      setError('Please enter your business name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, errors } = await client.mutations.generateBio({
        businessName,
        specializations,
        yearsExperience: yearsExperience && !isNaN(Number(yearsExperience)) ? Number(yearsExperience) : undefined,
        keywords,
        providerId,
      });

      if (errors) {
        throw new Error(errors[0].message);
      }

      const result = data as any;
      setGeneratedBio(result.bio);
      
      // Save to DynamoDB for caching
      await client.models.GeneratedBio.create({
        providerId: providerId || 'anonymous',
        businessName,
        bio: result.bio,
        specializations,
        keywords,
        yearsExperience: result.yearsExperience,
        generatedAt: result.generatedAt,
        status: 'completed',
      });

      if (onBioGenerated) {
        onBioGenerated(result.bio);
      }
    } catch (err) {
      console.error('Error generating bio:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate bio');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedBio);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      setError('Failed to copy to clipboard');
    }
  };

  const addSpecialization = () => {
    if (newSpecialization && !specializations.includes(newSpecialization)) {
      setSpecializations([...specializations, newSpecialization]);
      setNewSpecialization('');
    }
  };

  const removeSpecialization = (spec: string) => {
    setSpecializations(specializations.filter(s => s !== spec));
  };

  const addKeyword = () => {
    if (newKeyword && !keywords.includes(newKeyword)) {
      setKeywords([...keywords, newKeyword]);
      setNewKeyword('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          AI Bio Generator
        </CardTitle>
        <CardDescription>
          Let AI create a professional bio for your business profile
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Business Name */}
        <div className="space-y-2">
          <Label htmlFor="businessName">Business Name *</Label>
          <Input
            id="businessName"
            placeholder="Enter your business name"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />
        </div>

        {/* Years of Experience */}
        <div className="space-y-2">
          <Label htmlFor="experience">Years of Experience</Label>
          <Input
            id="experience"
            type="number"
            placeholder="e.g., 5"
            value={yearsExperience}
            onChange={(e) => setYearsExperience(e.target.value)}
          />
        </div>

        {/* Specializations */}
        <div className="space-y-2">
          <Label>Specializations</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Add a specialization"
              value={newSpecialization}
              onChange={(e) => setNewSpecialization(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialization())}
            />
            <Button 
              type="button"
              onClick={addSpecialization}
              size="icon"
              variant="outline"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {specializations.map((spec) => (
              <Badge key={spec} variant="secondary" className="gap-1">
                {spec}
                <button
                  onClick={() => removeSpecialization(spec)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Keywords */}
        <div className="space-y-2">
          <Label>Keywords</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Add keywords for SEO"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
            />
            <Button 
              type="button"
              onClick={addKeyword}
              size="icon"
              variant="outline"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {keywords.map((keyword) => (
              <Badge key={keyword} variant="outline" className="gap-1">
                {keyword}
                <button
                  onClick={() => removeKeyword(keyword)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Generate Button */}
        <Button 
          onClick={generateBio}
          disabled={loading || !businessName}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-4 w-4" />
              Generate Professional Bio
            </>
          )}
        </Button>

        {/* Generated Bio */}
        {generatedBio && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Generated Bio</Label>
              <Button
                size="sm"
                variant="ghost"
                onClick={copyToClipboard}
              >
                {copied ? (
                  <>
                    <Check className="mr-2 h-3 w-3" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-3 w-3" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <Textarea
              value={generatedBio}
              onChange={(e) => setGeneratedBio(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              You can edit the generated bio before saving
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}