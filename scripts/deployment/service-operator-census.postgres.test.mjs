import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { collectOperatorCensus } from './service-operator-census.mjs';

// Explicit synthetic local fixture only. This test never uses production DB bindings.
const socket = process.env.OPERATOR_TEST_PG_SOCKET;
const options = { skip: !socket };
async function fixture(run) {
  const local = resolve(socket);
  assert.ok(local.startsWith('/workspace/') || local.startsWith('/tmp/'));
  const {Client} = createRequire(new URL('../../apps/api-server/package.json',import.meta.url))('pg');
  const db = new Client({host:local,port:55453,user:'operator_fixture',database:'postgres'});
  await db.connect();
  try {
    await db.query(`CREATE TEMP TABLE users(id uuid,email text,status text,"isActive" boolean);
      CREATE TEMP TABLE role_assignments(user_id uuid,role text,is_active boolean,valid_from timestamp,valid_until timestamp);
      CREATE TEMP TABLE linked_accounts("userId" uuid,provider text,"providerId" text);
      CREATE TEMP TABLE service_memberships(user_id uuid,service_key text,status text);`);
    const target='11111111-2222-4333-8444-555555555555';
    const other='22222222-2222-4333-8444-555555555555';
    await db.query(`INSERT INTO users VALUES ($1,'operator@example.test','active',true),($2,'other@example.test','active',true);
    `,[target,other]);
    await db.query(`INSERT INTO role_assignments VALUES
      ($1,'supplier:operator',true,NOW()-interval '1 day',null),
      ($1,'funding:operator',true,NOW()-interval '2 days',NOW()-interval '1 day'),
      ($1,'community:operator',true,NOW()+interval '1 day',null),
      ($1,'neture:admin',false,NOW()-interval '1 day',null),
      ($1,'lecture:operator',true,NOW()-interval '1 day',NOW()+interval '1 day'),
      ($1,'neture:operator',true,NULL,NULL),
      ($2,'platform:super_admin',true,NULL,NULL),
      ($2,'supplier:operator',true,NOW()-interval '1 day',null)`,[target,other]);
    await db.query(`INSERT INTO linked_accounts VALUES ($1,'google','synthetic-provider-id')`,[target]);
    await db.query(`INSERT INTO service_memberships VALUES ($1,'supplier','active'),($1,'funding','suspended')`,[target]);
    await run(db,target);
  } finally { await db.end(); }
}

test('actual PostgreSQL census separates the target, other current operators, expiry, future, revoked and membership state',options,async()=>{
  await fixture(async db=>{
    const digest=createHash('sha256').update('operator@example.test').digest('hex');
    const report=await collectOperatorCensus(db,digest,['supplier:operator','funding:operator','community:operator','neture:admin','neture:operator','lecture:operator'],['supplier','funding']);
    assert.deepEqual(report.account,{matched_accounts:1,active_accounts:1,google_links:1,platform_admin_assignments:0});
    const byRole=Object.fromEntries(report.roles.map(row=>[row.role,row]));
    assert.equal(byRole['supplier:operator'].target_current,1);
    assert.equal(byRole['supplier:operator'].other_current_accounts,1);
    assert.equal(byRole['lecture:operator'].target_current,1);
    assert.equal(byRole['neture:operator'].target_current,1);
    assert.equal(byRole['funding:operator'].target_current,0);
    assert.equal(byRole['funding:operator'].target_expired,1);
    assert.equal(byRole['community:operator'].target_current,0);
    assert.equal(byRole['community:operator'].target_future,1);
    assert.equal(byRole['neture:admin'].target_inactive,1);
    assert.deepEqual(report.memberships,[{service_key:'funding',status:'suspended',count:1},{service_key:'supplier',status:'active',count:1}]);
    assert.doesNotMatch(JSON.stringify(report),/example\.test|synthetic-provider-id|11111111|22222222/);
    const before=await db.query('SELECT * FROM role_assignments ORDER BY user_id,role');
    await collectOperatorCensus(db,digest,['supplier:operator'],['supplier']);
    const after=await db.query('SELECT * FROM role_assignments ORDER BY user_id,role');
    assert.deepEqual(after.rows,before.rows);
    const otherDigest=createHash('sha256').update('other@example.test').digest('hex');
    const other=await collectOperatorCensus(db,otherDigest,['supplier:operator'],['supplier']);
    assert.equal(other.account.platform_admin_assignments,1);
  });
});

test('actual Controller role batch and role filter reject expired/future assignments and preserve inclusive time boundaries',options,async()=>{
  const source=readFileSync(new URL('../../apps/api-server/src/controllers/admin/AdminUserController.ts',import.meta.url),'utf8');
  const batch=source.match(/`(SELECT user_id, ARRAY_AGG\(role ORDER BY role\) as roles[\s\S]*?GROUP BY user_id)`/)[1];
  const filter=source.match(/`(EXISTS \(SELECT 1 FROM role_assignments ra[^`]+filterRole\))`/)[1].replace(':filterRole','$1').replace('user.id','"user".id');
  await fixture(async(db,target)=>{
    await db.query('BEGIN READ ONLY');
    assert.deepEqual((await db.query(batch,[[target]])).rows[0].roles,['lecture:operator','neture:operator','supplier:operator']);
    for(const role of ['funding:operator','community:operator','neture:admin']) {
      assert.equal((await db.query(`SELECT "user".id FROM users "user" WHERE ${filter}`,[role])).rows.length,0);
    }
    assert.equal((await db.query(`SELECT "user".id FROM users "user" WHERE ${filter}`,['supplier:operator'])).rows.length,2);
    assert.equal((await db.query(`SELECT "user".id FROM users "user" WHERE ${filter}`,['neture:operator'])).rows.length,1);
    await db.query('ROLLBACK');
    await db.query('BEGIN');
    await db.query(`INSERT INTO role_assignments VALUES ($1,'kpa:admin',true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,[target]);
    assert.ok((await db.query(batch,[[target]])).rows[0].roles.includes('kpa:admin'));
    assert.equal((await db.query(`SELECT "user".id FROM users "user" WHERE ${filter}`,['kpa:admin'])).rows.length,1);
    await db.query('ROLLBACK');
  });
});
