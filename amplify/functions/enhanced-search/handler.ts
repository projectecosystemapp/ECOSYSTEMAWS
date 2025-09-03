import type { Schema } from '../../data/resource';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { nullableToString, nullableToNumber } from '@/lib/type-utils';

type SearchAllHandler = Schema['searchAll']['functionHandler'];
type GetSearchSuggestionsHandler = Schema['getSearchSuggestions']['functionHandler'];
type GetSearchAnalyticsHandler = Schema['getSearchAnalytics']['functionHandler'];

type Handler = SearchAllHandler | GetSearchSuggestionsHandler | GetSearchAnalyticsHandler;

const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

// Simple text search function
function searchText(text: string, query: string): number {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  if (lowerText.includes(lowerQuery)) {
    return lowerText.indexOf(lowerQuery) === 0 ? 2 : 1; // Higher score for prefix match
  }
  return 0;
}

export const handler: Handler = async (event: any) => {
  const { fieldName, arguments: args } = event;

  try {
    if (fieldName === 'searchAll') {
      const { query, filters = {}, location, radius, sortBy = 'relevance', limit = 20, offset = 0 } = args;
      
      // Search across Services table using DynamoDB scan
      const serviceResults = await dynamodb.send(new ScanCommand({
        TableName: nullableToString(process.env.SERVICE_TABLE_NAME),
        FilterExpression: filters.category ? 'category = :category' : undefined,
        ExpressionAttributeValues: filters.category ? { ':category': filters.category } : undefined,
      }));

      // Search across ServiceRequest table
      const requestResults = await dynamodb.send(new ScanCommand({
        TableName: nullableToString(process.env.SERVICEREQUEST_TABLE_NAME),
        FilterExpression: filters.category ? 'category = :category' : undefined,
        ExpressionAttributeValues: filters.category ? { ':category': filters.category } : undefined,
      }));

      // Combine and score results
      const allResults = [
        ...(serviceResults.Items || []).map(item => ({ ...item, type: 'services' })),
        ...(requestResults.Items || []).map(item => ({ ...item, type: 'service-requests' })),
      ];

      // Simple text-based scoring
      const scoredResults = allResults
        .map(item => {
          let score = 0;
          score += searchText(item.title || '', query) * 3;
          score += searchText(item.description || '', query) * 2;
          score += searchText(item.category || '', query) * 2;
          
          return {
            id: nullableToString(item.id),
            type: nullableToString(item.type),
            score,
            source: item,
          };
        })
        .filter(result => result.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(offset, offset + limit);
      
      return {
        results: scoredResults,
        total: nullableToString(scoredResults.length),
        suggestions: [],
        aggregations: {},
        took: 50,
      };
    }

    if (fieldName === 'getSearchSuggestions') {
      const { query, type = 'all' } = args;
      
      // Simple prefix matching for suggestions
      const serviceResults = await dynamodb.send(new ScanCommand({
        TableName: nullableToString(process.env.SERVICE_TABLE_NAME),
        ProjectionExpression: 'title',
      }));

      const suggestions = (serviceResults.Items || [])
        .map(item => item.title)
        .filter(title => title && title.toLowerCase().startsWith(query.toLowerCase()))
        .slice(0, 10);
      
      return {
        suggestions: suggestions.map(text => ({ text, score: 1 })),
      };
    }

    if (fieldName === 'getSearchAnalytics') {
      const { timeRange = '7d', type = 'all' } = args;
      
      // Mock analytics data for now
      const mockAnalytics = {
        topSearches: [
          { key: 'plumber', doc_count: 45 },
          { key: 'electrician', doc_count: 32 },
          { key: 'cleaning', doc_count: 28 },
        ],
        noResultsSearches: [
          { key: 'quantum repair', doc_count: 3 },
          { key: 'time travel', doc_count: 2 },
        ],
        avgResultsPerSearch: 4.2,
        totalSearches: 150,
      };
      
      return mockAnalytics;
    }

    throw new Error(`Unknown field: ${fieldName}`);
  } catch (error) {
    console.error('Enhanced search error:', error);
    throw new Error('Search service temporarily unavailable');
  }
};