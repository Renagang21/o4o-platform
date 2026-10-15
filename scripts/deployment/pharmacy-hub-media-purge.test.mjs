import test from 'node:test';
import assert from 'node:assert/strict';
import {PharmacyHubMediaPurge,validateMediaObject,mediaReferenceQuery} from './pharmacy-hub-media-purge.mjs';
import {createHash} from 'node:crypto';

test('production UUID timeout query retains every token and gates substring fallback',()=>{
  const c={schema:'public',table:'product_identifiers',column:'product_master_id'};
  assert.equal(createHash('sha256').update(mediaReferenceQuery(c)).digest('hex'),'d16a1d52d2e1e16a6118e0dbaa95720722dbe6986b04e0563e0c11f307c86cbc');
  const sql=mediaReferenceQuery({...c,type:'uuid'});
  assert.match(sql,/s\."product_master_id" = ANY\(ARRAY\(SELECT id::uuid/);
  assert.match(sql,/unnest\(ARRAY\[a.id,a.url,a.gcs_path\]\)/);
  assert.match(sql,/targets.pattern IS NOT NULL/);
});
import {jobArguments} from './pharmacy-hub-administrative-purge-job.mjs';
function fixture(problem) {
  const calls=[],deleted=[],writes=[],missing=new Set();
  const assets=Array.from({length:4},(_,i)=>({gcs_path:`media/2026/10/fixture-${i}.png`,url:`https://storage.googleapis.com/o4o-media-library/media/2026/10/fixture-${i}.png`}));
  if(problem==='badPath')assets[0].gcs_path='../foreign.png';
  const q={isTransactionActive:true,async query(sql) {
    calls.push(sql);
    if(sql.startsWith('SET LOCAL')||sql.startsWith('LOCK TABLE'))return [];
    if(sql.includes('FROM pg_class c JOIN pg_namespace'))return [{schema:'public',table:'media_assets'}];
    if(sql.includes('FROM pg_constraint'))return problem==='fk'?[{schema:'foreign',table:'refs',target:'media_assets',source_columns:['asset_id'],target_columns:['id']}]:[];
    if(sql.includes('FROM pg_attribute a'))return [{schema:'public',table:'media_assets',column:'url'}];
    if(sql.startsWith('SELECT gcs_path,url'))return assets;
    if(sql.includes('FROM pg_trigger'))return [{count:problem==='trigger'?'1':'0'}];
    if(sql.includes('~ targets.pattern')||sql.includes('JOIN public."media_assets"'))return [{count:['fk','reference'].includes(problem)?'1':'0'}];
    if(sql.startsWith('WITH removed')){writes.push(sql);return [{count:sql.includes('DELETE FROM public.media_assets')?'4':'1'}];}
    if(sql.includes('FROM public.media_entity_links'))return [{count:problem==='link'?'0':'1'}];
    if(sql.includes('FROM public.media_assets'))return [{count:writes.length?'0':problem==='count'?'5':'4'}];
    throw new Error('unhandled fixture query');
  }};
  const storage={bucket(name){assert.equal(name,'o4o-media-library');return {file(path){return {
    async getMetadata(){
      if(problem==='read')throw Object.assign(new Error('private payload'),{code:403});
      if(missing.has(path)||problem==='missing')throw Object.assign(new Error('missing'),{code:404});
      return [{generation:problem==='generation'?'unknown':'123',name:path,bucket:'o4o-media-library'}];
    },
    async delete(options){
      assert.deepEqual(options,{ifGenerationMatch:'123',ignoreNotFound:false});
      if(problem==='delete'&&deleted.length===1)throw Object.assign(new Error('private payload'),{code:412});
      deleted.push(path);if(problem!=='reappeared')missing.add(path);
    },
  };}};}};
  return {q,storage,calls,deleted,writes};
}
test('storage namespace and URLs cannot redirect cleanup to foreign objects',()=>{
  for(const path of ['../foreign','media/../foreign.png','media/a?x.png','gs://foreign/file.png','media/a\\b.png'])
    assert.throws(()=>validateMediaObject({gcs_path:path,url:`https://storage.googleapis.com/o4o-media-library/${path}`}),/STORAGE_OWNERSHIP/);
  assert.throws(()=>validateMediaObject({gcs_path:'media/a.png',url:'https://storage.googleapis.com/foreign/media/a.png'}),/STORAGE_OWNERSHIP/);
});
for(const problem of ['trigger','count','link','fk','reference','badPath','read','generation'])test(`${problem} blocks object and DB deletion`,async()=>{
  const f=fixture(problem);await assert.rejects(new PharmacyHubMediaPurge({storage:f.storage}).up(f.q),/PH_MEDIA_/);
  assert.equal(f.deleted.length,0);assert.equal(f.writes.length,0);
});
test('plan reads exact objects but performs no delete',async()=>{
  const f=fixture();assert.deepEqual(await new PharmacyHubMediaPurge({storage:f.storage}).up(f.q,true),{applied:false,assets:4,links:1,objects:4,missingObjects:0});
  assert.equal(f.deleted.length,0);assert.equal(f.writes.length,0);
});
test('apply verifies all generation-bound object deletions before deleting PH links/assets',async()=>{
  const f=fixture();assert.equal((await new PharmacyHubMediaPurge({storage:f.storage}).up(f.q)).applied,true);
  assert.equal(f.deleted.length,4);assert.equal(f.writes.length,2);
});
for(const problem of ['delete','reappeared'])test(`${problem} preserves database rows after partial physical deletion`,async()=>{
  const f=fixture(problem);await assert.rejects(new PharmacyHubMediaPurge({storage:f.storage}).up(f.q),/PH_MEDIA_/);
  assert.ok(f.deleted.length>0);assert.equal(f.writes.length,0);
});
test('confirmed 404 objects allow resume while retaining explicit missing count',async()=>{
  const f=fixture('missing');assert.equal((await new PharmacyHubMediaPurge({storage:f.storage}).up(f.q)).missingObjects,4);
  assert.equal(f.deleted.length,0);assert.equal(f.writes.length,2);
});
test('media job binds runtime SDK identity and disables automatic storage retries',()=>{
  const job=jobArguments({image:'asia-northeast3-docker.pkg.dev/netureyoutube/o4o-api/api-server@sha256:'+'a'.repeat(64),source:'// reviewed',mode:'apply',runId:'12',attempt:'1',username:'fixture',database:'fixture',purge:'media'});
  const decoded=Buffer.from(job.args.find(a=>a.startsWith('--args=')).match(/base64,([^']+)/)[1],'base64').toString();
  assert.equal(job.name,'ph-media-12-1');assert.match(decoded,/PharmacyHubMediaPurge/);
  assert.match(decoded,/autoRetry:false,maxRetries:0/);assert.match(decoded,/SERIALIZABLE/);
});
