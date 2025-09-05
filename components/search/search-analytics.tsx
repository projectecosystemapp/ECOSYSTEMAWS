'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Search, AlertCircle, BarChart3 } from 'lucide-react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const client = generateClient<Schema>();

interface SearchAnalytics {
  topSearches: Array<{ key: string; doc_count: number }>;
  noResultsSearches: Array<{ key: string; doc_count: number }>;
  avgResultsPerSearch: number;
  totalSearches: number;
}

export function SearchAnalytics() {
  const [analytics, setAnalytics] = useState<SearchAnalytics | null>(null);
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const { data, errors } = await client.queries.getSearchAnalytics({
        timeRange,
        type: 'all',
      });

      if (errors) {
        throw new Error(errors[0].message);
      }

      setAnalytics(data as SearchAnalytics);
    } catch (error) {
      console.error('Error loading search analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Analytics...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Error Loading Analytics</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Search Analytics</h2>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1d">Last Day</SelectItem>
            <SelectItem value="7d">Last Week</SelectItem>
            <SelectItem value="30d">Last Month</SelectItem>
            <SelectItem value="90d">Last 3 Months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Search className="h-4 w-4" />
              Total Searches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalSearches.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Avg Results per Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.avgResultsPerSearch.toFixed(1)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              No Results Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {((analytics.noResultsSearches.length / analytics.totalSearches) * 100).toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Searches */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top Search Terms
          </CardTitle>
          <CardDescription>
            Most popular searches in the selected time period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.topSearches.slice(0, 10).map((search, index) => (
              <div key={search.key} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                    {index + 1}
                  </Badge>
                  <span className="font-medium">{search.key}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {search.doc_count} searches
                  </span>
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ 
                        width: `${(search.doc_count / analytics.topSearches[0].doc_count) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* No Results Searches */}
      {analytics.noResultsSearches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Searches with No Results
            </CardTitle>
            <CardDescription>
              These searches didn't return any results - potential growth opportunities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.noResultsSearches.slice(0, 10).map((search, index) => (
                <div key={search.key} className="flex items-center justify-between p-2 bg-red-50 rounded">
                  <span className="font-medium text-red-800">{search.key}</span>
                  <Badge variant="destructive">
                    {search.doc_count} attempts
                  </Badge>
                </div>
              ))}
            </div>
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                💡 <strong>Growth Opportunity:</strong> Consider adding services or content for these search terms to capture unmet demand.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}