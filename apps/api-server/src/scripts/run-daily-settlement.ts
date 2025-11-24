#!/usr/bin/env node
/**
 * Run Daily Settlement Batch
 * R-8-8-5: CLI script for daily settlement processing
 *
 * Usage:
 *   # Process yesterday's settlements
 *   npm run batch:settlement:daily
 *
 *   # Process specific date
 *   npm run batch:settlement:daily -- --date=2025-11-24
 *
 *   # Or directly with node/tsx
 *   node dist/scripts/run-daily-settlement.js --date=2025-11-24
 *   tsx src/scripts/run-daily-settlement.ts --date=2025-11-24
 */

import { AppDataSource } from '../database/connection.js';
import { SettlementBatchService } from '../services/SettlementBatchService.js';
import logger from '../utils/logger.js';

interface CommandLineArgs {
  date?: string;
  help?: boolean;
}

function parseArgs(args: string[]): CommandLineArgs {
  const parsed: CommandLineArgs = {};

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    } else if (arg.startsWith('--date=')) {
      parsed.date = arg.split('=')[1];
    }
  }

  return parsed;
}

function printHelp() {
  console.log(`
Usage: npm run batch:settlement:daily [options]

Options:
  --date=YYYY-MM-DD    Process settlements for specific date (default: yesterday)
  --help, -h           Show this help message

Examples:
  npm run batch:settlement:daily
  npm run batch:settlement:daily -- --date=2025-11-24
  tsx src/scripts/run-daily-settlement.ts --date=2025-11-24
  `);
}

function parseDate(dateStr: string): Date {
  const date = new Date(dateStr);

  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${dateStr}. Use YYYY-MM-DD format.`);
  }

  // Set to start of day
  date.setHours(0, 0, 0, 0);
  return date;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  console.log('='.repeat(80));
  console.log('Daily Settlement Batch - R-8-8-5');
  console.log('='.repeat(80));

  try {
    // Determine target date
    let targetDate: Date;
    if (args.date) {
      targetDate = parseDate(args.date);
      console.log(`Target date: ${args.date} (specified)`);
    } else {
      // Default: yesterday
      targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - 1);
      targetDate.setHours(0, 0, 0, 0);
      const dateStr = targetDate.toISOString().split('T')[0];
      console.log(`Target date: ${dateStr} (yesterday, default)`);
    }

    // Initialize database connection
    console.log('\nInitializing database connection...');
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('Database connected');
    }

    // Run batch settlement
    console.log('\nStarting settlement batch processing...');
    const batchService = new SettlementBatchService();
    const result = await batchService.runDailyForAllParties(targetDate);

    // Print results
    console.log('\n' + '='.repeat(80));
    console.log('BATCH RESULTS');
    console.log('='.repeat(80));
    console.log(`Target Date:              ${result.targetDate.toISOString().split('T')[0]}`);
    console.log(`Settlements Processed:    ${result.totalSettlementsProcessed}`);
    console.log(`Parties Processed:        ${result.partiesProcessed}`);
    console.log(`Start Time:               ${result.startTime.toISOString()}`);
    console.log(`End Time:                 ${result.endTime.toISOString()}`);
    console.log(`Duration:                 ${result.durationMs}ms (${(result.durationMs / 1000).toFixed(2)}s)`);
    console.log('='.repeat(80));

    if (result.totalSettlementsProcessed === 0) {
      console.log('\n⚠️  No settlements were processed.');
      console.log('   This could mean:');
      console.log('   - No PENDING settlements exist for this date');
      console.log('   - Settlements were already processed (PROCESSING/PAID status)');
      console.log('   - No orders were completed on this date');
    } else {
      console.log(`\n✅ Successfully processed ${result.totalSettlementsProcessed} settlements`);
    }

    // Close database connection
    await AppDataSource.destroy();
    console.log('\nDatabase connection closed');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error running daily settlement batch:');
    console.error(error);
    logger.error('[run-daily-settlement] Batch failed:', error);

    try {
      await AppDataSource.destroy();
    } catch (destroyError) {
      // Ignore destroy errors
    }

    process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
