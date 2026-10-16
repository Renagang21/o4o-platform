/** Opt-in isolated full keyset scan; never uses shared DB or GCS. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {loadPurgeSource} from './pharmacy-hub-administrative-purge-job.mjs';
const {countDevelopmentReferences,developmentReferenceQuery,developmentReferenceTargets}=await import(`data:text/javascript;base64,${Buffer.from(await loadPurgeSource('development')).toString('base64')}`);
const {countMediaReferences,mediaReferenceQuery,mediaReferenceTargets}=await import(`data:text/javascript;base64,${Buffer.from(await loadPurgeSource('media')).toString('base64')}`);
const uuid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const keys=['pharmacy-hub','pharmacy_hub','pharmacy_hub_cart','pharmacy-hub-event-offer'];
import {prepareReferenceGroups} from './pharmacy-hub-reference-batches.mjs';
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
   // The old worker rediscovered roots on every page; unrelated roots must not
   // multiply that work by the source page count.
   await c.query(`INSERT INTO cms_contents SELECT md5(('unrelated-root-'||n)::text)::uuid,'neture'
     FROM generate_series(1,100000) n; ANALYZE cms_contents`);
   await c.query("SET statement_timeout='15s'");
   for(const [kind,count,build,column,target,targets] of [
    ['development',countDevelopmentReferences,developmentReferenceQuery,'metadata',uuid(1),developmentReferenceTargets],
    ['media',countMediaReferences,mediaReferenceQuery,'source_label',uuid(50),mediaReferenceTargets],
   ]) {
    const descriptors=['source_label','metadata','paths'].map(name=>({schema:'public',table:'source_refs',column:name,type:'text',scan_key:'id'}));
    let targetReads=0;
    const [descriptor]=await prepareReferenceGroups({async query(sql,args){targetReads++;return (await c.query(sql,args)).rows;}},descriptors,targets(),keys,'invalid');
    assert.equal(targetReads,1);assert.equal(descriptor.columns.length,3);
    let scanned=0,calls=0;
    const q={async query(sql,args){const result=await c.query(sql,args);scanned+=Number(result.rows[0].scanned);calls++;return result.rows;}};
    const start=Date.now();assert.equal(await count(q,descriptor),0);
    assert.equal(scanned,rows);assert.equal(calls,Math.floor(rows/1024)+1);
    console.log(JSON.stringify({kind,rows,batchMs:Date.now()-start,calls,scanned}));
    const plan=(await c.query('EXPLAIN (ANALYZE,FORMAT JSON) '+build(descriptor),[keys,uuid(0),descriptor.target_tokens])).rows[0]['QUERY PLAN'][0].Plan;
    assert.ok(walk(plan).some(n=>/Index/.test(n['Node Type'])&&n['Index Cond']?.includes('id >')&&n['Actual Loops']>0));
    // No maximum UUID or late-page row can be skipped. Include NULL payloads too.
    const last='ffffffff-ffff-ffff-ffff-ffffffffffff';
    await c.query('INSERT INTO source_refs VALUES($1,NULL,NULL,NULL)',[last]);
    assert.equal(await count({query:async(s,a)=>(await c.query(s,a)).rows},descriptor),0);
    await c.query(`UPDATE source_refs SET ${column}=$1 WHERE id=$2`,[column==='metadata'?{nested:{reference:target}}:'prefix '+target+' suffix',last]);
    assert.equal(await count({query:async(s,a)=>(await c.query(s,a)).rows},descriptor),1);
    await c.query('DELETE FROM source_refs WHERE id=$1',[last]);
   }
   await c.query('CREATE TABLE split_refs(id uuid PRIMARY KEY,a text,b text,paths text[])');
   const token=uuid(1),last='ffffffff-ffff-ffff-ffff-ffffffffffff';
   await c.query('INSERT INTO split_refs VALUES($1,$2,$3,NULL)',[last,token.slice(0,18),token.slice(18)]);
   const split={schema:'public',table:'split_refs',column:'a',type:'text',scan_key:'id',columns:['a','b','paths'],target_tokens:[token]};
   const direct={query:async(s,a)=>(await c.query(s,a)).rows};
   assert.equal(await countDevelopmentReferences(direct,split),0);
   await c.query('UPDATE split_refs SET b=$1',[token]);assert.equal(await countDevelopmentReferences(direct,split),1);assert.equal(split.matched_column,'b');
   await c.query('UPDATE split_refs SET a=NULL,b=NULL,paths=$1',[['prefix '+token+' suffix']]);
   assert.equal(await countDevelopmentReferences(direct,split),1);assert.equal(split.matched_column,'paths');
   split.target_tokens=['한글_[]'];await c.query('UPDATE split_refs SET a=$1,b=NULL',['앞 한글_[] 뒤']);
   assert.equal(await countDevelopmentReferences(direct,split),1);
   split.target_tokens=[''];await c.query('UPDATE split_refs SET a=NULL,b=NULL,paths=NULL');assert.equal(await countDevelopmentReferences(direct,split),0);
   await c.query("UPDATE split_refs SET b=''");assert.equal(await countDevelopmentReferences(direct,split),1);
   // A UUID column first in a folded group keeps native equality plus the short
   // legacy-token fallback; the last page, NULL, array and JSON stay covered.
   await c.query(`CREATE TABLE uuid_group_refs(id uuid PRIMARY KEY,owner_id uuid,metadata jsonb,paths text[],label text);
    INSERT INTO uuid_group_refs SELECT md5(('uuid-group-'||n)::text)::uuid,md5(('owner-'||n)::text)::uuid,
      jsonb_build_object('source','legacy-import'),ARRAY['unrelated'],NULL FROM generate_series(1,2100) n;
    INSERT INTO uuid_group_refs VALUES('ffffffff-ffff-ffff-ffff-ffffffffffff',NULL,NULL,NULL,NULL)`);
   const uuidFirst=['owner_id','metadata','paths','label'].map((name,i)=>({schema:'public',table:'uuid_group_refs',column:name,
    type:['uuid','jsonb','_text','text'][i],scan_key:'id',...(i===0?{indexed:false}:{})}));
   const lastRow='ffffffff-ffff-ffff-ffff-ffffffffffff';
   for(const [count,targets,target] of [[countDevelopmentReferences,developmentReferenceTargets,uuid(1)],[countMediaReferences,mediaReferenceTargets,uuid(50)]]) {
    const [group]=await prepareReferenceGroups(direct,uuidFirst,targets(),keys,'invalid');
    assert.deepEqual(group.columns,['owner_id','metadata','paths','label']);assert.equal(group.types[0],'uuid');
    assert.equal(await count(direct,group),0);
    for(const [set,column] of [[`owner_id='${target}'`,'owner_id'],[`metadata=jsonb_build_object('nested',jsonb_build_array('${target}'))`,'metadata'],
      [`paths=ARRAY[NULL,'prefix ${target} suffix']`,'paths'],[`label='x${target}y'`,'label']]) {
     await c.query(`UPDATE uuid_group_refs SET ${set} WHERE id=$1`,[lastRow]);
     assert.equal(await count(direct,group),1);assert.equal(group.matched_column,column);
     await c.query('UPDATE uuid_group_refs SET owner_id=NULL,metadata=NULL,paths=NULL,label=NULL WHERE id=$1',[lastRow]);
    }
    // A canonical UUID never matches by substring of a different UUID.
    await c.query(`UPDATE uuid_group_refs SET owner_id=$1 WHERE id=$2`,['a'+target.slice(1),lastRow]);
    assert.equal(await count(direct,group),0);
   }
   // Short legacy token inside a UUID column (development text-PK target).
   await c.query('UPDATE offer_service_prices SET id=$1',['4000-80']);
   await c.query('UPDATE uuid_group_refs SET owner_id=$1 WHERE id=$2',['12345678-1234-4000-8000-123456789abc',lastRow]);
   const [legacy]=await prepareReferenceGroups(direct,uuidFirst,developmentReferenceTargets(),keys,'invalid');
   assert.equal(await countDevelopmentReferences(direct,legacy),1);assert.equal(legacy.matched_column,'owner_id');
   await c.query('UPDATE offer_service_prices SET id=$1',['legacy-not-hex']);
   const [nonHex]=await prepareReferenceGroups(direct,uuidFirst,developmentReferenceTargets(),keys,'invalid');
   assert.equal(await countDevelopmentReferences(direct,nonHex),0);
   await c.query('UPDATE offer_service_prices SET id=$1',[uuid(37)]);
   await c.query('DROP TABLE uuid_group_refs');
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
