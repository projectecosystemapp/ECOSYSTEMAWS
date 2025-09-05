#!/usr/bin/env node

/**
 * Webhook Backfill Script
 * 
 * Fetches historical Stripe events and processes them through the webhook handler
 * to ensure data consistency during the migration from Lambda URLs to AppSync.
 * 
 * Features:
 * - Progressive backfill with configurable date ranges
 * - Rate limiting to avoid overwhelming the API
 * - Duplicate detection using WebhookDeduplicationService
 * - Progress tracking and resumability
 * - Dry run mode for testing
 * 
 * Usage:
 * npm run webhook:backfill -- --start-date 2025-08-01 --end-date 2025-09-01
 * npm run webhook:backfill -- --days 30 --dry-run
 * npm run webhook:backfill -- --event-types payment_intent.succeeded,charge.succeeded
 */

import Stripe from 'stripe';
import { DynamoDBClient, PutItemCommand, GetItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { processWebhook } from '../lib/amplify-client-wrapper';
import { WebhookDeduplicationService } from '../amplify/data/webhook-deduplication';
import { correlationTracker } from '../lib/resilience/correlation-tracker';
import { PerformanceTracker } from '../lib/resilience/performance-tracker';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import pLimit from 'p-limit';
import chalk from 'chalk';
import ora from 'ora';

// Initialize services
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

const dynamodb = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const webhookDedup = new WebhookDeduplicationService();
const performanceTracker = new PerformanceTracker('ECOSYSTEMAWS/WebhookBackfill');

// Progress tracking table
const PROGRESS_TABLE = 'WebhookBackfillProgress';

interface BackfillProgress {
  id: string;
  startDate: number;
  endDate: number;
  lastProcessedEventId?: string;
  lastProcessedTimestamp?: number;
  totalEvents: number;
  processedEvents: number;
  skippedEvents: number;
  failedEvents: number;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'PAUSED';
  errors: string[];
}

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .option('start-date', {
    alias: 's',
    type: 'string',
    description: 'Start date for backfill (YYYY-MM-DD)',
  })
  .option('end-date', {
    alias: 'e',
    type: 'string',
    description: 'End date for backfill (YYYY-MM-DD)',
  })
  .option('days', {
    alias: 'd',
    type: 'number',
    description: 'Number of days to backfill from today',
    default: 7,
  })
  .option('event-types', {
    alias: 't',
    type: 'string',
    description: 'Comma-separated list of event types to backfill',
  })
  .option('concurrency', {
    alias: 'c',
    type: 'number',
    description: 'Number of concurrent webhook processing',
    default: 5,
  })
  .option('batch-size', {
    alias: 'b',
    type: 'number',
    description: 'Number of events to fetch per batch',
    default: 100,
  })
  .option('dry-run', {
    type: 'boolean',
    description: 'Run without actually processing webhooks',
    default: false,
  })
  .option('resume', {
    alias: 'r',
    type: 'string',
    description: 'Resume from a previous backfill session ID',
  })
  .option('pause-on-error', {
    type: 'boolean',
    description: 'Pause backfill on first error',
    default: false,
  })
  .parseSync();

/**
 * Save backfill progress to DynamoDB
 */
async function saveProgress(progress: BackfillProgress): Promise<void> {
  await dynamodb.send(new PutItemCommand({
    TableName: PROGRESS_TABLE,
    Item: marshall(progress),
  }));
}

/**
 * Load backfill progress from DynamoDB
 */
async function loadProgress(id: string): Promise<BackfillProgress | null> {
  const response = await dynamodb.send(new GetItemCommand({
    TableName: PROGRESS_TABLE,
    Key: marshall({ id }),
  }));

  if (!response.Item) {
    return null;
  }

  return unmarshall(response.Item) as BackfillProgress;
}

/**
 * Fetch events from Stripe API
 */
async function fetchStripeEvents(
  startDate: Date,
  endDate: Date,
  eventTypes?: string[],
  startingAfter?: string
): Promise<Stripe.Event[]> {
  const params: Stripe.EventListParams = {
    created: {
      gte: Math.floor(startDate.getTime() / 1000),
      lte: Math.floor(endDate.getTime() / 1000),
    },
    limit: argv['batch-size'],
  };

  if (eventTypes && eventTypes.length > 0) {
    params.types = eventTypes.map(type => type as any);
  }

  if (startingAfter) {
    params.starting_after = startingAfter;
  }

  const events = await stripe.events.list(params);
  return events.data;
}

/**
 * Process a single webhook event
 */
async function processEvent(
  event: Stripe.Event,
  isDryRun: boolean
): Promise<{ success: boolean; skipped: boolean; error?: string }> {
  return correlationTracker.runWithCorrelation(`backfill-${event.id}`, async () => {
    try {
      // Check if already processed
      const isProcessed = await webhookDedup.isProcessed(event.id);
      
      if (isProcessed) {
        console.log(chalk.yellow(`⏭️  Skipping already processed event: ${event.id} (${event.type})`));
        return { success: true, skipped: true };
      }

      if (isDryRun) {
        console.log(chalk.blue(`🔍 Would process: ${event.id} (${event.type})`));
        return { success: true, skipped: false };
      }

      // Construct webhook signature (for backfill, we use a special signature)
      const timestamp = Math.floor(Date.now() / 1000);
      const payload = JSON.stringify(event);
      const signature = `t=${timestamp},v1=backfill_${event.id}`;

      // Process through the webhook handler
      const result = await processWebhook({
        body: payload,
        signature,
        provider: 'stripe',
      });

      if (result.success) {
        console.log(chalk.green(`✅ Processed: ${event.id} (${event.type})`));
        return { success: true, skipped: false };
      } else {
        console.log(chalk.red(`❌ Failed: ${event.id} - ${result.error}`));
        return { success: false, skipped: false, error: result.error?.message };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(chalk.red(`❌ Error processing ${event.id}: ${errorMessage}`));
      return { success: false, skipped: false, error: errorMessage };
    }
  });
}

/**
 * Main backfill function
 */
async function backfillWebhooks(): Promise<void> {
  console.log(chalk.bold.cyan('\n🔄 Starting Webhook Backfill\n'));

  // Determine date range
  let startDate: Date;
  let endDate: Date;

  if (argv['start-date'] && argv['end-date']) {
    startDate = new Date(argv['start-date']);
    endDate = new Date(argv['end-date']);
  } else {
    endDate = new Date();
    startDate = new Date();
    startDate.setDate(startDate.getDate() - argv.days);
  }

  // Parse event types
  const eventTypes = argv['event-types']?.split(',').map(t => t.trim());

  // Initialize or resume progress
  const sessionId = argv.resume || `backfill-${Date.now()}`;
  let progress: BackfillProgress;

  if (argv.resume) {
    const existingProgress = await loadProgress(argv.resume);
    if (!existingProgress) {
      console.error(chalk.red(`❌ Could not find session ${argv.resume}`));
      process.exit(1);
    }
    progress = existingProgress;
    console.log(chalk.yellow(`📂 Resuming session ${sessionId}`));
    console.log(chalk.yellow(`   Processed: ${progress.processedEvents}/${progress.totalEvents}`));
  } else {
    progress = {
      id: sessionId,
      startDate: startDate.getTime(),
      endDate: endDate.getTime(),
      totalEvents: 0,
      processedEvents: 0,
      skippedEvents: 0,
      failedEvents: 0,
      status: 'IN_PROGRESS',
      errors: [],
    };
  }

  console.log(chalk.cyan(`📅 Date Range: ${startDate.toISOString()} to ${endDate.toISOString()}`));
  if (eventTypes) {
    console.log(chalk.cyan(`🎯 Event Types: ${eventTypes.join(', ')}`));
  }
  console.log(chalk.cyan(`🔀 Concurrency: ${argv.concurrency}`));
  console.log(chalk.cyan(`📦 Batch Size: ${argv['batch-size']}`));
  if (argv['dry-run']) {
    console.log(chalk.yellow(`⚠️  DRY RUN MODE - No webhooks will be processed`));
  }
  console.log('');

  // Create rate limiter
  const limit = pLimit(argv.concurrency);
  
  // Progress spinner
  const spinner = ora('Fetching events...').start();
  
  let hasMore = true;
  let lastEventId = progress.lastProcessedEventId;
  let totalProcessed = progress.processedEvents;
  let totalSkipped = progress.skippedEvents;
  let totalFailed = progress.failedEvents;

  try {
    while (hasMore) {
      // Fetch batch of events
      spinner.text = `Fetching events... (processed: ${totalProcessed}, skipped: ${totalSkipped}, failed: ${totalFailed})`;
      
      const events = await fetchStripeEvents(
        new Date(progress.startDate),
        new Date(progress.endDate),
        eventTypes,
        lastEventId
      );

      if (events.length === 0) {
        hasMore = false;
        break;
      }

      // Update total count
      if (!progress.totalEvents) {
        // This is an estimate, actual count may vary
        progress.totalEvents = totalProcessed + events.length * 10;
      }

      spinner.stop();

      // Process events concurrently with rate limiting
      const results = await Promise.all(
        events.map(event =>
          limit(() => processEvent(event, argv['dry-run']))
        )
      );

      // Update statistics
      for (const result of results) {
        if (result.skipped) {
          totalSkipped++;
          progress.skippedEvents++;
        } else if (result.success) {
          totalProcessed++;
          progress.processedEvents++;
        } else {
          totalFailed++;
          progress.failedEvents++;
          if (result.error) {
            progress.errors.push(result.error);
          }

          if (argv['pause-on-error']) {
            console.log(chalk.yellow('\n⏸️  Pausing due to error (use --resume to continue)'));
            progress.status = 'PAUSED';
            await saveProgress(progress);
            process.exit(1);
          }
        }
      }

      // Update progress
      lastEventId = events[events.length - 1].id;
      progress.lastProcessedEventId = lastEventId;
      progress.lastProcessedTimestamp = events[events.length - 1].created;

      // Save progress periodically
      await saveProgress(progress);

      // Check if we've processed all events in this batch
      if (events.length < argv['batch-size']) {
        hasMore = false;
      }

      spinner.start();
    }

    spinner.stop();

    // Final statistics
    progress.status = totalFailed > 0 ? 'COMPLETED' : 'COMPLETED';
    await saveProgress(progress);

    // Record performance metrics
    await performanceTracker.flush();

    console.log(chalk.bold.green('\n✅ Backfill Completed!\n'));
    console.log(chalk.cyan('📊 Statistics:'));
    console.log(chalk.white(`   Total Events: ${totalProcessed + totalSkipped + totalFailed}`));
    console.log(chalk.green(`   ✅ Processed: ${totalProcessed}`));
    console.log(chalk.yellow(`   ⏭️  Skipped: ${totalSkipped}`));
    console.log(chalk.red(`   ❌ Failed: ${totalFailed}`));
    console.log(chalk.blue(`   Session ID: ${sessionId}`));

    if (totalFailed > 0) {
      console.log(chalk.yellow('\n⚠️  Some events failed to process. Review the errors and consider re-running.'));
    }

  } catch (error) {
    spinner.stop();
    console.error(chalk.red('\n❌ Backfill failed:'), error);
    
    progress.status = 'FAILED';
    progress.errors.push(error instanceof Error ? error.message : 'Unknown error');
    await saveProgress(progress);
    
    console.log(chalk.yellow(`\n💾 Progress saved. Resume with: --resume ${sessionId}`));
    process.exit(1);
  }
}

// Run the backfill
backfillWebhooks().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});