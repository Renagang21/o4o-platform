import test from 'node:test';
import assert from 'node:assert/strict';
import { collectOperatorCensus } from './service-operator-census.mjs';

const fingerprint = 'a'.repeat(64);
const roles = ['supplier:admin','supplier:operator'];
const services = ['supplier'];
function fixture(change = {}) {
  const calls = [];
  const client = { query: async (sql,args) => {
    calls.push({sql,args});
    if (change.query) return change.query(sql,args);
    if (/SELECT count\(\*\)::int AS matched_accounts/.test(sql)) return {rows:[{matched_accounts:1,active_accounts:1,google_links:1,platform_admin_assignments:0,...change.account}]};
    if (/SELECT ra.role/.test(sql)) return {rows:[{role:'supplier:operator',target_current:1,target_inactive:0,target_future:0,target_expired:0,other_current_accounts:2,...change.role}]};
    if (/SELECT sm.service_key/.test(sql)) return {rows:[{service_key:'supplier',status:'active',count:1,...change.membership}]};
    return {rows:[]};
  } };
  return {client,calls};
}

test('census uses one read-only snapshot and parameter binding, then rolls back', async () => {
  const {client,calls} = fixture();
  const result = await collectOperatorCensus(client,fingerprint,roles,services);
  assert.equal(result.result,'CENSUS_COMPLETE');
  assert.equal(result.roles[0].other_current_accounts,2);
  assert.equal(calls[0].sql,'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  assert.equal(calls.at(-1).sql,'ROLLBACK');
  assert.ok(calls.every(({sql}) => /^(BEGIN |SET LOCAL |WITH target|ROLLBACK)/.test(sql)));
  assert.ok(calls.every(({sql}) => !sql.includes(fingerprint)));
  assert.deepEqual(calls.filter(({args}) => args).map(({args}) => args[0]),[fingerprint,fingerprint,fingerprint]);
});

test('output whitelists aggregate fields and discards private columns even if a query starts returning them', async () => {
  const extra = {email:'private@example.test',userId:'private-user-id',providerId:'private-provider-id',identityFingerprint:fingerprint};
  const report = await collectOperatorCensus(fixture({account:extra,role:extra,membership:extra}).client,fingerprint,roles,services);
  const output = JSON.stringify(report);
  for (const value of Object.values(extra)) assert.ok(!output.includes(value));
});

test('missing and ambiguous targets are reported without following another account or emitting a roster', async () => {
  for (const matched_accounts of [0,2]) {
    const {client,calls}=fixture({account:{matched_accounts}});
    const result=await collectOperatorCensus(client,fingerprint,roles,services);
    assert.equal(result.result,matched_accounts===0?'TARGET_NOT_FOUND':'TARGET_AMBIGUOUS');
    assert.equal(result.roles,undefined);
    assert.equal(calls.filter(({args})=>args).length,1);
    assert.equal(calls.at(-1).sql,'ROLLBACK');
  }
});

test('invalid input is rejected before a connection transaction, without SQL interpolation', async () => {
  for (const [identity,roleList,serviceList] of [['not-a-fingerprint',roles,services],
    [fingerprint,['supplier:operator;DELETE'],services],[fingerprint,roles,['supplier;DELETE']],
    [fingerprint,[],services],[fingerprint,roles,[]]]) {
    const {client,calls}=fixture();
    await assert.rejects(collectOperatorCensus(client,identity,roleList,serviceList),/INPUT_INVALID/);
    assert.equal(calls.length,0);
  }
});

test('query failures always roll back and never disclose original error or private row data', async () => {
  const {client,calls}=fixture({query:async sql=>{
    if(sql.startsWith('WITH target'))throw new Error('private@example.test secret-password');
    return {rows:[]};
  }});
  await assert.rejects(collectOperatorCensus(client,fingerprint,roles,services),error=>{
    assert.equal(error.message,'OPERATOR_CENSUS_QUERY_FAILED');
    assert.doesNotMatch(error.stack,/private@example|secret-password/);
    return true;
  });
  assert.equal(calls.at(-1).sql,'ROLLBACK');
});

test('rollback failure prevents a successful output', async () => {
  const base=fixture();
  const {client}=fixture({query:async(sql,args)=>{
    if(sql==='ROLLBACK')throw new Error('private failure');
    return base.client.query(sql,args);
  }});
  await assert.rejects(collectOperatorCensus(client,fingerprint,roles,services),/ROLLBACK_FAILED/);
});

test('unexpected role, membership or aggregate types fail closed', async () => {
  for(const change of [{role:{role:'platform:super_admin'}},{membership:{service_key:'unknown-private-service'}},
    {membership:{status:'private-name'}},{account:{matched_accounts:'1'}}]) {
    await assert.rejects(collectOperatorCensus(fixture(change).client,fingerprint,roles,services),/QUERY_FAILED/);
  }
});
