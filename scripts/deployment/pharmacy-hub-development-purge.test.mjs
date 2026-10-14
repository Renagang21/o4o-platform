import test from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {PharmacyHubDevelopmentPurge} from './pharmacy-hub-development-purge.mjs';
import {jobArguments} from './pharmacy-hub-administrative-purge-job.mjs';
const fenceBody=readFileSync(new URL('../../apps/api-server/src/database/migrations/1791795139475-RetireLegacyErasureIdentityHashes.ts',import.meta.url),'utf8').match(/AS \$\$(.*?)\$\$/s)[1];
const fence={table_name:'supplier_product_offers',trigger_name:'account_erasure_write_fence',event_type:23,enabled:'O',function_schema:'public',function_name:'account_erasure_write_fence',function_body:fenceBody,expected_shape:true};
const counts={checkout_order_logs:6,o4o_payments:6,offer_service_approvals:18,offer_service_prices:1,supplier_product_offers:19,cms_contents:3,forum_category_requests:1,checkout_orders:6};
function fixture(problem) {
  const calls=[],deleted=new Set();
  return {calls,isTransactionActive:true,async query(sql) {
    calls.push(sql);
    if(sql.includes('FROM pg_class c'))return Object.keys(counts).map(table=>({schema:'public',table}));
    if(sql.includes('FROM pg_constraint'))return problem==='fk'?[{schema:'other',table:'refs',target:'checkout_orders',source_columns:['order_id'],target_columns:['id']}]:[];
    if(sql.includes('FROM pg_attribute a'))return [{schema:'public',table:'checkout_orders',column:'metadata'}];
    if(sql.includes('FROM pg_trigger'))return problem==='trigger'?[{trigger_name:'unknown'}]:[fence];
    if(sql.includes('LIKE ANY('))return [{count:problem==='value'?'1':'0'}];
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


test('only the exact approved live erasure fence is compatible; drift and disabled guards block',async()=>{
  const {readFile}=await import('node:fs/promises');
  const migration=await readFile(new URL('../../apps/api-server/src/database/migrations/1791795139475-RetireLegacyErasureIdentityHashes.ts',import.meta.url),'utf8');
  const body=migration.match(/AS \$\$(.*?)\$\$/s)[1];
  const approved={table_name:'supplier_product_offers',trigger_name:'account_erasure_write_fence',event_type:23,enabled:'O',function_schema:'public',function_name:'account_erasure_write_fence',function_body:body,expected_shape:true};
  for(const change of [null,{function_body:body+' -- changed'},{enabled:'D'},{event_type:31},{expected_shape:false},{table_name:'checkout_orders'},{function_schema:'other'}]) {
    const q=fixture(),original=q.query;
    q.query=async(sql,args)=>sql.includes('FROM pg_trigger')?[{...approved,...change}]:original(sql,args);
    if(change)await assert.rejects(new PharmacyHubDevelopmentPurge().up(q,true),/MUTATION_TRIGGER/);
    else assert.equal((await new PharmacyHubDevelopmentPurge().up(q,true)).applied,false);
    assert.ok(q.calls.every(sql=>!sql.includes('DELETE FROM')));
  }
});

test('missing previously confirmed account fence blocks cleanup',async()=>{const q=fixture(),original=q.query;q.query=async(sql,args)=>sql.includes('FROM pg_trigger')?[]:original(sql,args);await assert.rejects(new PharmacyHubDevelopmentPurge().up(q,true),/MUTATION_TRIGGER/);});
