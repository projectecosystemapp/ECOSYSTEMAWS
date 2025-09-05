import { defineBackend } from '@aws-amplify/backend';
import * as opensearch from 'aws-cdk-lib/aws-opensearchserverless';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { nullableToString, nullableToNumber } from '@/lib/type-utils';

export function createOpenSearchDomain(backend: any) {
  const { stack } = backend;

  // PERFORMANCE: Cost-optimized OpenSearch domain configuration
  // Baseline: No search capability, manual DynamoDB scanning
  // Target: Sub-100ms search latency with 70% cost reduction vs standard config
  // Technique: Serverless with intelligent auto-scaling and data lifecycle management

  // Create OpenSearch Serverless collection for cost efficiency
  const searchCollection = new opensearch.CfnCollection(stack, 'EcosystemSearchCollection', {
    name: 'ecosystem-marketplace-search',
    description: 'High-performance search for marketplace services and bookings',
    type: 'SEARCH', // Optimized for search workloads
    standbyReplicas: 'DISABLED', // Cost optimization - disable standby for dev/staging
  });

  // Network policy for secure access
  const networkPolicy = new opensearch.CfnSecurityPolicy(stack, 'SearchNetworkPolicy', {
    name: 'ecosystem-search-network-policy',
    type: 'network',
    policy: JSON.stringify([
      {
        Rules: [
          {
            Resource: [`collection/ecosystem-marketplace-search`],
            ResourceType: 'collection'
          }
        ],
        AllowFromPublic: false, // Private access only
        SourceVPCs: [] // Will be configured per environment
      }
    ])
  });

  // Data access policy for fine-grained permissions
  const dataAccessPolicy = new opensearch.CfnAccessPolicy(stack, 'SearchDataAccessPolicy', {
    name: 'ecosystem-search-data-policy',
    type: 'data',
    policy: JSON.stringify([
      {
        Rules: [
          {
            Resource: [`collection/ecosystem-marketplace-search`],
            Permission: [
              'aoss:CreateCollectionItems',
              'aoss:DeleteCollectionItems',
              'aoss:UpdateCollectionItems',
              'aoss:DescribeCollectionItems'
            ],
            ResourceType: 'collection'
          },
          {
            Resource: [`index/ecosystem-marketplace-search/*`],
            Permission: [
              'aoss:CreateIndex',
              'aoss:DeleteIndex',
              'aoss:UpdateIndex',
              'aoss:DescribeIndex',
              'aoss:ReadDocument',
              'aoss:WriteDocument'
            ],
            ResourceType: 'index'
          }
        ],
        Principal: [
          // Will be populated with Lambda execution roles
        ]
      }
    ])
  });

  // Encryption policy for data at rest
  const encryptionPolicy = new opensearch.CfnSecurityPolicy(stack, 'SearchEncryptionPolicy', {
    name: 'ecosystem-search-encryption-policy',
    type: 'encryption',
    policy: JSON.stringify({
      Rules: [
        {
          Resource: [`collection/ecosystem-marketplace-search`],
          ResourceType: 'collection'
        }
      ],
      AWSOwnedKey: true // Use AWS managed keys for cost efficiency
    })
  });

  // Ensure dependencies
  searchCollection.addDependency(networkPolicy);
  searchCollection.addDependency(dataAccessPolicy);
  searchCollection.addDependency(encryptionPolicy);

  // CloudWatch log group for search analytics and debugging
  const searchLogGroup = new logs.LogGroup(stack, 'OpenSearchLogGroup', {
    logGroupName: '/aws/opensearch/ecosystem-marketplace-search',
    retention: logs.RetentionDays.ONE_MONTH, // Cost optimization - shorter retention
    removalPolicy: RemovalPolicy.DESTROY
  });

  // IAM role for Lambda functions to access OpenSearch
  const openSearchAccessRole = new iam.Role(stack, 'OpenSearchAccessRole', {
    assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    description: 'Role for Lambda functions to access OpenSearch collection',
    managedPolicies: [
      iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
    ],
    inlinePolicies: {
      OpenSearchAccess: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: nullableToString(iam.Effect.ALLOW),
            actions: [
              'aoss:APIAccessAll',
              'aoss:DashboardsAccessAll',
              'aoss:CreateCollectionItems',
              'aoss:DeleteCollectionItems',
              'aoss:UpdateCollectionItems',
              'aoss:DescribeCollectionItems'
            ],
            resources: [searchCollection.attrArn]
          }),
          new iam.PolicyStatement({
            effect: nullableToString(iam.Effect.ALLOW),
            actions: [
              'logs:CreateLogGroup',
              'logs:CreateLogStream',
              'logs:PutLogEvents'
            ],
            resources: [searchLogGroup.logGroupArn]
          }),
          // DynamoDB Streams permissions for real-time sync
          new iam.PolicyStatement({
            effect: nullableToString(iam.Effect.ALLOW),
            actions: [
              'dynamodb:DescribeStream',
              'dynamodb:GetRecords',
              'dynamodb:GetShardIterator',
              'dynamodb:ListStreams'
            ],
            resources: ['*'] // Will be restricted to specific table streams
          })
        ]
      })
    }
  });

  return {
    searchCollection,
    openSearchAccessRole,
    searchLogGroup,
    collectionEndpoint: nullableToString(searchCollection.attrCollectionEndpoint),
    dashboardsEndpoint: searchCollection.attrDashboardEndpoint
  };
}

export const openSearchConfig = {
  // Performance optimizations
  indices: {
    services: {
      name: 'services',
      settings: {
        number_of_shards: 1, // Single shard for cost efficiency with <1M documents
        number_of_replicas: 0, // No replicas for cost optimization
        refresh_interval: '30s', // Batch refresh for better performance
        max_result_window: 10000,
        'index.codec': 'best_compression', // 20-30% storage reduction
        'index.query.default_field': ['title^3', 'description^2', 'category'], // Boost title matches
        'index.mapping.total_fields.limit': 1000,
        'index.max_docvalue_fields_search': 100
      },
      mappings: {
        dynamic: 'strict', // Prevent mapping explosions
        properties: {
          id: { type: 'keyword' },
          title: { 
            type: 'text',
            analyzer: 'standard',
            fields: {
              keyword: { type: 'keyword' },
              suggest: { 
                type: 'search_as_you_type',
                max_shingle_size: 3
              }
            }
          },
          description: { 
            type: 'text',
            analyzer: 'standard'
          },
          category: { 
            type: 'keyword',
            fields: {
              text: { type: 'text', analyzer: 'standard' }
            }
          },
          price: { type: 'float' },
          priceType: { type: 'keyword' },
          currency: { type: 'keyword' },
          providerId: { type: 'keyword' },
          location: {
            properties: {
              coordinates: { type: 'geo_point' }, // Enable geo search
              address: { type: 'text' },
              city: { type: 'keyword' },
              state: { type: 'keyword' },
              country: { type: 'keyword' },
              zipCode: { type: 'keyword' }
            }
          },
          active: { type: 'boolean' },
          maxGroupSize: { type: 'integer' },
          duration: { type: 'integer' },
          rating: { type: 'float' },
          reviewCount: { type: 'integer' },
          tags: { type: 'keyword' },
          availability: {
            type: 'nested',
            properties: {
              dayOfWeek: { type: 'integer' },
              startTime: { type: 'keyword' },
              endTime: { type: 'keyword' }
            }
          },
          createdAt: { type: 'date' },
          updatedAt: { type: 'date' },
          // Performance fields for sorting/filtering
          popularityScore: { type: 'float' }, // Computed score for ranking
          lastBookedAt: { type: 'date' }
        }
      }
    },
    bookings: {
      name: 'bookings',
      settings: {
        number_of_shards: 1,
        number_of_replicas: 0,
        refresh_interval: '5s', // More frequent refresh for real-time booking updates
        'index.codec': 'best_compression'
      },
      mappings: {
        dynamic: 'strict',
        properties: {
          id: { type: 'keyword' },
          serviceId: { type: 'keyword' },
          customerId: { type: 'keyword' },
          providerId: { type: 'keyword' },
          customerEmail: { type: 'keyword' },
          providerEmail: { type: 'keyword' },
          status: { type: 'keyword' },
          paymentStatus: { type: 'keyword' },
          startDateTime: { type: 'date' },
          endDateTime: { type: 'date' },
          amount: { type: 'float' },
          currency: { type: 'keyword' },
          location: { type: 'geo_point' },
          groupSize: { type: 'integer' },
          createdAt: { type: 'date' },
          updatedAt: { type: 'date' },
          // Analytics fields
          timeSlot: { type: 'keyword' }, // hourly/daily buckets for aggregations
          dayOfWeek: { type: 'integer' },
          monthOfYear: { type: 'integer' }
        }
      }
    },
    users: {
      name: 'users',
      settings: {
        number_of_shards: 1,
        number_of_replicas: 0,
        refresh_interval: '60s', // Slower refresh for user data
        'index.codec': 'best_compression'
      },
      mappings: {
        dynamic: 'strict',
        properties: {
          id: { type: 'keyword' },
          email: { type: 'keyword' },
          firstName: { type: 'text' },
          lastName: { type: 'text' },
          userType: { type: 'keyword' },
          location: { type: 'geo_point' },
          joinedAt: { type: 'date' },
          lastActiveAt: { type: 'date' },
          // Provider-specific fields
          servicesOffered: { type: 'keyword' },
          averageRating: { type: 'float' },
          totalBookings: { type: 'integer' },
          isVerified: { type: 'boolean' }
        }
      }
    }
  },
  
  // Search templates for common queries
  searchTemplates: {
    serviceSearch: {
      template: {
        query: {
          bool: {
            must: [
              {
                multi_match: {
                  query: "{{query}}",
                  fields: ["title^3", "description^2", "category"],
                  type: "best_fields",
                  fuzziness: "AUTO"
                }
              }
            ],
            filter: [
              { term: { active: true } },
              { range: { price: { gte: "{{min_price}}", lte: "{{max_price}}" } } }
            ]
          }
        },
        sort: [
          { _score: { order: "desc" } },
          { popularityScore: { order: "desc" } },
          { createdAt: { order: "desc" } }
        ]
      }
    },
    geoSearch: {
      template: {
        query: {
          bool: {
            must: [
              { match_all: {} }
            ],
            filter: [
              { term: { active: true } },
              {
                geo_distance: {
                  distance: "{{distance}}km",
                  "location.coordinates": {
                    lat: "{{lat}}",
                    lon: "{{lon}}"
                  }
                }
              }
            ]
          }
        },
        sort: [
          {
            _geo_distance: {
              "location.coordinates": {
                lat: "{{lat}}",
                lon: "{{lon}}"
              },
              order: "asc",
              unit: "km"
            }
          }
        ]
      }
    }
  }
};