/**
 * Canonical schema fingerprint
 * (WO-O4O-CANONICAL-DATABASE-BOOTSTRAP-AND-INCREMENTAL-MIGRATION-SEPARATION-V1)
 *
 * Reads pg_catalog only (no information_schema, no data) and produces a sorted,
 * whitespace-normalized line set describing every canonical schema object:
 * schemas · extensions · enums · domains · tables · columns · constraints · indexes ·
 * sequences · views · non-extension functions · triggers · policies · RLS · comments.
 *
 * The hash is sha256 over `lines.join('\n')`. It is computed identically for
 *   - the production snapshot (expected value in canonical-schema-baseline.meta.ts)
 *   - a freshly bootstrapped database (verified inside the bootstrap transaction)
 *   - a database being classified (BOOTSTRAPPED check)
 *
 * Bootstrap bookkeeping objects (o4o_schema_baselines, typeorm_migrations and
 * their sequences) are excluded so the fingerprint describes the application schema only.
 *
 * MUST be executed inside a transaction: it issues `SET LOCAL search_path TO pg_catalog`
 * so that every emitted expression is schema-qualified regardless of session settings.
 */

import { createHash } from 'crypto';
import type { QueryRunner } from 'typeorm';

export const FINGERPRINT_CANONICAL_SCHEMAS = ['public', 'cosmetics', 'neture'] as const;

export const FINGERPRINT_EXCLUDED_RELATIONS = [
  'o4o_schema_baselines',
  'o4o_schema_baselines_id_seq',
  'typeorm_migrations',
  'typeorm_migrations_id_seq',
] as const;

const SCHEMA_LIST = FINGERPRINT_CANONICAL_SCHEMAS.map((s) => `'${s}'`).join(',');
const EXCLUDED_LIST = FINGERPRINT_EXCLUDED_RELATIONS.map((s) => `'${s}'`).join(',');

export const SCHEMA_FINGERPRINT_SQL = `
WITH s AS (SELECT n.oid, n.nspname FROM pg_namespace n WHERE n.nspname IN (${SCHEMA_LIST})),
excluded AS (SELECT unnest(ARRAY[${EXCLUDED_LIST}]) AS relname),
lines AS (
  SELECT 'SCHEMA|' || nspname AS line FROM s
  UNION ALL
  SELECT 'EXTENSION|' || e.extname FROM pg_extension e
  UNION ALL
  SELECT 'ENUM|' || s.nspname || '.' || t.typname || '|' || (SELECT string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder) FROM pg_enum e WHERE e.enumtypid = t.oid)
    FROM pg_type t JOIN s ON s.oid = t.typnamespace WHERE t.typtype = 'e'
  UNION ALL
  SELECT 'DOMAIN|' || s.nspname || '.' || t.typname || '|' || format_type(t.typbasetype, t.typtypmod)
    FROM pg_type t JOIN s ON s.oid = t.typnamespace WHERE t.typtype = 'd'
  UNION ALL
  SELECT 'TABLE|' || s.nspname || '.' || c.relname
    FROM pg_class c JOIN s ON s.oid = c.relnamespace WHERE c.relkind IN ('r','p') AND c.relname NOT IN (SELECT relname FROM excluded)
  UNION ALL
  SELECT 'COLUMN|' || s.nspname || '.' || c.relname || '|' || a.attname || '|' || format_type(a.atttypid, a.atttypmod)
      || '|' || CASE WHEN a.attnotnull THEN 'NOTNULL' ELSE 'NULL' END
      || '|' || COALESCE(pg_get_expr(d.adbin, d.adrelid), '')
      || '|' || COALESCE(a.attidentity::text, '') || '|' || COALESCE(a.attgenerated::text, '') || '|' || COALESCE(cl.collname, '')
    FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid JOIN s ON s.oid = c.relnamespace
    LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
    LEFT JOIN pg_collation cl ON cl.oid = a.attcollation AND cl.collname <> 'default'
    WHERE c.relkind IN ('r','p') AND a.attnum > 0 AND NOT a.attisdropped AND c.relname NOT IN (SELECT relname FROM excluded)
  UNION ALL
  SELECT 'CONSTRAINT|' || s.nspname || '.' || c.relname || '|' || con.conname || '|' || con.contype::text || '|' || pg_get_constraintdef(con.oid)
    FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN s ON s.oid = c.relnamespace
    WHERE c.relname NOT IN (SELECT relname FROM excluded)
  UNION ALL
  SELECT 'INDEX|' || s.nspname || '.' || c.relname || '|' || ic.relname || '|' || pg_get_indexdef(i.indexrelid)
    FROM pg_index i JOIN pg_class c ON c.oid = i.indrelid JOIN pg_class ic ON ic.oid = i.indexrelid JOIN s ON s.oid = c.relnamespace
    WHERE c.relname NOT IN (SELECT relname FROM excluded)
  UNION ALL
  SELECT 'SEQUENCE|' || s.nspname || '.' || c.relname || '|' || format_type(sq.seqtypid, NULL) || '|' || sq.seqstart || '|' || sq.seqincrement || '|' || sq.seqmin || '|' || sq.seqmax || '|' || sq.seqcycle
      || '|' || COALESCE((SELECT oc.relname || '.' || oa.attname FROM pg_depend dp JOIN pg_class oc ON oc.oid = dp.refobjid JOIN pg_attribute oa ON oa.attrelid = dp.refobjid AND oa.attnum = dp.refobjsubid WHERE dp.objid = c.oid AND dp.classid = 'pg_class'::regclass AND dp.deptype = 'a' LIMIT 1), '')
    FROM pg_class c JOIN s ON s.oid = c.relnamespace JOIN pg_sequence sq ON sq.seqrelid = c.oid
    WHERE c.relkind = 'S' AND c.relname NOT IN (SELECT relname FROM excluded)
  UNION ALL
  SELECT 'VIEW|' || s.nspname || '.' || c.relname || '|' || c.relkind::text || '|' || pg_get_viewdef(c.oid, true)
    FROM pg_class c JOIN s ON s.oid = c.relnamespace WHERE c.relkind IN ('v','m')
  UNION ALL
  SELECT 'FUNCTION|' || s.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')|' || md5(pg_get_functiondef(p.oid))
    FROM pg_proc p JOIN s ON s.oid = p.pronamespace
    WHERE NOT EXISTS (SELECT 1 FROM pg_depend dp WHERE dp.objid = p.oid AND dp.classid = 'pg_proc'::regclass AND dp.deptype = 'e')
  UNION ALL
  SELECT 'TRIGGER|' || s.nspname || '.' || c.relname || '|' || t.tgname || '|' || pg_get_triggerdef(t.oid)
    FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN s ON s.oid = c.relnamespace WHERE NOT t.tgisinternal
  UNION ALL
  SELECT 'POLICY|' || s.nspname || '.' || c.relname || '|' || pol.polname || '|' || pol.polcmd::text || '|' || COALESCE(pg_get_expr(pol.polqual, pol.polrelid), '') || '|' || COALESCE(pg_get_expr(pol.polwithcheck, pol.polrelid), '')
    FROM pg_policy pol JOIN pg_class c ON c.oid = pol.polrelid JOIN s ON s.oid = c.relnamespace
  UNION ALL
  SELECT 'RLS|' || s.nspname || '.' || c.relname
    FROM pg_class c JOIN s ON s.oid = c.relnamespace WHERE c.relkind IN ('r','p') AND c.relrowsecurity
  UNION ALL
  SELECT 'COMMENT|TABLE|' || s.nspname || '.' || c.relname || '|' || d.description
    FROM pg_description d JOIN pg_class c ON c.oid = d.objoid AND d.classoid = 'pg_class'::regclass AND d.objsubid = 0 JOIN s ON s.oid = c.relnamespace
    WHERE c.relname NOT IN (SELECT relname FROM excluded)
  UNION ALL
  SELECT 'COMMENT|COLUMN|' || s.nspname || '.' || c.relname || '.' || a.attname || '|' || d.description
    FROM pg_description d JOIN pg_class c ON c.oid = d.objoid AND d.classoid = 'pg_class'::regclass AND d.objsubid > 0
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = d.objsubid JOIN s ON s.oid = c.relnamespace
    WHERE c.relname NOT IN (SELECT relname FROM excluded)
)
SELECT regexp_replace(line, '\\s+', ' ', 'g') COLLATE "C" AS line FROM lines ORDER BY 1;
`;

export interface SchemaFingerprint {
  readonly hash: string;
  readonly lineCount: number;
  readonly lines: readonly string[];
}

/**
 * Deparse normalization. PostgreSQL deparses an expression created from `col IN ('a','b')`
 * as `ANY ((ARRAY['a'::character varying, 'b'::character varying])::text[])`, but the SAME
 * text, once re-parsed (pg_dump round trip → bootstrap), deparses as
 * `ANY (ARRAY[('a'::character varying)::text, ('b'::character varying)::text])`.
 * Both forms are semantically identical (verified on PostgreSQL 15 and 17). Rewriting the
 * first form into the second makes the fingerprint round-trip stable.
 */
const ARRAY_CAST_FORM = /\(\(ARRAY\[([^\]]*)\]\)::text\[\]\)/g;

export function normalizeFingerprintLine(line: string): string {
  return line.replace(ARRAY_CAST_FORM, (_m, inner: string) => {
    const elements = inner.split(', ').map((e) => `(${e})::text`);
    return `(ARRAY[${elements.join(', ')}])`;
  });
}

export function hashFingerprintLines(lines: readonly string[]): string {
  return createHash('sha256').update(lines.join('\n'), 'utf8').digest('hex');
}

/**
 * Compute the fingerprint. `queryRunner` MUST have an active transaction
 * (the search_path override is transaction-local by design).
 */
export async function computeSchemaFingerprint(queryRunner: QueryRunner): Promise<SchemaFingerprint> {
  if (!queryRunner.isTransactionActive) {
    throw new Error('computeSchemaFingerprint requires an active transaction');
  }
  await queryRunner.query('SET LOCAL search_path TO pg_catalog');
  const rows = (await queryRunner.query(SCHEMA_FINGERPRINT_SQL)) as Array<{ line: string }>;
  const lines = rows.map((r) => normalizeFingerprintLine(r.line));
  return { hash: hashFingerprintLines(lines), lineCount: lines.length, lines };
}

export interface FingerprintDiff {
  readonly missing: readonly string[];
  readonly unexpected: readonly string[];
}

/** Lines in `expected` not in `actual` (missing) and vice versa (unexpected). */
export function diffFingerprintLines(expected: readonly string[], actual: readonly string[]): FingerprintDiff {
  const e = new Set(expected);
  const a = new Set(actual);
  return {
    missing: expected.filter((l) => !a.has(l)),
    unexpected: actual.filter((l) => !e.has(l)),
  };
}
