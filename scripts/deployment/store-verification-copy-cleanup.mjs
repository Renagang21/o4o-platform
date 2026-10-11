/** One explicitly reviewed workflow-verification copy; never a general asset deletion API. */
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { stableJson } from './demo-store-relink.mjs';
import { quoteIdentifier, quoteTable } from './demo-store-cleanup.mjs';
import { readPassword, safeInventoryError } from './pharmacy-hub-qr-probes.mjs';

const ROOT_TABLES = ['o4o_asset_snapshots', 'kpa_store_contents', 'kpa_store_asset_controls'];
const HASH = /^[a-f0-9]{64}$/;
class CopyCleanupStop extends Error {}
export const fingerprint = value => createHash('sha256').update(value).digest('hex');

export function validateScope({ target, organization, marker, apply = false, expectedDigest = '' }) {
  if (![target, organization, marker].every(x => typeof x === 'string' && HASH.test(x))) {
    throw new CopyCleanupStop('Exact snapshot, organization and verification-marker fingerprints required');
  }
  if (apply && !HASH.test(expectedDigest)) throw new CopyCleanupStop('Apply requires a reviewed before-image digest');
}

export function validateCopy(snapshot, contents, controls, owner, options) {
  if (fingerprint(snapshot.id) !== options.target || fingerprint(snapshot.organization_id) !== options.organization ||
      snapshot.created_by !== owner || snapshot.source_service !== 'kpa' || snapshot.asset_type !== 'cms') {
    throw new CopyCleanupStop('Snapshot scope or provenance does not match');
  }
  if (contents.length !== 1 || controls.length !== 1) throw new CopyCleanupStop('Exactly one edit and one control required');
  const edit = contents[0], control = controls[0], marker = edit.content_json?.verification;
  const match = typeof marker === 'string' && /^O4O workflow verification (202610(?:10|11))T(\d{2})(\d{2})(\d{2})Z$/.exec(marker);
  const markedAt = match && Date.parse(`${match[1].slice(0,4)}-${match[1].slice(4,6)}-${match[1].slice(6,8)}T${match[2]}:${match[3]}:${match[4]}Z`);
  const createdAt = Date.parse(snapshot.created_at);
  if (!match || !Number.isFinite(markedAt) || !Number.isFinite(createdAt) ||
      createdAt < markedAt || createdAt > markedAt + 10 * 60 * 1000 || fingerprint(marker) !== options.marker ||
      edit.title !== marker + ' copy edited' || edit.source_type !== 'snapshot_edit' || edit.updated_by !== owner ||
      [edit, control].some(x => x.snapshot_id !== snapshot.id || x.organization_id !== snapshot.organization_id) ||
      control.publish_status !== 'hidden' || control.snapshot_type !== 'user_copy' || control.is_forced !== false || control.is_locked !== false) {
    throw new CopyCleanupStop('Only the hidden, unlocked verification edit is eligible');
  }
}

const columnsSql = `SELECT c.table_schema, c.table_name, c.column_name, c.udt_name
  FROM information_schema.columns c JOIN information_schema.tables t
    ON t.table_schema=c.table_schema AND t.table_name=c.table_name
  WHERE t.table_type='BASE TABLE' AND c.table_schema NOT IN ('pg_catalog','information_schema')
    AND c.table_schema NOT LIKE 'pg_%'
  ORDER BY c.table_schema,c.table_name,c.ordinal_position`;

/** Probe all native UUID/text and JSON references, excluding only the approved rows and recovery history. */
export async function referenceAudit(client, columns, roots) {
  const ids = roots.map(x => x.row.id), tables = new Map();
  for (const column of columns) {
    const key = `${column.table_schema}.${column.table_name}`;
    if (key === 'public.canonical_demo_repair_snapshots') continue;
    if (!tables.has(key)) tables.set(key, []);
    tables.get(key).push(column);
  }
  for (const name of ROOT_TABLES) {
    if (!tables.has('public.' + name)) throw new CopyCleanupStop('Required snapshot extension table missing');
  }
  const blockers = [];
  for (const [table, fields] of tables) {
    const predicates = [];
    for (const { column_name: name, udt_name: type } of fields) {
      const column = quoteIdentifier(name);
      if (type === 'uuid') predicates.push(`${column} = ANY($1::uuid[])`);
      else if (['text','varchar','bpchar'].includes(type)) predicates.push(`${column}::text ILIKE ANY($1::text[])`);
      else if (['json','jsonb','_uuid','_text','_varchar'].includes(type)) predicates.push(`${column}::text ILIKE ANY($2::text[])`);
    }
    if (!predicates.length) continue;
    const own = roots.find(x => table === 'public.' + x.table);
    // Type both bind arguments even for tables with only JSON or only scalar columns.
    const sql = `SELECT count(*)::int AS count FROM ${quoteTable(table)}
      WHERE (${predicates.join(' OR ')}) AND cardinality($1::uuid[]) > 0 AND cardinality($2::text[]) > 0${own ? ' AND id <> $3::uuid' : ''}`;
    const args = [ids, ids.map(id => '%' + id + '%')];
    if (own) args.push(own.row.id);
    const count = (await client.query(sql, args)).rows[0].count;
    if (count) blockers.push({ table, count });
  }
  return blockers;
}

async function inspect(client, options) {
  const ownerRows = (await client.query(`SELECT d.user_id FROM demo_accounts d JOIN users u ON u.id=d.user_id
    WHERE d.is_active AND d.demo_type='STORE_OWNER' AND u."isActive" AND u.status='active'`)).rows;
  if (ownerRows.length !== 1) throw new CopyCleanupStop('Canonical active Store Owner registry must be unambiguous');
  const owner = ownerRows[0].user_id;
  const candidates = (await client.query('SELECT to_jsonb(s) AS row FROM o4o_asset_snapshots s WHERE created_by=$1', [owner])).rows
    .map(x => x.row).filter(x => fingerprint(x.id) === options.target);
  if (candidates.length !== 1) throw new CopyCleanupStop('Reviewed verification snapshot missing or ambiguous');
  let snapshot = candidates[0];
  if (options.apply) snapshot = (await client.query('SELECT to_jsonb(s) AS row FROM o4o_asset_snapshots s WHERE id=$1 FOR UPDATE', [snapshot.id])).rows[0]?.row;
  if (!snapshot) throw new CopyCleanupStop('Snapshot changed during inspection');
  const membership = (await client.query(`SELECT to_jsonb(m) AS row FROM organization_members m
    WHERE organization_id=$1 AND user_id=$2 AND role='owner' AND left_at IS NULL`, [snapshot.organization_id, owner])).rows;
  if (membership.length !== 1) throw new CopyCleanupStop('Canonical ownership membership required');
  const lock = options.apply ? ' FOR UPDATE' : '';
  const contents = (await client.query('SELECT to_jsonb(c) AS row FROM kpa_store_contents c WHERE snapshot_id=$1' + lock, [snapshot.id])).rows.map(x => x.row);
  const controls = (await client.query('SELECT to_jsonb(c) AS row FROM kpa_store_asset_controls c WHERE snapshot_id=$1' + lock, [snapshot.id])).rows.map(x => x.row);
  validateCopy(snapshot, contents, controls, owner, options);
  const source = (await client.query('SELECT to_jsonb(c) AS row FROM cms_contents c WHERE id=$1' + (options.apply ? ' FOR SHARE' : ''), [snapshot.source_asset_id])).rows[0]?.row;
  if (!source) throw new CopyCleanupStop('Original CMS source must exist');
  const columns = (await client.query(columnsSql)).rows;
  const roots = ROOT_TABLES.map((table, i) => ({ table, row: [snapshot, contents[0], controls[0]][i] }));
  const blockers = await referenceAudit(client, columns, roots);
  return { roots, source, membership: membership[0].row, columns, blockers };
}

export async function runVerificationCopyCleanup(client, options) {
  validateScope(options);
  const apply = options.apply === true;
  await client.query(apply ? 'BEGIN ISOLATION LEVEL SERIALIZABLE' : 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  try {
    await client.query("SET LOCAL statement_timeout='15s'");
    await client.query("SET LOCAL lock_timeout='5s'");
    if (apply) await client.query("SELECT pg_advisory_xact_lock(hashtext('canonical-demo-store-relink'))");
    const before = await inspect(client, options);
    const digest = fingerprint(stableJson(before));
    if (apply) {
      if (before.blockers.length) throw new CopyCleanupStop('External references block cleanup; inspect the read-only plan');
      if (digest !== options.expectedDigest) throw new CopyCleanupStop('Before-images changed; replan');
      const ready = (await client.query("SELECT to_regclass('public.canonical_demo_repair_snapshots') IS NOT NULL AS ready")).rows[0]?.ready;
      if (!ready) throw new CopyCleanupStop('Existing recovery table required; no schema changes are permitted');
      const recovery = await client.query('INSERT INTO canonical_demo_repair_snapshots (migration,snapshot) VALUES ($1,$2::jsonb)',
        ['verification-copy-cleanup-' + digest, JSON.stringify({ before, scope: { target: options.target, organization: options.organization, marker: options.marker } })]);
      if (recovery.rowCount !== 1) throw new CopyCleanupStop('Recovery record was not saved');
      for (const { table, row } of [before.roots[2], before.roots[1], before.roots[0]]) {
        const result = await client.query(`DELETE FROM ${quoteTable(table)} WHERE id=$1 AND organization_id=$2`, [row.id, row.organization_id]);
        if (result.rowCount !== 1) throw new CopyCleanupStop('Deletion row count changed');
      }
      for (const { table, row } of before.roots) {
        if ((await client.query(`SELECT count(*)::int AS count FROM ${quoteTable(table)} WHERE id=$1`, [row.id])).rows[0].count !== 0) {
          throw new CopyCleanupStop('Deletion verification failed');
        }
      }
      if ((await referenceAudit(client, before.columns, before.roots)).length) throw new CopyCleanupStop('Reference verification failed');
      const source = (await client.query('SELECT to_jsonb(c) AS row FROM cms_contents c WHERE id=$1', [before.source.id])).rows[0]?.row;
      const membership = (await client.query('SELECT to_jsonb(m) AS row FROM organization_members m WHERE organization_id=$1 AND user_id=$2',
        [before.membership.organization_id, before.membership.user_id])).rows.map(x => x.row);
      if (stableJson(source) !== stableJson(before.source) || !membership.some(x => stableJson(x) === stableJson(before.membership))) {
        throw new CopyCleanupStop('Original source or ownership changed');
      }
    }
    await client.query(apply ? 'COMMIT' : 'ROLLBACK');
    return { mode: apply ? 'apply' : 'plan', eligible: !before.blockers.length, digest,
      rows: before.roots.map(x => ({ table: x.table, count: 1 })), blockers: before.blockers,
      deleted: apply ? 3 : 0, sourcePreserved: apply ? true : null };
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { /* Retain the original failure. */ }
    throw error instanceof CopyCleanupStop ? error : safeInventoryError(error, 'verification-copy-cleanup');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let client;
  try {
    const mode = process.env.COPY_CLEANUP_MODE || 'plan';
    if (!['plan','apply'].includes(mode) || !process.env.DB_USERNAME || !process.env.DB_NAME) throw new CopyCleanupStop('Invalid runtime configuration');
    const options = { apply: mode === 'apply', target: process.env.COPY_CLEANUP_TARGET || '',
      organization: process.env.COPY_CLEANUP_ORGANIZATION || '', marker: process.env.COPY_CLEANUP_MARKER || '',
      expectedDigest: process.env.COPY_CLEANUP_DIGEST || '' };
    validateScope(options);
    const require = createRequire(new URL('../../apps/api-server/package.json', import.meta.url));
    const { Client } = require('pg');
    client = new Client({ host: '127.0.0.1', port: 55432, user: process.env.DB_USERNAME, database: process.env.DB_NAME,
      password: readPassword(), connectionTimeoutMillis: 15000, options: mode === 'plan' ? '-c default_transaction_read_only=on' : '' });
    await client.connect();
    const result = JSON.stringify(await runVerificationCopyCleanup(client, options));
    console.log(result);
    if (process.env.GITHUB_ACTIONS === 'true') {
      const escaped = result.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
      console.log('::notice file=scripts/deployment/store-verification-copy-cleanup.mjs,line=1,title=Verification copy cleanup::' + escaped);
    }
  } catch (error) {
    console.error((error instanceof CopyCleanupStop ? error : safeInventoryError(error, 'verification-copy-cleanup-runtime')).message);
    process.exitCode = 1;
  } finally {
    if (client) try { await client.end(); } catch (error) { console.error(safeInventoryError(error, 'verification-copy-cleanup-disconnect').message); process.exitCode = 1; }
  }
}
