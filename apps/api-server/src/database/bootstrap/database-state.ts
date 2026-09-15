/**
 * Database state classifier
 * (WO-O4O-CANONICAL-DATABASE-BOOTSTRAP-AND-INCREMENTAL-MIGRATION-SEPARATION-V1,
 *  hardened by WO-O4O-DATABASE-STATE-CLASSIFIER-SCHEMA-DRIFT-AND-CONNECTION-LOG-HARDENING-V1)
 *
 *   FRESH_EMPTY         no user relations/types/schemas, no typeorm_migrations, no marker
 *                       → canonical bootstrap runs, then incremental migrations
 *   BOOTSTRAPPED        exactly one marker row matching the code baseline (version + fingerprint),
 *                       no legacy anchors, history = contiguous incremental prefix only,
 *                       core tables present, live fingerprint == expected state for that prefix
 *                       → bootstrap SKIPPED, incremental migrations only
 *   LEGACY_ESTABLISHED  no marker, typeorm_migrations carries every historical anchor incl. the
 *                       last historical migration, every history name is historical / retired
 *                       fact / contiguous incremental prefix, core tables present,
 *                       live fingerprint == expected state for that prefix
 *                       → bootstrap SKIPPED, historical replay ZERO, incremental only
 *   UNKNOWN_PARTIAL     anything else (partial schema, drift, marker/fingerprint mismatch,
 *                       mixed legacy+marker, history gap / reversal / duplicate / unknown name,
 *                       unregistered expected state, …) → fail-fast, no repair
 *
 * The schema fingerprint is compared for EVERY established database: the marker, the anchors and
 * the history rows are evidence of provenance, never a substitute for the schema comparison.
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
import { resolveIncrementalPrefix, validateLegacyHistoryNames } from './incremental-history.js';
import { incrementalMigrationNames } from '../incremental/manifest.js';
import {
  EXPECTED_SCHEMA_STATES,
  expectedSchemaStateFor,
  type ExpectedSchemaState,
} from '../incremental/expected-schema-states.js';

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
  /** Contiguous incremental prefix length; -1 when the history violates the prefix rule. */
  readonly incrementalPrefixLength: number;
  readonly incrementalHistoryContiguous: boolean;
  readonly incrementalHistoryProblems: readonly string[];
  readonly incrementalApplied: readonly string[];
  readonly incrementalPending: readonly string[];
  /** History names that are not incremental manifest names (historical rows for a legacy DB). */
  readonly historyNamesOutsideManifest: readonly string[];
  /** History names that are neither historical, retired-fact nor manifest names. */
  readonly historyNamesUnknown: readonly string[];
  readonly historyDuplicateProblems: readonly string[];
  /** Registered expected state for the current prefix (undefined = not registered). */
  readonly expectedSchemaState: ExpectedSchemaState | undefined;
  /** true / false when comparable; null when no live fingerprint (empty database). */
  readonly fingerprintMatch: boolean | null;
}

export interface DatabaseStateResult {
  readonly state: DatabaseState;
  readonly reasons: readonly string[];
  readonly facts: DatabaseStateFacts;
}

/**
 * Contract injection for the isolated-PostgreSQL harness ONLY (gap / reversal scenarios need a
 * synthetic manifest). The migration job always uses the defaults.
 */
export interface ClassifierContract {
  readonly manifestNames?: readonly string[];
  readonly expectedStates?: readonly ExpectedSchemaState[];
}

async function tableExists(queryRunner: QueryRunner, schema: string, table: string): Promise<boolean> {
  const rows = (await queryRunner.query(
    `SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = $1 AND c.relname = $2 AND c.relkind IN ('r','p')`,
    [schema, table],
  )) as unknown[];
  return rows.length > 0;
}

function describeFingerprint(hash: string | null, lines: number | null): string {
  return `${hash ? `${hash.slice(0, 12)}…` : '(none)'} (${lines ?? 0} lines)`;
}

export async function classifyDatabaseState(
  queryRunner: QueryRunner,
  contract: ClassifierContract = {},
): Promise<DatabaseStateResult> {
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

  const manifestNames = contract.manifestNames ?? incrementalMigrationNames();
  const expectedStates = contract.expectedStates ?? EXPECTED_SCHEMA_STATES;
  const manifestSet = new Set(manifestNames);
  const prefix = resolveIncrementalPrefix(historyNames, manifestNames);
  const historyNamesOutsideManifest = historyNames.filter((n) => !manifestSet.has(n));
  const legacyNames = validateLegacyHistoryNames(historyNames, manifestNames);

  let liveFingerprint: string | null = null;
  let liveFingerprintLineCount: number | null = null;
  if (userObjectCount > 0) {
    const fp = await computeSchemaFingerprint(queryRunner);
    liveFingerprint = fp.hash;
    liveFingerprintLineCount = fp.lineCount;
  }

  const expectedSchemaState = prefix.contiguous ? expectedSchemaStateFor(prefix.prefixLength, expectedStates) : undefined;
  let fingerprintMatch: boolean | null = null;
  if (liveFingerprint !== null) {
    fingerprintMatch =
      expectedSchemaState !== undefined &&
      liveFingerprint === expectedSchemaState.fingerprint &&
      liveFingerprintLineCount === expectedSchemaState.fingerprintLineCount;
  }

  const facts: DatabaseStateFacts = {
    userSchemas, userObjectCount, historyTableExists, historyRowCount: historyNames.length, historyNames,
    anchorsPresent, anchorsMissing, coreTablesMissing, markerTableExists, markers,
    liveFingerprint, liveFingerprintLineCount,
    incrementalPrefixLength: prefix.prefixLength, incrementalHistoryContiguous: prefix.contiguous,
    incrementalHistoryProblems: prefix.problems, incrementalApplied: prefix.applied, incrementalPending: prefix.pending,
    historyNamesOutsideManifest, historyNamesUnknown: legacyNames.unknown, historyDuplicateProblems: legacyNames.duplicateProblems,
    expectedSchemaState, fingerprintMatch,
  };

  const reasons: string[] = [];

  // ---- FRESH_EMPTY
  if (userObjectCount === 0 && !historyTableExists && !markerTableExists && userSchemas.length === 1) {
    return { state: 'FRESH_EMPTY', reasons: ['no user relations/types, no typeorm_migrations, no o4o_schema_baselines, only schema public'], facts };
  }

  const meta = CANONICAL_SCHEMA_BASELINE_META;

  // Shared by both established branches: prefix rule + expected-state fingerprint comparison.
  const establishedChecks = (): void => {
    reasons.push(...prefix.problems);
    if (coreTablesMissing.length > 0) reasons.push(`core tables missing: ${coreTablesMissing.join(', ')}`);
    if (prefix.contiguous && !expectedSchemaState) {
      reasons.push(`no expected schema state registered for incremental prefix ${prefix.prefixLength} (expected-schema-states.ts has ${expectedStates.length} entries)`);
    }
    if (expectedSchemaState && fingerprintMatch !== true) {
      reasons.push(
        `live fingerprint ${describeFingerprint(liveFingerprint, liveFingerprintLineCount)} != expected ` +
          `${describeFingerprint(expectedSchemaState.fingerprint, expectedSchemaState.fingerprintLineCount)} for incremental prefix ${prefix.prefixLength}` +
          ` (${expectedSchemaState.appliedThrough ?? 'baseline'})`,
      );
    }
  };

  // ---- BOOTSTRAPPED (marker-driven, fingerprint-verified)
  if (markerTableExists) {
    if (markers.length !== 1) reasons.push(`o4o_schema_baselines has ${markers.length} rows (expected exactly 1)`);
    const m = markers[0];
    if (m && m.baseline_version !== meta.baselineVersion) reasons.push(`marker baseline_version '${m.baseline_version}' != code '${meta.baselineVersion}'`);
    if (m && m.schema_fingerprint !== meta.expectedFingerprint) reasons.push('marker schema_fingerprint != code expectedFingerprint');
    if (anchorsPresent.length > 0) reasons.push(`marker present but legacy history anchors also present: ${anchorsPresent.join(', ')}`);
    if (historyNamesOutsideManifest.length > 0) reasons.push(`typeorm_migrations has ${historyNamesOutsideManifest.length} name(s) outside the incremental manifest: ${historyNamesOutsideManifest.slice(0, 5).join(', ')}`);
    establishedChecks();
    if (reasons.length === 0) {
      return { state: 'BOOTSTRAPPED', reasons: [`marker ${meta.baselineVersion} verified; incremental prefix ${prefix.prefixLength} (pending ${prefix.pending.length}); live fingerprint == expected`], facts };
    }
    return { state: 'UNKNOWN_PARTIAL', reasons, facts };
  }

  // ---- LEGACY_ESTABLISHED (history-driven, fingerprint-verified)
  if (historyTableExists) {
    if (anchorsMissing.length > 0) reasons.push(`legacy history anchors missing: ${anchorsMissing.join(', ')}`);
    if (!historySet.has(meta.lastHistoricalMigration)) reasons.push(`last historical migration '${meta.lastHistoricalMigration}' not in typeorm_migrations`);
    if (legacyNames.unknown.length > 0) reasons.push(`typeorm_migrations has ${legacyNames.unknown.length} unknown name(s): ${legacyNames.unknown.slice(0, 5).join(', ')}`);
    reasons.push(...legacyNames.duplicateProblems);
    establishedChecks();
    if (reasons.length === 0) {
      return {
        state: 'LEGACY_ESTABLISHED',
        reasons: [`typeorm_migrations ${historyNames.length} rows, all ${LEGACY_HISTORY_ANCHORS.length} anchors present, every name known, core tables present, no marker; incremental prefix ${prefix.prefixLength} (pending ${prefix.pending.length}); live fingerprint == expected`],
        facts,
      };
    }
    return { state: 'UNKNOWN_PARTIAL', reasons, facts };
  }

  // ---- everything else
  reasons.push(`user objects ${userObjectCount} in schemas [${userSchemas.join(', ')}] without typeorm_migrations or o4o_schema_baselines`);
  if (coreTablesMissing.length > 0) reasons.push(`core tables missing: ${coreTablesMissing.join(', ')}`);
  return { state: 'UNKNOWN_PARTIAL', reasons, facts };
}
