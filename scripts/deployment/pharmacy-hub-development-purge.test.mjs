import test from 'node:test';
import assert from 'node:assert/strict';
import {PharmacyHubDevelopmentPurge} from './pharmacy-hub-development-purge.mjs';
import {jobArguments} from './pharmacy-hub-administrative-purge-job.mjs';
const counts={checkout_order_logs:6,o4o_payments:6,offer_service_approvals:18,offer_service_prices:1,supplier_product_offers:19,cms_contents:3,forum_category_requests:1,checkout_orders:6};
function fixture(problem) {
  const calls=[],deleted=new Set();
  return {calls,isTransactionActive:true,async query(sql) {
    calls.push(sql);
    if(sql.includes('FROM pg_class c'))return Object.keys(counts).map(table=>({schema:'public',table}));
    if(sql.includes('FROM pg_constraint'))return problem==='fk'?[{schema:'other',table:'refs',target:'checkout_orders',source_columns:['order_id'],target_columns:['id']}]:[];
    if(sql.includes('FROM pg_attribute a'))return [{schema:'public',table:'checkout_orders',column:'metadata'}];
    if(sql.includes('FROM pg_trigger'))return [{count:problem==='trigger'?'1':'0'}];
    if(sql.includes('strpos('))return [{count:problem==='value'?'1':'0'}];
    if(sql.includes('FROM "other"."refs"'))return [{count:problem==='fk'?'1':'0'}];
    if(sql.includes('FROM public.o4o_payments p'))return [{count:problem==='payment'?'1':'0'}];
    if(sql.includes('FROM public.supplier_product_offers x')&&sql.includes('x.is_active'))return [{count:problem==='widening'?'1':'0'}];
    if(sql.startsWith('SELECT count')&&sql.includes('FROM public.supplier_product_offers x'))return [{count:'18'}];
    if(sql.includes('NOT COALESCE')||sql.includes('AND EXISTS (SELECT 1 FROM unnest'))return [{count:problem==='mixed'?'1':'0'}];
    const table=sql.match(/FROM public\."([a-z0-9_]+)"/)?.[1];
    if(sql.startsWith('WITH changed')){deleted.add('supplier_product_offers');return [{count:'19'}];}
    if(sql.startsWith('WITH removed')) {deleted.add(table);return [{count:String(problem==='deleteCount'?0:counts[table])}];}
    if(sql.startsWith('SELECT count')&&table)return [{count:String(problem==='count'?0:deleted.has(table)?0:counts[table])}];
    return [];
  }};
}
test('transaction is required before querying',async()=>{
  const q=fixture();q.isTransactionActive=false;
  await assert.rejects(new PharmacyHubDevelopmentPurge().up(q),/TRANSACTION_REQUIRED/);assert.equal(q.calls.length,0);
});
for(const problem of ['trigger','count','mixed','fk','value','payment','widening'])test(`${problem} stops before any deletion`,async()=>{
  const q=fixture(problem);await assert.rejects(new PharmacyHubDevelopmentPurge().up(q),/PH_DEV_/);
  assert.ok(q.calls.every(s=>!s.includes('DELETE FROM')));
});
test('plan and apply preserve media/identity/schema and verify every delete',async()=>{
  const plan=fixture();assert.deepEqual(await new PharmacyHubDevelopmentPurge().up(plan,true),{counts,applied:false,offerRowsPreserved:19,offerAssociations:19,exclusiveOffersRetired:18,rowsToDelete:41,mediaAndGcsPreserved:true});
  assert.ok(plan.calls.every(s=>!s.includes('DELETE FROM')));
  const q=fixture();assert.equal((await new PharmacyHubDevelopmentPurge().up(q)).applied,true);
  const writes=q.calls.filter(s=>s.includes('DELETE FROM'));assert.equal(writes.length,7);
  assert.doesNotMatch(writes.join('\n'),/supplier_product_offers|media_assets|\busers\b|organizations|\bALTER\b|\bDROP\b|\bTRUNCATE\b/);
  assert.match(q.calls.join('\n'),/checkoutOrderIds/);assert.match(q.calls.join('\n'),/paymentGroupId/);
});
test('delete count drift throws within caller transaction',async()=>{
  await assert.rejects(new PharmacyHubDevelopmentPurge().up(fixture('deleteCount')),/DELETE_COUNT/);
});
test('development job uses its reviewed source, class, bounded execution and no retries',()=>{
  const job=jobArguments({image:'asia-northeast3-docker.pkg.dev/netureyoutube/o4o-api/api-server@sha256:'+'a'.repeat(64),source:'// reviewed',mode:'plan',runId:'12',attempt:'1',username:'test',database:'test',purge:'development'});
  assert.equal(job.name,'ph-dev-12-1');assert.ok(job.args.includes('--task-timeout=600'));assert.ok(job.args.includes('--max-retries=0'));
  const boot=job.args.find(a=>a.startsWith('--args='));
  const decoded=Buffer.from(boot.match(/base64,([^']+)/)[1],'base64').toString();
  assert.match(decoded,/PharmacyHubDevelopmentPurge/);assert.match(decoded,/REPEATABLE READ READ ONLY/);
  assert.match(decoded,/ROLLBACK/);assert.doesNotMatch(decoded,/console\.error\(error\)/);
});
