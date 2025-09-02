'use client';

import { useState } from 'react';
import { AlertTriangle, FileText, DollarSign, Loader2 } from 'lucide-react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

const client = generateClient<Schema>();

const disputeReasons = [
  'Service not provided',
  'Poor quality work',
  'Incomplete service',
  'Overcharged',
  'Provider no-show',
  'Safety concerns',
  'Other'
];

interface DisputeFormProps {
  bookingId: string;
  bookingAmount?: number;
  onDisputeCreated?: (disputeId: string) => void;
}

export function DisputeForm({ bookingId, bookingAmount, onDisputeCreated }: DisputeFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    reason: '',
    description: '',
    amount: bookingAmount?.toString() || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.reason || !formData.description) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { data, errors } = await client.mutations.initiateDispute({
        bookingId,
        reason: formData.reason,
        description: formData.description,
        amount: formData.amount ? parseFloat(formData.amount) : undefined,
      });

      if (errors) {
        throw new Error(errors[0].message);
      }

      const result = data as any;
      setSuccess('Dispute initiated successfully. Both parties have 3 days to submit evidence.');
      
      // Reset form
      setFormData({
        reason: '',
        description: '',
        amount: bookingAmount?.toString() || '',
      });

      if (onDisputeCreated && result.disputeId) {
        onDisputeCreated(result.disputeId);
      }
    } catch (err) {
      console.error('Error creating dispute:', err);
      setError(err instanceof Error ? err.message : 'Failed to create dispute');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="h-5 w-5" />
          File a Dispute
        </CardTitle>
        <CardDescription>
          Start the formal dispute resolution process for this booking
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Dispute *</Label>
            <Select value={formData.reason} onValueChange={(value) => setFormData(prev => ({ ...prev, reason: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {disputeReasons.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Detailed Description *</Label>
            <Textarea
              id="description"
              placeholder="Explain what happened and why you're filing this dispute..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount" className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              Disputed Amount
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to dispute the full booking amount
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <FileText className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800">What happens next:</p>
                <ul className="mt-2 space-y-1 text-yellow-700">
                  <li>• Payment will be frozen immediately</li>
                  <li>• Both parties have 3 days to submit evidence</li>
                  <li>• AI will analyze the case for quick resolution</li>
                  <li>• Complex cases escalate to human moderators</li>
                  <li>• You'll receive updates via email and notifications</li>
                </ul>
              </div>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full" variant="destructive">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Filing Dispute...
              </>
            ) : (
              'File Dispute'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}