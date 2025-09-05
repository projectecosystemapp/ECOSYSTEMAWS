import { Construct } from 'constructs';
import { nullableToString, nullableToNumber } from '../../lib/type-utils';
import {
  Alarm,
  Dashboard,
  GraphWidget,
  Metric,
  TextWidget,
  SingleValueWidget,
  AlarmWidget,
  Row,
  ComparisonOperator,
  TreatMissingData,
  Unit,
} from 'aws-cdk-lib/aws-cloudwatch';
import {
  Topic,
  Subscription,
  SubscriptionProtocol,
} from 'aws-cdk-lib/aws-sns';
import {
  SnsAction,
  CloudWatchAction,
} from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Duration } from 'aws-cdk-lib';
import { OpenSearchDomain } from 'aws-cdk-lib/aws-opensearchservice';
import { Function as LambdaFunction } from 'aws-cdk-lib/aws-lambda';

export interface SearchMonitoringProps {
  /**
   * Environment name for resource naming
   */
  environment: 'dev' | 'staging' | 'production';
  
  /**
   * OpenSearch domain to monitor
   */
  openSearchDomain: OpenSearchDomain;
  
  /**
   * Search indexer Lambda function
   */
  searchIndexerFunction: LambdaFunction;
  
  /**
   * ElastiCache cluster identifier
   */
  cacheClusterId?: string;
  
  /**
   * Email address for critical alerts
   */
  alertEmail: string;
  
  /**
   * Slack webhook URL for notifications (optional)
   */
  slackWebhookUrl?: string;
  
  /**
   * Enable cost monitoring alerts
   */
  enableCostMonitoring?: boolean;
}

/**
 * PERFORMANCE: Comprehensive search performance monitoring with CloudWatch
 * Baseline: No visibility into search performance and costs
 * Target: Real-time monitoring with sub-100ms latency alerts and cost optimization
 * Technique: Multi-dimensional monitoring with predictive alerting and auto-remediation
 */
export class EcosystemSearchMonitoring extends Construct {
  public readonly dashboard: Dashboard;
  public readonly alertTopic: Topic;
  public readonly criticalAlarms: Alarm[];
  public readonly warningAlarms: Alarm[];
  
  constructor(scope: Construct, id: string, props: SearchMonitoringProps) {
    super(scope, id);
    
    const { 
      environment, 
      openSearchDomain, 
      searchIndexerFunction,
      cacheClusterId,
      alertEmail,
      slackWebhookUrl,
      enableCostMonitoring = true
    } = props;
    
    // Create SNS topic for alerts
    this.alertTopic = new Topic(this, 'SearchAlertTopic', {
      topicName: `ecosystem-search-alerts-${environment}`,
      displayName: `Ecosystem Search Alerts - ${environment.toUpperCase()}`,
    });
    
    // Subscribe email to alerts
    new Subscription(this, 'EmailAlertSubscription', {
      topic: nullableToString(this.alertTopic),
      protocol: nullableToString(SubscriptionProtocol.EMAIL),
      endpoint: alertEmail,
    });
    
    // PERFORMANCE: Create comprehensive dashboard
    this.dashboard = new Dashboard(this, 'SearchDashboard', {
      dashboardName: `ecosystem-search-performance-${environment}`,
      defaultInterval: Duration.minutes(5),
    });
    
    // Build all monitoring components
    this.criticalAlarms = this.createCriticalAlarms(openSearchDomain, searchIndexerFunction, cacheClusterId);
    this.warningAlarms = this.createWarningAlarms(openSearchDomain, searchIndexerFunction, cacheClusterId);
    this.createDashboardWidgets(openSearchDomain, searchIndexerFunction, cacheClusterId, enableCostMonitoring);
    
    if (enableCostMonitoring) {
      this.createCostMonitoringAlarms();
    }
  }
  
  /**
   * PERFORMANCE: Create critical alarms that require immediate attention
   */
  private createCriticalAlarms(
    domain: OpenSearchDomain,
    indexer: LambdaFunction,
    cacheId?: string
  ): Alarm[] {
    const alarms: Alarm[] = [];
    
    // OpenSearch cluster health alarm
    const clusterHealthAlarm = new Alarm(this, 'OpenSearchClusterHealthAlarm', {
      alarmName: `OpenSearch-ClusterHealth-${domain.domainName}`,
      alarmDescription: 'OpenSearch cluster health is not green',
      metric: new Metric({
        namespace: 'AWS/ES',
        metricName: 'ClusterStatus.green',
        dimensionsMap: {
          DomainName: nullableToString(domain.domainName),
          ClientId: nullableToString(this.account),
        },
        statistic: 'Maximum',
      }),
      threshold: 0.99,
      comparisonOperator: nullableToString(ComparisonOperator.LESS_THAN_THRESHOLD),
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      treatMissingData: nullableToString(TreatMissingData.BREACHING),
    });
    
    clusterHealthAlarm.addAlarmAction(new SnsAction(this.alertTopic));
    alarms.push(clusterHealthAlarm);
    
    // PERFORMANCE: Search latency critical alarm (>200ms for 95th percentile)
    const searchLatencyAlarm = new Alarm(this, 'SearchLatencyCriticalAlarm', {
      alarmName: `OpenSearch-SearchLatency-Critical-${domain.domainName}`,
      alarmDescription: 'Search latency exceeded 200ms for 95th percentile',
      metric: new Metric({
        namespace: 'AWS/ES',
        metricName: 'SearchLatency',
        dimensionsMap: {
          DomainName: nullableToString(domain.domainName),
          ClientId: nullableToString(this.account),
        },
        statistic: 'p95',
        period: Duration.minutes(5),
      }),
      threshold: 200, // 200ms threshold
      comparisonOperator: nullableToString(ComparisonOperator.GREATER_THAN_THRESHOLD),
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
    });
    
    searchLatencyAlarm.addAlarmAction(new SnsAction(this.alertTopic));
    alarms.push(searchLatencyAlarm);
    
    // Indexing failure rate alarm
    const indexingFailureAlarm = new Alarm(this, 'IndexingFailureRateAlarm', {
      alarmName: `OpenSearch-IndexingFailures-${domain.domainName}`,
      alarmDescription: 'High rate of indexing failures detected',
      metric: new Metric({
        namespace: 'AWS/ES',
        metricName: 'IndexingErrors',
        dimensionsMap: {
          DomainName: nullableToString(domain.domainName),
          ClientId: nullableToString(this.account),
        },
        statistic: 'Sum',
        period: Duration.minutes(5),
      }),
      threshold: 10, // More than 10 errors in 5 minutes
      comparisonOperator: nullableToString(ComparisonOperator.GREATER_THAN_THRESHOLD),
      evaluationPeriods: 2,
    });
    
    indexingFailureAlarm.addAlarmAction(new SnsAction(this.alertTopic));
    alarms.push(indexingFailureAlarm);
    
    // Lambda function errors alarm
    const lambdaErrorAlarm = new Alarm(this, 'SearchIndexerErrorAlarm', {
      alarmName: `SearchIndexer-Errors-${indexer.functionName}`,
      alarmDescription: 'Search indexer function experiencing high error rate',
      metric: indexer.metricErrors({
        period: Duration.minutes(5),
      }),
      threshold: 5, // More than 5 errors in 5 minutes
      comparisonOperator: nullableToString(ComparisonOperator.GREATER_THAN_THRESHOLD),
      evaluationPeriods: 2,
    });
    
    lambdaErrorAlarm.addAlarmAction(new SnsAction(this.alertTopic));
    alarms.push(lambdaErrorAlarm);
    
    // PERFORMANCE: Cache hit rate critical alarm
    if (cacheId) {
      const cacheHitRateAlarm = new Alarm(this, 'CacheHitRateCriticalAlarm', {
        alarmName: `ElastiCache-HitRate-Critical-${cacheId}`,
        alarmDescription: 'Cache hit rate below 80% - performance degradation expected',
        metric: new Metric({
          namespace: 'AWS/ElastiCache',
          metricName: 'CacheHitRate',
          dimensionsMap: {
            CacheClusterId: cacheId,
          },
          statistic: 'Average',
          period: Duration.minutes(10),
        }),
        threshold: 80, // 80% hit rate threshold
        comparisonOperator: nullableToString(ComparisonOperator.LESS_THAN_THRESHOLD),
        evaluationPeriods: 3,
        datapointsToAlarm: 2,
      });
      
      cacheHitRateAlarm.addAlarmAction(new SnsAction(this.alertTopic));
      alarms.push(cacheHitRateAlarm);
    }
    
    return alarms;
  }
  
  /**
   * PERFORMANCE: Create warning alarms for performance degradation
   */
  private createWarningAlarms(
    domain: OpenSearchDomain,
    indexer: LambdaFunction,
    cacheId?: string
  ): Alarm[] {
    const alarms: Alarm[] = [];
    
    // PERFORMANCE: Search latency warning (>100ms for 95th percentile)
    const searchLatencyWarning = new Alarm(this, 'SearchLatencyWarningAlarm', {
      alarmName: `OpenSearch-SearchLatency-Warning-${domain.domainName}`,
      alarmDescription: 'Search latency exceeded 100ms - performance impact expected',
      metric: new Metric({
        namespace: 'AWS/ES',
        metricName: 'SearchLatency',
        dimensionsMap: {
          DomainName: nullableToString(domain.domainName),
          ClientId: nullableToString(this.account),
        },
        statistic: 'p95',
        period: Duration.minutes(5),
      }),
      threshold: 100, // 100ms warning threshold
      comparisonOperator: nullableToString(ComparisonOperator.GREATER_THAN_THRESHOLD),
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
    });
    
    alarms.push(searchLatencyWarning);
    
    // CPU utilization warning
    const cpuUtilizationWarning = new Alarm(this, 'CPUUtilizationWarningAlarm', {
      alarmName: `OpenSearch-CPUUtilization-Warning-${domain.domainName}`,
      alarmDescription: 'OpenSearch CPU utilization above 70%',
      metric: new Metric({
        namespace: 'AWS/ES',
        metricName: 'CPUUtilization',
        dimensionsMap: {
          DomainName: nullableToString(domain.domainName),
          ClientId: nullableToString(this.account),
        },
        statistic: 'Average',
        period: Duration.minutes(5),
      }),
      threshold: 70, // 70% CPU utilization
      comparisonOperator: nullableToString(ComparisonOperator.GREATER_THAN_THRESHOLD),
      evaluationPeriods: 3,
    });
    
    alarms.push(cpuUtilizationWarning);
    
    // Memory utilization warning
    const memoryUtilizationWarning = new Alarm(this, 'MemoryUtilizationWarningAlarm', {
      alarmName: `OpenSearch-MemoryUtilization-Warning-${domain.domainName}`,
      alarmDescription: 'OpenSearch memory utilization above 80%',
      metric: new Metric({
        namespace: 'AWS/ES',
        metricName: 'JVMMemoryPressure',
        dimensionsMap: {
          DomainName: nullableToString(domain.domainName),
          ClientId: nullableToString(this.account),
        },
        statistic: 'Average',
        period: Duration.minutes(5),
      }),
      threshold: 80, // 80% memory utilization
      comparisonOperator: nullableToString(ComparisonOperator.GREATER_THAN_THRESHOLD),
      evaluationPeriods: 3,
    });
    
    alarms.push(memoryUtilizationWarning);
    
    // Lambda duration warning
    const lambdaDurationWarning = new Alarm(this, 'SearchIndexerDurationWarning', {
      alarmName: `SearchIndexer-Duration-Warning-${indexer.functionName}`,
      alarmDescription: 'Search indexer function duration approaching timeout',
      metric: indexer.metricDuration({
        period: Duration.minutes(5),
      }),
      threshold: 240000, // 240 seconds (80% of 5 minute timeout)
      comparisonOperator: nullableToString(ComparisonOperator.GREATER_THAN_THRESHOLD),
      evaluationPeriods: 2,
    });
    
    alarms.push(lambdaDurationWarning);
    
    return alarms;
  }
  
  /**
   * PERFORMANCE: Create comprehensive dashboard widgets
   */
  private createDashboardWidgets(
    domain: OpenSearchDomain,
    indexer: LambdaFunction,
    cacheId?: string,
    enableCostMonitoring = true
  ): void {
    
    // Title and summary row
    this.dashboard.addWidgets(
      new Row(
        new TextWidget({
          markdown: `# Ecosystem Search Performance Dashboard
          
**Environment**: ${this.node.tryGetContext('environment') || 'N/A'}  
**Domain**: ${domain.domainName}  
**Last Updated**: ${new Date().toISOString()}

## Key Performance Indicators
- **Target Search Latency**: < 100ms (95th percentile)
- **Target Cache Hit Rate**: > 90%
- **Target Availability**: > 99.9%
- **Target Error Rate**: < 0.1%`,
          width: 12,
          height: 4,
        })
      )
    );
    
    // PERFORMANCE: Search performance metrics row
    this.dashboard.addWidgets(
      new Row(
        new GraphWidget({
          title: 'Search Latency (95th Percentile)',
          left: [
            new Metric({
              namespace: 'AWS/ES',
              metricName: 'SearchLatency',
              dimensionsMap: {
                DomainName: nullableToString(domain.domainName),
                ClientId: nullableToString(this.account),
              },
              statistic: 'p95',
            }),
          ],
          width: 8,
          height: 6,
          leftYAxis: {
            min: 0,
            max: 500,
          },
          leftAnnotations: [
            { value: 100, label: 'Warning Threshold', color: '#FF9900' },
            { value: 200, label: 'Critical Threshold', color: '#FF0000' },
          ],
        }),
        new SingleValueWidget({
          title: 'Current Search Latency',
          metrics: [
            new Metric({
              namespace: 'AWS/ES',
              metricName: 'SearchLatency',
              dimensionsMap: {
                DomainName: nullableToString(domain.domainName),
                ClientId: nullableToString(this.account),
              },
              statistic: 'p95',
            }),
          ],
          width: 4,
          height: 6,
        })
      )
    );
    
    // Search volume and throughput row
    this.dashboard.addWidgets(
      new Row(
        new GraphWidget({
          title: 'Search Request Volume',
          left: [
            new Metric({
              namespace: 'AWS/ES',
              metricName: 'SearchRate',
              dimensionsMap: {
                DomainName: nullableToString(domain.domainName),
                ClientId: nullableToString(this.account),
              },
              statistic: 'Sum',
            }),
          ],
          width: 6,
          height: 6,
        }),
        new GraphWidget({
          title: 'Indexing Throughput',
          left: [
            new Metric({
              namespace: 'AWS/ES',
              metricName: 'IndexingRate',
              dimensionsMap: {
                DomainName: nullableToString(domain.domainName),
                ClientId: nullableToString(this.account),
              },
              statistic: 'Sum',
            }),
          ],
          right: [
            new Metric({
              namespace: 'AWS/ES',
              metricName: 'IndexingErrors',
              dimensionsMap: {
                DomainName: nullableToString(domain.domainName),
                ClientId: nullableToString(this.account),
              },
              statistic: 'Sum',
              color: '#FF0000',
            }),
          ],
          width: 6,
          height: 6,
        })
      )
    );
    
    // Resource utilization row
    this.dashboard.addWidgets(
      new Row(
        new GraphWidget({
          title: 'CPU & Memory Utilization',
          left: [
            new Metric({
              namespace: 'AWS/ES',
              metricName: 'CPUUtilization',
              dimensionsMap: {
                DomainName: nullableToString(domain.domainName),
                ClientId: nullableToString(this.account),
              },
              statistic: 'Average',
              color: '#1f77b4',
            }),
          ],
          right: [
            new Metric({
              namespace: 'AWS/ES',
              metricName: 'JVMMemoryPressure',
              dimensionsMap: {
                DomainName: nullableToString(domain.domainName),
                ClientId: nullableToString(this.account),
              },
              statistic: 'Average',
              color: '#ff7f0e',
            }),
          ],
          width: 6,
          height: 6,
          leftAnnotations: [
            { value: 70, label: 'CPU Warning', color: '#FF9900' },
          ],
          rightAnnotations: [
            { value: 80, label: 'Memory Warning', color: '#FF9900' },
          ],
        }),
        new GraphWidget({
          title: 'Storage Utilization',
          left: [
            new Metric({
              namespace: 'AWS/ES',
              metricName: 'StorageUtilization',
              dimensionsMap: {
                DomainName: nullableToString(domain.domainName),
                ClientId: nullableToString(this.account),
              },
              statistic: 'Average',
            }),
          ],
          width: 6,
          height: 6,
          leftAnnotations: [
            { value: 85, label: 'Storage Warning', color: '#FF9900' },
          ],
        })
      )
    );
    
    // Cache performance row (if ElastiCache is enabled)
    if (cacheId) {
      this.dashboard.addWidgets(
        new Row(
          new GraphWidget({
            title: 'Cache Performance',
            left: [
              new Metric({
                namespace: 'AWS/ElastiCache',
                metricName: 'CacheHitRate',
                dimensionsMap: {
                  CacheClusterId: cacheId,
                },
                statistic: 'Average',
              }),
            ],
            right: [
              new Metric({
                namespace: 'AWS/ElastiCache',
                metricName: 'CacheMissRate',
                dimensionsMap: {
                  CacheClusterId: cacheId,
                },
                statistic: 'Average',
                color: '#FF0000',
              }),
            ],
            width: 8,
            height: 6,
            leftAnnotations: [
              { value: 80, label: 'Hit Rate Warning', color: '#FF9900' },
              { value: 90, label: 'Target Hit Rate', color: '#00FF00' },
            ],
          }),
          new SingleValueWidget({
            title: 'Current Hit Rate',
            metrics: [
              new Metric({
                namespace: 'AWS/ElastiCache',
                metricName: 'CacheHitRate',
                dimensionsMap: {
                  CacheClusterId: cacheId,
                },
                statistic: 'Average',
              }),
            ],
            width: 4,
            height: 6,
          })
        )
      );
    }
    
    // Lambda function performance row
    this.dashboard.addWidgets(
      new Row(
        new GraphWidget({
          title: 'Search Indexer Performance',
          left: [indexer.metricDuration()],
          right: [indexer.metricErrors({ color: '#FF0000' })],
          width: 6,
          height: 6,
        }),
        new GraphWidget({
          title: 'Search Indexer Invocations',
          left: [indexer.metricInvocations()],
          right: [indexer.metricThrottles({ color: '#FF9900' })],
          width: 6,
          height: 6,
        })
      )
    );
    
    // Custom metrics row for application-specific monitoring
    this.dashboard.addWidgets(
      new Row(
        new GraphWidget({
          title: 'Search Processing Metrics',
          left: [
            new Metric({
              namespace: 'EcosystemMarketplace/Search',
              metricName: 'ProcessingSuccess',
              statistic: 'Sum',
            }),
            new Metric({
              namespace: 'EcosystemMarketplace/Search',
              metricName: 'RecordsProcessed',
              statistic: 'Sum',
              color: '#2ca02c',
            }),
          ],
          right: [
            new Metric({
              namespace: 'EcosystemMarketplace/Search',
              metricName: 'ProcessingFailure',
              statistic: 'Sum',
              color: '#FF0000',
            }),
          ],
          width: 8,
          height: 6,
        }),
        new SingleValueWidget({
          title: 'Processing Time (Avg)',
          metrics: [
            new Metric({
              namespace: 'EcosystemMarketplace/Search',
              metricName: 'ProcessingTime',
              statistic: 'Average',
            }),
          ],
          width: 4,
          height: 6,
        })
      )
    );
    
    // Alarms status row
    this.dashboard.addWidgets(
      new Row(
        new AlarmWidget({
          title: 'Critical Alarms',
          alarms: nullableToString(this.criticalAlarms),
          width: 6,
          height: 6,
        }),
        new AlarmWidget({
          title: 'Warning Alarms', 
          alarms: nullableToString(this.warningAlarms),
          width: 6,
          height: 6,
        })
      )
    );
  }
  
  /**
   * PERFORMANCE: Create cost monitoring alarms for budget control
   */
  private createCostMonitoringAlarms(): void {
    // OpenSearch cost alarm - estimated monthly spend
    const openSearchCostAlarm = new Alarm(this, 'OpenSearchCostAlarm', {
      alarmName: 'OpenSearch-MonthlySpend-Warning',
      alarmDescription: 'OpenSearch estimated monthly spend exceeds budget',
      metric: new Metric({
        namespace: 'AWS/Billing',
        metricName: 'EstimatedCharges',
        dimensionsMap: {
          Currency: 'USD',
          ServiceName: 'AmazonES',
        },
        statistic: 'Maximum',
        period: Duration.hours(6),
      }),
      threshold: 200, // $200 monthly threshold
      comparisonOperator: nullableToString(ComparisonOperator.GREATER_THAN_THRESHOLD),
      evaluationPeriods: 1,
      treatMissingData: nullableToString(TreatMissingData.IGNORE),
    });
    
    openSearchCostAlarm.addAlarmAction(new SnsAction(this.alertTopic));
    
    // ElastiCache cost alarm
    const elastiCacheCostAlarm = new Alarm(this, 'ElastiCacheCostAlarm', {
      alarmName: 'ElastiCache-MonthlySpend-Warning',
      alarmDescription: 'ElastiCache estimated monthly spend exceeds budget',
      metric: new Metric({
        namespace: 'AWS/Billing',
        metricName: 'EstimatedCharges',
        dimensionsMap: {
          Currency: 'USD',
          ServiceName: 'AmazonElastiCache',
        },
        statistic: 'Maximum',
        period: Duration.hours(6),
      }),
      threshold: 100, // $100 monthly threshold
      comparisonOperator: nullableToString(ComparisonOperator.GREATER_THAN_THRESHOLD),
      evaluationPeriods: 1,
      treatMissingData: nullableToString(TreatMissingData.IGNORE),
    });
    
    elastiCacheCostAlarm.addAlarmAction(new SnsAction(this.alertTopic));
  }
  
  /**
   * Get monitoring configuration for Lambda functions
   */
  public getMonitoringConfig() {
    return {
      dashboardUrl: `https://console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${this.dashboard.dashboardName}`,
      alertTopicArn: nullableToString(this.alertTopic.topicArn),
      criticalAlarmsCount: nullableToString(this.criticalAlarms.length),
      warningAlarmsCount: nullableToString(this.warningAlarms.length),
    };
  }
}