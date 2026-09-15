/**
 * migrate.ts - Migration-Only Entry Point for Cloud Run Job
 * ==========================================================
 *
 * This file is the DEDICATED entry point for the database migration job.
 * It MUST NOT start any HTTP server, Express app, or listen on any port.
 * It shares NO code path with main.ts (the API never runs migrations or bootstrap).
 *
 * Usage:
 *   node dist/migrate.js            apply (bootstrap if FRESH_EMPTY, then incremental)
 *   node dist/migrate.js --status   classify + report only (no writes)
 *
 * Flow (WO-O4O-CANONICAL-DATABASE-BOOTSTRAP-AND-INCREMENTAL-MIGRATION-SEPARATION-V1):
 *   1. classify DATABASE_STATE  FRESH_EMPTY | BOOTSTRAPPED | LEGACY_ESTABLISHED | UNKNOWN_PARTIAL
 *   2. FRESH_EMPTY         → canonical schema bootstrap (one transaction, fingerprint-verified, marker)
 *      BOOTSTRAPPED /
 *      LEGACY_ESTABLISHED → bootstrap SKIPPED
 *      UNKNOWN_PARTIAL    → fail-fast (exit 1), no repair, no fallback
 *   3. HISTORICAL_REPLAY = ZERO   the 644 historical migrations are never loaded
 *   4. incremental migrations from src/database/incremental/manifest.ts only,
 *      each in its own transaction, recorded in typeorm_migrations
 *
 * Exit Codes:
 *   0 = MIGRATION_JOB = SUCCESS
 *   1 = MIGRATION_JOB = FAILED (connection, classification, bootstrap or migration error)
 *
 * Cloud Run Job Configuration:
 *   --command="node"
 *   --args="dist/migrate.js"
 * ==========================================================
 */

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { classifyDatabaseState, type DatabaseStateResult } from './database/bootstrap/database-state.js';
import { runCanonicalBootstrap } from './database/bootstrap/bootstrap-runner.js';
import { CANONICAL_SCHEMA_BASELINE_META } from './database/bootstrap/canonical-schema-baseline.meta.js';
import { INCREMENTAL_MIGRATIONS, INCREMENTAL_MIGRATION_CUTOFF } from './database/incremental/manifest.js';

// Simple console logger (no external dependencies)
const log = {
  info: (msg: string) => console.log(`[MIGRATE] ${new Date().toISOString()} INFO: ${msg}`),
  error: (msg: string, err?: unknown) => {
    console.error(`[MIGRATE] ${new Date().toISOString()} ERROR: ${msg}`);
    if (err) console.error(err);
  },
  warn: (msg: string) => console.warn(`[MIGRATE] ${new Date().toISOString()} WARN: ${msg}`),
};

/** Structured, grep-able result lines (deploy verification reads these). */
const report = (key: string, value: string | number) => log.info(`${key} = ${value}`);

const STATUS_ONLY = process.argv.includes('--status');

/**
 * Create a lightweight DataSource for the migration job only.
 * NO entities · NO glob · ONLY the explicit incremental manifest.
 */
function createMigrationDataSource(): DataSource {
  const NODE_ENV = process.env.NODE_ENV || 'development';
  const DB_HOST = process.env.DB_HOST;
  const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);
  const DB_USERNAME = process.env.DB_USERNAME;
  const DB_PASSWORD = process.env.DB_PASSWORD;
  const DB_NAME = process.env.DB_NAME;

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

  const connectionConfig = isCloudSQLSocket
    ? { type: 'postgres' as const, host: DB_HOST, username: DB_USERNAME, password: DB_PASSWORD, database: DB_NAME }
    : { type: 'postgres' as const, host: DB_HOST, port: DB_PORT, username: DB_USERNAME, password: DB_PASSWORD, database: DB_NAME };

  return new DataSource({
    ...connectionConfig,
    entities: [],
    migrations: [...INCREMENTAL_MIGRATIONS],
    migrationsTableName: 'typeorm_migrations',
    logging: ['error', 'schema', 'migration'],
    synchronize: false,
  });
}

function logClassification(result: DatabaseStateResult): void {
  const f = result.facts;
  report('DATABASE_STATE', result.state);
  for (const r of result.reasons) log.info(`  reason: ${r}`);
  log.info(`  schemas: [${f.userSchemas.join(', ')}] · user objects: ${f.userObjectCount}`);
  log.info(`  typeorm_migrations: ${f.historyTableExists ? `${f.historyRowCount} rows` : 'absent'} · anchors ${f.anchorsPresent.length}/${f.anchorsPresent.length + f.anchorsMissing.length}`);
  log.info(`  o4o_schema_baselines: ${f.markerTableExists ? f.markers.map((m) => `${m.baseline_version}@${m.schema_fingerprint.slice(0, 12)}`).join(', ') || 'empty' : 'absent'}`);
  log.info(`  live fingerprint: ${f.liveFingerprint ?? '(empty database)'}${f.liveFingerprintLineCount !== null ? ` (${f.liveFingerprintLineCount} lines)` : ''}`);
  log.info(`  baseline ${CANONICAL_SCHEMA_BASELINE_META.baselineVersion} fingerprint: ${CANONICAL_SCHEMA_BASELINE_META.expectedFingerprint}`);
  if (f.coreTablesMissing.length > 0) log.info(`  core tables missing: ${f.coreTablesMissing.join(', ')}`);
}

async function runMigrationJob(): Promise<void> {
  log.info('='.repeat(60));
  log.info(`Cloud Run Migration Job - Starting${STATUS_ONLY ? ' (STATUS ONLY, no writes)' : ''}`);
  log.info('='.repeat(60));

  let dataSource: DataSource | null = null;

  try {
    log.info('Step 1: Creating database connection...');
    dataSource = createMigrationDataSource();
    await dataSource.initialize();
    log.info('Database connection established');
    log.info(`Incremental manifest: ${INCREMENTAL_MIGRATIONS.length} migration(s) after cutoff ${INCREMENTAL_MIGRATION_CUTOFF.lastHistoricalMigration}`);

    // Step 2: classify (+ bootstrap) inside ONE transaction
    log.info('Step 2: Classifying database state...');
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    let classification: DatabaseStateResult;
    let bootstrapExecution: 'EXECUTED' | 'SKIPPED' | 'WOULD_EXECUTE' = 'SKIPPED';
    try {
      classification = await classifyDatabaseState(queryRunner);
      logClassification(classification);

      switch (classification.state) {
        case 'FRESH_EMPTY':
          if (STATUS_ONLY) {
            bootstrapExecution = 'WOULD_EXECUTE';
            await queryRunner.rollbackTransaction();
          } else {
            log.info('Step 3: FRESH_EMPTY → running canonical schema bootstrap...');
            const result = await runCanonicalBootstrap(queryRunner, log);
            await queryRunner.commitTransaction();
            bootstrapExecution = 'EXECUTED';
            log.info(`  statements ${result.statementsExecuted} · fingerprint ${result.fingerprint} · extensions created [${result.extensionsCreated.join(', ')}]`);
          }
          break;
        case 'BOOTSTRAPPED':
        case 'LEGACY_ESTABLISHED':
          await queryRunner.rollbackTransaction(); // read-only classification, nothing to commit
          bootstrapExecution = 'SKIPPED';
          break;
        case 'UNKNOWN_PARTIAL':
          await queryRunner.rollbackTransaction();
          report('BOOTSTRAP_EXECUTION', 'REFUSED');
          report('HISTORICAL_REPLAY', 'ZERO');
          report('MIGRATION_JOB', 'FAILED');
          throw new Error(`database state UNKNOWN_PARTIAL — refusing to bootstrap or migrate: ${classification.reasons.join(' | ')}`);
      }
    } catch (err) {
      if (queryRunner.isTransactionActive) await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
    report('BOOTSTRAP_EXECUTION', bootstrapExecution);
    report('HISTORICAL_REPLAY', 'ZERO');

    // Step 4: incremental migrations (explicit manifest only)
    const pending = classification.facts.incrementalPending;
    report('INCREMENTAL_PENDING', pending.length);
    for (const name of pending) log.info(`  pending: ${name}`);

    if (STATUS_ONLY) {
      report('MIGRATION_JOB', 'STATUS_ONLY');
    } else if (pending.length > 0) {
      log.info('Step 4: Running incremental migrations...');
      const executed = await dataSource.runMigrations({
        transaction: 'each', // Each migration in its own transaction
      });
      report('INCREMENTAL_EXECUTED', executed.length);
      executed.forEach((m, i) => log.info(`    ${i + 1}. ${m.name}`));
      if (executed.length !== pending.length) {
        throw new Error(`executed ${executed.length} migration(s) but ${pending.length} were pending`);
      }
      report('MIGRATION_JOB', 'SUCCESS');
    } else {
      log.info('Step 4: No incremental migrations pending');
      report('INCREMENTAL_EXECUTED', 0);
      report('MIGRATION_JOB', 'SUCCESS');
    }

    log.info('Step 5: Closing database connection...');
    await dataSource.destroy();
    log.info('Database connection closed');
    log.info('='.repeat(60));
    log.info(`Migration Job - ${STATUS_ONLY ? 'STATUS' : 'SUCCESS'}`);
    log.info('='.repeat(60));
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

    if (dataSource?.isInitialized) {
      try {
        await dataSource.destroy();
        log.info('Database connection closed after error');
      } catch (closeError) {
        log.error('Failed to close database connection:', closeError);
      }
    }

    process.exit(1);
  }
}

runMigrationJob();
