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
