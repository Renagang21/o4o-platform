jest.mock('../../../../database/connection.js',()=>({AppDataSource:{getRepository:jest.fn()}}));
jest.mock('../../../../middleware/auth.middleware.js',()=>({
 authenticate:(req:any,res:any,next:any)=>{if(!req.headers['x-test-user'])return res.status(401).json({error:'AUTH_REQUIRED'});req.user={id:req.headers['x-test-user']};next();},
 requireRole:()=> (_req:any,_res:any,next:any)=>next(),
}));
jest.mock('../../../../utils/serviceScope.js',()=>({...jest.requireActual('../../../../utils/serviceScope.js'),injectServiceScope:(req:any,_res:any,next:any)=>{req.serviceScope={isPlatformAdmin:false,serviceKeys:['neture']};next();}}));
jest.mock('../../../../middleware/central-operation-menu.middleware.js',()=>({centralScopedNetureRequest:()=> (req:any,res:any,next:any)=>req.headers['x-menu-access']==='denied'?res.status(403).json({error:'MENU_REVOKED'}):next()}));
import express from 'express';
import request from 'supertest';
import { createProductCandidateController } from '../../controllers/product-candidate.controller.js';
import 'reflect-metadata';
import { DataSource, Entity, PrimaryColumn } from 'typeorm';
import { randomUUID } from 'crypto';
import { ProductCandidate } from '../../entities/ProductCandidate.entity.js';
import { CandidateWorkflowService, candidateFilter } from '../candidate-workflow.service.js';
import { candidateTriage } from '../candidate-triage.js';
import { inboxTaskSources } from '../../../contact-inquiry/inbox-tasks.js';
import { DESCRIPTION_INTAKE_LABEL } from '../../product-description-intake/namespace.js';
@Entity('product_masters') class ProductMaster { @PrimaryColumn('uuid') id!:string; }
const socket=process.env.CANDIDATE_QUEUE_TEST_SOCKET;
const ci=process.env.CI==='true' && process.env.CANDIDATE_WORKFLOW_CI_PORT==='55432';
const suite=socket||ci?describe:describe.skip;
suite('candidate whole-query workflows — dedicated local PostgreSQL',()=>{
 let db:DataSource, workflow:CandidateWorkflowService, app:express.Express;
 const schema=`workflow_${randomUUID().replace(/-/g,'')}`,actor=randomUUID();
 const filter={serviceKey:'neture',includeShared:true,scopeServiceKeys:['neture'],candidateStatus:'pending' as const};
 const device=(name='synthetic device')=>({candidateName:name,sourceType:'external_api' as const,sourceLabel:'MFDS_MEDICAL_DEVICE_STANDARD_CODE',candidateStatus:'pending' as const,serviceKey:null,rawPayload:{regulatoryType:'MEDICAL_DEVICE',reviewFlags:['STATUS_UNCHECKED','UDI_DI_MISSING']}});
 beforeAll(async()=>{
  if(!ci && !socket?.startsWith('/tmp/'))throw Error('Dedicated local socket required');
  db=new DataSource({type:'postgres',host:ci?'127.0.0.1':socket,port:ci?55432:33457,username:'agent',database:ci?'postgres':'admin_queue_test',schema,entities:[ProductCandidate,ProductMaster],extra:{options:`-c search_path=${schema},public`}});
  await db.initialize();await db.query(`CREATE SCHEMA ${schema}`);await db.synchronize();workflow=new CandidateWorkflowService(db);app=express();app.use(express.json());app.use('/candidates',createProductCandidateController(db));
 });
 beforeEach(async()=>{await db.query('TRUNCATE product_candidates, product_masters');});
 afterAll(async()=>{if(db?.isInitialized){await db.query(`DROP SCHEMA ${schema} CASCADE`);await db.destroy();}});
 const previewFor=(query:Parameters<CandidateWorkflowService['preview']>[0],selection:Parameters<CandidateWorkflowService['preview']>[1])=>workflow.preview(query,selection,actor);
 const seed=async(rows:object[])=>db.getRepository(ProductCandidate).save(rows);
 it('separates intake, sources and overlapping reasons from operator requests',async()=>{
  await seed([device(),{...device(),serviceKey:'another-service'}, {...device(),sourceLabel:DESCRIPTION_INTAKE_LABEL},{...device(),sourceType:'supplier_web',sourceLabel:'supplier-single'},{...device(),sourceLabel:'mfds-drug-master-standard-code-v1'}]);
  const summary=await workflow.summary(filter);expect(summary).toMatchObject({total:3,intake:1,review:2});
  expect(summary.reasons).toContainEqual({code:'STATUS_UNCHECKED',label:'허가 상태 미확인',count:3});
  const {ProductCandidateService}=await import('../product-candidate.service.js');
  const intake=await new ProductCandidateService(db).findCandidates({...filter,queue:'intake',reason:'UDI_DI_MISSING'});expect(intake.total).toBe(1);
  expect(candidateTriage(intake.items[0])).toMatchObject({queue:'intake',registration:'unsupported',medicalDevice:true,reasons:expect.arrayContaining(['현재 화면의 상품 등록 경로 미지원','허가 상태 미확인','UDI 식별자 누락'])});
 });
 it('keeps unrecognized and unlabelled external API requests in the operational queue',async()=>{
  await seed([{...device('partner API request'),sourceLabel:'PARTNER_CANDIDATE_API',rawPayload:{}},{...device('unlabelled request'),sourceLabel:null,rawPayload:{}}]);
  expect(await workflow.summary(filter)).toMatchObject({total:2,intake:0,review:2});
  const {ProductCandidateService}=await import('../product-candidate.service.js');
  const review=await new ProductCandidateService(db).findCandidates({...filter,queue:'review'});
  expect(review.total).toBe(2);expect(review.items.every(item=>candidateTriage(item).queue==='review')).toBe(true);
 });
 it('updates more than 10,000 matching rows in one transaction, preserving other services and registered candidates',async()=>{
  const rows=Array.from({length:10021},()=>device());
  for(let i=0;i<rows.length;i+=500)await db.getRepository(ProductCandidate).insert(rows.slice(i,i+500));
  await seed([{...device('other'),serviceKey:'another-service'},{...device('completed'),candidateStatus:'approved_new_master'},{...device('namespace'),sourceLabel:DESCRIPTION_INTAKE_LABEL}]);
  const preview=await previewFor({...filter,queue:'intake'},{action:'archive'});expect(preview.count).toBe(10021);
  const result=await workflow.execute({...filter,queue:'intake'},{...preview,expectedCount:preview.count},actor);expect(result.updated).toBe(10021);
  expect(await db.getRepository(ProductCandidate).countBy({candidateStatus:'archived'})).toBe(10021);
  expect(await db.getRepository(ProductCandidate).countBy({candidateStatus:'pending'})).toBe(2);
  expect(await db.getRepository(ProductMaster).count()).toBe(0);
  await expect(workflow.execute({...filter,queue:'intake'},{...preview,expectedCount:preview.count},actor)).rejects.toMatchObject({code:'SELECTION_CHANGED'});
 },30000);
 it('excludes new candidates after preview and records a review note without registering a product',async()=>{
  await seed([device()]);const preview=await previewFor(filter,{action:'hold',note:'허가 상태 확인 필요'});
  await seed([device('new arrival')]);
  await workflow.execute(filter,{...preview,expectedCount:1,note:'허가 상태 확인 필요'},actor);
  const held=await db.getRepository(ProductCandidate).findOneByOrFail({candidateStatus:'reviewing'});expect(held.reviewNote).toBe('허가 상태 확인 필요');expect(held.reviewedBy).toBe(actor);
  expect(await db.getRepository(ProductCandidate).countBy({candidateStatus:'pending'})).toBe(1);
  const source=inboxTaskSources({kind:'service',key:'neture',serviceKey:'neture'} as any).find(task=>task.key==='product-candidate-intake')!;
  const [count]=await db.query(source.sql,source.params);expect(Number(count.count)).toBe(2);expect(source.href).toContain('status=active');
 });
 it('rejects a changed snapshot atomically, even if updated_at is deliberately preserved',async()=>{
  const [one]=await seed([device('one'),device('two')]);const preview=await previewFor(filter,{action:'archive'});
  await db.query('UPDATE product_candidates SET review_note=$1 WHERE id=$2',['changed',one.id]);
  await expect(workflow.execute(filter,{...preview,expectedCount:2},actor)).rejects.toMatchObject({code:'SELECTION_CHANGED'});
  expect(await db.getRepository(ProductCandidate).countBy({candidateStatus:'archived'})).toBe(0);
 });
 it('excludes already linked candidates even if their stored status is pending',async()=>{
  const masterId=randomUUID();await db.getRepository(ProductMaster).save({id:masterId});
  const [candidate]=await seed([{...device(),matchedProductMasterId:masterId}]);
  expect((await previewFor(filter,{action:'archive'})).count).toBe(0);
  expect(candidateTriage(candidate).reasons).toEqual(['상품 등록·연결 완료']);
 });
 it('binds confirmation to the actor and query scope',async()=>{
  await seed([device()]);const preview=await previewFor(filter,{action:'archive'});
  await expect(workflow.execute(filter,{...preview,expectedCount:1},randomUUID())).rejects.toMatchObject({code:'SELECTION_CHANGED'});
  await expect(workflow.execute({...filter,queue:'intake'},{...preview,expectedCount:1},actor)).rejects.toMatchObject({code:'SELECTION_CHANGED'});
  await expect(workflow.execute(filter,{...preview,expectedCount:1,note:'다른 내용'},actor)).rejects.toMatchObject({code:'SELECTION_CHANGED'});
  expect(await db.getRepository(ProductCandidate).countBy({candidateStatus:'pending'})).toBe(1);
 });
 it('allows only one concurrent execution of the same preview',async()=>{
  await seed([device()]);const preview=await previewFor(filter,{action:'review'});
  const results=await Promise.allSettled([workflow.execute(filter,{...preview,expectedCount:1},actor),workflow.execute(filter,{...preview,expectedCount:1},actor)]);
  expect(results.filter(result=>result.status==='fulfilled')).toHaveLength(1);expect(results.filter(result=>result.status==='rejected')).toHaveLength(1);
 });
 it('requires fresh confirmation, notes for hold/reject and exact eligible counts',async()=>{
  await seed([device()]);const preview=await previewFor(filter,{action:'reject'});
  await expect(workflow.execute(filter,{...preview,expectedCount:1},actor)).rejects.toMatchObject({code:'REVIEW_NOTE_REQUIRED'});
  await expect(workflow.execute(filter,{...preview,expectedCount:2,note:'not a product'},actor)).rejects.toMatchObject({code:'SELECTION_CHANGED'});
  await expect(workflow.execute(filter,{...preview,cutoff:'2020-01-01',expectedCount:1,note:'not a product'},actor)).rejects.toMatchObject({code:'PREVIEW_EXPIRED'});
  expect(await db.getRepository(ProductCandidate).countBy({candidateStatus:'pending'})).toBe(1);
 });
 it('protects the summary and whole-query HTTP endpoints and rechecks delegation before execution',async()=>{
  await seed([device()]);
  await request(app).get('/candidates/workflow-summary?serviceKey=neture&includeShared=true').expect(401);
  await request(app).post('/candidates/workflow-preview').send({filter:{serviceKey:'neture'},action:'review'}).expect(401);
  await request(app).get('/candidates/workflow-summary?serviceKey=neture&includeShared=true').set('x-test-user',actor).expect(200).expect(response=>expect(response.body.data.intake).toBe(1));
  await request(app).post('/candidates/workflow-preview').set('x-test-user',actor).send({filter:{serviceKey:'another-service'},action:'review'}).expect(403);
  const response=await request(app).post('/candidates/workflow-preview').set('x-test-user',actor).send({filter:{serviceKey:'neture',includeShared:true,status:'pending'},action:'review'}).expect(200);
  const payload={filter:{serviceKey:'neture',includeShared:true,status:'pending'},...response.body.data,expectedCount:1};
  await request(app).post('/candidates/workflow-execute').set('x-test-user',actor).set('x-menu-access','denied').send(payload).expect(403);
  expect(await db.getRepository(ProductCandidate).countBy({candidateStatus:'pending'})).toBe(1);
  await request(app).post('/candidates/workflow-execute').set('x-test-user',actor).send(payload).expect(200).expect(result=>expect(result.body.data.updated).toBe(1));
 });
 it('validates malformed HTTP filters and preserves existing list pagination cap',async()=>{
  await seed([device()]);
  for(const filter of [[],{serviceKey:'neture',queue:'invalid'},{serviceKey:'neture',sourceType:'invalid'},{serviceKey:'neture',status:false},{serviceKey:'neture',groupedStatus:'toString'}])await request(app).post('/candidates/workflow-preview').set('x-test-user',actor).send({filter,action:'review'}).expect(400);
  await request(app).get('/candidates?serviceKey=other').set('x-test-user',actor).expect(403);
  const response=await request(app).get('/candidates?serviceKey=neture&includeShared=true&limit=200').set('x-test-user',actor).expect(200);
  expect(response.body.data.items[0].triage).toMatchObject({queue:'intake',medicalDevice:true});
 });
 it('appends review notes instead of erasing an earlier review',async()=>{
  await seed([{...device(),reviewNote:'기존 검토 기록'}]);const preview=await previewFor(filter,{action:'hold',note:'허가 상태 확인 필요'});
  await workflow.execute(filter,{...preview,expectedCount:1,note:'허가 상태 확인 필요'},actor);
  expect((await db.getRepository(ProductCandidate).findOneByOrFail({candidateStatus:'reviewing'})).reviewNote).toBe('기존 검토 기록\n허가 상태 확인 필요');
 });
 it('scopes selected IDs and literal search to the same query as the displayed list',async()=>{
  const [one,other]=await seed([device('literal %'),{...device('literal other'),serviceKey:'another-service'},device('ordinary own candidate')]);
  const preview=await previewFor({...filter,search:'%'},{action:'review',ids:[one.id,other.id]});expect(preview.count).toBe(1);
  await workflow.execute({...filter,search:'%'},{...preview,ids:[one.id,other.id],expectedCount:1},actor);
  expect((await db.getRepository(ProductCandidate).findOneByOrFail({id:other.id})).candidateStatus).toBe('pending');
 });
});
describe('candidate filter authorization',()=>{
 const scoped={isPlatformAdmin:false,serviceKeys:['neture']} as any;
 it('rejects another service and malformed filters rather than widening scope',()=>{
  expect(()=>candidateFilter(scoped,{serviceKey:'other',includeShared:true})).toThrow('SERVICE_SCOPE_DENIED');
  expect(()=>candidateFilter(scoped,{queue:['intake']})).toThrow('INVALID_FILTER');
  expect(()=>candidateFilter(scoped,{queue:'anything'})).toThrow('INVALID_QUEUE');
  expect(()=>candidateFilter({isPlatformAdmin:true,serviceKeys:[]} as any,{})).toThrow('SERVICE_SCOPE_REQUIRED');
  expect(candidateFilter(scoped,{serviceKey:'neture',includeShared:true,queue:'intake'})).toMatchObject({serviceKey:'neture',scopeServiceKeys:['neture'],includeShared:true,queue:'intake'});
 });
});
