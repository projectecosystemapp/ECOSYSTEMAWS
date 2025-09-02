'use client';

import { useState, useEffect } from 'react';
import { Clock, CheckCircle, AlertCircle, FileText, Gavel } from 'lucide-react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const client = generateClient<Schema>();

interface DisputeTrackerProps {
  disputeId: string;
}

const statusSteps = [
  { key: 'INITIATED', label: 'Dispute Filed', icon: FileText },
  { key: 'EVIDENCE_COLLECTION', label: 'Evidence Collection', icon: Clock },
  { key: 'AUTOMATED_REVIEW', label: 'AI Analysis', icon: AlertCircle },
  { key: 'RESOLVED', label: 'Resolved', icon: CheckCircle },
];

export function DisputeTracker({ disputeId }: DisputeTrackerProps) {
  const [dispute, setDispute] = useState<any>(null);
  const [workflowStatus, setWorkflowStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDisputeStatus();
    const interval = setInterval(loadDisputeStatus, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, [disputeId]);

  const loadDisputeStatus = async () => {
    try {
      const { data, errors } = await client.queries.getDisputeStatus({
        disputeId,
      });

      if (errors) {
        throw new Error(errors[0].message);
      }

      const result = data as any;
      setDispute(result.dispute);
      setWorkflowStatus(result.workflowStatus);
    } catch (err) {
      console.error('Error loading dispute status:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dispute status');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStepIndex = () => {
    if (!dispute) return 0;
    return statusSteps.findIndex(step => step.key === dispute.status);
  };

  const getProgressPercentage = () => {
    const currentIndex = getCurrentStepIndex();
    return ((currentIndex + 1) / statusSteps.length) * 100;
  };

  const formatTimeRemaining = (timeRemaining: number) => {
    if (timeRemaining <= 0) return 'Expired';
    
    const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h remaining`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'INITIATED': return 'bg-blue-500';
      case 'EVIDENCE_COLLECTION': return 'bg-yellow-500';
      case 'AUTOMATED_REVIEW': return 'bg-purple-500';
      case 'MANUAL_REVIEW': return 'bg-orange-500';
      case 'RESOLVED': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Dispute Status...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (error || !dispute) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Error</CardTitle>
          <CardDescription>{error || 'Dispute not found'}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Dispute #{disputeId.slice(-8)}</CardTitle>
              <CardDescription>
                {dispute.reason} • ${dispute.amount}
              </CardDescription>
            </div>
            <Badge className={getStatusColor(dispute.status)}>
              {dispute.status.replace('_', ' ')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Progress</span>
                <span>{Math.round(getProgressPercentage())}%</span>
              </div>
              <Progress value={getProgressPercentage()} className="h-2" />
            </div>

            {dispute.status === 'EVIDENCE_COLLECTION' && dispute.timeRemaining && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="font-medium text-yellow-800">Evidence Collection Period</p>
                    <p className="text-sm text-yellow-700">
                      {formatTimeRemaining(dispute.timeRemaining)} to submit evidence
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {statusSteps.map((step, index) => {
                const Icon = step.icon;
                const isCompleted = index <= getCurrentStepIndex();
                const isCurrent = index === getCurrentStepIndex();
                
                return (
                  <div key={step.key} className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                      isCompleted ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${isCurrent ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'}`}>
                        {step.label}
                      </p>
                      {isCurrent && (
                        <p className="text-sm text-muted-foreground">
                          Currently in progress...
                        </p>
                      )}
                    </div>
                    {isCompleted && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                );
              })}
            </div>

            {workflowStatus && (
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Workflow Details</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Status: {workflowStatus.status}</p>
                  <p>Started: {new Date(workflowStatus.startDate).toLocaleString()}</p>
                  {workflowStatus.stopDate && (
                    <p>Completed: {new Date(workflowStatus.stopDate).toLocaleString()}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}