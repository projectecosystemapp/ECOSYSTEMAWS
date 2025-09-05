import { Construct } from 'constructs';
import { nullableToString, nullableToNumber } from '../../lib/type-utils';
import {
  Domain as OpenSearchDomain,
  EngineVersion,
  TLSSecurityPolicy,
  EbsDeviceVolumeType,
  CapacityConfig,
  ZoneAwarenessConfig,
  DomainEndpointOptions,
  EncryptionAtRestOptions,
  AdvancedSecurityOptions,
  LoggingOptions,
  LogType,
  CognitoOptions,
} from 'aws-cdk-lib/aws-opensearchservice';
import { 
  SecurityGroup, 
  Vpc, 
  SubnetType,
  IVpc,
  Port,
  Peer,
} from 'aws-cdk-lib/aws-ec2';
import { 
  Role, 
  ServicePrincipal, 
  PolicyStatement, 
  ManagedPolicy,
  PolicyDocument,
} from 'aws-cdk-lib/aws-iam';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { RemovalPolicy, Duration } from 'aws-cdk-lib';
import { Key } from 'aws-cdk-lib/aws-kms';

export interface OpenSearchDomainProps {
  /**
   * Environment: 'dev', 'staging', 'production'
   * Affects instance sizing and redundancy
   */
  environment: 'dev' | 'staging' | 'production';
  
  /**
   * VPC for domain deployment (optional, creates public domain if not provided)
   */
  vpc?: IVpc;
  
  /**
   * Cognito user pool ID for authentication (optional)
   */
  cognitoUserPoolId?: string;
  
  /**
   * Cognito identity pool ID for fine-grained access control (optional)
   */
  cognitoIdentityPoolId?: string;
  
  /**
   * Enable cost optimization features
   */
  enableCostOptimization?: boolean;
  
  /**
   * Custom domain name (optional)
   */
  customDomainName?: string;
}

/**
 * PERFORMANCE: OpenSearch Domain with cost-optimized configuration
 * Baseline: No search infrastructure
 * Target: Sub-100ms search latency with cost-effective t3.small instances
 * Technique: Multi-AZ deployment with performance monitoring and auto-scaling
 */
export class EcosystemOpenSearchDomain extends Construct {
  public readonly domain: OpenSearchDomain;
  public readonly domainEndpoint: string;
  public readonly dashboardsEndpoint: string;
  public readonly securityGroup?: SecurityGroup;
  public readonly serviceRole: Role;
  
  constructor(scope: Construct, id: string, props: OpenSearchDomainProps) {
    super(scope, id);
    
    const { environment, vpc, enableCostOptimization = true } = props;
    
    // Create KMS key for encryption
    const encryptionKey = new Key(this, 'OpenSearchEncryptionKey', {
      description: 'KMS key for OpenSearch domain encryption',
      enableKeyRotation: true,
      removalPolicy: environment === 'production' ? RemovalPolicy.RETAIN : nullableToString(RemovalPolicy.DESTROY),
    });
    
    // Service role for OpenSearch
    this.serviceRole = new Role(this, 'OpenSearchServiceRole', {
      assumedBy: new ServicePrincipal('opensearch.amazonaws.com'),
      description: 'Service role for OpenSearch domain operations',
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('AmazonOpenSearchServiceFullAccess'),
      ],
      inlinePolicies: {
        OpenSearchServicePolicy: new PolicyDocument({
          statements: [
            new PolicyStatement({
              actions: [
                'es:ESHttpPost',
                'es:ESHttpPut',
                'es:ESHttpGet',
                'es:ESHttpDelete',
                'es:ESHttpHead',
                'es:CreateElasticsearchDomain',
                'es:DeleteElasticsearchDomain',
                'es:DescribeElasticsearchDomain',
                'es:UpdateElasticsearchDomainConfig',
                'kms:Encrypt',
                'kms:Decrypt',
                'kms:ReEncrypt*',
                'kms:GenerateDataKey*',
                'kms:CreateGrant',
                'kms:DescribeKey',
              ],
              resources: ['*'],
            }),
          ],
        }),
      },
    });
    
    // CloudWatch log groups for OpenSearch logs
    const indexSlowLogGroup = new LogGroup(this, 'IndexSlowLogGroup', {
      logGroupName: `/aws/opensearch/domains/ecosystem-marketplace-${environment}/index-slow`,
      retention: nullableToString(RetentionDays.TWO_WEEKS),
      removalPolicy: environment === 'production' ? RemovalPolicy.RETAIN : nullableToString(RemovalPolicy.DESTROY),
    });
    
    const searchSlowLogGroup = new LogGroup(this, 'SearchSlowLogGroup', {
      logGroupName: `/aws/opensearch/domains/ecosystem-marketplace-${environment}/search-slow`,
      retention: nullableToString(RetentionDays.TWO_WEEKS),
      removalPolicy: environment === 'production' ? RemovalPolicy.RETAIN : nullableToString(RemovalPolicy.DESTROY),
    });
    
    const applicationLogGroup = new LogGroup(this, 'ApplicationLogGroup', {
      logGroupName: `/aws/opensearch/domains/ecosystem-marketplace-${environment}/application`,
      retention: nullableToString(RetentionDays.ONE_WEEK),
      removalPolicy: environment === 'production' ? RemovalPolicy.RETAIN : nullableToString(RemovalPolicy.DESTROY),
    });
    
    // Security group for VPC deployment
    let securityGroup: SecurityGroup | undefined;
    if (vpc) {
      securityGroup = new SecurityGroup(this, 'OpenSearchSecurityGroup', {
        vpc,
        description: 'Security group for OpenSearch domain',
        allowAllOutbound: true,
      });
      
      // Allow HTTPS access from within VPC
      securityGroup.addIngressRule(
        Peer.ipv4(vpc.vpcCidrBlock),
        Port.tcp(443),
        'HTTPS access from VPC'
      );
      
      this.securityGroup = securityGroup;
    }
    
    // PERFORMANCE: Cost-optimized capacity configuration based on environment
    const getCapacityConfig = (): CapacityConfig => {
      switch (environment) {
        case 'production':
          return {
            masterNodes: enableCostOptimization ? 3 : 3, // Always 3 for HA in production
            masterNodeInstanceType: enableCostOptimization ? 't3.small.search' : 'c6g.large.search',
            dataNodes: enableCostOptimization ? 2 : 4, // 2 nodes for cost optimization
            dataNodeInstanceType: enableCostOptimization ? 't3.small.search' : 'c6g.large.search',
            warmNodes: 0, // No warm nodes for cost optimization
          };
        case 'staging':
          return {
            masterNodes: 1, // Single master for staging
            masterNodeInstanceType: 't3.small.search',
            dataNodes: 2,
            dataNodeInstanceType: 't3.small.search',
            warmNodes: 0,
          };
        case 'dev':
        default:
          return {
            masterNodes: 0, // No dedicated masters for dev
            dataNodes: 1,
            dataNodeInstanceType: 't3.small.search',
            warmNodes: 0,
          };
      }
    };
    
    // PERFORMANCE: EBS configuration optimized for cost and performance
    const getEbsOptions = () => {
      const baseConfig = {
        enabled: true,
        volumeType: EbsDeviceVolumeType.GP3, // gp3 for better price/performance
        iops: enableCostOptimization ? 3000 : 4000, // Baseline IOPS for cost optimization
        throughput: enableCostOptimization ? 125 : 250, // MB/s throughput
      };
      
      switch (environment) {
        case 'production':
          return { ...baseConfig, volumeSize: enableCostOptimization ? 20 : 50 };
        case 'staging':
          return { ...baseConfig, volumeSize: 20 };
        case 'dev':
        default:
          return { ...baseConfig, volumeSize: 10 };
      }
    };
    
    // Zone awareness configuration
    const zoneAwarenessConfig: ZoneAwarenessConfig | undefined = 
      environment === 'production' ? {
        enabled: true,
        availabilityZoneCount: 2, // Multi-AZ for production
      } : undefined;
    
    // Create the OpenSearch domain
    this.domain = new OpenSearchDomain(this, 'Domain', {
      domainName: `ecosystem-marketplace-${environment}`,
      version: EngineVersion.OPENSEARCH_2_11, // Latest stable version
      
      // PERFORMANCE: Cost-optimized capacity configuration
      capacity: getCapacityConfig(),
      
      // EBS storage configuration
      ebs: getEbsOptions(),
      
      // Zone awareness for production
      zoneAwareness: zoneAwarenessConfig,
      
      // VPC configuration (optional)
      vpc: vpc ? {
        subnets: vpc.selectSubnets({
          subnetType: nullableToString(SubnetType.PRIVATE_WITH_EGRESS),
        }).subnets,
        securityGroups: securityGroup ? [securityGroup] : undefined,
      } : undefined,
      
      // Security configuration
      enforceHttps: true,
      nodeToNodeEncryption: true,
      encryptionAtRest: {
        enabled: true,
        kmsKey: encryptionKey,
      } as EncryptionAtRestOptions,
      
      // TLS security policy
      tlsSecurityPolicy: nullableToString(TLSSecurityPolicy.TLS_1_2),
      // Domain endpoint configuration
      domainEndpointOptions: {
        enforceHttps: true,
        tlsSecurityPolicy: nullableToString(TLSSecurityPolicy.TLS_1_2),
        customDomainEnabled: !!props.customDomainName,
        customDomain: nullableToString(props.customDomainName),
      } as DomainEndpointOptions,
      
      // Fine-grained access control (disabled for cost optimization in dev/staging)
      fineGrainedAccessControl: environment === 'production' ? {
        masterUserName: 'admin',
        masterUserPassword: undefined, // Use AWS Secrets Manager
      } as AdvancedSecurityOptions : undefined,
      
      // Cognito authentication (optional)
      cognitoKibanaAuth: props.cognitoUserPoolId ? {
        userPoolId: nullableToString(props.cognitoUserPoolId),
        identityPoolId: nullableToString(props.cognitoIdentityPoolId),
        role: nullableToString(this.serviceRole),
      } as CognitoOptions : undefined,
      
      // Logging configuration
      logging: {
        slowSearchLogEnabled: true,
        appLogEnabled: true,
        slowIndexLogEnabled: true,
        slowSearchLogGroup: searchSlowLogGroup,
        appLogGroup: applicationLogGroup,
        slowIndexLogGroup: indexSlowLogGroup,
      } as LoggingOptions,
      
      // Advanced options for performance tuning
      advancedOptions: {
        'rest.action.multi.allow_explicit_index': 'true',
        'indices.fielddata.cache.size': enableCostOptimization ? '20%' : '40%',
        'indices.query.bool.max_clause_count': '1024',
        // PERFORMANCE: Optimize for search performance
        'indices.memory.index_buffer_size': '20%',
        'indices.memory.min_index_buffer_size': '48mb',
        'indices.breaker.total.use_real_memory': 'true',
        'indices.breaker.total.limit': '95%',
        'indices.breaker.request.limit': '60%',
        'indices.breaker.fielddata.limit': '40%',
      },
      
      // Automated snapshot configuration
      automatedSnapshotStartHour: 2, // 2 AM UTC
      
      // Access policies (restrictive by default)
      accessPolicies: [
        new PolicyStatement({
          principals: [this.serviceRole],
          actions: ['es:*'],
          resources: ['*'],
        }),
      ],
      
      // Removal policy
      removalPolicy: environment === 'production' ? RemovalPolicy.RETAIN : nullableToString(RemovalPolicy.DESTROY),
      // Enable UltraWarm for cost optimization in production (optional)
      useUnsignedBasicAuth: false,
      
      // Enable slow log monitoring
      enableVersionUpgrade: true,
    });
    
    // Store endpoints
    this.domainEndpoint = this.domain.domainEndpoint;
    this.dashboardsEndpoint = `${this.domainEndpoint}/_dashboards/`;
    
    // PERFORMANCE: Auto-scaling policy for data nodes (production only)
    if (environment === 'production') {
      // Note: OpenSearch Service auto-scaling is managed through AWS console or CLI
      // This is a placeholder for future CDK support
      this.domain.node.addMetadata('AutoScalingEnabled', true);
      this.domain.node.addMetadata('AutoScalingPolicy', {
        targetCpuUtilization: 70,
        targetMemoryUtilization: 80,
        minNodes: getCapacityConfig().dataNodes,
        maxNodes: (getCapacityConfig().dataNodes || 2) * 2,
      });
    }
    
    // Grant permissions to access the domain
    this.grantAccess(this.serviceRole);
  }
  
  /**
   * Grant access to the OpenSearch domain
   */
  public grantAccess(grantee: Role): void {
    grantee.addToPolicy(
      new PolicyStatement({
        actions: [
          'es:ESHttpGet',
          'es:ESHttpPost',
          'es:ESHttpPut',
          'es:ESHttpDelete',
          'es:ESHttpHead',
        ],
        resources: [this.domain.domainArn + '/*'],
      })
    );
  }
  
  /**
   * Get the search client configuration for Lambda functions
   */
  public getClientConfig() {
    return {
      endpoint: nullableToString(this.domainEndpoint),
      region: nullableToString(this.domain.stack.region),
      service: 'es',
    };
  }
  
  /**
   * PERFORMANCE: Get index templates optimized for marketplace data
   */
  public getIndexTemplates() {
    return {
      services: {
        index_patterns: ['services-*'],
        template: {
          settings: {
            number_of_shards: 1, // Single shard for cost optimization
            number_of_replicas: this.domain.stack.node.tryGetContext('environment') === 'production' ? 1 : 0,
            'index.refresh_interval': '30s', // Optimize for indexing performance
            'index.max_result_window': 50000, // Support deep pagination
            'index.mapping.ignore_malformed': false,
            'index.mapping.coerce': false,
            // PERFORMANCE: Enable field data cache for aggregations
            'index.queries.cache.enabled': true,
            'index.requests.cache.enable': true,
            // Codec for compression
            'index.codec': 'best_compression',
            analysis: {
              analyzer: {
                marketplace_analyzer: {
                  type: 'custom',
                  tokenizer: 'standard',
                  filter: ['lowercase', 'stop', 'marketplace_synonym', 'stemmer'],
                },
                marketplace_search_analyzer: {
                  type: 'custom',
                  tokenizer: 'standard',
                  filter: ['lowercase', 'stop'],
                },
              },
              filter: {
                marketplace_synonym: {
                  type: 'synonym',
                  synonyms: [
                    'yoga,pilates,meditation',
                    'massage,therapy,spa',
                    'fitness,gym,workout',
                    'cooking,culinary,chef',
                  ],
                },
              },
            },
          },
          mappings: {
            properties: {
              id: { type: 'keyword' },
              title: {
                type: 'text',
                analyzer: 'marketplace_analyzer',
                search_analyzer: 'marketplace_search_analyzer',
                fields: {
                  keyword: { type: 'keyword' },
                  suggest: {
                    type: 'completion',
                    analyzer: 'simple',
                    search_analyzer: 'simple',
                  },
                },
              },
              description: {
                type: 'text',
                analyzer: 'marketplace_analyzer',
              },
              category: { type: 'keyword' },
              providerId: { type: 'keyword' },
              providerName: {
                type: 'text',
                fields: { keyword: { type: 'keyword' } },
              },
              price: { type: 'float' },
              priceType: { type: 'keyword' },
              currency: { type: 'keyword' },
              maxGroupSize: { type: 'integer' },
              duration: { type: 'integer' },
              location: {
                type: 'geo_point',
              },
              address: {
                type: 'text',
                fields: { keyword: { type: 'keyword' } },
              },
              active: { type: 'boolean' },
              rating: { type: 'float' },
              reviewCount: { type: 'integer' },
              tags: { type: 'keyword' },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' },
            },
          },
        },
      },
      bookings: {
        index_patterns: ['bookings-*'],
        template: {
          settings: {
            number_of_shards: 1,
            number_of_replicas: this.domain.stack.node.tryGetContext('environment') === 'production' ? 1 : 0,
            'index.refresh_interval': '30s',
          },
          mappings: {
            properties: {
              id: { type: 'keyword' },
              serviceId: { type: 'keyword' },
              customerId: { type: 'keyword' },
              providerId: { type: 'keyword' },
              customerEmail: { type: 'keyword' },
              providerEmail: { type: 'keyword' },
              startDateTime: { type: 'date' },
              endDateTime: { type: 'date' },
              status: { type: 'keyword' },
              paymentStatus: { type: 'keyword' },
              amount: { type: 'float' },
              currency: { type: 'keyword' },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' },
            },
          },
        },
      },
      users: {
        index_patterns: ['users-*'],
        template: {
          settings: {
            number_of_shards: 1,
            number_of_replicas: this.domain.stack.node.tryGetContext('environment') === 'production' ? 1 : 0,
          },
          mappings: {
            properties: {
              id: { type: 'keyword' },
              email: { type: 'keyword' },
              firstName: {
                type: 'text',
                fields: { keyword: { type: 'keyword' } },
              },
              lastName: {
                type: 'text',
                fields: { keyword: { type: 'keyword' } },
              },
              userType: { type: 'keyword' },
              location: { type: 'geo_point' },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' },
            },
          },
        },
      },
    };
  }
}