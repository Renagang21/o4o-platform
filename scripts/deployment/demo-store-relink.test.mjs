import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runStoreRelink, stableJson, storeFingerprint } from './demo-store-relink.mjs';

const userId = '11111111-1111-4111-8111-111111111111';
const orgId = '22222222-2222-4222-8222-222222222222';
const targetFingerprints = [storeFingerprint(orgId)];
function fakeClient({ linked = false, verify = 1, backup = true, ownerCount = 1, roles = [{ role: 'neture:store_owner' }] } = {}) {
  const calls = [];
  const client = { query: async (sql, args) => {
    calls.push({ sql, args });
    if (sql.includes('SELECT d.user_id')) return { rows: Array.from({ length: ownerCount }, () => ({ user_id: userId })) };
    if (sql.startsWith('SELECT role')) return { rows: roles };
    if (sql.includes('SELECT to_jsonb(o)')) return { rows: [{ row: { id: orgId, type: 'pharmacy', created_by_user_id: linked ? userId : null } }] };
    if (sql.includes('SELECT to_jsonb(m)')) return { rows: linked ? [{ row: { organization_id: orgId, user_id: userId, role: 'owner', left_at: null, is_primary: true } }] : [] };
    if (sql.includes('to_regclass')) return { rows: [{ ready: backup }] };
    if (sql.startsWith('INSERT INTO canonical_demo')) return { rows: [{ id: 'private-audit' }] };
    if (sql.startsWith('SELECT count')) return { rows: [{ count: verify }] };
    return { rows: [] };
  } };
  return { calls, client };
}

test('stable digest serialization ignores JSON object insertion order', () => {
  assert.equal(stableJson({ b: 2, a: { y: 1, x: 0 } }), stableJson({ a: { x: 0, y: 1 }, b: 2 }));
});

test('default plan is read-only, returns aggregates/digest and never writes backup or ownership', async () => {
  const { calls, client } = fakeClient();
  const result = await runStoreRelink(client, { targetFingerprints });
  assert.equal(result.mode, 'plan');
  assert.equal(result.targetStores, 1);
  assert.equal(result.storesNeedingRelink, 1);
  assert.match(result.digest, /^[a-f0-9]{64}$/);
  assert.equal(calls[0].sql, 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  assert.equal(calls.at(-1).sql, 'ROLLBACK');
  assert.ok(!calls.some(({sql}) => /^(INSERT|UPDATE|DELETE)/.test(sql)));
  assert.doesNotMatch(JSON.stringify(result), /11111111|22222222/);
});

test('mismatched before-images abort apply before any data write', async () => {
  const { calls, client } = fakeClient();
  await assert.rejects(runStoreRelink(client, { apply: true, targetFingerprints, expectedDigest: '0'.repeat(64) }));
  assert.equal(calls.at(-1).sql, 'ROLLBACK');
  assert.ok(!calls.some(({sql}) => /^(INSERT|UPDATE|DELETE)/.test(sql)));
});

test('matching apply persists recovery before ownership writes and verifies before commit', async () => {
  const { calls, client } = fakeClient();
  const plan = await runStoreRelink(client, { targetFingerprints });
  calls.length = 0;
  await runStoreRelink(client, { apply: true, targetFingerprints, expectedDigest: plan.digest });
  const backupAt = calls.findIndex(({sql}) => sql.startsWith('INSERT INTO canonical_demo'));
  const updateAt = calls.findIndex(({sql}) => sql.startsWith('UPDATE organizations'));
  assert.ok(backupAt >= 0 && backupAt < updateAt);
  assert.equal(calls.at(-1).sql, 'COMMIT');
  assert.ok(calls.some(({sql}) => sql.includes('SELECT count')));
  assert.ok(!calls.some(({sql}) => /^(DELETE|ALTER|DROP)/.test(sql)));
  assert.ok(!calls.some(({sql}) => /UPDATE (users|role_assignments|neture_suppliers|store_)/.test(sql)));
});

test('missing recovery table or failed verification rolls the entire apply back', async () => {
  for (const options of [{ backup: false }, { verify: 0 }]) {
    const { calls, client } = fakeClient(options);
    const plan = await runStoreRelink(client, { targetFingerprints });
    calls.length = 0;
    await assert.rejects(runStoreRelink(client, { apply: true, targetFingerprints, expectedDigest: plan.digest }));
    assert.equal(calls.at(-1).sql, 'ROLLBACK');
    assert.ok(!calls.some(({sql}) => sql === 'COMMIT'));
  }
});

test('already linked stores are verified without writing or requiring a new digest', async () => {
  const { calls, client } = fakeClient({ linked: true });
  const result = await runStoreRelink(client, { apply: true, targetFingerprints });
  assert.equal(result.storesNeedingRelink, 0);
  assert.ok(!calls.some(({sql}) => /^(INSERT|UPDATE|DELETE)/.test(sql)));
  assert.equal(calls.at(-1).sql, 'COMMIT');
});

test('missing/ambiguous registry and invalid Demo roles abort before ownership discovery', async () => {
  for (const options of [{ownerCount:0},{ownerCount:2},{roles:[]},
    {roles:[{role:'neture:store_owner'},{role:'platform:super_admin'}]}]) {
    const {client,calls}=fakeClient(options);
    await assert.rejects(runStoreRelink(client,{apply:true,targetFingerprints}));
    assert.equal(calls.at(-1).sql,'ROLLBACK');
    assert.ok(!calls.some(({sql})=>sql.includes('SELECT to_jsonb(o)')));
    assert.ok(!calls.some(({sql})=>/^(INSERT|UPDATE|DELETE)/.test(sql)));
  }
});

test('target query limits organizational types and the approved inventory time', async () => {
  const {client,calls}=fakeClient();
  await runStoreRelink(client, { targetFingerprints });
  const query=calls.find(({sql})=>sql.includes('SELECT to_jsonb(o)'));
  assert.match(query.sql,/o\.type IN \('pharmacy','store'\)/);
  assert.match(query.sql,/o\."createdAt" <= \$1::timestamptz/);
  assert.deepEqual(query.args,['2026-10-10T10:14:01Z']);
});

test('unselected discovery exposes fingerprints without an apply digest or data writes', async () => {
  const {client,calls}=fakeClient();
  const result=await runStoreRelink(client);
  assert.equal(result.mode,'discovery');
  assert.equal(result.digest,undefined);
  assert.deepEqual(result.targetFingerprints,targetFingerprints);
  assert.ok(!calls.some(({sql})=>/^(INSERT|UPDATE|DELETE)/.test(sql)));
  await assert.rejects(runStoreRelink(client,{apply:true}));
});

test('unverified, duplicate or missing targets cannot enter the relink population', async () => {
  for (const targets of [['invalid'],[storeFingerprint('unknown')],
    [storeFingerprint(orgId),storeFingerprint(orgId)]]) {
    const {client,calls}=fakeClient();
    await assert.rejects(runStoreRelink(client,{apply:true,targetFingerprints:targets}));
    assert.ok(!calls.some(({sql})=>/^(INSERT|UPDATE|DELETE)/.test(sql)));
  }
});
