/** Opt-in isolated query/planner regression; no shared DB or real GCS access. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {performance} from 'node:perf_hooks';
import {developmentReferenceQuery} from './pharmacy-hub-development-purge.mjs';
import {mediaReferenceQuery} from './pharmacy-hub-media-purge.mjs';
const uuid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const keys=['pharmacy-hub','pharmacy_hub','pharmacy_hub_cart','pharmacy-hub-event-offer'];
const walk=node=>[node,...(node.Plans??[]).flatMap(walk)];

test('UUID reference queries preserve exact/legacy matches and use indexes without scanning the fallback',
  {skip:!process.env.PH_UUID_FIXTURE_URL,timeout:180000},async()=>{
    const url=new URL(process.env.PH_UUID_FIXTURE_URL);
    if(url.hostname!=='127.0.0.1'||url.pathname!=='/ph_uuid_scan_fixture')throw new Error('Isolated UUID fixture database required');
    const {Client}=createRequire(new URL('../../apps/api-server/package.json',import.meta.url))('pg');
    const client=new Client({connectionString:url.toString(),connectionTimeoutMillis:3000});
    await client.connect();
    try {
      await client.query(`CREATE TABLE checkout_orders(id text,metadata jsonb);
        CREATE TABLE checkout_order_logs(id text,"orderId" text);
        CREATE TABLE o4o_payments(id text,"sourceService" text);
        CREATE TABLE offer_service_approvals(id text,service_key text);
        CREATE TABLE offer_service_prices(id text,service_key text);
        CREATE TABLE cms_contents(id text,"serviceKey" text);
        CREATE TABLE forum_category_requests(id text,service_code text);
        CREATE TABLE media_assets(id text,service_key text,url text,gcs_path text);
        CREATE TABLE media_entity_links(id text,media_asset_id text,entity_type text,purpose text,entity_id text);
        CREATE TABLE automation_jobs(id text)`);
      await client.query('INSERT INTO checkout_orders VALUES($1,$2)',[uuid(1),{serviceKey:keys[0]}]);
      await client.query('INSERT INTO checkout_order_logs VALUES($1,$2)',[uuid(2),uuid(1)]);
      await client.query('INSERT INTO o4o_payments VALUES($1,$2)',[uuid(3),keys[0]]);
      for(const [table,column,n] of [['offer_service_approvals','service_key',4],['offer_service_prices','service_key',5],['cms_contents','"serviceKey"',6],['forum_category_requests','service_code',7]])
        await client.query(`INSERT INTO ${table}(id,${column}) VALUES($1,$2)`,[uuid(n),keys[0]]);
      await client.query('INSERT INTO media_assets VALUES($1,$2,$3,$4)',[uuid(8),keys[0],'https://storage.googleapis.com/o4o-media-library/media/fixture.png','media/fixture.png']);
      await client.query('INSERT INTO media_entity_links VALUES($1,$2,$3,$4,NULL)',[uuid(9),uuid(8),'service','INPUT']);
      const rows=process.env.PH_PURGE_UUID_STRESS_FIXTURE==='1'?1000000:5000;
      // Loading/index creation are fixture setup, outside the production query timeout.
      for(const table of ['product_landings','product_identifiers']) {
        await client.query(`CREATE TABLE ${table}(product_master_id uuid);
          INSERT INTO ${table} SELECT md5(n::text)::uuid FROM generate_series(1,${rows}) n;
          INSERT INTO ${table} VALUES(NULL);
          CREATE INDEX ON ${table}(product_master_id); ANALYZE ${table}`);
      }
      await client.query("SET statement_timeout='15s'");
      for(const [kind,build,table,target,legacyTable] of [
        ['development',developmentReferenceQuery,'product_landings',1,'offer_service_prices'],
        ['media',mediaReferenceQuery,'product_identifiers',8,'media_entity_links'],
      ]) {
        const column={schema:'public',table,column:'product_master_id'};
        const sql=build({...column,type:'uuid'});
        const count=async query=>Number((await client.query(query,[keys])).rows[0].count);
        const started=performance.now();
        assert.equal(await count(sql),0);
        const indexedMs=performance.now()-started;
        const plan=(await client.query('EXPLAIN (ANALYZE,FORMAT JSON) '+sql,[keys])).rows[0]['QUERY PLAN'][0].Plan;
        const accesses=walk(plan).filter(n=>n['Relation Name']===table);
        const producers=walk(plan).filter(n=>n['Subplan Name']==='CTE target_values');
        assert.equal(producers.length,1);assert.equal(producers[0]['Actual Loops'],1);
        console.log(JSON.stringify({kind,accesses:accesses.map(n=>({type:n['Node Type'],loops:n['Actual Loops'],index:n['Index Name']}))}));
        assert.ok(accesses.some(n=>n['Actual Loops']>0&&walk(n).some(child=>/Index/.test(child['Node Type'])&&child['Actual Loops']>0)));
        assert.ok(accesses.every(n=>n['Node Type']!=='Seq Scan'||n['Actual Loops']===0));
        let legacyStatus='passed';
        const before=performance.now();
        try {assert.equal(await count(build(column)),0);} catch(error) {if(error.code!=='57014')throw error;legacyStatus='57014';}
        console.log(JSON.stringify({kind,rows,indexedMs,legacyMs:performance.now()-before,legacyStatus}));
        // Exact UUID references still block; NULL and unrelated masters stay safe.
        await client.query(`INSERT INTO ${table} VALUES($1)`,[uuid(target)]);
        assert.equal(await count(sql),1);
        assert.equal(await count(build(column)),1);
        await client.query(`DELETE FROM ${table} WHERE product_master_id=$1`,[uuid(target)]);
        // Legacy text IDs may be proper substrings of UUID text; retain that guard.
        const originalId=uuid(kind==='development'?5:9),partial=uuid(999).slice(1);
        await client.query(`UPDATE ${legacyTable} SET id=$1 WHERE id=$2`,[partial,originalId]);
        await client.query(`INSERT INTO ${table} VALUES($1)`,[uuid(999)]);
        assert.equal(await count(sql),1);
        assert.equal(await count(build(column)),1);
        await client.query(`DELETE FROM ${table} WHERE product_master_id=$1`,[uuid(999)]);
        await client.query(`UPDATE ${legacyTable} SET id=$1 WHERE id=$2`,[originalId,partial]);
        assert.equal(await count(sql),0);
      }
    } finally {
      try {await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');}
      finally {await client.end();}
    }
  });
