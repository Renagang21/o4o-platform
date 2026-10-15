/** Opt-in isolated full keyset scan; never uses shared DB or GCS. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {loadPurgeSource} from './pharmacy-hub-administrative-purge-job.mjs';
const {countDevelopmentReferences,developmentReferenceQuery}=await import(`data:text/javascript;base64,${Buffer.from(await loadPurgeSource('development')).toString('base64')}`);
const {countMediaReferences,mediaReferenceQuery}=await import(`data:text/javascript;base64,${Buffer.from(await loadPurgeSource('media')).toString('base64')}`);
const uuid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const keys=['pharmacy-hub','pharmacy_hub','pharmacy_hub_cart','pharmacy-hub-event-offer'];
const walk=n=>[n,...(n.Plans??[]).flatMap(walk)];
test('PostgreSQL keyset covers every row, uses PK range index, and detects final/NULL/array/literal references',
 {skip:!process.env.PH_BATCH_FIXTURE_URL,timeout:300000},async()=>{
  const url=new URL(process.env.PH_BATCH_FIXTURE_URL);
  if(url.hostname!=='127.0.0.1'||url.pathname!=='/ph_reference_batch_fixture')throw new Error('Isolated batch fixture required');
  const {Client}=createRequire(new URL('../../apps/api-server/package.json',import.meta.url))('pg');
  const c=new Client({connectionString:url.toString()});await c.connect();
  try {
   await c.query(`CREATE TABLE checkout_orders(id uuid PRIMARY KEY,metadata jsonb);
    CREATE TABLE checkout_order_logs(id uuid PRIMARY KEY,"orderId" uuid);
    CREATE TABLE o4o_payments(id uuid PRIMARY KEY,"sourceService" text);
    CREATE TABLE offer_service_approvals(id uuid PRIMARY KEY,service_key text);
    CREATE TABLE offer_service_prices(id text PRIMARY KEY,service_key text);
    CREATE TABLE cms_contents(id uuid PRIMARY KEY,"serviceKey" text);
    CREATE TABLE forum_category_requests(id uuid PRIMARY KEY,service_code text);
    CREATE TABLE media_assets(id uuid PRIMARY KEY,service_key text,url text,gcs_path text);
    CREATE TABLE media_entity_links(id uuid PRIMARY KEY,media_asset_id uuid,entity_type text,purpose text,entity_id text);
    CREATE TABLE automation_jobs(id uuid PRIMARY KEY)`);
   for(let n=1;n<=6;n++) {
    await c.query('INSERT INTO checkout_orders VALUES($1,$2)',[uuid(n),{serviceKey:keys[0]}]);
    await c.query('INSERT INTO checkout_order_logs VALUES($1,$2)',[uuid(6+n),uuid(n)]);
    await c.query('INSERT INTO o4o_payments VALUES($1,$2)',[uuid(12+n),keys[0]]);
   }
   for(let n=19;n<=36;n++)await c.query('INSERT INTO offer_service_approvals VALUES($1,$2)',[uuid(n),keys[0]]);
   await c.query('INSERT INTO offer_service_prices VALUES($1,$2)',[uuid(37),keys[0]]);
   for(let n=38;n<=40;n++)await c.query('INSERT INTO cms_contents VALUES($1,$2)',[uuid(n),keys[0]]);
   await c.query('INSERT INTO forum_category_requests VALUES($1,$2)',[uuid(41),keys[0]]);
   for(let n=50;n<54;n++)await c.query('INSERT INTO media_assets VALUES($1,$2,$3,$4)',[uuid(n),keys[0],`https://storage.googleapis.com/o4o-media-library/media/${n}.png`,`media/${n}.png`]);
   await c.query("INSERT INTO media_entity_links VALUES($1,$2,'service','INPUT',NULL)",[uuid(54),uuid(50)]);
   const rows=process.env.PH_BATCH_STRESS_FIXTURE==='1'?2000000:3200;
   await c.query(`CREATE TABLE source_refs(id uuid PRIMARY KEY,source_label text,metadata jsonb,paths text[]);
    INSERT INTO source_refs SELECT md5(n::text)::uuid,'legacy-import-source-'||n,
      jsonb_build_object('productMasterId',md5(n::text)::uuid,'source','legacy-import'),ARRAY['unrelated']
      FROM generate_series(1,${rows}) n; ANALYZE source_refs`);
   await c.query("SET statement_timeout='15s'");
   for(const [kind,count,build,column,target] of [
    ['development',countDevelopmentReferences,developmentReferenceQuery,'metadata',uuid(1)],
    ['media',countMediaReferences,mediaReferenceQuery,'source_label',uuid(50)],
   ]) {
    const descriptor={schema:'public',table:'source_refs',column,type:column==='metadata'?'jsonb':'text',scan_key:'id'};
    let scanned=0,calls=0;
    const q={async query(sql,args){const result=await c.query(sql,args);scanned+=Number(result.rows[0].scanned);calls++;return result.rows;}};
    const start=Date.now();assert.equal(await count(q,descriptor),0);
    assert.equal(scanned,rows);assert.equal(calls,Math.floor(rows/1024)+1);
    console.log(JSON.stringify({kind,rows,batchMs:Date.now()-start,calls,scanned}));
    const plan=(await c.query('EXPLAIN (ANALYZE,FORMAT JSON) '+build(descriptor),[keys,uuid(0)])).rows[0]['QUERY PLAN'][0].Plan;
    assert.ok(walk(plan).some(n=>/Index/.test(n['Node Type'])&&n['Index Cond']?.includes('id >')&&n['Actual Loops']>0));
    // No maximum UUID or late-page row can be skipped. Include NULL payloads too.
    const last='ffffffff-ffff-ffff-ffff-ffffffffffff';
    await c.query('INSERT INTO source_refs VALUES($1,NULL,NULL,NULL)',[last]);
    assert.equal(await count({query:async(s,a)=>(await c.query(s,a)).rows},descriptor),0);
    await c.query(`UPDATE source_refs SET ${column}=$1 WHERE id=$2`,[column==='metadata'?{nested:{reference:target}}:'prefix '+target+' suffix',last]);
    assert.equal(await count({query:async(s,a)=>(await c.query(s,a)).rows},descriptor),1);
    await c.query('DELETE FROM source_refs WHERE id=$1',[last]);
   }
   // Literal metacharacters and arrays retain the exact PostgreSQL ::text semantics.
   await c.query('ALTER TABLE source_refs RENAME COLUMN id TO reference_key');
   const literal='legacy_[x].+(y){z}^$|?*%\\token';
   await c.query('UPDATE offer_service_prices SET id=$1',[literal]);
   await c.query('INSERT INTO source_refs VALUES($1,$2,NULL,$3)',['00000000-0000-0000-0000-000000000000','prefix '+literal+' suffix',['prefix '+uuid(1)+' suffix']]);
   assert.equal(await countDevelopmentReferences({query:async(s,a)=>(await c.query(s,a)).rows},
    {schema:'public',table:'source_refs',column:'source_label',type:'text',scan_key:'reference_key'}),1);
   assert.equal(await countDevelopmentReferences({query:async(s,a)=>(await c.query(s,a)).rows},
    {schema:'public',table:'source_refs',column:'paths',type:'_text',scan_key:'reference_key'}),1);
  }finally {
   try{await c.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');}finally{await c.end();}
  }
 });
