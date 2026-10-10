import test from 'node:test';
import assert from 'node:assert/strict';
import { collectRetirementInventory, collectCloudInventory, countQuery, retiredKeys } from './pharmacy-hub-retirement-inventory.mjs';

test('census is read-only, reports counts/schema, retains protected identities', async () => {
  const statements=[];
  const client={query:async(sql,args)=>{
    statements.push(sql);
    if(sql.includes('information_schema.columns')) return {rows:[
      {table_name:'ph_orders',column_name:'id',data_type:'uuid',udt_name:'uuid'},
      {table_name:'service_memberships',column_name:'service_key',data_type:'text',udt_name:'text'},
      {table_name:'users',column_name:'email',data_type:'text',udt_name:'text'},
      {table_name:'supplier_product_offers',column_name:'service_keys',data_type:'ARRAY',udt_name:'_text'},
    ]};
    if(sql.includes('pg_constraint')) {assert.deepEqual(args,[['ph_orders','service_memberships']]);return {rows:[]};}
    if(sql.includes('count(*)')) {
      if(args) assert.deepEqual(args,[retiredKeys]);
      return {rows:[{count:sql.includes('supplier_product_offers')?'0':'2'}]};
    }
    return {rows:[]};
  }};
  const result=await collectRetirementInventory(client);
  assert.equal(statements[0],'BEGIN READ ONLY');
  assert.equal(statements.at(-1),'ROLLBACK');
  assert.equal(statements.some(s=>/\b(INSERT|UPDATE|DELETE|DROP|ALTER)\b/.test(s)),false);
  assert.equal(statements.some(s=>s.includes('FROM public."users"')),false);
  assert.deepEqual(result.scopeCounts,[{table:'service_memberships',column:'service_key',count:'2'}]);
  assert.equal(result.deletionApprovedByInventory,false);
  assert.equal(result.dedicatedTables[0].count,'2');
});

test('schema identifiers reject SQL injection; array scope is exact namespace membership',()=>{
  assert.throws(()=>countQuery('users; DELETE','service_key'),/identifier/);
  assert.throws(()=>countQuery('users','role"; SELECT'),/identifier/);
  assert.match(countQuery('supplier_product_offers','service_keys',true),/unnest/);
  assert.match(countQuery('roles','name'),/left\("name"::text,13\)/);
});

test('failed census rolls back and suppresses private SQL error text',async()=>{
  const statements=[];
  const client={query:async(sql)=>{statements.push(sql);if(sql.includes('information_schema')) throw Object.assign(new Error('private user and credential'),{code:'42501'});return {rows:[]};}};
  await assert.rejects(collectRetirementInventory(client),error=>error.message.includes('42501')&&!error.message.includes('private user'));
  assert.equal(statements.at(-1),'ROLLBACK');
});

test('cloud census calls read operations only and excludes Run credentials',()=>{
  const calls=[];
  const result=collectCloudInventory((cmd,args)=>{
    calls.push(args);
    if(args[0]==='run')return JSON.stringify({metadata:{name:'pharmacy-hub-web'},spec:{secret:'private credential'}});
    if(args[1]==='url-maps')return JSON.stringify([{name:'map',hostRules:[],pathMatchers:[],secret:'private credential'}]);
    return '[]';
  });
  assert.equal(calls.length,4);
  assert.equal(calls.every(a=>a.includes('list')||a.includes('describe')),true);
  assert.equal(JSON.stringify(result).includes('private credential'),false);
  assert.deepEqual(result.resources.runService,{name:'pharmacy-hub-web',present:true});
});

test('permission failures contain only safe permission names',()=>{
  const result=collectCloudInventory(()=>{throw {stderr:'PERMISSION_DENIED compute.backendServices.list private password',output:'private password'};});
  assert.equal(result.blockers.length,4);
  assert.equal(JSON.stringify(result).includes('private password'),false);
  assert.deepEqual(result.blockers[0].permissions,['compute.backendServices.list']);
});
