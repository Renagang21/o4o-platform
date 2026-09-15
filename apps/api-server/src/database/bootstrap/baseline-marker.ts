/**
 * Bootstrap marker table `public.o4o_schema_baselines`
 * (WO-O4O-CANONICAL-DATABASE-BOOTSTRAP-AND-INCREMENTAL-MIGRATION-SEPARATION-V1)
 *
 * One row per applied canonical baseline. Written ONLY by the bootstrap runner, as the
 * last statement of the bootstrap transaction, after the schema fingerprint has been
 * verified. It is never written for LEGACY_ESTABLISHED databases and never used as a
 * substitute for schema verification (the classifier re-checks the fingerprint).
 *
 * This table is deliberately NOT a TypeORM entity and is excluded from the fingerprint.
 */

import type { QueryRunner } from 'typeorm';

export const BASELINE_MARKER_TABLE = 'o4o_schema_baselines';

export const BASELINE_MARKER_TABLE_DDL = `CREATE TABLE public.${BASELINE_MARKER_TABLE} (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  baseline_version character varying(64) NOT NULL UNIQUE,
  schema_fingerprint character(64) NOT NULL,
  fingerprint_line_count integer NOT NULL,
  last_historical_migration character varying(255) NOT NULL,
  bootstrap_tool_version character varying(32) NOT NULL,
  applied_at timestamp with time zone NOT NULL DEFAULT now()
)`;

export interface BaselineMarkerRow {
  readonly id: number;
  readonly baseline_version: string;
  readonly schema_fingerprint: string;
  readonly fingerprint_line_count: number;
  readonly last_historical_migration: string;
  readonly bootstrap_tool_version: string;
  readonly applied_at: Date;
}

export async function baselineMarkerTableExists(queryRunner: QueryRunner): Promise<boolean> {
  const rows = (await queryRunner.query(
    `SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = $1 AND c.relkind = 'r'`,
    [BASELINE_MARKER_TABLE],
  )) as unknown[];
  return rows.length > 0;
}

export async function readBaselineMarkers(queryRunner: QueryRunner): Promise<BaselineMarkerRow[]> {
  return (await queryRunner.query(
    `SELECT id, baseline_version, schema_fingerprint, fingerprint_line_count, last_historical_migration,
            bootstrap_tool_version, applied_at
     FROM public.${BASELINE_MARKER_TABLE} ORDER BY id`,
  )) as BaselineMarkerRow[];
}

export async function createBaselineMarkerTable(queryRunner: QueryRunner): Promise<void> {
  await queryRunner.query(BASELINE_MARKER_TABLE_DDL);
}

export async function insertBaselineMarker(
  queryRunner: QueryRunner,
  marker: Omit<BaselineMarkerRow, 'id' | 'applied_at'>,
): Promise<void> {
  await queryRunner.query(
    `INSERT INTO public.${BASELINE_MARKER_TABLE}
       (baseline_version, schema_fingerprint, fingerprint_line_count, last_historical_migration, bootstrap_tool_version)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      marker.baseline_version,
      marker.schema_fingerprint,
      marker.fingerprint_line_count,
      marker.last_historical_migration,
      marker.bootstrap_tool_version,
    ],
  );
}
