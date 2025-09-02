import type { Schema } from '../../data/resource';
import { Client } from '@opensearch-project/opensearch';
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws';

type Handler = Schema['searchAll']['functionHandler'] | 
              Schema['getSearchSuggestions']['functionHandler'] | 
              Schema['getSearchAnalytics']['functionHandler'];

const client = new Client({
  ...AwsSigv4Signer({
    region: process.env.OPENSEARCH_REGION || 'us-east-1',
    service: 'es',
  }),
  node: process.env.OPENSEARCH_ENDPOINT,
});

export const handler: Handler = async (event) => {
  const { fieldName, arguments: args } = event;

  try {
    if (fieldName === 'searchAll') {
      const { query, filters = {}, location, radius, sortBy = 'relevance', limit = 20, offset = 0 } = args;
      
      // Build OpenSearch query
      const searchQuery: any = {
        index: ['services', 'service-requests', 'providers'],
        body: {
          query: {
            bool: {
              must: [
                {
                  multi_match: {
                    query,
                    fields: [
                      'title^3',
                      'description^2', 
                      'category^2',
                      'keywords',
                      'specializations'
                    ],
                    type: 'best_fields',
                    fuzziness: 'AUTO',
                  }
                }
              ],
              filter: []
            }
          },
          highlight: {
            fields: {
              title: {},
              description: {},
            }
          },
          suggest: {
            text: query,
            simple_phrase: {
              phrase: {
                field: 'title.suggest',
                size: 3,
                gram_size: 3,
                direct_generator: [{
                  field: 'title.suggest',
                  suggest_mode: 'always',
                }]
              }
            }
          },
          from: offset,
          size: limit,
        }
      };

      // Add filters
      if (filters.category) {
        searchQuery.body.query.bool.filter.push({
          term: { 'category.keyword': filters.category }
        });
      }

      if (filters.priceRange) {
        searchQuery.body.query.bool.filter.push({
          range: {
            price: {
              gte: filters.priceRange.min,
              lte: filters.priceRange.max,
            }
          }
        });
      }

      // Add location-based search
      if (location && radius) {
        searchQuery.body.query.bool.filter.push({
          geo_distance: {
            distance: `${radius}km`,
            location: {
              lat: location.split(',')[0],
              lon: location.split(',')[1],
            }
          }
        });
      }

      // Add sorting
      if (sortBy === 'price_low') {
        searchQuery.body.sort = [{ price: { order: 'asc' } }];
      } else if (sortBy === 'price_high') {
        searchQuery.body.sort = [{ price: { order: 'desc' } }];
      } else if (sortBy === 'rating') {
        searchQuery.body.sort = [{ rating: { order: 'desc' } }];
      } else if (sortBy === 'distance' && location) {
        searchQuery.body.sort = [{
          _geo_distance: {
            location: {
              lat: location.split(',')[0],
              lon: location.split(',')[1],
            },
            order: 'asc',
            unit: 'km',
          }
        }];
      }

      const response = await client.search(searchQuery);
      
      return {
        results: response.body.hits.hits.map((hit: any) => ({
          id: hit._id,
          type: hit._index,
          score: hit._score,
          source: hit._source,
          highlights: hit.highlight,
        })),
        total: response.body.hits.total.value,
        suggestions: response.body.suggest?.simple_phrase?.[0]?.options || [],
        aggregations: response.body.aggregations,
        took: response.body.took,
      };
    }

    if (fieldName === 'getSearchSuggestions') {
      const { query, type = 'all' } = args;
      
      const suggestionQuery = {
        index: type === 'all' ? ['services', 'service-requests'] : [type],
        body: {
          suggest: {
            autocomplete: {
              prefix: query,
              completion: {
                field: 'suggest',
                size: 10,
                skip_duplicates: true,
              }
            }
          },
          _source: false,
        }
      };

      const response = await client.search(suggestionQuery);
      
      return {
        suggestions: response.body.suggest.autocomplete[0].options.map((option: any) => ({
          text: option.text,
          score: option._score,
        })),
      };
    }

    if (fieldName === 'getSearchAnalytics') {
      const { timeRange = '7d', type = 'all' } = args;
      
      // Get search analytics from OpenSearch
      const analyticsQuery = {
        index: 'search-logs',
        body: {
          query: {
            range: {
              timestamp: {
                gte: `now-${timeRange}`,
              }
            }
          },
          aggs: {
            top_searches: {
              terms: {
                field: 'query.keyword',
                size: 20,
              }
            },
            searches_over_time: {
              date_histogram: {
                field: 'timestamp',
                calendar_interval: '1h',
              }
            },
            no_results_searches: {
              filter: {
                term: { results_count: 0 }
              },
              aggs: {
                queries: {
                  terms: {
                    field: 'query.keyword',
                    size: 10,
                  }
                }
              }
            },
            avg_results_per_search: {
              avg: {
                field: 'results_count'
              }
            }
          },
          size: 0,
        }
      };

      const response = await client.search(analyticsQuery);
      
      return {
        topSearches: response.body.aggregations.top_searches.buckets,
        searchesOverTime: response.body.aggregations.searches_over_time.buckets,
        noResultsSearches: response.body.aggregations.no_results_searches.queries.buckets,
        avgResultsPerSearch: response.body.aggregations.avg_results_per_search.value,
        totalSearches: response.body.hits.total.value,
      };
    }

    throw new Error(`Unknown field: ${fieldName}`);
  } catch (error) {
    console.error('Enhanced search error:', error);
    throw new Error('Search service temporarily unavailable');
  }
};