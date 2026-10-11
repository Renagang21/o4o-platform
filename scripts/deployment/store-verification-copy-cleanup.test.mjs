import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fingerprint, validateScope, validateCopy, runVerificationCopyCleanup } from './store-verification-copy-cleanup.mjs';

const ids = {
  owner: '11111111-1111-4111-8111-111111111111', organization: '22222222-2222-4222-8222-222222222222',
  snapshot: 'a3333333-3333-4333-8333-333333333333', edit: 'b4444444-4444-4444-8444-444444444444',
  control: '55555555-5555-4555-8555-555555555555', source: '66666666-6666-4666-8666-666666666666',
};
const marker = 'O4O workflow verification 20261011T001500Z';
const options = { target: fingerprint(ids.snapshot), organization: fingerprint(ids.organization), marker: fingerprint(marker) };
const snapshot = { id: ids.snapshot, organization_id: ids.organization, created_by: ids.owner,
  source_service: 'kpa', asset_type: 'cms', source_asset_id: ids.source, created_at: '2026-10-11T00:15:01Z' };
const edit = { id: ids.edit, organization_id: ids.organization, snapshot_id: ids.snapshot, source_type: 'snapshot_edit',
  title: marker + ' copy edited', content_json: { verification: marker, html: '<p>temporary</p>' }, updated_by: ids.owner };
const control = { id: ids.control, organization_id: ids.organization, snapshot_id: ids.snapshot,
  publish_status: 'hidden', snapshot_type: 'user_copy', is_forced: false, is_locked: false };

test('requires exact reviewed fingerprints and a digest before opening an apply transaction', async () => {
  const client = { query() { throw new Error('Database must not be accessed'); } };
  for (const invalid of [{}, { ...options, target: ids.snapshot }, { ...options, organization: '' }, { ...options, marker: '' }, { ...options, apply: true }]) {
    await assert.rejects(runVerificationCopyCleanup(client, invalid), /required|requires/i);
  }
  validateScope({ ...options, apply: true, expectedDigest: 'a'.repeat(64) });
});
test('rejects wrong provenance, shared/forced copies and incomplete extensions', () => {
  for (const altered of [{ ...snapshot, created_by: ids.source }, { ...snapshot, asset_type: 'signage' }, { ...snapshot, organization_id: ids.source }]) {
    assert.throws(() => validateCopy(altered, [edit], [control], ids.owner, options), /scope|provenance/);
  }
  for (const altered of [{ ...control, publish_status: 'published' }, { ...control, is_forced: true }, { ...control, is_locked: true }, { ...control, snapshot_type: 'hq_forced' }]) {
    assert.throws(() => validateCopy(snapshot, [edit], [altered], ids.owner, options), /hidden, unlocked/);
  }
  assert.throws(() => validateCopy(snapshot, [], [control], ids.owner, options), /Exactly one/);
  assert.throws(() => validateCopy(snapshot, [edit, edit], [control], ids.owner, options), /Exactly one/);
});
test('requires the actual verification edit, owner and narrow creation window', () => {
  validateCopy(snapshot, [edit], [control], ids.owner, options);
  for (const altered of [{ ...edit, content_json: {} }, { ...edit, title: 'unrelated' }, { ...edit, updated_by: ids.source },
    { ...edit, source_type: 'direct' }, { ...edit, organization_id: ids.source }]) {
    assert.throws(() => validateCopy(snapshot, [altered], [control], ids.owner, options), /verification edit/);
  }
  for (const time of ['2026-10-10T00:00:00Z', '2026-10-11T00:26:00Z', 'invalid']) {
    assert.throws(() => validateCopy({ ...snapshot, created_at: time }, [edit], [control], ids.owner, options), /verification edit/);
  }
});

// Optional locally isolated PostgreSQL proves the transaction, catalog probes and actual rollback behavior.
// The runner creates/drops a new database outside this test. Never point this at an application database.
const databaseUrl = process.env.COPY_CLEANUP_TEST_DB;
test('PostgreSQL cleanup integration', { skip: !databaseUrl }, async t => {
  const url = new URL(databaseUrl);
  if (!['127.0.0.1','localhost'].includes(url.hostname) || !/^\/o4o_cms_copy_test_[a-f0-9]+$/.test(url.pathname)) {
    throw new Error('Integration tests require an isolated local test database');
  }
  const require = createRequire(process.env.COPY_CLEANUP_TEST_PACKAGE_JSON || new URL('../../apps/api-server/package.json', import.meta.url));
  const { Client } = require('pg');
  const socket = process.env.COPY_CLEANUP_TEST_SOCKET;
  if (socket && !socket.startsWith('/workspace/.o4o-tools/pg/')) throw new Error('Unsupported local test socket');
  const client = new Client(socket
    ? { host: socket, database: url.pathname.slice(1), user: decodeURIComponent(url.username) }
    : { connectionString: databaseUrl });
  await client.connect();
  async function reset() {
    await client.query(`DROP SCHEMA IF EXISTS extra CASCADE; DROP SCHEMA public CASCADE; CREATE SCHEMA public;
      CREATE TABLE users(id uuid PRIMARY KEY,"isActive" boolean,status text);
      CREATE TABLE demo_accounts(user_id uuid,demo_type text,is_active boolean);
      CREATE TABLE organization_members(organization_id uuid,user_id uuid,role text,left_at timestamp);
      CREATE TABLE o4o_asset_snapshots(id uuid PRIMARY KEY,organization_id uuid,created_by uuid,source_service text,
        asset_type text,source_asset_id uuid,created_at timestamptz);
      CREATE TABLE kpa_store_contents(id uuid PRIMARY KEY,organization_id uuid,snapshot_id uuid,source_type text,title text,content_json jsonb,updated_by uuid);
      CREATE TABLE kpa_store_asset_controls(id uuid PRIMARY KEY,organization_id uuid,snapshot_id uuid,publish_status text,
        snapshot_type text,is_forced boolean,is_locked boolean);
      CREATE TABLE cms_contents(id uuid PRIMARY KEY,title text,content jsonb);
      CREATE TABLE canonical_demo_repair_snapshots(id bigserial PRIMARY KEY,migration text,snapshot jsonb);`);
    await client.query("INSERT INTO users VALUES ($1,true,'active'),($2,true,'active')", [ids.owner, ids.source]);
    await client.query("INSERT INTO demo_accounts VALUES ($1,'STORE_OWNER',true)", [ids.owner]);
    await client.query("INSERT INTO organization_members VALUES ($1,$2,'owner',null)", [ids.organization, ids.owner]);
    await client.query('INSERT INTO o4o_asset_snapshots SELECT * FROM jsonb_populate_record(null::o4o_asset_snapshots,$1::jsonb)', [JSON.stringify(snapshot)]);
    await client.query('INSERT INTO kpa_store_contents SELECT * FROM jsonb_populate_record(null::kpa_store_contents,$1::jsonb)', [JSON.stringify(edit)]);
    await client.query('INSERT INTO kpa_store_asset_controls SELECT * FROM jsonb_populate_record(null::kpa_store_asset_controls,$1::jsonb)', [JSON.stringify(control)]);
    await client.query("INSERT INTO cms_contents VALUES ($1,'Original CMS source','{}')", [ids.source]);
  }
  async function count(table) { return (await client.query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n; }
  async function intact() {
    for (const table of ['o4o_asset_snapshots','kpa_store_contents','kpa_store_asset_controls']) assert.equal(await count(table), 1);
    assert.equal(await count('canonical_demo_repair_snapshots'), 0);
  }
  async function scenario(name, body) { await t.test(name, async () => { await reset(); await body(); }); }
  try {
    await scenario('plan is read-only and emits no row IDs, marker or content', async () => {
      const result = await runVerificationCopyCleanup(client, options);
      assert.equal(result.eligible, true); assert.equal(result.deleted, 0); assert.match(result.digest, /^[a-f0-9]{64}$/);
      for (const value of [...Object.values(ids), marker, 'temporary', 'Original CMS source']) assert.ok(!JSON.stringify(result).includes(value));
      await intact();
    });
    await scenario('apply atomically removes only three rows and saves private recovery before-images', async () => {
      const plan = await runVerificationCopyCleanup(client, options);
      const result = await runVerificationCopyCleanup(client, { ...options, apply: true, expectedDigest: plan.digest });
      assert.equal(result.deleted, 3); assert.equal(result.sourcePreserved, true);
      for (const table of ['o4o_asset_snapshots','kpa_store_contents','kpa_store_asset_controls']) assert.equal(await count(table), 0);
      assert.equal(await count('users'), 2); assert.equal(await count('organization_members'), 1);
      assert.equal((await client.query('SELECT title FROM cms_contents')).rows[0].title, 'Original CMS source');
      const recovery = (await client.query('SELECT snapshot FROM canonical_demo_repair_snapshots')).rows[0].snapshot;
      assert.equal(recovery.before.roots.length, 3); assert.equal(recovery.before.roots[0].row.id, ids.snapshot);
    });
    for (const [kind, ddl, insert, value] of [
      ['UUID','ref uuid','($1::uuid)',ids.snapshot], ['uppercase text','ref text','($1::text)',ids.snapshot.toUpperCase()],
      ['nested JSON','ref jsonb','($1::jsonb)',JSON.stringify({ nested: { selected: ids.snapshot } })],
      ['UUID array','ref uuid[]','($1::uuid[])',[ids.edit]],
    ]) await scenario(`unknown ${kind} references block plan/apply without leaking values`, async () => {
      await client.query('CREATE SCHEMA extra; CREATE TABLE extra.links (' + ddl + ')');
      await client.query('INSERT INTO extra.links VALUES ' + insert, [value]);
      const plan = await runVerificationCopyCleanup(client, options);
      assert.equal(plan.eligible, false); assert.deepEqual(plan.blockers, [{ table: 'extra.links', count: 1 }]);
      await assert.rejects(runVerificationCopyCleanup(client, { ...options, apply: true, expectedDigest: plan.digest }), /External references/);
      await intact();
    });
    await scenario('edited before-image drift rejects the reviewed digest', async () => {
      const plan = await runVerificationCopyCleanup(client, options);
      await client.query("UPDATE kpa_store_contents SET content_json=content_json || '{\"changed\":true}'::jsonb");
      await assert.rejects(runVerificationCopyCleanup(client, { ...options, apply: true, expectedDigest: plan.digest }), /Before-images changed/);
      await intact();
    });
    await scenario('a failed root delete rolls back child deletion and recovery insert', async () => {
      await client.query(`CREATE FUNCTION stop_snapshot_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NULL; END $$;
        CREATE TRIGGER stop_delete BEFORE DELETE ON o4o_asset_snapshots FOR EACH ROW EXECUTE FUNCTION stop_snapshot_delete()`);
      const plan = await runVerificationCopyCleanup(client, options);
      await assert.rejects(runVerificationCopyCleanup(client, { ...options, apply: true, expectedDigest: plan.digest }), /Deletion row count/);
      await intact();
    });
    await scenario('a suppressed recovery insert prevents all deletion', async () => {
      await client.query(`CREATE FUNCTION stop_recovery_insert() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NULL; END $$;
        CREATE TRIGGER stop_insert BEFORE INSERT ON canonical_demo_repair_snapshots FOR EACH ROW EXECUTE FUNCTION stop_recovery_insert()`);
      const plan = await runVerificationCopyCleanup(client, options);
      await assert.rejects(runVerificationCopyCleanup(client, { ...options, apply: true, expectedDigest: plan.digest }), /Recovery record was not saved/);
      await intact();
    });
    await scenario('changed original CMS source requires a new reviewed plan', async () => {
      const plan = await runVerificationCopyCleanup(client, options);
      await client.query("UPDATE cms_contents SET title='Changed source'");
      await assert.rejects(runVerificationCopyCleanup(client, { ...options, apply: true, expectedDigest: plan.digest }), /Before-images changed/);
      await intact();
    });
    await scenario('missing recovery infrastructure stops before any deletion', async () => {
      await client.query('DROP TABLE canonical_demo_repair_snapshots');
      const plan = await runVerificationCopyCleanup(client, options);
      await assert.rejects(runVerificationCopyCleanup(client, { ...options, apply: true, expectedDigest: plan.digest }), /recovery table required/);
      assert.equal(await count('o4o_asset_snapshots'), 1); assert.equal(await count('kpa_store_contents'), 1);
    });
  } finally { await client.end(); }
});
