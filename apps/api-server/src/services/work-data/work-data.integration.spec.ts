import express from 'express';
import request from 'supertest';
import { createWorkDataRouter } from '../../routes/ai-proxy/work-data.routes.js';
jest.mock('../../middleware/auth.middleware.js',()=>({authenticate:(req,res,next)=>{const id=req.headers['x-fixture-user'];if(!id)return res.status(401).json({success:false});req.user={id};next();}}));
import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
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
});
