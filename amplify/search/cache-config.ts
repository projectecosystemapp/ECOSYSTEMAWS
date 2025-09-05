import { Construct } from 'constructs';
import { nullableToString, nullableToNumber } from '@/lib/type-utils';
import {
  CfnCacheCluster,
  CfnReplicationGroup,
  CfnSubnetGroup,
  CfnParameterGroup,
} from 'aws-cdk-lib/aws-elasticache';
import {
  SecurityGroup,
  IVpc,
  SubnetType,
  Port,
  Peer,
} from 'aws-cdk-lib/aws-ec2';
import {
  Role,
  ServicePrincipal,
  PolicyStatement,
  PolicyDocument,
} from 'aws-cdk-lib/aws-iam';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';

export interface CacheConfigProps {
  /**
   * Environment: 'dev', 'staging', 'production'
   * Affects cache sizing and redundancy
   */
  environment: 'dev' | 'staging' | 'production';
  
  /**
   * VPC for cache deployment
   */
  vpc: IVpc;
  
  /**
   * Enable cost optimization features
   */
  enableCostOptimization?: boolean;
  
  /**
   * Enable cluster mode for high availability
   */
  enableClusterMode?: boolean;
}

/**
 * PERFORMANCE: ElastiCache Redis configuration for sub-100ms search latency
 * Baseline: Direct OpenSearch queries (200-500ms average)
 * Target: Sub-100ms cached search results with 95% hit rate
 * Technique: Multi-layer caching with TTL optimization and cluster failover
 */
export class EcosystemCacheConfig extends Construct {
  public readonly replicationGroup?: CfnReplicationGroup;
  public readonly cacheCluster?: CfnCacheCluster;
  public readonly securityGroup: SecurityGroup;
  public readonly subnetGroup: CfnSubnetGroup;
  public readonly parameterGroup: CfnParameterGroup;
  public readonly cacheEndpoint: string;
  public readonly cachePort: number = 6379;

  constructor(scope: Construct, id: string, props: CacheConfigProps) {
    super(scope, id);

    const { environment, vpc, enableCostOptimization = true, enableClusterMode = false } = props;

    // Create security group for ElastiCache
    this.securityGroup = new SecurityGroup(this, 'CacheSecurityGroup', {
      vpc,
      description: 'Security group for ElastiCache Redis cluster',
      allowAllOutbound: false,
    });

    // Allow Redis access from within VPC
    this.securityGroup.addIngressRule(
      Peer.ipv4(vpc.vpcCidrBlock),
      Port.tcp(this.cachePort),
      'Redis access from VPC'
    );

    // Create subnet group for ElastiCache
    this.subnetGroup = new CfnSubnetGroup(this, 'CacheSubnetGroup', {
      description: 'Subnet group for ElastiCache Redis cluster',
      subnetIds: vpc.selectSubnets({
        subnetType: nullableToString(SubnetType.PRIVATE_WITH_EGRESS),
      }).subnetIds,
      cacheSubnetGroupName: `ecosystem-cache-subnet-group-${environment}`,
    });

    // PERFORMANCE: Create custom parameter group for optimization
    this.parameterGroup = new CfnParameterGroup(this, 'CacheParameterGroup', {
      cacheParameterGroupFamily: 'redis7.x',
      description: `Redis parameter group for ${environment} environment`,
      properties: this.getOptimizedParameters(environment, enableCostOptimization),
    });

    // PERFORMANCE: Configure cache based on environment and cost optimization
    if (enableClusterMode && environment === 'production') {
      this.createReplicationGroup(environment, enableCostOptimization);
    } else {
      this.createSingleNodeCluster(environment, enableCostOptimization);
    }

    // Set cache endpoint
    this.cacheEndpoint = this.replicationGroup
      ? this.replicationGroup.attrPrimaryEndPointAddress
      : this.cacheCluster!.attrRedisEndpointAddress;
  }

  /**
   * PERFORMANCE: Create Redis replication group for production high availability
   */
  private createReplicationGroup(environment: string, enableCostOptimization: boolean): void {
    const nodeType = this.getOptimizedNodeType(environment, enableCostOptimization);
    
    this.replicationGroup = new CfnReplicationGroup(this, 'CacheReplicationGroup', {
      replicationGroupId: `ecosystem-search-cache-${environment}`,
      description: `Redis replication group for search caching in ${environment}`,
      
      // PERFORMANCE: Multi-AZ deployment for production
      multiAzEnabled: environment === 'production',
      automaticFailoverEnabled: environment === 'production',
      
      // Node configuration
      cacheNodeType: nodeType,
      numCacheClusters: this.getNumCacheClusters(environment, enableCostOptimization),
      
      // Engine configuration
      engine: 'redis',
      engineVersion: '7.0',
      port: nullableToString(this.cachePort),
      parameterGroupName: nullableToString(this.parameterGroup.ref),
      // Network configuration
      cacheSubnetGroupName: nullableToString(this.subnetGroup.ref),
      securityGroupIds: [this.securityGroup.securityGroupId],
      
      // PERFORMANCE: Backup and maintenance configuration
      snapshotRetentionLimit: environment === 'production' ? 7 : 1,
      snapshotWindow: '03:00-05:00', // 3-5 AM UTC for low usage
      preferredMaintenanceWindow: 'sun:05:00-sun:06:00',
      
      // Data persistence
      dataTieringEnabled: false, // Disabled for cost optimization
      
      // Encryption
      atRestEncryptionEnabled: true,
      transitEncryptionEnabled: true,
      
      // Logging
      logDeliveryConfigurations: [
        {
          destinationType: 'cloudwatch-logs',
          logFormat: 'json',
          logType: 'slow-log',
          destinationDetails: {
            cloudWatchLogsDetails: {
              logGroup: `/aws/elasticache/redis/${environment}/slow-log`,
            },
          },
        },
      ],
      
      // Removal policy
      deletionProtection: environment === 'production',
      finalSnapshotIdentifier: environment === 'production' 
        ? `ecosystem-search-cache-final-snapshot-${Date.now()}`
        : undefined,
    });
  }

  /**
   * PERFORMANCE: Create single-node cluster for development and staging
   */
  private createSingleNodeCluster(environment: string, enableCostOptimization: boolean): void {
    const nodeType = this.getOptimizedNodeType(environment, enableCostOptimization);
    
    this.cacheCluster = new CfnCacheCluster(this, 'CacheCluster', {
      clusterId: `ecosystem-search-cache-${environment}`,
      
      // Node configuration
      cacheNodeType: nodeType,
      numCacheNodes: 1,
      
      // Engine configuration
      engine: 'redis',
      engineVersion: '7.0',
      port: nullableToString(this.cachePort),
      cacheParameterGroupName: nullableToString(this.parameterGroup.ref),
      // Network configuration
      cacheSubnetGroupName: nullableToString(this.subnetGroup.ref),
      vpcSecurityGroupIds: [this.securityGroup.securityGroupId],
      
      // Backup configuration
      snapshotRetentionLimit: environment === 'staging' ? 1 : 0,
      snapshotWindow: '03:00-05:00',
      preferredMaintenanceWindow: 'sun:05:00-sun:06:00',
      
      // Logging
      logDeliveryConfigurations: [
        {
          destinationType: 'cloudwatch-logs',
          logFormat: 'json',
          logType: 'slow-log',
          destinationDetails: {
            cloudWatchLogsDetails: {
              logGroup: `/aws/elasticache/redis/${environment}/slow-log`,
            },
          },
        },
      ],
    });
  }

  /**
   * PERFORMANCE: Get optimized Redis parameters for search caching
   */
  private getOptimizedParameters(environment: string, enableCostOptimization: boolean): { [key: string]: string } {
    const baseParams = {
      // PERFORMANCE: Memory management optimization
      'maxmemory-policy': 'allkeys-lru', // Evict least recently used keys
      'maxmemory-samples': '5', // Sample size for LRU eviction
      
      // Connection optimization
      'tcp-keepalive': '300', // Keep connections alive
      'timeout': '300', // Client timeout (5 minutes)
      'tcp-backlog': '511', // Connection backlog
      
      // Performance tuning
      'save': '900 1 300 10 60 10000', // Background save intervals
      'stop-writes-on-bgsave-error': 'no', // Continue writes during save errors
      'rdbcompression': 'yes', // Compress RDB files
      'rdbchecksum': 'yes', // Add checksum to RDB files
      
      // Lazy freeing for better performance
      'lazyfree-lazy-eviction': 'yes',
      'lazyfree-lazy-expire': 'yes',
      'lazyfree-lazy-server-del': 'yes',
      
      // Hash optimization for small objects
      'hash-max-ziplist-entries': '512',
      'hash-max-ziplist-value': '64',
      
      // List optimization
      'list-max-ziplist-size': '-2',
      'list-compress-depth': '0',
      
      // Set optimization
      'set-max-intset-entries': '512',
      
      // Sorted set optimization
      'zset-max-ziplist-entries': '128',
      'zset-max-ziplist-value': '64',
      
      // HyperLogLog optimization
      'hll-sparse-max-bytes': '3000',
      
      // Stream optimization
      'stream-node-max-bytes': '4096',
      'stream-node-max-entries': '100',
    };

    // Environment-specific optimizations
    const envParams: { [key: string]: string } = {};
    
    if (environment === 'production') {
      envParams['maxclients'] = '65000'; // Higher connection limit
      envParams['replica-read-only'] = 'yes';
      envParams['replica-serve-stale-data'] = 'yes';
    } else {
      envParams['maxclients'] = enableCostOptimization ? '1000' : '10000';
    }

    // Cost optimization parameters
    if (enableCostOptimization) {
      envParams['activedefrag'] = 'no'; // Disable active defragmentation to save CPU
      envParams['jemalloc-bg-thread'] = 'no'; // Disable background memory management
    } else {
      envParams['activedefrag'] = 'yes';
      envParams['active-defrag-ignore-bytes'] = '100mb';
      envParams['active-defrag-threshold-lower'] = '10';
      envParams['active-defrag-threshold-upper'] = '100';
      envParams['jemalloc-bg-thread'] = 'yes';
    }

    return { ...baseParams, ...envParams };
  }

  /**
   * PERFORMANCE: Get cost-optimized node type based on environment
   */
  private getOptimizedNodeType(environment: string, enableCostOptimization: boolean): string {
    if (enableCostOptimization) {
      switch (environment) {
        case 'production':
          return 'cache.t4g.medium'; // ARM-based for better price/performance
        case 'staging':
          return 'cache.t4g.small';
        case 'dev':
        default:
          return 'cache.t4g.micro';
      }
    } else {
      switch (environment) {
        case 'production':
          return 'cache.r7g.large'; // Memory-optimized for high performance
        case 'staging':
          return 'cache.r7g.medium';
        case 'dev':
        default:
          return 'cache.t4g.small';
      }
    }
  }

  /**
   * Get number of cache clusters for replication group
   */
  private getNumCacheClusters(environment: string, enableCostOptimization: boolean): number {
    if (environment === 'production') {
      return enableCostOptimization ? 2 : 3; // Primary + 1 or 2 replicas
    }
    return 1;
  }

  /**
   * PERFORMANCE: Get cache configuration for Lambda functions
   */
  public getCacheConfig() {
    return {
      endpoint: nullableToString(this.cacheEndpoint),
      port: nullableToString(this.cachePort),
      // PERFORMANCE: Connection pool settings for optimal Lambda performance
      connectionPool: {
        maxConnections: 10,
        idleTimeout: 300000, // 5 minutes
        connectTimeout: 5000, // 5 seconds
        lazyConnect: true, // Connect on first command
        keepAlive: true,
        family: 4, // IPv4
      },
      // PERFORMANCE: Retry configuration
      retryDelayOnFailover: 100,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 3,
      retryDelayOnClusterDown: 300,
      enableReadyCheck: true,
      lazyConnect: true,
    };
  }

  /**
   * PERFORMANCE: Get optimized TTL strategies for different data types
   */
  public static getCacheTTLStrategies() {
    return {
      // Search results - short TTL for real-time updates
      searchResults: {
        ttl: 300, // 5 minutes
        keyPrefix: 'search:',
        compression: true,
      },
      
      // Service listings - medium TTL for catalog data
      serviceListings: {
        ttl: 1800, // 30 minutes
        keyPrefix: 'service:',
        compression: true,
      },
      
      // User profiles - longer TTL for relatively static data
      userProfiles: {
        ttl: 3600, // 1 hour
        keyPrefix: 'user:',
        compression: false,
      },
      
      // Search suggestions - long TTL for autocomplete
      searchSuggestions: {
        ttl: 7200, // 2 hours
        keyPrefix: 'suggest:',
        compression: true,
      },
      
      // Popular searches - very long TTL for trending data
      popularSearches: {
        ttl: 14400, // 4 hours
        keyPrefix: 'popular:',
        compression: true,
      },
      
      // Geographic data - very long TTL for location-based searches
      geoData: {
        ttl: 86400, // 24 hours
        keyPrefix: 'geo:',
        compression: true,
      },
      
      // Session data - short TTL for user sessions
      sessionData: {
        ttl: 1800, // 30 minutes
        keyPrefix: 'session:',
        compression: false,
      },
      
      // Rate limiting - very short TTL for request throttling
      rateLimiting: {
        ttl: 60, // 1 minute
        keyPrefix: 'rate:',
        compression: false,
      },
    };
  }

  /**
   * PERFORMANCE: Get cache warming strategies
   */
  public static getCacheWarmingStrategies() {
    return {
      // Popular services - warm cache with top services
      popularServices: {
        schedule: 'rate(15 minutes)', // Every 15 minutes
        query: {
          size: 50,
          sort: [{ rating: 'desc' }, { reviewCount: 'desc' }],
          filter: { term: { active: true } },
        },
        cacheKey: 'search:popular:services',
      },
      
      // Recent bookings - warm cache with recent activity
      recentBookings: {
        schedule: 'rate(5 minutes)', // Every 5 minutes
        query: {
          size: 20,
          sort: [{ createdAt: 'desc' }],
          filter: { range: { createdAt: { gte: 'now-1h' } } },
        },
        cacheKey: 'search:recent:bookings',
      },
      
      // Category aggregations - warm cache with category data
      categoryAggregations: {
        schedule: 'rate(30 minutes)', // Every 30 minutes
        query: {
          size: 0,
          aggs: {
            categories: {
              terms: { field: 'category', size: 20 },
              aggs: {
                avg_price: { avg: { field: 'price' } },
                service_count: { value_count: { field: 'id' } },
              },
            },
          },
        },
        cacheKey: 'search:aggs:categories',
      },
      
      // Geographic regions - warm cache with location-based data
      geoRegions: {
        schedule: 'rate(60 minutes)', // Every hour
        query: {
          size: 0,
          aggs: {
            geo_bounds: { geo_bounds: { field: 'location' } },
            geo_centroid: { geo_centroid: { field: 'location' } },
          },
        },
        cacheKey: 'search:geo:regions',
      },
    };
  }
}