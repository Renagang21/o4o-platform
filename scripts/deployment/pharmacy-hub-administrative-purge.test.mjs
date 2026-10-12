import test from 'node:test';
import assert from 'node:assert/strict';
import { PharmacyHubAdministrativePurge } from './pharmacy-hub-administrative-purge.mjs';

const counts = { action_logs:33, o4o_event_logs:5, role_assignments:3, service_memberships:2,
  user_policy_acceptances:2, service_policy_documents:3, service_audience_policies:1,
  service_legal_profiles:1, roles:5, platform_services:1 };
function fixture(problem) {
  const calls=[], deleted=new Set();
  return { calls, isTransactionActive:true, async query(sql) {
    calls.push(sql);
    if(sql.includes('FROM pg_constraint')) return problem==='reference' ? [{schema:'neture',table:'refs',target:'platform_services',source_columns:['service_code'],target_columns:['code']}] : [];
    if(sql.includes('FROM pg_trigger')) return [{count:problem==='trigger'?'1':'0'}];
    if(sql.includes('NOT COALESCE')) return [{count:problem==='mixed'||problem==='reference'&&sql.includes('"neture"."refs"')?'1':'0'}];
    const table=sql.match(/FROM public\."([a-z0-9_]+)"/)?.[1];
    if(sql.startsWith('WITH removed')) { deleted.add(table);return [{count:String(counts[table])}]; }
    if(sql.startsWith('SELECT count')&&table) return [{count:String(deleted.has(table)||problem==='count'?0:counts[table])}];
    return [];
  }};
}
test('a transaction is mandatory before any query',async()=>{
  const q=fixture();q.isTransactionActive=false;
  await assert.rejects(new PharmacyHubAdministrativePurge().up(q),/TRANSACTION_REQUIRED/);
  assert.equal(q.calls.length,0);
});
for(const problem of ['count','mixed','trigger','reference'])test(`${problem} blocks all deletes`,async()=>{
  const q=fixture(problem);
  await assert.rejects(new PharmacyHubAdministrativePurge().up(q),/PH_PURGE_/);
  assert.ok(q.calls.every(sql=>!sql.includes('DELETE FROM')));
});
test('plan uses read-only-compatible locks and does not delete',async()=>{
  const q=fixture();const result=await new PharmacyHubAdministrativePurge().up(q,true);
  assert.deepEqual(result,{counts,applied:false});
  assert.ok(q.calls.every(sql=>!sql.includes('DELETE FROM')));
  assert.ok(q.calls.filter(sql=>sql.startsWith('LOCK')).every(sql=>sql.includes('ACCESS SHARE')));
});
test('apply restricts writes to PH administrative roots and verifies residuals',async()=>{
  const q=fixture();await new PharmacyHubAdministrativePurge().up(q);
  const writes=q.calls.filter(sql=>sql.includes('DELETE FROM'));
  assert.equal(writes.length,11);
  for(const sql of writes){assert.ok(sql.includes('ANY($1::text[])'));assert.doesNotMatch(sql,/\b(users|organizations|media_assets|checkout_orders|supplier_product_offers)\b/);}
  assert.doesNotMatch(q.calls.join('\n'),/\b(ALTER|DROP|TRUNCATE|CREATE)\b/);
});
