import { ERASURE_WRITER_GAPS_SQL } from '../privacy/erasure-writer-manifest.js';
import { CreateAssistantWorkData1793257200000 } from '../../database/migrations/1793257200000-CreateAssistantWorkData.js';
import { AccountErasureService } from '../privacy/account-erasure.service.js';
import { pcWorkData, readWorkData } from './work-data-bridge.js';
import { AddAssistantStorageAuthority1793322213345 } from '../../database/migrations/1793322213345-AddAssistantStorageAuthority.js';
import { submitCommandResult } from '../local-agent/local-agent-service.js';
import express from 'express';
import request from 'supertest';
import { createWorkDataRouter } from '../../routes/ai-proxy/work-data.routes.js';
jest.mock('../../middleware/auth.middleware.js',()=>({authenticate:(req,res,next)=>{const id=req.headers['x-fixture-user'];if(!id)return res.status(401).json({success:false});req.user={id};next();}}));
import 'reflect-metadata';
import { randomUUID, randomBytes } from 'node:crypto';
import { DataSource } from 'typeorm';
import { methodSharing, sharedMethodCandidates } from './shared-methods.js';
import { WorkDataService, assertWorkDataOwner } from './work-data.service.js';

const raw=process.env.MAIN_AUTOMATION_IT_DATABASE_URL;
const suite=raw?describe:describe.skip;
suite('Main business copies on isolated PostgreSQL',()=>{
 let db:DataSource,service:WorkDataService,app:express.Express;const ids=[randomUUID(),randomUUID(),randomUUID()],org=randomUUID();
 const owner={key:'user:'+ids[0],userId:ids[0],organizationId:null};
 const product=(name='합성 상품')=>({kind:'product',data:{id:'p1',name,program:'fixture',program_code:'001',kind:'dispensing'},origin:{program:'fixture',source_key:'p1',collected_at:'2026-10-29T00:00:00Z'}});
 const change=(entry=product(),version=0)=>({lane:'imported',entry,expectedVersion:version,mutationId:randomUUID()});
 beforeAll(async()=>{
   const url=new URL(raw!);if(url.hostname!=='127.0.0.1'||url.port!=='55439'||url.pathname!=='/o4o_main_automation_integration')throw Error('Dedicated fixture required');
   db=new DataSource({type:'postgres',url:raw});await db.initialize();service=new WorkDataService(db);
   for(const id of ids)await db.query(`INSERT INTO users(id,email,name,status,"isActive","isEmailVerified") VALUES($1,$2,'합성 사용자','active',true,true)`,[id,id+'@fixture.invalid']);
   await db.query(`INSERT INTO organizations(id,name,code) VALUES($1::uuid,'합성 조직',$2)`,[org,org]);
   await db.query(`INSERT INTO organization_members(organization_id,user_id,role) VALUES($1,$2,'owner'),($1,$3,'member')`,[org,ids[0],ids[1]]);
   app=express();app.use(express.json());app.use('/work-data',createWorkDataRouter(db));
 });
 afterAll(async()=>{if(db?.isInitialized)await db.destroy();});
 it('denies upload without consent and ignores forged owner scope',async()=>{
   await expect(service.sync(ids[0],owner.key,randomUUID(),[change()])).rejects.toMatchObject({code:'WORK_DATA_CONSENT_REQUIRED'});
   await expect(assertWorkDataOwner(db,ids[1],owner,false)).rejects.toMatchObject({code:'WORK_DATA_FORBIDDEN'});
 });
 it('grants once, retries idempotently, reads without PC, rejects stale writes atomically',async()=>{
   const consent=await service.setConsent(ids[0],owner,true);
   expect((await service.setConsent(ids[0],owner,true)).epoch).toBe(consent.epoch);
   const first=change(),saved=await service.sync(ids[0],owner.key,consent.epoch,[first]);
   const retry=await service.sync(ids[0],owner.key,consent.epoch,[first]);expect(retry.accepted[0].version).toBe(saved.accepted[0].version);
   const read=await service.query(ids[0],owner,{});expect(read.location).toBe('server');expect(read.records).toHaveLength(1);
   await expect(service.sync(ids[0],owner.key,consent.epoch,[change(product('과거 수정'))])).rejects.toMatchObject({code:'WORK_DATA_CONFLICT'});
   expect((await service.query(ids[0],owner,{})).records[0].data.name).toBe('합성 상품');
 });
 it('keeps user correction above later program collection',async()=>{
   const {epoch}=await service.consent(ids[0],owner);
   const corrected={kind:'product',data:{...product().data,name:'사용자 교정'}};
   await service.sync(ids[0],owner.key,epoch,[{lane:'user',entry:corrected,expectedVersion:0,mutationId:randomUUID()}]);
   const source=await db.query(`SELECT version FROM assistant_work_data_records WHERE owner_key=$1 AND lane='imported'`,[owner.key]);
   await service.sync(ids[0],owner.key,epoch,[change(product('새 프로그램 값'),Number(source[0].version))]);
   expect((await service.query(ids[0],owner,{})).records[0].data.name).toBe('사용자 교정');
 });
 it('shared recommendations require separate consent and independent verified contributors, and expose no labels',async()=>{
   for(const userId of ids.slice(1))await db.query(`INSERT INTO assistant_procedural_patterns(ownership_scope,user_id,target_id,task_type_key,stage_key,polarity,pattern_sig,strategy)
     VALUES('USER',$1,'healthkr','search_task','search','preferred',$2,$3::jsonb)`,[userId,'a'.repeat(64),JSON.stringify({ops:[{op:'open_menu',label:'개인 메뉴'},{op:'read_result'}]})]);
   expect(await sharedMethodCandidates(db,ids[0],'healthkr',null)).toEqual([]);
   await methodSharing(db,ids[1],true);expect(await sharedMethodCandidates(db,ids[0],'healthkr',null)).toEqual([]);
   await methodSharing(db,ids[2],true);
   const candidates=await sharedMethodCandidates(db,ids[0],'healthkr',null);
   expect(candidates).toHaveLength(1);expect(candidates[0].contributors).toBe(2);
   expect(JSON.stringify(candidates)).not.toContain('개인 메뉴');expect(JSON.stringify(candidates)).not.toContain(ids[1]);
   expect(await sharedMethodCandidates(db,ids[0],'windows.notepad',null)).toEqual([]);
   await methodSharing(db,ids[2],false);expect(await sharedMethodCandidates(db,ids[0],'healthkr',null)).toEqual([]);
 });
 it('aggregates stored periods by document type and unit without a PC',async()=>{
   const {epoch}=await service.consent(ids[0],owner);
   const entries=[
    {kind:'supplier',data:{id:'s1',name:'합성 거래처',enabled:true,payment_timing:'unknown',payment_required:null}},
    {kind:'pack',data:{id:'k1',product_id:'p1',label:'100정',base_unit:'정',units_per_pack:100,preferred:true}},
    {kind:'purchase',data:{id:'buy1',document_type:'purchase',product_id:'p1',supplier_id:'s1',pack_id:'k1',pack_count:2,purchased_at:'2026-10-29T00:00:00Z'}},
    {kind:'purchase',data:{id:'return1',document_type:'return',product_id:'p1',supplier_id:'s1',pack_id:'k1',pack_count:1,purchased_at:'2026-10-29T00:00:00Z'}},
   ];
   await service.sync(ids[0],owner.key,epoch,entries.map(entry=>({lane:'imported',entry:{...entry,origin:{program:'fixture',source_key:entry.data.id,collected_at:'2026-10-29T00:00:00Z'}},expectedVersion:0,mutationId:randomUUID()})));
   const analysis=await service.analysis(ids[0],owner);
   expect(analysis.movement.find(r=>r.movement==='purchase').quantity).toBe('200');
   expect(analysis.movement.find(r=>r.movement==='return').quantity).toBe('-100');
 });
 it('returns typed source conflicts for suppliers and purchases with aliased local IDs',async()=>{
   const {epoch}=await service.consent(ids[0],owner);
   for(const kind of ['supplier','purchase']){
     const [original]=await db.query("SELECT entry FROM assistant_work_data_records WHERE owner_key=$1 AND lane='imported' AND kind=$2 LIMIT 1",[owner.key,kind]);
     const alias={...original.entry,data:{...original.entry.data,id:'alias-'+kind}};
     await expect(service.sync(ids[0],owner.key,epoch,[{lane:'imported',entry:alias,expectedVersion:0,mutationId:randomUUID()}])).rejects.toMatchObject({code:'WORK_DATA_SOURCE_CONFLICT',status:409});
     expect(await db.query('SELECT 1 FROM assistant_work_data_records WHERE owner_key=$1 AND id=$2',[owner.key,alias.data.id])).toHaveLength(0);
   }
 });
 it('preserves prepared-sheet validity and permits an explicit atomic demotion with supplier disable',async()=>{
   const {epoch}=await service.consent(ids[0],owner);
   const sheet={kind:'sheet',data:{id:'reverse-sheet',title:'합성 준비 시트',status:'prepared',lines:[{id:'line1',product_id:'p1',supplier_id:'s1',pack_id:'k1',product_name:'합성 상품',pack_label:'100정',pack_count:1}]}};
   const added=await service.sync(ids[0],owner.key,epoch,[{lane:'user',entry:sheet,expectedVersion:0,mutationId:randomUUID()}]);
   const [supplier]=await db.query("SELECT entry,version FROM assistant_work_data_records WHERE owner_key=$1 AND lane='imported' AND kind='supplier' AND id='s1'",[owner.key]);
   const disable={lane:'imported',entry:{...supplier.entry,data:{...supplier.entry.data,enabled:false}},expectedVersion:Number(supplier.version),mutationId:randomUUID()};
   await expect(service.sync(ids[0],owner.key,epoch,[disable])).rejects.toMatchObject({code:'WORK_DATA_REFERENCE_CONFLICT',status:409});
   expect((await service.query(ids[0],owner,{kind:'supplier'})).records.find(r=>r.data.id==='s1')?.data).toMatchObject({enabled:true});
   await service.sync(ids[0],owner.key,epoch,[disable,{lane:'user',entry:{...sheet,data:{...sheet.data,status:'draft'}},expectedVersion:added.accepted[0].version,mutationId:randomUUID()}]);
   expect((await service.query(ids[0],owner,{kind:'supplier'})).records.find(r=>r.data.id==='s1')?.data).toMatchObject({enabled:false});
 });
 it('pages mixed-case and punctuation IDs without gaps or duplicate cursors',async()=>{
   const idsToSave=['a','A','_a','a_','a-1','a1','aA','aa'];
   const {epoch}=await service.consent(ids[0],owner);
   await service.sync(ids[0],owner.key,epoch,idsToSave.map(id=>({lane:'user',entry:{kind:'supplier',data:{id,name:'합성 거래처',enabled:true,payment_timing:'unknown',payment_required:null}},expectedVersion:0,mutationId:randomUUID()})));
   const found:string[]=[];let after='';
   do{const page=await service.query(ids[0],owner,{kind:'supplier',limit:2,after});found.push(...page.records.map(entry=>entry.data.id));after=page.next??'';}while(after);
   expect(new Set(found).size).toBe(found.length);expect(found.filter(id=>idsToSave.includes(id)).sort()).toEqual([...idsToSave].sort());
 });
 it('HTTP guards derive ownership from the authenticated fixture and reject unconsented server writes',async()=>{
   expect((await request(app).post('/work-data/status').send({})).status).toBe(401);
   const status=await request(app).post('/work-data/status').set('x-fixture-user',ids[1]).send({owner:owner.key,workScope:{workspace:'home',organizationId:org}});
   expect(status.status).toBe(200);expect(status.body.data.owner).toBe('user:'+ids[1]);expect(status.body.data.enabled).toBe(false);
   const write=await request(app).post('/work-data/save').set('x-fixture-user',ids[1]).send({owner:owner.key,location:'server',epoch:(await service.consent(ids[0],owner)).epoch,changes:[]});
   expect(write.status).toBe(403);expect(write.body.code).toBe('WORK_DATA_CONSENT_REQUIRED');
 });
 it("lists only the requester's live waiting Tasks without retaining request text",async()=>{
   const task=randomUUID(),run='fixture-'+randomUUID();
   await db.query(`INSERT INTO assistant_tasks(id,requested_by_user_id,ownership_scope,status,target_kind,target_id) VALUES($1,$2,'USER','waiting_for_user','browser_site','healthkr')`,[task,ids[0]]);
   await db.query(`INSERT INTO work_run_coordination(run_id,user_id,task_id,status,expires_at) VALUES($1,$2,$3,'waiting_for_user',now()+interval '30 minutes')`,[run,ids[0],task]);
   const own=await request(app).post('/work-data/tasks').set('x-fixture-user',ids[0]).send({});expect(own.body.data.some(row=>row.runId===run)).toBe(true);
   const other=await request(app).post('/work-data/tasks').set('x-fixture-user',ids[1]).send({});expect(other.body.data).toEqual([]);
   await db.query("UPDATE work_run_coordination SET expires_at=now()-interval '1 second' WHERE run_id=$1",[run]);
   expect((await request(app).post('/work-data/tasks').set('x-fixture-user',ids[0]).send({})).body.data).toEqual([]);
 });
 it('keeps the real PostgreSQL command transport bound to the original authorized PC',async()=>{
   const a=randomUUID(),b=randomUUID();
   const localOwner={key:'user:'+ids[2],userId:ids[2],organizationId:null};
   const capabilities=JSON.stringify({browser:false,windowsUia:false,localData:true,ownerScopedLedger:true,taskUnit:false,pharmacyData:true});
   await db.query(`INSERT INTO local_agent_devices(id,user_id,platform,agent_version,status,last_seen_at,capabilities,credential_hash) VALUES($1,$3,'win32','0.5.0','active',now(),$4::jsonb,$5),($2,$3,'win32','0.5.0','active',now()-interval '1 second',$4::jsonb,$6)`,[a,b,ids[2],capabilities,randomBytes(32).toString('hex'),randomBytes(32).toString('hex')]);
   async function read(bound?:string){
     const operation=pcWorkData(db,ids[2],localOwner,'read',{limit:1},bound);operation.catch(()=>{});
     let command:any;
     for(let attempt=0;attempt<100;attempt++){
       [command]=await db.query(`SELECT command_id,device_id FROM local_agent_commands WHERE user_id=$1 AND status='pending' AND tool_name='assistant.work_data.read' ORDER BY issued_at DESC LIMIT 1`,[ids[2]]);
       if(command)break;await new Promise(resolve=>setTimeout(resolve,10));
     }
     if(!command){await operation;throw Error('Fixture PC command missing');}
     expect(command.device_id).toBe(a);
     await submitCommandResult(db,a,{commandId:command.command_id,status:'success',data:{revision:7,records:[],counts:{},next:null}} as any);
     return operation;
   }
   const initial=await read();expect(initial.deviceId).toBe(a);
   await db.query("UPDATE local_agent_devices SET last_seen_at=now()-interval '10 seconds' WHERE id=$1",[a]);
   await read(initial.deviceId);
   await db.query("UPDATE local_agent_devices SET last_seen_at=now()-interval '5 minutes' WHERE id=$1",[a]);
   await expect(pcWorkData(db,ids[2],localOwner,'read',{},a)).rejects.toMatchObject({code:'LOCAL_AGENT_OFFLINE'});
   await expect(pcWorkData(db,ids[1],{key:'user:'+ids[1],userId:ids[1],organizationId:null},'read',{},a)).rejects.toMatchObject({code:'WORK_DATA_PC_SOURCE_UNAVAILABLE'});
   expect((await db.query('SELECT result_data FROM local_agent_commands WHERE device_id=$1',[a])).every(row=>row.result_data===null)).toBe(true);
 });
 it('fences new domain tables and removes personal copies while preserving organizational copies',async()=>{
   const target=randomUUID(),admin=ids[0],targetOwner={key:'user:'+target,userId:target,organizationId:null};
   await db.query(`INSERT INTO users(id,email,name,status,"isActive","isEmailVerified") VALUES($1,$2,'Isolated work-copy erasure','active',true,true)`,[target,target+'@fixture.invalid']);
   await db.query("INSERT INTO role_assignments(user_id,role,is_active) VALUES($1,'platform:super_admin',true)",[admin]);
   const grant=await service.setConsent(target,targetOwner,true);
   await service.sync(target,targetOwner.key,grant.epoch,[change()]);await methodSharing(db,target,true);
   const organization={key:'organization:'+org,userId:null,organizationId:org};
   await service.setConsent(ids[0],organization,true);
   await db.query('UPDATE assistant_work_data_consents SET granted_by=$1 WHERE owner_key=$2',[target,organization.key]);
   await db.query("INSERT INTO service_memberships(user_id,service_key,role,status) VALUES($1,'neture','member','suspended')",[target]);
   const erasure=new AccountErasureService(db,{enabled:true,inventoryReviewed:true,systemYears:1,systemBasis:'isolated-synthetic-system',personalBuckets:[]});
   const gaps=await db.query(`SELECT gap.oid::regclass::text AS table_name FROM (${ERASURE_WRITER_GAPS_SQL}) gap`);
   expect(gaps.filter(row=>['assistant_work_data_consents','assistant_work_data_records','assistant_method_sharing_consents'].includes(row.table_name))).toEqual([]);
   // Current main has unrelated pre-existing writer gaps. Never repair or bypass
   // their production gate as part of this domain change. Exercise the reviewed
   // domain scan/purge in this disposable fixture; do not call it full erasure PASS.
   if(gaps.length){
     await expect(erasure.request(target,admin)).rejects.toMatchObject({code:'ACCOUNT_ERASURE_MIGRATION_REQUIRED'});
     expect((await db.query('SELECT "isActive" FROM users WHERE id=$1',[target]))[0].isActive).toBe(true);
   }
   const [subject]=await db.query('SELECT * FROM users WHERE id=$1',[target]);
   const codes=await (erasure as any).reviewManifest(db.manager,subject);
   expect(codes).toEqual(gaps.length?['WRITER_MANIFEST_REQUIRES_REFRESH']:[]);
   await db.transaction(async manager=>{await (erasure as any).removePrivateRows(manager,target);await manager.query('DELETE FROM users WHERE id=$1',[target]);});
   expect(await db.query('SELECT id FROM users WHERE id=$1',[target])).toHaveLength(0);
   expect(await db.query('SELECT owner_key FROM assistant_work_data_consents WHERE owner_key=$1',[targetOwner.key])).toHaveLength(0);
   expect(await db.query('SELECT id FROM assistant_work_data_records WHERE owner_key=$1',[targetOwner.key])).toHaveLength(0);
   expect(await db.query('SELECT user_id FROM assistant_method_sharing_consents WHERE user_id=$1',[target])).toHaveLength(0);
   expect((await db.query('SELECT enabled,granted_by FROM assistant_work_data_consents WHERE owner_key=$1',[organization.key]))[0]).toEqual({enabled:true,granted_by:null});
 });
 it('refuses a populated schema rollback without deleting existing work copies',async()=>{
   const q=db.createQueryRunner();await q.startTransaction();
   try{await expect(new CreateAssistantWorkData1793257200000().down(q)).rejects.toThrow('reviewed data migration');}
   finally{await q.rollbackTransaction();await q.release();}
   expect((await db.query('SELECT count(*)::int AS n FROM assistant_work_data_records'))[0].n).toBeGreaterThan(0);
 });
 it('reads and analyzes concurrently with a single pool connection',async()=>{
   const limited=new DataSource({type:'postgres',url:raw,extra:{max:1,connectionTimeoutMillis:500}});
   await limited.initialize();
   try{
     const scoped=new WorkDataService(limited);
     const results=await Promise.all(Array.from({length:8},(_,i)=>i%2?scoped.analysis(ids[0],owner):scoped.query(ids[0],owner,{limit:1})));
     expect(results).toHaveLength(8);expect(results.every(result=>result.location==='server')).toBe(true);
   }finally{await limited.destroy();}
 });
 it('checks membership for organization writes and deletes cloud copies on revoke',async()=>{
   const organization={key:'organization:'+org,userId:null,organizationId:org};
   await expect(service.setConsent(ids[1],organization,true)).rejects.toMatchObject({code:'WORK_DATA_FORBIDDEN'});
   await service.setConsent(ids[0],organization,true);
   const {epoch}=await service.consent(ids[0],owner);
   await service.setConsent(ids[0],owner,false);
   expect(await db.query('SELECT id FROM assistant_work_data_records WHERE owner_key=$1',[owner.key])).toHaveLength(0);
   await expect(service.sync(ids[0],owner.key,epoch,[])).rejects.toMatchObject({code:'WORK_DATA_CONSENT_REQUIRED'});
   const renewed=await service.setConsent(ids[0],owner,true);expect(renewed.epoch).not.toBe(epoch);
   await expect(service.sync(ids[0],owner.key,epoch,[])).rejects.toMatchObject({code:'WORK_DATA_CONSENT_REQUIRED'});
 });
 async function transitionFixture(){
   const user=randomUUID(),device=randomUUID();
   await db.query(`INSERT INTO users(id,email,name,status,"isActive","isEmailVerified") VALUES($1,$2,'합성 사용자','active',true,true)`,[user,user+'@fixture.invalid']);
   const capabilities={browser:false,windowsUia:false,localData:true,ownerScopedLedger:true,pharmacyData:true,serverAuthority:true};
   await db.query(`INSERT INTO local_agent_devices(id,user_id,platform,agent_version,status,last_seen_at,capabilities,credential_hash) VALUES($1,$2,'win32','0.6.0','active',now(),$3::jsonb,$4)`,[device,user,JSON.stringify(capabilities),randomBytes(32).toString('hex')]);
   return {user,device,owner:{key:'user:'+user,userId:user,organizationId:null}};
 }
 it('moves a designated PC once, hides partial data, and rejects reverse/local writes',async()=>{
   const f=await transitionFixture();
   const begin=await request(app).post('/work-data/consent').set('x-fixture-user',f.user).send({enabled:true,deviceId:f.device});
   expect(begin.status).toBe(200);expect(begin.body.data.storageMode).toBe('transferring');
   const epoch=begin.body.data.epoch;
   expect(await service.grants(f.user)).toEqual([]);expect(await service.grants(f.user,randomUUID())).toEqual([]);
   expect((await service.grants(f.user,f.device))[0].storageMode).toBe('transferring');
   await expect(service.sync(f.user,f.owner.key,epoch,[],0,{deviceId:randomUUID()})).rejects.toMatchObject({code:'WORK_DATA_FORBIDDEN'});
   const first=change();const upload=await service.sync(f.user,f.owner.key,epoch,[first],0,{deviceId:f.device});
   expect(upload.changes).toEqual([]);expect(upload.storageMode).toBe('transferring');
   expect((await service.sync(f.user,f.owner.key,epoch,[first],0,{deviceId:f.device})).accepted[0].version).toBe(upload.accepted[0].version);
   await expect(service.query(f.user,f.owner)).rejects.toMatchObject({code:'WORK_DATA_TRANSFERRING'});
   await expect(service.analysis(f.user,f.owner)).rejects.toMatchObject({code:'WORK_DATA_TRANSFERRING'});
   await service.sync(f.user,f.owner.key,epoch,[],0,{deviceId:f.device,complete:true});
   expect((await service.sync(f.user,f.owner.key,epoch,[],0,{deviceId:f.device,complete:true})).storageMode).toBe('server');
   expect((await readWorkData(db,f.user,f.owner)).location).toBe('server');
   await expect(pcWorkData(db,f.user,f.owner,'read',{},f.device)).rejects.toMatchObject({code:'WORK_DATA_NO_LOCAL_RETURN'});
   await expect(service.sync(f.user,f.owner.key,epoch,[{...change(),lane:'user'}],0,{deviceId:f.device})).rejects.toMatchObject({code:'WORK_DATA_NO_LOCAL_RETURN'});
   const save=await request(app).post('/work-data/save').set('x-fixture-user',f.user).send({location:'server',epoch,changes:[{lane:'user',entry:{kind:'sheet',data:{id:'mobile',title:'다른 기기 주문 준비',status:'draft',lines:[]}},expectedVersion:0,mutationId:randomUUID()}]});
   expect(save.status).toBe(200);expect((await service.query(f.user,f.owner)).records.some(r=>r.kind==='sheet')).toBe(true);
   const stale=await request(app).post('/work-data/save').set('x-fixture-user',f.user).send({deviceId:f.device,expectedOwner:f.owner.key,records:[],expectedRevision:1});
   expect(stale.status).toBe(409);expect(stale.body.code).toBe('WORK_DATA_NO_LOCAL_RETURN');
 });
 it('requires an explicit start choice, refuses old PC capability, and never restores a revoked checkpoint',async()=>{
   const f=await transitionFixture();
   expect((await request(app).post('/work-data/consent').set('x-fixture-user',f.user).send({enabled:true})).body.code).toBe('WORK_DATA_STORAGE_CHOICE_REQUIRED');
   await db.query(`UPDATE local_agent_devices SET capabilities=capabilities-'serverAuthority' WHERE id=$1`,[f.device]);
   expect((await request(app).post('/work-data/consent').set('x-fixture-user',f.user).send({enabled:true,deviceId:f.device})).body.code).toBe('PC_PROGRAM_UPDATE_REQUIRED');
   const c=await service.setConsent(f.user,f.owner,true,f.device);
   await service.sync(f.user,f.owner.key,c.epoch,[change()],0,{deviceId:f.device});
   expect((await service.setConsent(f.user,f.owner,false)).storageMode).toBe('stopped');
   await expect(readWorkData(db,f.user,f.owner)).rejects.toMatchObject({code:'WORK_DATA_STOPPED'});
   await expect(service.sync(f.user,f.owner.key,c.epoch,[],0,{deviceId:f.device,complete:true})).rejects.toMatchObject({code:'WORK_DATA_CONSENT_REQUIRED'});
   await expect(service.setConsent(f.user,f.owner,true,f.device)).rejects.toMatchObject({code:'WORK_DATA_NO_LOCAL_RETURN'});
   const restarted=await service.setConsent(f.user,f.owner,true);expect(restarted.storageMode).toBe('server');expect(restarted.sourceDeviceId).toBeNull();
   expect((await service.query(f.user,f.owner)).records).toEqual([]);expect(await service.grants(f.user,f.device)).toEqual([]);
 });
 it('preserves established server authority when a schema downgrade is requested',async()=>{
   const q=db.createQueryRunner();await q.startTransaction();
   try{await expect(new AddAssistantStorageAuthority1793322213345().down(q)).rejects.toThrow('reviewed data migration');}
   finally{await q.rollbackTransaction();await q.release();}
 });
});
