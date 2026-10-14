/**
 * Metadata-only inventory of an isolated, canonical erasure-review database.
 * Run with the existing tsx loader; no account rows, file objects or writes.
 * Classification labels describe runtime coverage, never deletion approval.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';
import ts from 'typescript';
import { computeSchemaFingerprint } from '../../apps/api-server/src/database/bootstrap/schema-fingerprint.js';
import { EXPECTED_SCHEMA_STATES } from '../../apps/api-server/src/database/incremental/expected-schema-states.js';

if (process.env.NODE_ENV !== 'development' || process.env.DB_HOST !== '127.0.0.1' ||
    process.env.DB_PORT !== '55469' || !/^o4o_erasure_inventory_[a-f0-9]{8,40}$/.test(process.env.DB_NAME ?? '')) {
  throw new Error('Only the dedicated loopback inventory database on port 55469 is allowed');
}
const outputIndex = process.argv.indexOf('--out');
assert.ok(outputIndex >= 0 && process.argv[outputIndex + 1], '--out is required');
const source = readFileSync(resolve('apps/api-server/src/services/privacy/account-erasure.service.ts'), 'utf8');
const ast = ts.createSourceFile('account-erasure.service.ts', source, ts.ScriptTarget.Latest, true);
let declaration;
function visit(node) {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'PRIVATE_OWNERS') declaration = node;
  ts.forEachChild(node, visit);
}
visit(ast);
assert.ok(declaration?.initializer && ts.isObjectLiteralExpression(declaration.initializer), 'PRIVATE_OWNERS must be an explicit object');
const owners = Object.fromEntries(declaration.initializer.properties.map(property => {
  assert.ok(ts.isPropertyAssignment(property) && ts.isArrayLiteralExpression(property.initializer));
  assert.ok(ts.isIdentifier(property.name) || ts.isStringLiteral(property.name));
  return [property.name.text, property.initializer.elements.map(element => {
    assert.ok(ts.isStringLiteral(element));
    return element.text;
  })];
}));

const client = new pg.Client({ host: '127.0.0.1', port: 55469, user: 'agent', database: process.env.DB_NAME });
await client.connect();
try {
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  await client.query("SET LOCAL statement_timeout = '10s'");
  assert.equal((await client.query("SELECT current_setting('transaction_read_only') AS read_only")).rows[0].read_only, 'on');
  const query = async (sql, parameters) => (await client.query(sql, parameters)).rows;
  const fingerprint = await computeSchemaFingerprint({ query, isTransactionActive: true });
  const expected = EXPECTED_SCHEMA_STATES.at(-1);
  assert.equal(fingerprint.hash, expected.fingerprint, 'canonical schema drift');
  assert.equal(fingerprint.lineCount, expected.fingerprintLineCount);
  const history = await query('SELECT name FROM public.typeorm_migrations ORDER BY id');
  assert.deepEqual(history.map(row => row.name), EXPECTED_SCHEMA_STATES.slice(1).map(state => state.appliedThrough));

  const columns = await query(`SELECT n.nspname AS schema, c.relname AS relation, a.attname AS field,
      format_type(a.atttypid,a.atttypmod) AS type, t.typcategory, t.typname
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    JOIN pg_attribute a ON a.attrelid=c.oid JOIN pg_type t ON t.oid=a.atttypid
    WHERE n.nspname IN ('public','neture','cosmetics') AND c.relkind IN ('r','m')
      AND a.attnum>0 AND NOT a.attisdropped
      AND c.relname NOT IN ('o4o_schema_baselines','typeorm_migrations')
    ORDER BY n.nspname,c.relname,a.attnum`);
  const foreignKeys = await query(`SELECT n.nspname AS schema,c.relname AS relation,k.conname AS constraint,
      array_agg(a.attname::text ORDER BY keys.ordinality) AS fields,k.confdeltype AS on_delete
    FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace
    CROSS JOIN LATERAL unnest(k.conkey) WITH ORDINALITY keys(attnum,ordinality)
    JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=keys.attnum
    WHERE k.contype='f' AND k.confrelid='public.users'::regclass
    GROUP BY n.nspname,c.relname,k.conname,k.confdeltype ORDER BY n.nspname,c.relname,k.conname`);
  const tables = new Map();
  for (const column of columns) {
    const key = `${column.schema}.${column.relation}`;
    if (!tables.has(key)) {
      const privateOwners = column.schema === 'public' ? owners[column.relation] ?? [] : [];
      const coverage = key === 'public.users' ? 'identity_core' : privateOwners.length ? 'runtime_private_owner' :
        key === 'public.community_membership_changes' ? 'runtime_evidence_transfer' :
        column.relation.startsWith('account_erasure_') ? 'operation_or_minimum_evidence' : 'domain_review_required';
      tables.set(key, { key, coverage, privateOwners, columns: [], userForeignKeys: foreignKeys.filter(fk => `${fk.schema}.${fk.relation}` === key) });
    }
    const identityCandidate = column.typcategory === 'S' || ['uuid','json','jsonb'].includes(column.typname) ||
      /user|author|actor|owner|email|phone|contact|profile|provider/i.test(column.field);
    const fileCandidate = /file|attachment|avatar|image|photo|picture|url|path|storage|metadata|payload|body|content/i.test(column.field);
    tables.get(key).columns.push({ field: column.field, type: column.type, identityCandidate, fileCandidate });
  }
  const result = {
    schema: { appliedThrough: expected.appliedThrough, fingerprint: fingerprint.hash, lines: fingerprint.lineCount },
    erasureSourceHash: createHash('sha256').update(source).digest('hex'),
    scope: 'canonical local schema metadata; candidates require domain/ownership/legal review',
    missingRuntimeOwnerTables: Object.keys(owners).filter(table => !tables.has(`public.${table}`)),
    tables: [...tables.values()],
  };
  for (const table of result.tables) for (const owner of table.privateOwners) {
    assert.ok(table.columns.some(column => column.field === owner), `missing runtime owner field: ${table.key}.${owner}`);
  }
  await client.query('COMMIT');
  writeFileSync(resolve(process.argv[outputIndex + 1]), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ tables: tables.size, columns: columns.length, userForeignKeys: foreignKeys.length,
    runtimePrivateTables: result.tables.filter(table => table.coverage === 'runtime_private_owner').length,
    domainReviewTables: result.tables.filter(table => table.coverage === 'domain_review_required').length,
    identityCandidates: result.tables.flatMap(table => table.columns).filter(column => column.identityCandidate).length,
    missingRuntimeOwnerTables: result.missingRuntimeOwnerTables, schema: result.schema }));
} finally {
  await client.end();
}
