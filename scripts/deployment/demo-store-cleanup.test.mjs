import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateTargets,quoteIdentifier,rowKey,deletionOrder,runStoreCleanup,quoteTable,batchDeleteStatement,directOrganizationColumn,logicalEdges,removeTable,verifyLogicalCoverage} from './demo-store-cleanup.mjs';
const keep='1'.repeat(64),target='2'.repeat(64);
test('apply requires exact nonempty targets; retained store cannot be a target',()=>{
  assert.throws(()=>validateTargets(keep,[],true));assert.throws(()=>validateTargets(keep,[keep],true));
  assert.throws(()=>validateTargets(keep,[target,target],false));assert.throws(()=>validateTargets('unsafe',[target],false));
  validateTargets(keep,[target],true);
});
test('metadata identifiers never become arbitrary SQL',()=>{
  assert.equal(quoteIdentifier('createdAt'),'"createdAt"');assert.throws(()=>quoteIdentifier('users; DROP TABLE users'));
});
test('compound primary keys identify rows without exposing identifiers in summary',()=>{
  assert.equal(rowKey('members',{a:1,b:'x'},['a','b']),'members:[1,"x"]');assert.throws(()=>rowKey('unknown',{},[]));
});
test('foreign-key dependency deletion is child first, not alphabetical',()=>{
  assert.deepEqual(deletionOrder(['organizations','assets','items'],[{parent:'organizations',child:'assets'},{parent:'assets',child:'items'}]),['items','assets','organizations']);
  assert.throws(()=>deletionOrder(['a','b'],[{parent:'a',child:'b'},{parent:'b',child:'a'}]));
});
test('invalid apply request is rejected before opening a transaction',async()=>{
  let calls=0;await assert.rejects(runStoreCleanup({query:async()=>{calls++;}},{apply:true,keep}));assert.equal(calls,0);
});

test('cross-schema SQL is qualified, without arbitrary identifier interpolation',()=>{
  assert.equal(quoteTable('cosmetics.cosmetics_stores'),'"cosmetics"."cosmetics_stores"');assert.throws(()=>quoteTable('a.b.c'));
  assert.equal(quoteTable('users'),'"public"."users"');
});
test('logical ownership covers camelCase/scope and does not confuse cosmetics store IDs with organization IDs',()=>{
  assert.equal(directOrganizationColumn('signage_playlists','organizationId'),true);
  assert.equal(directOrganizationColumn('role_assignments','scope_id'),true);
  assert.equal(directOrganizationColumn('cosmetics.cosmetics_store_listings','store_id'),false);
  assert.ok(logicalEdges.some(([child,column,parent])=>child==='signage_playlist_items' && column==='playlistId' && parent==='signage_playlists'));
});
test('typed compound PK deletion batches parameter values and never casts indexed columns to text',()=>{
  const statement=batchDeleteStatement({table:'cosmetics.items',keys:['store_id','id']},[{store_id:'a',id:1},{store_id:'b',id:2}]);
  assert.equal(statement.sql,'DELETE FROM "cosmetics"."items" WHERE ("store_id","id") IN (($1,$2),($3,$4))');
  assert.deepEqual(statement.args,['a',1,'b',2]);assert.doesNotMatch(statement.sql,/::text/);
});
test('native PK deletes use bounded batches and abort unexpected affected row counts',async()=>{
  const calls=[];const table={table:'items',keys:['id'],rows:Array.from({length:205},(_,id)=>({id}))};
  await removeTable({query:async(sql,args)=>{calls.push(args.length);return {rowCount:args.length};}},table);
  assert.deepEqual(calls,[100,100,5]);await assert.rejects(removeTable({query:async()=>({rowCount:0})},table));
});
test('unknown logical references report all blocking columns and counts without row data',async()=>{
  const id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const state={rows:new Map([['organizations',new Map([['root',{id}]])]]),keys:new Map()};
  const columns=[{table_name:'content.links',column_name:'target_id',udt_name:'uuid'},{table_name:'legacy_links',column_name:'sourceId',udt_name:'text'}];
  const client={query:async()=>({rows:[{row:{id:'PRIVATE_ROW_ID',target_id:id,sourceId:id,email:'PRIVATE_EMAIL',content:'PRIVATE_CONTENT'}}]})};
  await assert.rejects(verifyLogicalCoverage(client,state,columns,[]),error=>{
    const details=JSON.parse(error.message.slice(error.message.indexOf('{')));
    assert.deepEqual(details.references,columns.map(c=>({table:c.table_name,column:c.column_name,count:1,referencedTables:['organizations']})));
    for(const value of [id,'PRIVATE_ROW_ID','PRIVATE_EMAIL','PRIVATE_CONTENT']) assert.ok(!error.message.includes(value));
    return true;
  });
});
test('selected rows and modelled FK references do not become false diagnostic blockers',async()=>{
  const id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',row={id:1,target_id:id};
  const state={rows:new Map([['organizations',new Map([['root',{id}]])],['links',new Map([[rowKey('links',row,['id']),row]])]]),keys:new Map([['links',['id']]])};
  const column={table_name:'links',column_name:'target_id',udt_name:'uuid'};
  const client={query:async()=>({rows:[{row}]})};
  await verifyLogicalCoverage(client,state,[column],[]);
  await verifyLogicalCoverage({query:async()=>{throw new Error('Known FK should not be queried');}},state,[column],[{child:'links',child_columns:['target_id']}]);
});
