/** Approved test-store ownership relink. Default plan; apply requires the exact before-image digest. */
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readPassword, safeInventoryError } from './pharmacy-hub-qr-probes.mjs';

// Only stores that existed at the approved production inventory are in scope.
export const STORE_INVENTORY_CUTOFF = '2026-10-10T10:14:01Z';

export function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.keys(value).sort((a, b) => a.localeCompare(b, 'en'))
      .map(key => JSON.stringify(key) + ':' + stableJson(value[key]));
    return '{' + entries.join(',') + '}';
  }
  return JSON.stringify(value);
}

export function storeFingerprint(id) {
  return createHash('sha256').update(id).digest('hex');
}

export async function storeRelinkPlan(client, apply = false, targetFingerprints = []) {
  if (targetFingerprints.some(value => !/^[a-f0-9]{64}$/.test(value)) ||
      new Set(targetFingerprints).size !== targetFingerprints.length) throw new Error('Invalid reviewed target set');
  if (apply && !targetFingerprints.length) throw new Error('Apply requires an explicitly reviewed target set');
  const owner = (await client.query(`SELECT d.user_id FROM demo_accounts d JOIN users u ON u.id=d.user_id
    WHERE d.is_active AND d.demo_type='STORE_OWNER' AND u."isActive" AND u.status='active' ${apply ? 'FOR UPDATE OF d,u' : ''}`)).rows;
  if (owner.length !== 1) throw new Error('Canonical Store Demo is ambiguous');
  const userId = owner[0].user_id;
  const roles = (await client.query(`SELECT role FROM role_assignments WHERE user_id=$1 AND is_active`, [userId])).rows;
  if (!roles.some(row => row.role === 'neture:store_owner') ||
      roles.some(row => /(^|:)(admin|operator|super_admin)$/.test(row.role))) throw new Error('Demo role boundary invalid');
  // Association/supplier organizations never enter this approved store-only population.
  const candidates = (await client.query(`SELECT to_jsonb(o) AS row FROM organizations o
    WHERE o.type IN ('pharmacy','store') AND o."createdAt" <= $1::timestamptz
    ORDER BY o.id ${apply ? 'FOR UPDATE OF o' : ''}`, [STORE_INVENTORY_CUTOFF])).rows.map(row => row.row);
  if (!candidates.length) throw new Error('No existing stores');
  const selected = new Set(targetFingerprints);
  const organizations = selected.size ? candidates.filter(row => selected.has(storeFingerprint(row.id))) : candidates;
  if (selected.size && organizations.length !== selected.size) throw new Error('Reviewed store population changed');
  const ids = organizations.map(row => row.id);
  const members = (await client.query(`SELECT to_jsonb(m) AS row FROM organization_members m
    WHERE m.organization_id=ANY($1::uuid[]) AND m.user_id=$2 ORDER BY m.organization_id
    ${apply ? 'FOR UPDATE OF m' : ''}`, [ids, userId])).rows.map(row => row.row);
  const byOrg = new Map(members.map(row => [row.organization_id, row]));
  const changes = organizations.filter(org => {
    const member = byOrg.get(org.id);
    return org.created_by_user_id !== userId || member?.role !== 'owner' || member?.left_at !== null;
  });
  const before = {
    provenance: { authorization: 'user-declared-existing-test-data-2026-10-10',
      canonicalPolicy: 'O4O-CANONICAL-DEMO-ACCOUNTS-V1 section 14', inventoryRun: '38044110792' },
    inventoryCutoff: STORE_INVENTORY_CUTOFF,
    targetFingerprints: organizations.map(row => storeFingerprint(row.id)).sort((a, b) => a.localeCompare(b, 'en')), userId, organizations, members,
  };
  const digest = createHash('sha256').update(stableJson(before)).digest('hex');
  return { before, ids, changes, digest, requiresVerifiedTargets: !selected.size };
}

export async function verifyStoreRelink(client, plan) {
  const result = await client.query(`SELECT count(*)::int AS count FROM organizations o
    JOIN organization_members m ON m.organization_id=o.id AND m.user_id=$2
      AND m.role='owner' AND m.left_at IS NULL
    WHERE o.id=ANY($1::uuid[]) AND o.created_by_user_id=$2`, [plan.ids, plan.before.userId]);
  if (result.rows[0].count !== plan.ids.length) throw new Error('Store relink verification failed');
}

async function applyStoreRelink(client, plan, expectedDigest) {
  if (!/^[a-f0-9]{64}$/.test(expectedDigest) || plan.digest !== expectedDigest) throw new Error('Before-image digest changed; re-plan');
  const backup = await client.query(`SELECT to_regclass('public.canonical_demo_repair_snapshots') IS NOT NULL AS ready`);
  if (!backup.rows[0].ready) throw new Error('Existing recovery table missing');
  // Full before-images remain in the existing DB audit table, never in CI artifacts/logs.
  const audit = await client.query(`INSERT INTO canonical_demo_repair_snapshots (migration,snapshot)
    VALUES ($1,$2::jsonb) RETURNING id`, [`store-relink-${plan.digest}`, JSON.stringify({ before: plan.before })]);
  await client.query(`UPDATE organizations SET created_by_user_id=$2
    WHERE id=ANY($1::uuid[]) AND created_by_user_id IS DISTINCT FROM $2`, [plan.ids, plan.before.userId]);
  await client.query(`INSERT INTO organization_members (organization_id,user_id,role,is_primary)
    SELECT id,$2,'owner',false FROM organizations WHERE id=ANY($1::uuid[])
    ON CONFLICT (organization_id,user_id) DO UPDATE
      SET role='owner',left_at=NULL,updated_at=now()
      WHERE organization_members.role IS DISTINCT FROM 'owner' OR organization_members.left_at IS NOT NULL`, [plan.ids, plan.before.userId]);
  await verifyStoreRelink(client, plan);
  const afterMembers = (await client.query(`SELECT to_jsonb(m) AS row FROM organization_members m
    WHERE m.organization_id=ANY($1::uuid[]) AND m.user_id=$2 ORDER BY m.organization_id`, [plan.ids, plan.before.userId])).rows.map(row => row.row);
  await client.query(`UPDATE canonical_demo_repair_snapshots SET snapshot=snapshot || $2::jsonb WHERE id=$1`,
    [audit.rows[0].id, JSON.stringify({ after_members: afterMembers, verified_stores: plan.ids.length })]);
}

export async function runStoreRelink(client, { apply = false, expectedDigest = '', targetFingerprints = [] } = {}) {
  await client.query(apply ? 'BEGIN ISOLATION LEVEL SERIALIZABLE' : 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  let failure;
  let summary;
  let finished = false;
  try {
    await client.query("SET LOCAL statement_timeout='15s'");
    await client.query("SET LOCAL lock_timeout='5s'");
    if (apply) await client.query("SELECT pg_advisory_xact_lock(hashtext('canonical-demo-store-relink'))");
    const plan = await storeRelinkPlan(client, apply, targetFingerprints);
    summary = plan.requiresVerifiedTargets
      ? { mode: 'discovery', candidateStores: plan.ids.length,
        targetFingerprints: plan.before.targetFingerprints, requiresVerifiedTargets: true }
      : { mode: apply ? 'apply' : 'plan', targetStores: plan.ids.length,
        storesNeedingRelink: plan.changes.length, digest: plan.digest,
        targetFingerprints: plan.before.targetFingerprints, provenance: plan.before.provenance };
    if (apply && plan.changes.length) {
      await applyStoreRelink(client, plan, expectedDigest);
    } else if (apply) {
      await verifyStoreRelink(client, plan);
    }
    await client.query(apply ? 'COMMIT' : 'ROLLBACK');
    finished = true;
  } catch (error) {
    failure = safeInventoryError(error, 'store-relink');
  }
  if (!finished) {
    try { await client.query('ROLLBACK'); } catch (error) { failure ??= safeInventoryError(error, 'store-relink-rollback'); }
  }
  if (failure) throw failure;
  return summary;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let client;
  try {
    const mode = process.env.DEMO_RELINK_MODE || 'plan';
    if (!['plan','apply'].includes(mode) || !process.env.DB_USERNAME || !process.env.DB_NAME) throw new Error('Invalid runtime configuration');
    const require = createRequire(new URL('../../apps/api-server/package.json', import.meta.url));
    const { Client } = require('pg');
    client = new Client({ host: '127.0.0.1', port: 55432, user: process.env.DB_USERNAME,
      database: process.env.DB_NAME, password: readPassword(), connectionTimeoutMillis: 15000,
      options: mode === 'plan' ? '-c default_transaction_read_only=on' : '' });
    await client.connect();
    console.log(JSON.stringify(await runStoreRelink(client, { apply: mode === 'apply', expectedDigest: process.env.DEMO_RELINK_DIGEST || '',
      targetFingerprints: (process.env.DEMO_RELINK_TARGETS || '').split(',').map(value => value.trim()).filter(Boolean) })));
  } catch (error) {
    console.error(safeInventoryError(error, 'store-relink-runtime').message);
    process.exitCode = 1;
  } finally {
    if (client) {
      try { await client.end(); } catch (error) {
        console.error(safeInventoryError(error, 'store-relink-disconnect').message);
        process.exitCode = 1;
      }
    }
  }
}
