import test from 'node:test';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {countDevelopmentReferences,developmentReferenceQuery} from './pharmacy-hub-development-purge.mjs';
import {countMediaReferences,mediaReferenceQuery} from './pharmacy-hub-media-purge.mjs';
const uuid=n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
for(const [kind,count,build] of [['dev',countDevelopmentReferences,developmentReferenceQuery],['media',countMediaReferences,mediaReferenceQuery]]) {
 const column={schema:'public',table:'notes',column:'metadata',type:'jsonb',scan_key:'id'};
 test(`${kind}: walks every full UUID keyset batch and catches a final-page reference`,async()=>{
  const cursors=[];
  const q={async query(sql,args){cursors.push(args[1]);return [{count:cursors.length===3?'1':'0',scanned:cursors.length===3?'1':'1024',last_id:uuid(cursors.length*1024)}];}};
  assert.equal(await count(q,column),1);
  assert.deepEqual(cursors,[null,uuid(1024),uuid(2048)]);
 });
 test(`${kind}: empty and exact-boundary scans finish, NULL source values do not stop iteration`,async()=>{
  const cursors=[];
  const q={async query(sql,args){cursors.push(args[1]);return [cursors.length===1?{count:'0',scanned:'1024',last_id:uuid(1024)}:{count:'0',scanned:'0',last_id:null}];}};
  assert.equal(await count(q,column),0);assert.deepEqual(cursors,[null,uuid(1024)]);
 });
 test(`${kind}: malformed or nonadvancing batches fail closed`,async()=>{
  for(const invalid of [{count:'0',scanned:'1025',last_id:uuid(3)},{count:'1',scanned:'0',last_id:null},{count:'0',scanned:'1',last_id:'invalid'},{count:'0',scanned:'1024',last_id:uuid(1024)}]) {
   let calls=0;
   await assert.rejects(count({async query(){return [++calls===1?{count:'0',scanned:'1024',last_id:uuid(1024)}:invalid];}},column),/REFERENCE_BATCH/);
  }
 });
 test(`${kind}: DB exceptions abort instead of accepting partial results`,async()=>{
  let calls=0;
  await assert.rejects(count({async query(){if(++calls===2)throw new Error('timeout');return [{count:'0',scanned:'1024',last_id:uuid(1024)}];}},column),/timeout/);
 });
 test(`${kind}: UUID equality and unkeyed tables retain their existing complete scans`,async()=>{
  for(const c of [{...column,type:'uuid'},{...column,scan_key:null}]) {
   const sql=build(c);assert.doesNotMatch(sql,/reference_source/);
   let calls=0;assert.equal(await count({async query(){calls++;return [{count:'0'}];}},c),0);assert.equal(calls,1);
  }
  assert.match(build(column),/FROM ONLY "public"\."notes"/);
 });
}

test('production non-UUID timeout hashes identify metadata/source_label',()=>{
 for(const [build,table,column,hash] of [
  [developmentReferenceQuery,'product_landings','metadata','258048132b0bc3743a034c7b84ab89af832f622f8ff6b760d952eb09dee49bff'],
  [mediaReferenceQuery,'product_identifiers','source_label','d69849326571a56da9279a0532339eadb52e5c8323abb7b5277dcda920f91ca4'],
 ])assert.equal(createHash('sha256').update(build({schema:'public',table,column})).digest('hex'),hash);
});

test('groups every non-UUID leaf column and reads the complete literal target snapshot once',async()=>{
 const {prepareReferenceGroups}=await import('./pharmacy-hub-reference-batches.mjs');
 const base={schema:'public',table:'notes',scan_key:'id'};
 const columns=[{...base,column:'a',type:'text'},{...base,column:'id',type:'uuid'},
  {...base,column:'b',type:'jsonb'},{...base,table:'other',column:'c',type:'_text'},
  {...base,scan_key:null,column:'unkeyed',type:'text'}];
 let calls=0;
 const groups=await prepareReferenceGroups({async query(sql,args){calls++;assert.equal(sql,'targets');assert.deepEqual(args,[['ph']]);return [{id:'literal_[x]'},{id:''},{id:null},{id:'literal_[x]'}];}},columns,'targets',['ph'],'invalid');
 assert.equal(calls,1);assert.deepEqual(groups.map(c=>c.columns??c.column),[['a','b'],'id',['c'],'unkeyed']);
 assert.deepEqual(groups[0].target_tokens,['literal_[x]','']);assert.equal(groups[0].target_tokens,groups[2].target_tokens);
 await assert.rejects(prepareReferenceGroups({query:async()=>[{id:12}]},columns,'targets',[],'invalid'),/invalid/);
});
for(const [kind,count,build] of [['dev',countDevelopmentReferences,developmentReferenceQuery],['media',countMediaReferences,mediaReferenceQuery]]) {
 test(`${kind}: grouped batches bind cached targets, identify the matching field, and reject malformed field indices`,async()=>{
  const group={schema:'public',table:'notes',column:'a',type:'text',scan_key:'id',columns:['a','b'],target_tokens:['literal_[x]']};
  let calls=0;
  assert.equal(await count({async query(sql,args){assert.deepEqual(args[2],group.target_tokens);return [++calls===1?
   {count:'0',scanned:'1024',last_id:uuid(1024),column_index:null}:
   {count:'1',scanned:'1',last_id:uuid(1025),column_index:'2'}];}},group),1);
  assert.equal(group.matched_column,'b');
  for(const column_index of [null,'0','3','bad'])await assert.rejects(count({query:async()=>[
   {count:'1',scanned:'1',last_id:uuid(1),column_index}]},group),/REFERENCE_BATCH/);
  const sql=build(group);assert.match(sql,/s\."a"::text AS v1,s\."b"::text AS v2/);assert.match(sql,/unnest\(\$3::text\[\]\)/);
  assert.doesNotMatch(sql,/FROM public\./);assert.match(sql,/CASE\s+WHEN octet_length/);
 });
}

for(const [kind,count] of [['dev',countDevelopmentReferences],['media',countMediaReferences]]) {
 test(`${kind}: a catalog group starting with an unindexed UUID still binds targets and walks late pages`,async()=>{
  const {prepareReferenceGroups}=await import('./pharmacy-hub-reference-batches.mjs');
  const base={schema:'public',table:'notes',scan_key:'id'};
  const [group]=await prepareReferenceGroups({query:async()=>[{id:uuid(7)}]},[
   {...base,column:'reviewed_by',type:'uuid',indexed:false},
   {...base,column:'payload',type:'jsonb',indexed:false},
  ],'targets',['ph'],'invalid');
  let calls=0;
  assert.equal(await count({async query(sql,args){
   assert.equal(args.length,3);assert.deepEqual(args[2],[uuid(7)]);
   assert.equal(args[1],calls===0?null:uuid(1024));
   return [++calls===1?{count:'0',scanned:'1024',last_id:uuid(1024),column_index:null}:
    {count:'1',scanned:'1',last_id:uuid(1025),column_index:'1'}];
  }},group),1);
  assert.equal(calls,2);assert.equal(group.matched_column,'reviewed_by');
 });
}

test('only catalog-confirmed unindexed UUID columns join the single keyset pass; indexed/unknown UUID and unkeyed stay separate',async()=>{
 const {prepareReferenceGroups,referencePhase}=await import('./pharmacy-hub-reference-batches.mjs');
 const base={schema:'public',table:'notes',scan_key:'id'};
 const columns=[{...base,column:'id',type:'uuid',indexed:true},{...base,column:'payload',type:'jsonb',indexed:false},
  {...base,column:'reviewed_by',type:'uuid',indexed:false},{...base,column:'owner_id',type:'uuid'},
  {...base,scan_key:null,table:'legacy',column:'ref_id',type:'uuid',indexed:false}];
 const groups=await prepareReferenceGroups({query:async()=>[{id:uuid(1)}]},columns,'targets',['ph'],'invalid');
 assert.deepEqual(groups.map(c=>c.columns??c.column),['id',['payload','reviewed_by'],'owner_id','ref_id']);
 assert.deepEqual(groups.map(referencePhase),['reference_uuid:public.notes.id','reference_group:public.notes',
  'reference_uuid:public.notes.owner_id','reference_uuid:public.legacy.ref_id']);
 assert.deepEqual(groups[1].types,['jsonb','uuid']);
 // The folded UUID keeps native equality; only short legacy tokens use the text regex.
 for(const sql of [developmentReferenceQuery(groups[1]),mediaReferenceQuery(groups[1])]) {
  assert.match(sql,/s\."payload"::text AS v1,s\."reviewed_by" AS v2,/);
  assert.match(sql,/\(source\.v2 = ANY\(targets\.uuids\) OR \(targets\.legacy_pattern IS NOT NULL AND \(source\.v2::text COLLATE "C"\) ~ targets\.legacy_pattern\)\)/);
  assert.match(sql,/CASE WHEN octet_length\(source\.v1\)>=targets\.min_bytes THEN \(source\.v1 COLLATE "C"\) ~ targets\.pattern ELSE FALSE END/);
  assert.doesNotMatch(sql,/"reviewed_by"::text/);
  assert.match(sql,/found AS MATERIALIZED \(/);
 }
 assert.throws(()=>developmentReferenceQuery({...groups[1],types:['jsonb']}),/PH_PURGE_REFERENCE_GROUP/);
});
