import test from 'node:test';
import assert from 'node:assert/strict';
import {collectRetirementReferences} from './pharmacy-hub-retirement-references.mjs';
test('missing schemas remain explicit blockers, never zero evidence',async()=>{
  const result=await collectRetirementReferences({query:()=>{throw new Error('unexpected SQL');}},[]);
  assert.equal(result.complete,false);assert.equal(result.blockers.length,10);
  assert.deepEqual(result.counts,{});assert.equal(result.deletionApproved,false);
});
test('order logs use PH order ownership and parameter bindings without outputting rows',async()=>{
  const columns=[['checkout_order_logs','orderId'],['checkout_orders','id'],['checkout_orders','metadata']].map(([table_name,column_name])=>({table_name,column_name}));
  const result=await collectRetirementReferences({query:async(sql,args)=>{
    assert.match(sql,/JOIN checkout_orders o ON l\."orderId"=o\.id/);
    assert.match(sql,/metadata->>'serviceKey'/);assert.match(sql,/metadata->>'sourceService'/);
    assert.deepEqual(args[0],['pharmacy-hub','pharmacy_hub','pharmacy_hub_cart','pharmacy-hub-event-offer']);
    return {rows:[{count:'7',privateRow:'must not emit'}]};
  }},columns);
  assert.equal(result.counts.orderLogs,'7');assert.equal(JSON.stringify(result).includes('privateRow'),false);
});
test('invalid count shape fails rather than claiming success',async()=>{
  const columns=[['checkout_order_logs','orderId'],['checkout_orders','id'],['checkout_orders','metadata']].map(([table_name,column_name])=>({table_name,column_name}));
  await assert.rejects(collectRetirementReferences({query:async()=>({rows:[{count:0}]})},columns),{code:'REFERENCE_COUNT'});
});
test('PH content links are counted even when assets have foreign or null service scope',async()=>{
  const columns=[['media_entity_links','entity_type'],['media_entity_links','entity_id'],['cms_contents','id'],['cms_contents','serviceKey']].map(([table_name,column_name])=>({table_name,column_name}));
  const result=await collectRetirementReferences({query:async sql=>{
    assert.match(sql,/JOIN cms_contents c/);assert.match(sql,/c\."serviceKey"/);assert.doesNotMatch(sql,/a\.service_key/);
    return {rows:[{count:'2'}]};
  }},columns);
  assert.equal(result.counts.phContentMediaLinks,'2');
});
