import { IsolatedPgHarness, isolatedPgUrl } from './helpers/isolated-pg-classifier-harness.js';
import { StoreOwnerTerminationService } from '../services/store-owner-termination.service.js';

const USER='11111111-1111-4111-8111-111111111111';
const USER2='11111111-1111-4111-8111-111111111112';
const ORG='22222222-2222-4222-8222-222222222222';
const ORG2='22222222-2222-4222-8222-222222222223';

async function seedIdentity(ds:any,userId:string,email:string,orgId:string,code:string,service:string,role:string,extraService?:string) {
  await ds.query(`INSERT INTO platform_services (code,name) VALUES ($1,$2) ON CONFLICT (code) DO NOTHING`,[service,`Fixture ${service}`]);
  if(extraService) {
    await ds.query(`INSERT INTO platform_services (code,name) VALUES ($1,$2) ON CONFLICT (code) DO NOTHING`,[extraService,`Fixture ${extraService}`]);
  }
  await ds.query(`INSERT INTO users (id,email) VALUES ($1,$2)`,[userId,email]);
  await ds.query(
    `INSERT INTO organizations (id,name,code,type,path,business_number,address,phone)
     VALUES ($1,$2,$3,'store',$4,'123-45-67890','서울 테스트 주소','02-000-0000')`,
    [orgId,'격리 테스트 매장',code,`/${code}`],
  );
  await ds.query(`INSERT INTO organization_members (organization_id,user_id,role,is_primary) VALUES ($1,$2,'owner',true)`,[orgId,userId]);
  await ds.query(`INSERT INTO role_assignments (user_id,role) VALUES ($1,$2)`,[userId,role]);
  await ds.query(`INSERT INTO organization_service_enrollments (organization_id,service_code,status) VALUES ($1,$2,'active')`,[orgId,service]);
  if(extraService) await ds.query(`INSERT INTO organization_service_enrollments (organization_id,service_code,status) VALUES ($1,$2,'active')`,[orgId,extraService]);
}

describe('store-owner termination isolated PostgreSQL lifecycle',()=>{
  const url=isolatedPgUrl();
  if(!url) {
    it.skip('requires O4O_ISOLATED_PG_URL',()=>{});
    return;
  }
  const harness=new IsolatedPgHarness(url);
  let db:string;
  let ds:any;

  beforeAll(async()=>{
    const templates=await harness.buildTemplates();
    db=await harness.createDatabase('store_term_int',templates.bootstrap_inc);
    ds=harness.dataSource(db);
    await ds.initialize();
  },120_000);

  afterAll(async()=>{
    if(ds?.isInitialized) await ds.destroy();
    await harness.cleanup();
  },60_000);

  it('deletes target-service rows but preserves organization-shared rows and operator originals when another Store service stays active',async()=>{
    await seedIdentity(ds,USER,'store1@example.test',ORG,'STOREINT1','kpa-society','kpa:store_owner','k-cosmetics');
    await ds.query(`INSERT INTO store_local_products (organization_id,name) VALUES ($1,'공용 매장상품')`,[ORG]);
    await ds.query(`INSERT INTO store_pops (store_id,service_key,author_role,title,slug,content) VALUES ($1,'kpa-society','store','매장 POP','store-pop','본문')`,[ORG]);
    await ds.query(`INSERT INTO store_pops (store_id,service_key,author_role,title,slug,content) VALUES (NULL,'kpa-society','operator','운영자 원본','operator-pop','원본')`);
    const service=new StoreOwnerTerminationService(ds);
    const now=new Date('2026-09-18T00:00:00Z');
    const c=await service.createCase({serviceKey:'kpa-society',organizationId:ORG,userId:USER,returnRequested:false,terminationEffectiveAt:now.toISOString()});
    const returned:any=await service.buildReturnPackage(c.id);
    expect(returned.format).toBe('O4O_STORE_OWNER_DATA_RETURN_V1');
    expect(returned.serviceKey).toBe('kpa-society');
    expect(returned.manifestHash).toMatch(/^[a-f0-9]{64}$/);
    await service.terminateCase(c.id,now);
    const preview=await service.previewPurge(c.id);
    expect(preview.hasOtherActiveStoreService).toBe(true);
    expect(preview.items.find(i=>i.key==='store_local_products')?.action).toBe('PRESERVE');
    await service.purgeCase(c.id,{dryRun:false,now:new Date('2026-09-26T00:00:00Z')});
    expect(Number((await ds.query(`SELECT COUNT(*) n FROM store_pops WHERE store_id=$1 AND author_role='store'`,[ORG]))[0].n)).toBe(0);
    expect(Number((await ds.query(`SELECT COUNT(*) n FROM store_pops WHERE store_id IS NULL AND author_role='operator' AND slug='operator-pop'`))[0].n)).toBe(1);
    expect(Number((await ds.query(`SELECT COUNT(*) n FROM store_local_products WHERE organization_id=$1`,[ORG]))[0].n)).toBe(1);
    expect((await ds.query(`SELECT status FROM organization_service_enrollments WHERE organization_id=$1 AND service_code='k-cosmetics'`,[ORG]))[0].status).toBe('active');
  },60_000);

  it('purges organization-shared Store data after the final Store service ends and anonymizes the now-unused organization',async()=>{
    await seedIdentity(ds,USER2,'store2@example.test',ORG2,'STOREINT2','pharmacy-hub','pharmacy-hub:store_owner');
    await ds.query(`INSERT INTO store_local_products (organization_id,name) VALUES ($1,'마지막 매장상품')`,[ORG2]);
    await ds.query(`INSERT INTO store_playlists (organization_id,name) VALUES ($1,'매장 플레이리스트')`,[ORG2]);
    const service=new StoreOwnerTerminationService(ds);
    const now=new Date('2026-09-18T00:00:00Z');
    const c=await service.createCase({serviceKey:'pharmacy-hub',organizationId:ORG2,userId:USER2,returnRequested:false,terminationEffectiveAt:now.toISOString()});
    const returned:any=await service.buildReturnPackage(c.id);
    expect(returned.format).toBe('O4O_STORE_OWNER_DATA_RETURN_V1');
    expect(returned.serviceKey).toBe('pharmacy-hub');
    await service.terminateCase(c.id,now);
    const preview=await service.previewPurge(c.id);
    expect(preview.hasOtherActiveStoreService).toBe(false);
    expect(preview.items.find(i=>i.key==='store_local_products')?.action).toBe('DELETE');
    await service.purgeCase(c.id,{dryRun:false,now:new Date('2026-09-26T00:00:00Z')});
    expect(Number((await ds.query(`SELECT COUNT(*) n FROM store_local_products WHERE organization_id=$1`,[ORG2]))[0].n)).toBe(0);
    expect(Number((await ds.query(`SELECT COUNT(*) n FROM store_playlists WHERE organization_id=$1`,[ORG2]))[0].n)).toBe(0);
    const org=(await ds.query(`SELECT name,business_number,address,phone,"isActive" FROM organizations WHERE id=$1`,[ORG2]))[0];
    expect(org).toEqual(expect.objectContaining({name:'종료된 매장',business_number:null,address:null,phone:null,isActive:false}));
    const member=(await ds.query(`SELECT left_at FROM organization_members WHERE organization_id=$1 AND user_id=$2`,[ORG2,USER2]))[0];
    expect(member.left_at).not.toBeNull();
    const term=(await ds.query(`SELECT status,purge_completed_at FROM store_owner_termination_cases WHERE id=$1`,[c.id]))[0];
    expect(term.status).toBe('purge_completed');
    expect(term.purge_completed_at).not.toBeNull();
  },60_000);
});
