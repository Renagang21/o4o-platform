#!/usr/bin/env node
/**
 * Canonical schema baseline generator
 * (WO-O4O-CANONICAL-DATABASE-BOOTSTRAP-AND-INCREMENTAL-MIGRATION-SEPARATION-V1)
 *
 * Input : a `pg_dump --schema-only --no-owner --no-privileges` file of the canonical
 *         production schema (public · cosmetics · neture).
 * Output: apps/api-server/src/database/bootstrap/canonical-schema-baseline.ts
 *
 * Normalization (deterministic, no semantic change):
 *   - drop psql meta lines (`\restrict` / `\unrestrict`), session `SET ...`,
 *     `SELECT pg_catalog.set_config(...)`, and every `--` comment line
 *   - drop `CREATE EXTENSION` / `COMMENT ON EXTENSION` — extensions are
 *     ENVIRONMENT_MANAGED and handled by the bootstrap runner preflight
 *   - split into one statement per `;` at end of line
 * Refuses to emit if the dump contains data / privilege / ownership statements.
 *
 * Usage: node scripts/db/build-canonical-schema-baseline.mjs <dump.sql> [--out <file>]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const input = args.find((a) => !a.startsWith('--'));
if (!input) {
  console.error('usage: build-canonical-schema-baseline.mjs <dump.sql> [--out <file>]');
  process.exit(2);
}
const outIdx = args.indexOf('--out');
const out = outIdx >= 0
  ? resolve(args[outIdx + 1])
  : resolve('apps/api-server/src/database/bootstrap/canonical-schema-baseline.ts');

const raw = readFileSync(resolve(input), 'utf8').replace(/\r\n/g, '\n');

const FORBIDDEN = [
  /^(INSERT|COPY|UPDATE|DELETE)\b/im,
  /^(GRANT|REVOKE)\b/im,
  /^ALTER .* OWNER TO\b/im,
  /^(CREATE|ALTER) (ROLE|USER)\b/im,
  /^CREATE DATABASE\b/im,
  /^DROP\b/im,
  /\bPASSWORD\s+'/i,
  /(host=|postgres(ql)?:\/\/)/i,
];
for (const re of FORBIDDEN) {
  const m = raw.match(re);
  if (m) {
    console.error(`refused: dump contains forbidden statement: ${m[0].slice(0, 60)}`);
    process.exit(1);
  }
}

const kept = raw
  .split('\n')
  .filter((line) => {
    if (line.startsWith('\\')) return false;
    if (/^SET /.test(line)) return false;
    if (/^SELECT pg_catalog\.set_config/.test(line)) return false;
    if (line.startsWith('--')) return false;
    return true;
  })
  .join('\n');

const statements = [];
let buf = [];
for (const line of kept.split('\n')) {
  if (line.trim() === '' && buf.length === 0) continue;
  buf.push(line);
  if (line.endsWith(';')) {
    const stmt = buf.join('\n').trim();
    buf = [];
    if (/^CREATE EXTENSION\b/.test(stmt) || /^COMMENT ON EXTENSION\b/.test(stmt)) continue;
    statements.push(stmt);
  }
}
if (buf.join('').trim() !== '') {
  console.error('refused: trailing unterminated statement');
  process.exit(1);
}

const count = (re) => statements.filter((s) => re.test(s)).length;
const census = {
  schemas: count(/^CREATE SCHEMA\b/),
  enums: count(/^CREATE TYPE .* AS ENUM/),
  tables: count(/^CREATE TABLE\b/),
  sequences: count(/^CREATE SEQUENCE\b/),
  indexes: count(/^CREATE (UNIQUE )?INDEX\b/),
  alterTable: count(/^ALTER TABLE\b/),
  alterSequence: count(/^ALTER SEQUENCE\b/),
  comments: count(/^COMMENT ON\b/),
  total: statements.length,
};
const classified = Object.entries(census).filter(([k]) => k !== 'total').reduce((a, [, v]) => a + v, 0);
if (classified !== census.total) {
  console.error(`refused: ${census.total - classified} statement(s) of unknown kind`);
  process.exit(1);
}
for (const s of statements) {
  if (s.includes('`') || s.includes('${')) {
    console.error('refused: statement contains template-literal characters');
    process.exit(1);
  }
}

const header = `/**
 * GENERATED FILE — do not edit by hand.
 * Source: scripts/db/build-canonical-schema-baseline.mjs
 * Canonical schema baseline (schema-only, no data, no roles, no privileges, no owners).
 * See canonical-schema-baseline.meta.ts for version / fingerprint / provenance.
 *
 * WO-O4O-CANONICAL-DATABASE-BOOTSTRAP-AND-INCREMENTAL-MIGRATION-SEPARATION-V1
 */

export const CANONICAL_SCHEMA_BASELINE_CENSUS = ${JSON.stringify(census, null, 2)} as const;

export const CANONICAL_SCHEMA_BASELINE_STATEMENTS: readonly string[] = [
`;
const body = statements.map((s) => `  \`${s.replace(/\\/g, '\\\\')}\`,`).join('\n');
writeFileSync(out, `${header}${body}\n];\n`, 'utf8');
console.log(`wrote ${out}`);
console.log(JSON.stringify(census));
