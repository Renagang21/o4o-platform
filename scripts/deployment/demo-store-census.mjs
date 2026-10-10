/** Read-only inventory for the approved canonical Demo relink; never changes ownership. */
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readPassword, safeInventoryError } from './pharmacy-hub-qr-probes.mjs';

export const queries = {
  demos: `SELECT demo_type, count(*)::int AS count FROM demo_accounts
    WHERE is_active GROUP BY demo_type ORDER BY demo_type`,
  organizations: `SELECT type, count(*)::int AS count FROM organizations GROUP BY type ORDER BY type`,
  memberships: `SELECT m.role, (d.user_id IS NOT NULL) AS demo_owned, count(*)::int AS count
    FROM organization_members m LEFT JOIN demo_accounts d ON d.user_id=m.user_id
      AND d.is_active AND d.demo_type='STORE_OWNER'
    WHERE m.left_at IS NULL GROUP BY m.role, (d.user_id IS NOT NULL) ORDER BY m.role, demo_owned`,
  columns: `SELECT table_name, column_name FROM information_schema.columns
    WHERE table_schema='public'
      AND (left(table_name,6)='store_' OR left(table_name,4)='kpa_'
        OR table_name IN ('organization_members','organizations','neture_pharmacy_memberships',
          'role_assignments','service_memberships','neture_suppliers',
          'supplier_product_offers','neture_supplier_library_items'))
      AND column_name IN ('organization_id','store_id','user_id','created_by_user_id',
        'created_by','owner_id','applicant_user_id','service_key','supplier_id')
    ORDER BY table_name, column_name`,
  foreignKeys: `SELECT source.relname AS source_table, target.relname AS target_table,
      pg_get_constraintdef(c.oid) AS definition
    FROM pg_constraint c JOIN pg_class source ON source.oid=c.conrelid
      JOIN pg_namespace n ON n.oid=source.relnamespace
      JOIN pg_class target ON target.oid=c.confrelid
    WHERE c.contype='f' AND n.nspname='public' AND target.relname IN ('users','organizations','neture_suppliers')
    ORDER BY source.relname, target.relname, c.conname`,
};


// Registry IDs remain inside SQL; joining through memberships preserves organization boundaries.
export function scopedCountQuery(table, columns) {
  if (!/^[a-z][a-z0-9_]*$/.test(table)) throw new Error('Unsupported table identifier');
  const userColumns = new Set(['user_id','created_by_user_id','created_by','owner_id','applicant_user_id']);
  function predicate(demoType) {
    const conditions = [];
    for (const column of columns) {
      if (column === 'organization_id' || column === 'store_id') {
        conditions.push(`t."${column}"::text IN (SELECT organization_id::text FROM demo_orgs WHERE demo_type='${demoType}')`);
      } else if (userColumns.has(column)) {
        conditions.push(`t."${column}"::text IN (SELECT user_id::text FROM demo_accounts WHERE is_active AND demo_type='${demoType}')`);
      } else if (column === 'supplier_id' && demoType === 'SUPPLIER') {
        conditions.push('t.supplier_id::text IN (SELECT id::text FROM demo_suppliers)');
      }
    }
    if (table === 'neture_suppliers' && demoType === 'SUPPLIER') {
      conditions.push('t.id::text IN (SELECT id::text FROM demo_suppliers)');
    }
    return conditions.length ? `COALESCE((${conditions.join(' OR ')}), false)` : 'false';
  }
  const store = predicate('STORE_OWNER');
  const supplier = predicate('SUPPLIER');
  return `WITH demo_orgs AS (
    SELECT DISTINCT m.organization_id,d.demo_type FROM organization_members m
      JOIN demo_accounts d ON d.user_id=m.user_id AND d.is_active
    WHERE m.left_at IS NULL AND m.role IN ('owner','admin','manager')
  ), demo_suppliers AS (
    SELECT s.id FROM neture_suppliers s WHERE
      s.user_id IN (SELECT user_id FROM demo_accounts WHERE is_active AND demo_type='SUPPLIER')
      OR s.organization_id IN (SELECT organization_id FROM demo_orgs WHERE demo_type='SUPPLIER')
  ) SELECT count(*)::int AS count,
      count(*) FILTER (WHERE ${store})::int AS store_demo_count,
      count(*) FILTER (WHERE ${supplier})::int AS supplier_demo_count,
      count(*) FILTER (WHERE NOT (${store} OR ${supplier}))::int AS unlinked_to_demo_count
    FROM "${table}" t`;
}

export async function collectDemoStoreCensus(client) {
  await client.query('BEGIN READ ONLY');
  let failure;
  let census;
  try {
    await client.query("SET LOCAL statement_timeout='15s'");
    const demos = (await client.query(queries.demos)).rows;
    const types = new Set(demos.map(row => row.demo_type));
    if (demos.length !== 2 || !types.has('STORE_OWNER') || !types.has('SUPPLIER') ||
        demos.some(row => row.count !== 1)) throw new Error('Canonical Demo registry is ambiguous');
    const organizations = (await client.query(queries.organizations)).rows;
    const memberships = (await client.query(queries.memberships)).rows;
    const relationshipColumns = (await client.query(queries.columns)).rows;
    const foreignKeys = (await client.query(queries.foreignKeys)).rows;
    const tables = [...new Set(relationshipColumns.map(row => row.table_name))];
    // pg uses one connection, so queued counts stay inside this transaction.
    const tableCounts = await Promise.all(tables.map(async table => {
      const columns = relationshipColumns.filter(row => row.table_name === table).map(row => row.column_name);
      const result = await client.query(scopedCountQuery(table, columns));
      return { table, ...result.rows[0] };
    }));
    // Aggregates/schema metadata only; no user/organization IDs, names or row contents.
    census = { readOnly: true, demos, organizations, memberships, relationshipColumns, foreignKeys, tableCounts };
  } catch (error) {
    failure = safeInventoryError(error, 'demo-census');
  }
  try {
    await client.query('ROLLBACK');
  } catch (error) {
    failure ??= safeInventoryError(error, 'demo-rollback');
  }
  if (failure) throw failure;
  return census;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let client;
  let stage = 'demo-config';
  try {
    if (!process.env.DB_USERNAME || !process.env.DB_NAME) throw new Error('Database bindings missing');
    const require = createRequire(new URL('../../apps/api-server/package.json', import.meta.url));
    const { Client } = require('pg');
    stage = 'demo-secret';
    const password = readPassword();
    client = new Client({ host: '127.0.0.1', port: 55432,
      user: process.env.DB_USERNAME, database: process.env.DB_NAME, password,
      connectionTimeoutMillis: 15000, options: '-c default_transaction_read_only=on' });
    stage = 'demo-connect';
    await client.connect();
    stage = 'demo-census';
    console.log(JSON.stringify(await collectDemoStoreCensus(client)));
  } catch (error) {
    // Never print subprocess output, SQL errors, credential values or original stacks.
    console.error(safeInventoryError(error, stage).message);
    process.exitCode = 1;
  } finally {
    if (client) {
      try { await client.end(); } catch (error) {
        console.error(safeInventoryError(error, 'demo-disconnect').message);
        process.exitCode = 1;
      }
    }
  }
}
