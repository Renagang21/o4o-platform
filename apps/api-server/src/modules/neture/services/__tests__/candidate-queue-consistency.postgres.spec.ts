import 'reflect-metadata';
import { DataSource, Entity, PrimaryColumn } from 'typeorm';
import { randomUUID } from 'crypto';
import { ProductCandidate } from '../../entities/ProductCandidate.entity.js';
import { ProductCandidateService } from '../product-candidate.service.js';
import { inboxTaskSources } from '../../../contact-inquiry/inbox-tasks.js';
import { DESCRIPTION_INTAKE_LABEL } from '../../product-description-intake/namespace.js';
@Entity('product_masters')
class ProductMaster { @PrimaryColumn('uuid') id!: string; }
const socket=process.env.CANDIDATE_QUEUE_TEST_SOCKET;
const suite=socket ? describe : describe.skip;
suite('candidate backlog and actionable list use the same local PostgreSQL rows',()=>{
 let db:DataSource, service:ProductCandidateService;
 const schema=`candidate_queue_${randomUUID().replace(/-/g,'')}`;
 beforeAll(async()=>{
  if(!socket?.startsWith('/tmp/')) throw new Error('Dedicated local test socket required');
  db=new DataSource({type:'postgres',host:socket,port:33457,username:'agent',database:'admin_queue_test',schema,entities:[ProductCandidate,ProductMaster],extra:{options:`-c search_path=${schema},public`}});
  await db.initialize();await db.query(`CREATE SCHEMA ${schema}`);await db.synchronize();
  const base={sourceType:'unknown' as const,candidateStatus:'pending' as const,candidateName:'synthetic'};
  await db.getRepository(ProductCandidate).save([
   {...base,serviceKey:'neture',candidateName:'service candidate'},
   {...base,serviceKey:null,candidateName:'shared candidate'},
   {...base,serviceKey:'neture',deletedAt:new Date()},
   {...base,serviceKey:null,sourceLabel:DESCRIPTION_INTAKE_LABEL},
   {...base,serviceKey:'another-service'},
   {...base,serviceKey:'neture',candidateStatus:'archived'},
   {...base,serviceKey:'neture',candidateStatus:'reviewing'},
  ]);
  service=new ProductCandidateService(db);
 });
 afterAll(async()=>{if(db?.isInitialized){await db.query(`DROP SCHEMA ${schema} CASCADE`);await db.destroy();}});
 it('counts only pending visible candidates including the shared queue',async()=>{
  const source=inboxTaskSources({kind:'service',key:'neture',serviceKey:'neture'} as any).find(task=>task.key==='product-candidates')!;
  const [count]=await db.query(source.sql,source.params);
  const list=await service.findCandidates({serviceKey:'neture',includeShared:true,scopeServiceKeys:['neture'],candidateStatus:'pending'});
  expect(Number(count.count)).toBe(2);expect(list.total).toBe(2);
  expect(list.items.map(item=>item.candidateName).sort()).toEqual(['service candidate','shared candidate']);
 });
 it('keeps the strict service filter unchanged and searches shared candidates across pages',async()=>{
  const strict=await service.findCandidates({serviceKey:'neture',candidateStatus:'pending'});expect(strict.total).toBe(1);
  const filter={serviceKey:'neture',includeShared:true,candidateStatus:'pending' as const,limit:1};
  const first=await service.findCandidates({...filter,page:1});const next=await service.findCandidates({...filter,page:2});
  expect(first.total).toBe(2);expect(next.total).toBe(2);expect(first.items[0].id).not.toBe(next.items[0].id);
  const search=await service.findCandidates({...filter,search:'shared'});expect(search.total).toBe(1);expect(search.items[0].serviceKey).toBeNull();
 });
});
