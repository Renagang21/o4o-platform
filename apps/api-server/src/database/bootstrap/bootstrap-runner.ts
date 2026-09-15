/**
 * Canonical schema bootstrap runner
 * (WO-O4O-CANONICAL-DATABASE-BOOTSTRAP-AND-INCREMENTAL-MIGRATION-SEPARATION-V1)
 *
 * Executed ONLY for a database classified FRESH_EMPTY, ONLY by the deploy migration job
 * (src/migrate.ts). Never from API startup, never from an HTTP route.
 *
 * One transaction:
 *   1. preflight  required extensions present with the expected schema, or created explicitly
 *                 (no IF NOT EXISTS — a wrong-schema extension fails, it is not papered over)
 *   2. execute    every CANONICAL_SCHEMA_BASELINE_STATEMENT in order (first error → rollback)
 *   3. verify     computeSchemaFingerprint() === expectedFingerprint (mismatch → rollback)
 *   4. mark       create o4o_schema_baselines and insert exactly one row (last statement)
 * Any failure rolls the whole transaction back: no marker, no partial schema.
 */

import type { QueryRunner } from 'typeorm';
import { CANONICAL_SCHEMA_BASELINE_STATEMENTS } from './canonical-schema-baseline.js';
import { CANONICAL_SCHEMA_BASELINE_META } from './canonical-schema-baseline.meta.js';
import { computeSchemaFingerprint, diffFingerprintLines } from './schema-fingerprint.js';
import { createBaselineMarkerTable, insertBaselineMarker } from './baseline-marker.js';

export interface BootstrapLogger {
  info(msg: string): void;
  error(msg: string): void;
}

export interface BootstrapResult {
  readonly statementsExecuted: number;
  readonly fingerprint: string;
  readonly fingerprintLineCount: number;
  readonly extensionsCreated: readonly string[];
}

export class BootstrapFingerprintMismatchError extends Error {
  constructor(
    readonly expected: string,
    readonly actual: string,
    readonly expectedLineCount: number,
    readonly actualLineCount: number,
    readonly sampleMissing: readonly string[],
    readonly sampleUnexpected: readonly string[],
  ) {
    super(
      `bootstrap fingerprint mismatch: expected ${expected} (${expectedLineCount} lines), got ${actual} (${actualLineCount} lines)`,
    );
    this.name = 'BootstrapFingerprintMismatchError';
  }
}

async function preflightExtensions(queryRunner: QueryRunner, log: BootstrapLogger): Promise<string[]> {
  const created: string[] = [];
  for (const ext of CANONICAL_SCHEMA_BASELINE_META.requiredExtensions) {
    const rows = (await queryRunner.query(
      `SELECT n.nspname FROM pg_catalog.pg_extension e JOIN pg_catalog.pg_namespace n ON n.oid = e.extnamespace WHERE e.extname = $1`,
      [ext.name],
    )) as Array<{ nspname: string }>;
    if (rows.length === 0) {
      log.info(`extension "${ext.name}" absent → CREATE EXTENSION "${ext.name}" WITH SCHEMA ${ext.schema}`);
      await queryRunner.query(`CREATE EXTENSION "${ext.name}" WITH SCHEMA ${ext.schema}`);
      created.push(ext.name);
    } else if (rows[0].nspname !== ext.schema) {
      throw new Error(`extension "${ext.name}" is installed in schema "${rows[0].nspname}", expected "${ext.schema}"`);
    } else {
      log.info(`extension "${ext.name}" present in schema ${ext.schema}`);
    }
  }
  return created;
}

/**
 * Run the bootstrap inside the caller's transaction. The caller owns BEGIN/COMMIT/ROLLBACK
 * so that classification and bootstrap share one transaction.
 * `expectedLines` (optional) enriches the mismatch error with a line diff sample.
 */
export async function runCanonicalBootstrap(
  queryRunner: QueryRunner,
  log: BootstrapLogger,
  expectedLines?: readonly string[],
): Promise<BootstrapResult> {
  if (!queryRunner.isTransactionActive) {
    throw new Error('runCanonicalBootstrap requires an active transaction');
  }
  const meta = CANONICAL_SCHEMA_BASELINE_META;
  log.info(`bootstrap baseline ${meta.baselineVersion} (tool ${meta.bootstrapToolVersion}, ${CANONICAL_SCHEMA_BASELINE_STATEMENTS.length} statements)`);

  const extensionsCreated = await preflightExtensions(queryRunner, log);

  let executed = 0;
  for (const statement of CANONICAL_SCHEMA_BASELINE_STATEMENTS) {
    try {
      await queryRunner.query(statement);
      executed += 1;
    } catch (err) {
      const head = statement.replace(/\s+/g, ' ').slice(0, 120);
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`bootstrap statement #${executed + 1} failed: ${message} :: ${head}`);
    }
  }
  log.info(`bootstrap statements executed: ${executed}`);

  const fp = await computeSchemaFingerprint(queryRunner);
  if (fp.hash !== meta.expectedFingerprint || fp.lineCount !== meta.expectedFingerprintLineCount) {
    const diff = expectedLines ? diffFingerprintLines(expectedLines, fp.lines) : { missing: [], unexpected: [] };
    throw new BootstrapFingerprintMismatchError(
      meta.expectedFingerprint, fp.hash, meta.expectedFingerprintLineCount, fp.lineCount,
      diff.missing.slice(0, 10), diff.unexpected.slice(0, 10),
    );
  }
  log.info(`bootstrap fingerprint verified: ${fp.hash} (${fp.lineCount} lines)`);

  await createBaselineMarkerTable(queryRunner);
  await insertBaselineMarker(queryRunner, {
    baseline_version: meta.baselineVersion,
    schema_fingerprint: fp.hash,
    fingerprint_line_count: fp.lineCount,
    last_historical_migration: meta.lastHistoricalMigration,
    bootstrap_tool_version: meta.bootstrapToolVersion,
  });
  log.info(`bootstrap marker written: o4o_schema_baselines(${meta.baselineVersion})`);

  return { statementsExecuted: executed, fingerprint: fp.hash, fingerprintLineCount: fp.lineCount, extensionsCreated };
}
