#!/usr/bin/env ts-node
/**
 * AI Admin CLI Tool
 * Sprint 4: Operations tool for managing AI jobs
 *
 * Commands:
 * - jobs list [--status=<status>] [--limit=<n>]
 * - jobs view <jobId>
 * - jobs retry <jobId>
 * - jobs delete <jobId>
 * - dlq list [--limit=<n>]
 * - dlq stats
 * - dlq retry <dlqJobId>
 * - metrics [--hours=<n>]
 * - usage report [--days=<n>] [--format=csv|json]
 * - queue clear [--status=<status>]
 * - queue pause
 * - queue resume
 *
 * Usage:
 * ts-node scripts/ai-admin-cli.ts jobs list
 * ts-node scripts/ai-admin-cli.ts jobs view job-123
 * ts-node scripts/ai-admin-cli.ts metrics --hours=24
 */

import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { program } from 'commander';

// Redis configuration
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
});

const aiQueue = new Queue('ai-generation', { connection: redis });
const dlqQueue = new Queue('ai-generation-dlq', { connection: redis });

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

// ===== Jobs Commands =====

async function listJobs(status?: string, limit: number = 50) {
  try {
    const statuses = status
      ? [status]
      : ['waiting', 'active', 'completed', 'failed', 'delayed'];

    console.log(colorize('\n📋 AI Jobs List', 'cyan'));
    console.log('─'.repeat(80));

    for (const s of statuses) {
      const jobs = await aiQueue.getJobs([s as any], 0, limit - 1);

      if (jobs.length > 0) {
        console.log(colorize(`\n${s.toUpperCase()} (${jobs.length})`, 'yellow'));

        jobs.forEach(job => {
          const statusColor = s === 'completed' ? 'green' : s === 'failed' ? 'red' : 'blue';
          console.log(`  ${colorize('●', statusColor)} ${job.id}`);
          console.log(`    Provider: ${job.data.provider} | Model: ${job.data.model}`);
          console.log(`    User: ${job.data.userId}`);
          if (job.finishedOn) {
            console.log(`    Finished: ${new Date(job.finishedOn).toISOString()}`);
          }
          if (job.failedReason) {
            console.log(`    ${colorize('Error:', 'red')} ${job.failedReason}`);
          }
        });
      }
    }

    console.log('\n');
    await cleanup();
  } catch (error: any) {
    console.error(colorize(`❌ Error: ${error.message}`, 'red'));
    await cleanup();
    process.exit(1);
  }
}

async function viewJob(jobId: string) {
  try {
    const job = await aiQueue.getJob(jobId);

    if (!job) {
      console.error(colorize(`❌ Job not found: ${jobId}`, 'red'));
      await cleanup();
      process.exit(1);
    }

    console.log(colorize(`\n🔍 Job Details: ${jobId}`, 'cyan'));
    console.log('─'.repeat(80));

    const state = await job.getState();
    const statusColor = state === 'completed' ? 'green' : state === 'failed' ? 'red' : 'yellow';

    console.log(`Status: ${colorize(state.toUpperCase(), statusColor)}`);
    console.log(`Provider: ${job.data.provider}`);
    console.log(`Model: ${job.data.model}`);
    console.log(`User ID: ${job.data.userId}`);
    console.log(`Request ID: ${job.data.requestId}`);
    console.log(`Attempts: ${job.attemptsMade}`);

    if (job.timestamp) {
      console.log(`Created: ${new Date(job.timestamp).toISOString()}`);
    }

    if (job.processedOn) {
      console.log(`Started: ${new Date(job.processedOn).toISOString()}`);
    }

    if (job.finishedOn) {
      console.log(`Finished: ${new Date(job.finishedOn).toISOString()}`);
      if (job.processedOn) {
        const duration = job.finishedOn - job.processedOn;
        console.log(`Duration: ${duration}ms`);
      }
    }

    if (job.returnvalue) {
      console.log(colorize('\nResult:', 'blue'));
      console.log(JSON.stringify(job.returnvalue, null, 2));
    }

    if (job.failedReason) {
      console.log(colorize('\nError:', 'red'));
      console.log(job.failedReason);
    }

    console.log('\n');
    await cleanup();
  } catch (error: any) {
    console.error(colorize(`❌ Error: ${error.message}`, 'red'));
    await cleanup();
    process.exit(1);
  }
}

async function retryJob(jobId: string) {
  try {
    const job = await aiQueue.getJob(jobId);

    if (!job) {
      console.error(colorize(`❌ Job not found: ${jobId}`, 'red'));
      await cleanup();
      process.exit(1);
    }

    // Re-enqueue with same data
    const newJob = await aiQueue.add('generate', job.data, {
      attempts: 3,
    });

    console.log(colorize(`✅ Job retried successfully`, 'green'));
    console.log(`Original Job ID: ${jobId}`);
    console.log(`New Job ID: ${newJob.id}`);

    await cleanup();
  } catch (error: any) {
    console.error(colorize(`❌ Error: ${error.message}`, 'red'));
    await cleanup();
    process.exit(1);
  }
}

async function deleteJob(jobId: string) {
  try {
    const job = await aiQueue.getJob(jobId);

    if (!job) {
      console.error(colorize(`❌ Job not found: ${jobId}`, 'red'));
      await cleanup();
      process.exit(1);
    }

    await job.remove();

    console.log(colorize(`✅ Job deleted: ${jobId}`, 'green'));
    await cleanup();
  } catch (error: any) {
    console.error(colorize(`❌ Error: ${error.message}`, 'red'));
    await cleanup();
    process.exit(1);
  }
}

// ===== DLQ Commands =====

async function listDLQ(limit: number = 50) {
  try {
    const jobs = await dlqQueue.getJobs(['completed', 'failed'], 0, limit - 1);

    console.log(colorize('\n⚠️  Dead Letter Queue', 'yellow'));
    console.log('─'.repeat(80));

    if (jobs.length === 0) {
      console.log(colorize('No jobs in DLQ', 'green'));
    } else {
      jobs.forEach(job => {
        const entry = job.data as any;
        console.log(`  ${colorize('●', 'red')} ${job.id}`);
        console.log(`    Original Job: ${entry.jobId}`);
        console.log(`    Provider: ${entry.data.provider} | Model: ${entry.data.model}`);
        console.log(`    User: ${entry.data.userId}`);
        console.log(`    Failed: ${entry.failedAt}`);
        console.log(`    Attempts: ${entry.attemptsMade}`);
        console.log(`    Can Retry: ${entry.canRetry ? colorize('Yes', 'green') : colorize('No', 'red')}`);
        console.log(`    Error: ${entry.error}`);
        console.log('');
      });
    }

    console.log('\n');
    await cleanup();
  } catch (error: any) {
    console.error(colorize(`❌ Error: ${error.message}`, 'red'));
    await cleanup();
    process.exit(1);
  }
}

async function dlqStats() {
  try {
    const jobs = await dlqQueue.getJobs(['completed', 'failed'], 0, 10000);

    const stats: any = {
      total: jobs.length,
      retryable: 0,
      nonRetryable: 0,
      byProvider: {} as any,
      byErrorType: {} as any,
    };

    jobs.forEach(job => {
      const entry = job.data as any;

      if (entry.canRetry) {
        stats.retryable++;
      } else {
        stats.nonRetryable++;
      }

      const provider = entry.data.provider;
      stats.byProvider[provider] = (stats.byProvider[provider] || 0) + 1;

      // Simple error classification
      const error = entry.error.toLowerCase();
      let errorType = 'UNKNOWN';
      if (error.includes('timeout')) errorType = 'TIMEOUT';
      else if (error.includes('rate limit')) errorType = 'RATE_LIMIT';
      else if (error.includes('validation')) errorType = 'VALIDATION';
      else if (error.includes('auth')) errorType = 'AUTH';

      stats.byErrorType[errorType] = (stats.byErrorType[errorType] || 0) + 1;
    });

    console.log(colorize('\n📊 DLQ Statistics', 'cyan'));
    console.log('─'.repeat(80));
    console.log(`Total: ${stats.total}`);
    console.log(`${colorize('Retryable:', 'green')} ${stats.retryable}`);
    console.log(`${colorize('Non-retryable:', 'red')} ${stats.nonRetryable}`);

    console.log(colorize('\nBy Provider:', 'yellow'));
    Object.entries(stats.byProvider).forEach(([provider, count]) => {
      console.log(`  ${provider}: ${count}`);
    });

    console.log(colorize('\nBy Error Type:', 'yellow'));
    Object.entries(stats.byErrorType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

    console.log('\n');
    await cleanup();
  } catch (error: any) {
    console.error(colorize(`❌ Error: ${error.message}`, 'red'));
    await cleanup();
    process.exit(1);
  }
}

async function retryFromDLQ(dlqJobId: string) {
  try {
    const dlqJob = await dlqQueue.getJob(dlqJobId);

    if (!dlqJob) {
      console.error(colorize(`❌ DLQ job not found: ${dlqJobId}`, 'red'));
      await cleanup();
      process.exit(1);
    }

    const entry = dlqJob.data as any;

    if (!entry.canRetry) {
      console.error(colorize(`❌ Job is not retryable`, 'red'));
      await cleanup();
      process.exit(1);
    }

    // Re-enqueue to main queue
    const newJob = await aiQueue.add('generate', entry.data, {
      jobId: `retry-dlq-${entry.jobId}`,
      attempts: 3,
    });

    // Remove from DLQ
    await dlqJob.remove();

    console.log(colorize(`✅ Job retried from DLQ`, 'green'));
    console.log(`DLQ Job ID: ${dlqJobId}`);
    console.log(`New Job ID: ${newJob.id}`);

    await cleanup();
  } catch (error: any) {
    console.error(colorize(`❌ Error: ${error.message}`, 'red'));
    await cleanup();
    process.exit(1);
  }
}

// ===== Queue Management Commands =====

async function clearQueue(status?: string) {
  try {
    const statuses = status ? [status] : ['completed', 'failed'];

    for (const s of statuses) {
      await aiQueue.clean(0, 10000, s as any);
    }

    console.log(colorize(`✅ Queue cleared: ${statuses.join(', ')}`, 'green'));
    await cleanup();
  } catch (error: any) {
    console.error(colorize(`❌ Error: ${error.message}`, 'red'));
    await cleanup();
    process.exit(1);
  }
}

async function pauseQueue() {
  try {
    await aiQueue.pause();
    console.log(colorize('⏸  Queue paused', 'yellow'));
    await cleanup();
  } catch (error: any) {
    console.error(colorize(`❌ Error: ${error.message}`, 'red'));
    await cleanup();
    process.exit(1);
  }
}

async function resumeQueue() {
  try {
    await aiQueue.resume();
    console.log(colorize('▶️  Queue resumed', 'green'));
    await cleanup();
  } catch (error: any) {
    console.error(colorize(`❌ Error: ${error.message}`, 'red'));
    await cleanup();
    process.exit(1);
  }
}

// ===== Cleanup =====

async function cleanup() {
  await aiQueue.close();
  await dlqQueue.close();
  await redis.quit();
}

// ===== CLI Setup =====

program
  .name('ai-admin-cli')
  .description('AI Admin CLI tool for managing AI jobs and queue')
  .version('1.0.0');

// Jobs commands
const jobsCmd = program.command('jobs').description('Manage AI jobs');

jobsCmd
  .command('list')
  .description('List jobs')
  .option('--status <status>', 'Filter by status (waiting, active, completed, failed, delayed)')
  .option('--limit <n>', 'Limit results', '50')
  .action((options) => {
    listJobs(options.status, parseInt(options.limit));
  });

jobsCmd
  .command('view <jobId>')
  .description('View job details')
  .action((jobId) => {
    viewJob(jobId);
  });

jobsCmd
  .command('retry <jobId>')
  .description('Retry a job')
  .action((jobId) => {
    retryJob(jobId);
  });

jobsCmd
  .command('delete <jobId>')
  .description('Delete a job')
  .action((jobId) => {
    deleteJob(jobId);
  });

// DLQ commands
const dlqCmd = program.command('dlq').description('Manage Dead Letter Queue');

dlqCmd
  .command('list')
  .description('List DLQ entries')
  .option('--limit <n>', 'Limit results', '50')
  .action((options) => {
    listDLQ(parseInt(options.limit));
  });

dlqCmd
  .command('stats')
  .description('Show DLQ statistics')
  .action(() => {
    dlqStats();
  });

dlqCmd
  .command('retry <dlqJobId>')
  .description('Retry job from DLQ')
  .action((dlqJobId) => {
    retryFromDLQ(dlqJobId);
  });

// Queue management commands
const queueCmd = program.command('queue').description('Manage queue');

queueCmd
  .command('clear')
  .description('Clear completed and failed jobs')
  .option('--status <status>', 'Clear specific status')
  .action((options) => {
    clearQueue(options.status);
  });

queueCmd
  .command('pause')
  .description('Pause job processing')
  .action(() => {
    pauseQueue();
  });

queueCmd
  .command('resume')
  .description('Resume job processing')
  .action(() => {
    resumeQueue();
  });

// Parse arguments
program.parse(process.argv);
