/**
 * migrate.ts - Migration-Only Entry Point for Cloud Run Job
 * ==========================================================
 *
 * This file is the DEDICATED entry point for running database migrations.
 * It MUST NOT start any HTTP server, Express app, or listen on any port.
 *
 * Usage:
 *   node dist/migrate.js
 *
 * Exit Codes:
 *   0 = Success (all migrations applied)
 *   1 = Failure (migration error or DB connection failure)
 *
 * Cloud Run Job Configuration:
 *   --command="node"
 *   --args="dist/migrate.js"
 *
 * IMPORTANT: This file shares NO code path with main.ts
 * ==========================================================
 */

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Simple console logger (no external dependencies)
const log = {
  info: (msg: string) => console.log(`[MIGRATE] ${new Date().toISOString()} INFO: ${msg}`),
  error: (msg: string, err?: any) => {
    console.error(`[MIGRATE] ${new Date().toISOString()} ERROR: ${msg}`);
    if (err) console.error(err);
  },
  warn: (msg: string) => console.warn(`[MIGRATE] ${new Date().toISOString()} WARN: ${msg}`),
};

/**
 * Create a lightweight DataSource for migrations only
 * NO entity imports - migrations execute raw SQL
 */
function createMigrationDataSource(): DataSource {
  const NODE_ENV = process.env.NODE_ENV || 'development';
  const DB_HOST = process.env.DB_HOST;
  const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);
  const DB_USERNAME = process.env.DB_USERNAME;
  const DB_PASSWORD = process.env.DB_PASSWORD;
  const DB_NAME = process.env.DB_NAME;

  // Validate required environment variables
  if (!DB_HOST || !DB_USERNAME || !DB_PASSWORD || !DB_NAME) {
    throw new Error(
      `Missing required database environment variables.\n` +
      `  DB_HOST: ${DB_HOST ? 'SET' : 'MISSING'}\n` +
      `  DB_USERNAME: ${DB_USERNAME ? 'SET' : 'MISSING'}\n` +
      `  DB_PASSWORD: ${DB_PASSWORD ? 'SET' : 'MISSING'}\n` +
      `  DB_NAME: ${DB_NAME ? 'SET' : 'MISSING'}`
    );
  }

  // Cloud SQL Unix Socket detection
  const isCloudSQLSocket = DB_HOST.startsWith('/cloudsql/');

  log.info(`Database configuration:`);
  log.info(`  - Host: ${isCloudSQLSocket ? 'Cloud SQL Socket' : DB_HOST}`);
  log.info(`  - Database: ${DB_NAME}`);
  log.info(`  - Environment: ${NODE_ENV}`);

  // Build connection config
  const connectionConfig = isCloudSQLSocket
    ? {
        type: 'postgres' as const,
        host: DB_HOST,
        username: DB_USERNAME,
        password: DB_PASSWORD,
        database: DB_NAME,
      }
    : {
        type: 'postgres' as const,
        host: DB_HOST,
        port: DB_PORT,
        username: DB_USERNAME,
        password: DB_PASSWORD,
        database: DB_NAME,
      };

  return new DataSource({
    ...connectionConfig,

    // NO entities - migrations execute raw SQL
    entities: [],

    // Migration files location
    migrations: [join(__dirname, 'database', 'migrations', '*.js')],

    migrationsTableName: 'typeorm_migrations',

    // Verbose logging for debugging
    logging: ['query', 'error', 'schema', 'migration'],

    // No synchronize - we use migrations only
    synchronize: false,
  });
}

/**
 * Main migration runner
 */
async function runMigrations(): Promise<void> {
  log.info('='.repeat(60));
  log.info('Cloud Run Migration Job - Starting');
  log.info('='.repeat(60));

  let dataSource: DataSource | null = null;

  try {
    // Step 1: Create DataSource
    log.info('Step 1: Creating database connection...');
    dataSource = createMigrationDataSource();

    // Step 2: Initialize connection
    log.info('Step 2: Connecting to database...');
    await dataSource.initialize();
    log.info('Database connection established');

    // Step 3: Check pending migrations
    log.info('Step 3: Checking pending migrations...');
    const pendingMigrations = await dataSource.showMigrations();

    if (pendingMigrations) {
      log.info('Pending migrations detected');
    } else {
      log.info('No pending migrations');
    }

    // Step 4: Run migrations
    log.info('Step 4: Running migrations...');
    const executedMigrations = await dataSource.runMigrations({
      transaction: 'each', // Each migration in its own transaction
    });

    // Step 5: Report results
    log.info('='.repeat(60));
    log.info(`Migration completed successfully!`);
    log.info(`  - Migrations executed: ${executedMigrations.length}`);

    if (executedMigrations.length > 0) {
      log.info('  - Executed migrations:');
      executedMigrations.forEach((migration, index) => {
        log.info(`    ${index + 1}. ${migration.name}`);
      });
    }

    // Step 6: Close connection
    log.info('Step 6: Closing database connection...');
    await dataSource.destroy();
    log.info('Database connection closed');

    log.info('='.repeat(60));
    log.info('Migration Job - SUCCESS');
    log.info('='.repeat(60));

    // Exit with success
    process.exit(0);

  } catch (error) {
    log.error('='.repeat(60));
    log.error('Migration Job - FAILED');
    log.error('='.repeat(60));

    if (error instanceof Error) {
      log.error(`Error message: ${error.message}`);
      log.error(`Stack trace:`, error.stack);
    } else {
      log.error('Unknown error:', error);
    }

    // Try to close connection if it was opened
    if (dataSource?.isInitialized) {
      try {
        await dataSource.destroy();
        log.info('Database connection closed after error');
      } catch (closeError) {
        log.error('Failed to close database connection:', closeError);
      }
    }

    // Exit with failure
    process.exit(1);
  }
}

// Run migrations
runMigrations();
