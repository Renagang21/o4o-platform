import test from 'node:test';
import assert from 'node:assert/strict';
import { collectRetirementInventory, collectCloudInventory, countQuery, jsonScopeQuery, retiredKeys } from './pharmacy-hub-retirement-inventory.mjs';

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
    if(args.includes('describe'))return JSON.stringify({name:'map',pathMatchers:[]});
    if(args[1]==='url-maps')return JSON.stringify([{name:'map',hostRules:[],pathMatchers:[],secret:'private credential'}]);
    return '[]';
  });
  assert.equal(calls.length,6);
  assert.equal(calls.every(a=>a.includes('list')||a.includes('describe')),true);
  assert.equal(JSON.stringify(result).includes('private credential'),false);
  assert.deepEqual(result.resources.runService,{name:'pharmacy-hub-web',present:true});
});

test('permission failures contain only safe permission names',()=>{
  const result=collectCloudInventory(()=>{throw {stderr:'PERMISSION_DENIED compute.backendServices.list private password',output:'private password'};});
  assert.equal(result.blockers.length,6);
  assert.equal(JSON.stringify(result).includes('private password'),false);
  assert.deepEqual(result.blockers[0].permissions,['compute.backendServices.list']);
});


test('checkout metadata scopes are counted and included in FK review',async()=>{
  const client={query:async(sql,args)=>{
    if(sql.includes('information_schema.columns'))return {rows:[{table_name:'checkout_orders',column_name:'metadata',data_type:'jsonb',udt_name:'jsonb'}]};
    if(sql.includes('count(*)')) {assert.match(sql,/metadata"->>'serviceKey'/);assert.match(sql,/metadata"->>'source'/);assert.deepEqual(args,[retiredKeys]);return {rows:[{count:'3'}]};}
    if(sql.includes('pg_constraint')){assert.deepEqual(args,[['checkout_orders']]);return {rows:[]};}
    return {rows:[]};
  }};
  const result=await collectRetirementInventory(client);
  assert.equal(result.scopeCounts[0].table,'checkout_orders');
  assert.equal(result.scopeCounts[0].count,'3');
  assert.throws(()=>jsonScopeQuery('checkout_orders','metadata; DROP'),/identifier/);
});

test('HTTP/DNS census uses synthetic paths and reports no addresses or Location contents',async()=>{
  const {collectHttpInventory}=await import('./pharmacy-hub-retirement-inventory.mjs');
  const result=await collectHttpInventory(async()=>new Response(null,{status:301,headers:{location:'https://private.example/secret-path?secret=value'}}),async()=>['test-address']);
  assert.equal(result.checks.length,12);
  assert.equal(result.dns.every(d=>d.matchesApiAddress),true);
  assert.equal(JSON.stringify(result).includes('test-address'),false);
  assert.equal(JSON.stringify(result).includes('secret-path'),false);
  assert.equal(result.checks[0].status,301);
  assert.equal(result.checks[0].hostMatch,false);
});


test('quoted camelCase scopes are counted, safely quoted and included in FK review',async()=>{
  const client={query:async(sql,args)=>{
    if(sql.includes('information_schema.columns'))return {rows:[{table_name:'cms_contents',column_name:'serviceKey',data_type:'character varying',udt_name:'varchar'}]};
    if(sql.includes('count(*)')){assert.match(sql,/"serviceKey"::text/);assert.deepEqual(args,[retiredKeys]);return {rows:[{count:'4'}]};}
    if(sql.includes('pg_constraint')){assert.deepEqual(args,[['cms_contents']]);return {rows:[]};}
    return {rows:[]};
  }};
  const result=await collectRetirementInventory(client);
  assert.deepEqual(result.scopeCounts,[{table:'cms_contents',column:'serviceKey',count:'4'}]);
});

test('rollback failures remain sanitized and do not replace an earlier query failure',async()=>{
  await assert.rejects(collectRetirementInventory({query:async(sql)=>{
    if(sql==='ROLLBACK')throw Object.assign(new Error('private rollback'),{code:'ECONNRESET'});
    if(sql.includes('information_schema'))throw Object.assign(new Error('private query'),{code:'42501'});
    return {rows:[]};
  }}),error=>error.message.includes('42501')&&!error.message.includes('private'));
  await assert.rejects(collectRetirementInventory({query:async(sql)=>{
    if(sql==='ROLLBACK')throw Object.assign(new Error('private rollback'),{code:'ECONNRESET'});
    return {rows:[]};
  }}),error=>error.message.includes('ECONNRESET')&&!error.message.includes('private'));
});


test('Event Offer is an exact retired namespace and malformed Location retains HTTP evidence',async()=>{
  assert.equal(retiredKeys.includes('pharmacy-hub-event-offer'),true);
  const {collectHttpInventory}=await import('./pharmacy-hub-retirement-inventory.mjs');
  const result=await collectHttpInventory(async()=>new Response(null,{status:302,headers:{location:'https://[invalid-private'}}),async()=>[]);
  assert.equal(result.checks[0].status,302);
  assert.equal(result.checks[0].locationPresent,true);
  assert.equal(result.checks[0].hostMatch,false);
  assert.equal(result.checks[0].error,undefined);
  assert.equal(JSON.stringify(result).includes('invalid-private'),false);
});


test('service namespace discovery includes handoff source/target and seller service IDs',async()=>{
  const columns=[
    {table_name:'handoff_tokens',column_name:'source_service_key',data_type:'text',udt_name:'text'},
    {table_name:'handoff_tokens',column_name:'target_service_key',data_type:'text',udt_name:'text'},
    {table_name:'seller_recruitments',column_name:'service_id',data_type:'character varying',udt_name:'varchar'},
  ];
  const client={query:async(sql,args)=>{
    if(sql.includes('information_schema.columns'))return {rows:columns};
    if(sql.includes('count(*)')){assert.deepEqual(args,[retiredKeys]);return {rows:[{count:'1'}]};}
    if(sql.includes('pg_constraint')){assert.deepEqual(args,[['handoff_tokens','seller_recruitments']]);return {rows:[]};}
    return {rows:[]};
  }};
  const result=await collectRetirementInventory(client);
  assert.deepEqual(result.scopeCounts.map(c=>c.column),columns.map(c=>c.column_name));
});


test('database failure still reports independent read-only cloud and HTTP evidence and stays failed', async () => {
  const { collectCensus } = await import('./pharmacy-hub-retirement-inventory.mjs');
  const result = await collectCensus(
    async () => collectRetirementInventory({ query: async sql => {
      if (sql.includes('information_schema')) throw Object.assign(new Error('private SQL row and secret'), { code: '42501' });
      return { rows: [] };
    } }),
    () => ({ readOnly: true, blockers: [{ permissions: ['compute.urlMaps.list'] }] }),
    async () => ({ readOnly: true, checks: [{ status: 301 }] }),
  );
  assert.equal(result.failed, true);
  assert.equal(result.database.complete, false);
  assert.match(result.database.error, /code=42501/);
  assert.equal(result.cloud.blockers.length, 1);
  assert.equal(result.http.checks[0].status, 301);
  assert.doesNotMatch(JSON.stringify(result), /private SQL|secret/);
});


test('successful gcloud exit with a permission warning cannot prove no resources', () => {
  const result = collectCloudInventory(() => ({ status: 0, stdout: '[]', stderr: "WARNING: Some requests did not succeed. Required 'compute.urlMaps.list' permission private details" }));
  assert.equal(result.blockers.length, 6);
  assert.equal(Object.keys(result.resources).length, 0);
  assert.deepEqual(result.blockers[0].permissions, ['compute.urlMaps.list']);
  assert.doesNotMatch(JSON.stringify(result), /private details/);
});

test('scope query failure identifies only validated schema and SQLSTATE', async () => {
  const client = { query: async sql => {
    if (sql.includes('information_schema')) return { rows: [{ table_name: 'service_catalog', column_name: 'service_key', data_type: 'text', udt_name: 'text' }] };
    if (sql.includes('count(*)')) throw Object.assign(new Error('private SQL row'), { code: '22P02' });
    return { rows: [] };
  } };
  await assert.rejects(collectRetirementInventory(client), error => /retirement-scope:service_catalog.service_key; code=22P02/.test(error.message) && !error.stack.includes('private'));
});
