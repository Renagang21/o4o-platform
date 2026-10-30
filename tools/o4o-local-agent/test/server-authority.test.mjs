import {test,beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {bootstrapLocalDb,closeLocalDb,openLocalDb,LocalPharmacySyncRepository as journal} from '../src/local-db.mjs';
import {createBackup} from '../src/local-db-backup.mjs';
import {importPharmacyRecords,pharmacyDataset,readPharmacyWorkspace} from '../src/pharmacy-data.mjs';
import {createPharmacySync} from '../src/pharmacy-sync.mjs';
import {PHARMACY_FORMAT} from '../src/pharmacy-order-contract.mjs';
const owner='user:authority-fixture',dataset=pharmacyDataset(owner);
const source=id=>({kind:'product',data:{id,name:'합성 상품',program:'fixture',program_code:id,kind:'unknown'},origin:{program:'fixture',source_key:id,collected_at:'2026-10-30T00:00:00Z'}});
let home;
beforeEach(()=>{closeLocalDb();home=fs.mkdtempSync(path.join(os.tmpdir(),'o4o-authority-'));process.env.O4O_AGENT_HOME=home;assert.equal(bootstrapLocalDb({backup:(db,r)=>createBackup(db,r)}).ready,true);});
afterEach(()=>{closeLocalDb();fs.rmSync(home,{recursive:true,force:true});});

test('bounded transfer resumes across ticks, freezes local edits, completes once and only uploads new source data',async()=>{
 importPharmacyRecords(owner,{format:PHARMACY_FORMAT,records:Array.from({length:350},(_,i)=>source('p'+i))},0);
 const epoch=randomUUID(),calls=[];let mode='transferring',allowed=true;
 const worker=createPharmacySync({post:async(url,body)=>{
  calls.push({url,body});assert.equal(body.protocol,'server-authority-v1');
  if(url.endsWith('grants'))return {status:200,payload:{data:allowed?[{owner,epoch,storageMode:mode}]:[]}};
  assert.equal(body.cursor,0);
  if(body.complete){assert.equal(journal.state(dataset).pending,0);mode='server';}
  return {status:200,payload:{success:true,data:{accepted:body.changes.map((r,i)=>({lane:r.lane,kind:r.entry.kind,id:r.entry.data.id,mutationId:r.mutationId,version:i+1})),changes:[],cursor:0,more:false,storageMode:mode}}};
 }});
 await worker.tick('session',true);assert.equal(journal.state(dataset).pending,50);assert.equal(mode,'transferring');
 assert.throws(()=>importPharmacyRecords(owner,{format:PHARMACY_FORMAT,records:[]},1,'user'),/SERVER_AUTHORITY/);
 assert.throws(()=>importPharmacyRecords(owner,{format:PHARMACY_FORMAT,records:[source('new')]},1),/SERVER_AUTHORITY/);
 await worker.tick('session',true);assert.equal(mode,'server');assert.equal(journal.state(dataset).authority,'server');
 assert.throws(()=>readPharmacyWorkspace(owner),/SERVER_AUTHORITY/);
 assert.throws(()=>importPharmacyRecords(owner,{format:PHARMACY_FORMAT,records:[]},1,'restore'),/SERVER_AUTHORITY/);
 importPharmacyRecords(owner,{format:PHARMACY_FORMAT,records:[source('new')]},1);
 await worker.tick('session',true);assert.equal(journal.state(dataset).pending,0);
 assert.equal(calls.filter(c=>c.body.complete).length,1);
 allowed=false;await worker.tick('session',true);
 assert.throws(()=>importPharmacyRecords(owner,{format:PHARMACY_FORMAT,records:[]},2,'user'),/SERVER_AUTHORITY/);
 assert.throws(()=>journal.configure(dataset,epoch,'local'),/SERVER_AUTHORITY/);
});

test('unavailable upload keeps pending rows; server payloads are never downloaded into SQLite',async()=>{
 importPharmacyRecords(owner,{format:PHARMACY_FORMAT,records:[source('p')]},0);
 const epoch=randomUUID();let broken=true;
 const worker=createPharmacySync({post:async(url)=>url.endsWith('grants')?{status:200,payload:{data:[{owner,epoch,storageMode:'transferring'}]}}:broken?{status:503}:{status:200,payload:{success:true,data:{accepted:[],changes:[{lane:'user',entry:source('remote'),version:1,mutationId:randomUUID()}],cursor:1,more:false}}}});
 await worker.tick('session',true);assert.equal(journal.state(dataset).pending,1);
 broken=false;await worker.tick('session',true);assert.equal(journal.state(dataset).pending,1);
 assert.equal(journal.pending(dataset)[0].entry.data.id,'p');
});

test('attaching a collector after starting on server does not restore its local checkpoint',async()=>{
 importPharmacyRecords(owner,{format:PHARMACY_FORMAT,records:[source('old')]},0);
 const epoch=randomUUID();journal.configure(dataset,epoch,'server');
 assert.equal(journal.state(dataset).pending,0);
 importPharmacyRecords(owner,{format:PHARMACY_FORMAT,records:[source('new')]},1);
 assert.deepEqual(journal.pending(dataset).map(r=>r.entry.data.id),['new']);
});

test('an old mirror transitions with the same epoch, retaining known versions and source records',()=>{
 importPharmacyRecords(owner,{format:PHARMACY_FORMAT,records:[source('old')]},0);
 const epoch=randomUUID();journal.configure(dataset,epoch);
 openLocalDb().prepare('UPDATE local_pharmacy_records SET dirty=2,server_version=7 WHERE dataset=?').run(dataset);
 journal.configure(dataset,epoch,'transferring');
 assert.equal(journal.state(dataset).conflicts,0);
 assert.equal(journal.pending(dataset)[0].expectedVersion,7);
 assert.equal(journal.pending(dataset)[0].entry.data.id,'old');
});
