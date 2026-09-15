/**
 * Database state classifier
 * (WO-O4O-CANONICAL-DATABASE-BOOTSTRAP-AND-INCREMENTAL-MIGRATION-SEPARATION-V1)
 *
 *   FRESH_EMPTY         no user relations/types/schemas, no typeorm_migrations, no marker
 *                       → canonical bootstrap runs, then incremental migrations
 *   BOOTSTRAPPED        marker row matches the code baseline (version + fingerprint),
 *                       history ⊆ incremental manifest, core tables present,
 *                       and — when no incremental migration has been applied yet —
 *                       the live fingerprint equals the baseline exactly
 *                       → bootstrap SKIPPED, incremental migrations only
 *   LEGACY_ESTABLISHED  no marker, typeorm_migrations carries every historical anchor
 *                       incl. the last historical migration, core tables present
 *                       → bootstrap SKIPPED, historical replay ZERO, incremental only
 *   UNKNOWN_PARTIAL     anything else (partial schema, marker/fingerprint mismatch,
 *                       mixed legacy+marker, truncated history, …) → fail-fast, no repair
 *
 * Read-only. Runs inside a transaction (the fingerprint requires one).
 */

import type { QueryRunner } from 'typeorm';
import {
  CANONICAL_SCHEMA_BASELINE_META,
  CORE_TABLES,
  LEGACY_HISTORY_ANCHORS,
} from './canonical-schema-baseline.meta.js';
import { baselineMarkerTableExists, readBaselineMarkers, type BaselineMarkerRow } from './baseline-marker.js';
import { computeSchemaFingerprint } from './schema-fingerprint.js';
import { incrementalMigrationNames } from '../incremental/manifest.js';

export type DatabaseState = 'FRESH_EMPTY' | 'BOOTSTRAPPED' | 'LEGACY_ESTABLISHED' | 'UNKNOWN_PARTIAL';

export const MIGRATIONS_TABLE = 'typeorm_migrations';

export interface DatabaseStateFacts {
  readonly userSchemas: readonly string[];
  readonly userObjectCount: number;
  readonly historyTableExists: boolean;
  readonly historyRowCount: number;
  readonly historyNames: readonly string[];
  readonly anchorsPresent: readonly string[];
  readonly anchorsMissing: readonly string[];
  readonly coreTablesMissing: readonly string[];
  readonly markerTableExists: boolean;
  readonly markers: readonly BaselineMarkerRow[];
  readonly liveFingerprint: string | null;
  readonly liveFingerprintLineCount: number | null;
  readonly incrementalApplied: readonly string[];
  readonly incrementalPending: readonly string[];
  readonly historyNamesOutsideManifest: readonly string[];
}

export interface DatabaseStateResult {
  readonly state: DatabaseState;
  readonly reasons: readonly string[];
  readonly facts: DatabaseStateFacts;
}

async function tableExists(queryRunner: QueryRunner, schema: string, table: string): Promise<boolean> {
  const rows = (await queryRunner.query(
    `SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = $1 AND c.relname = $2 AND c.relkind IN ('r','p')`,
    [schema, table],
  )) as unknown[];
  return rows.length > 0;
}

export async function classifyDatabaseState(queryRunner: QueryRunner): Promise<DatabaseStateResult> {
  if (!queryRunner.isTransactionActive) {
    throw new Error('classifyDatabaseState requires an active transaction');
  }

  const schemaRows = (await queryRunner.query(
    `SELECT n.nspname FROM pg_catalog.pg_namespace n
     WHERE n.nspname NOT IN ('pg_catalog','information_schema','pg_toast','public')
       AND n.nspname NOT LIKE 'pg_temp_%' AND n.nspname NOT LIKE 'pg_toast_temp_%'
     ORDER BY 1`,
  )) as Array<{ nspname: string }>;
  const userSchemas = ['public', ...schemaRows.map((r) => r.nspname)];

  const objRows = (await queryRunner.query(
    `SELECT
       (SELECT count(*) FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname NOT IN ('pg_catalog','information_schema','pg_toast')
           AND n.nspname NOT LIKE 'pg_temp_%' AND n.nspname NOT LIKE 'pg_toast_temp_%'
           AND c.relkind IN ('r','p','S','v','m','f'))
     + (SELECT count(*) FROM pg_catalog.pg_type t JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
         WHERE n.nspname NOT IN ('pg_catalog','information_schema','pg_toast') AND t.typtype IN ('e','d'))
     AS n`,
  )) as Array<{ n: string }>;
  const userObjectCount = parseInt(objRows[0].n, 10);

  const historyTableExists = await tableExists(queryRunner, 'public', MIGRATIONS_TABLE);
  const historyNames = historyTableExists
    ? ((await queryRunner.query(`SELECT name FROM public.${MIGRATIONS_TABLE} ORDER BY id`)) as Array<{ name: string }>).map((r) => r.name)
    : [];
  const historySet = new Set(historyNames);
  const anchorsPresent = LEGACY_HISTORY_ANCHORS.filter((a) => historySet.has(a));
  const anchorsMissing = LEGACY_HISTORY_ANCHORS.filter((a) => !historySet.has(a));

  const coreTablesMissing: string[] = [];
  for (const t of CORE_TABLES) {
    if (!(await tableExists(queryRunner, t.schema, t.table))) coreTablesMissing.push(`${t.schema}.${t.table}`);
  }

  const markerTableExists = await baselineMarkerTableExists(queryRunner);
  const markers = markerTableExists ? await readBaselineMarkers(queryRunner) : [];

  const manifestNames = incrementalMigrationNames();
  const manifestSet = new Set(manifestNames);
  const incrementalApplied = manifestNames.filter((n) => historySet.has(n));
  const incrementalPending = manifestNames.filter((n) => !historySet.has(n));
  const historyNamesOutsideManifest = historyNames.filter((n) => !manifestSet.has(n));

  let liveFingerprint: string | null = null;
  let liveFingerprintLineCount: number | null = null;
  const needFingerprint = userObjectCount > 0;
  if (needFingerprint) {
    const fp = await computeSchemaFingerprint(queryRunner);
    liveFingerprint = fp.hash;
    liveFingerprintLineCount = fp.lineCount;
  }

  const facts: DatabaseStateFacts = {
    userSchemas, userObjectCount, historyTableExists, historyRowCount: historyNames.length, historyNames,
    anchorsPresent, anchorsMissing, coreTablesMissing, markerTableExists, markers,
    liveFingerprint, liveFingerprintLineCount, incrementalApplied, incrementalPending, historyNamesOutsideManifest,
  };

  const reasons: string[] = [];

  // ---- FRESH_EMPTY
  if (userObjectCount === 0 && !historyTableExists && !markerTableExists && userSchemas.length === 1) {
    return { state: 'FRESH_EMPTY', reasons: ['no user relations/types, no typeorm_migrations, no o4o_schema_baselines, only schema public'], facts };
  }

  const meta = CANONICAL_SCHEMA_BASELINE_META;

  // ---- BOOTSTRAPPED (marker-driven, fingerprint-verified)
  if (markerTableExists) {
    if (markers.length !== 1) reasons.push(`o4o_schema_baselines has ${markers.length} rows (expected exactly 1)`);
    const m = markers[0];
    if (m && m.baseline_version !== meta.baselineVersion) reasons.push(`marker baseline_version '${m.baseline_version}' != code '${meta.baselineVersion}'`);
    if (m && m.schema_fingerprint !== meta.expectedFingerprint) reasons.push('marker schema_fingerprint != code expectedFingerprint');
    if (anchorsPresent.length > 0) reasons.push(`marker present but legacy history anchors also present: ${anchorsPresent.join(', ')}`);
    if (historyNamesOutsideManifest.length > 0) reasons.push(`typeorm_migrations has ${historyNamesOutsideManifest.length} name(s) outside the incremental manifest`);
    if (coreTablesMissing.length > 0) reasons.push(`core tables missing: ${coreTablesMissing.join(', ')}`);
    if (incrementalApplied.length === 0 && liveFingerprint !== meta.expectedFingerprint) {
      reasons.push(`live fingerprint ${liveFingerprint?.slice(0, 12)}… (${liveFingerprintLineCount} lines) != baseline ${meta.expectedFingerprint.slice(0, 12)}… (${meta.expectedFingerprintLineCount} lines) with no incremental migration applied`);
    }
    if (reasons.length === 0) {
      return { state: 'BOOTSTRAPPED', reasons: [`marker ${meta.baselineVersion} verified; incremental applied ${incrementalApplied.length}, pending ${incrementalPending.length}`], facts };
    }
    return { state: 'UNKNOWN_PARTIAL', reasons, facts };
  }

  // ---- LEGACY_ESTABLISHED (history-driven)
  if (historyTableExists) {
    if (anchorsMissing.length > 0) reasons.push(`legacy history anchors missing: ${anchorsMissing.join(', ')}`);
    if (!historySet.has(meta.lastHistoricalMigration)) reasons.push(`last historical migration '${meta.lastHistoricalMigration}' not in typeorm_migrations`);
    if (coreTablesMissing.length > 0) reasons.push(`core tables missing: ${coreTablesMissing.join(', ')}`);
    if (reasons.length === 0) {
      return { state: 'LEGACY_ESTABLISHED', reasons: [`typeorm_migrations ${historyNames.length} rows, all ${LEGACY_HISTORY_ANCHORS.length} anchors present, core tables present, no marker`], facts };
    }
    return { state: 'UNKNOWN_PARTIAL', reasons, facts };
  }

  // ---- everything else
  reasons.push(`user objects ${userObjectCount} in schemas [${userSchemas.join(', ')}] without typeorm_migrations or o4o_schema_baselines`);
  if (coreTablesMissing.length > 0) reasons.push(`core tables missing: ${coreTablesMissing.join(', ')}`);
  return { state: 'UNKNOWN_PARTIAL', reasons, facts };
}
