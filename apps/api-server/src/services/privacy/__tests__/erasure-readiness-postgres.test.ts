import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { AccountErasureService } from '../account-erasure.service.js';
import { ERASURE_WRITER_GAPS_SQL } from '../erasure-writer-manifest.js';

const integration=process.env.O4O_ERASURE_TEST_PORT==='55469'?describe:describe.skip;
integration('erasure readiness — disposable schema and synthetic accounts',()=>{
  let db:DataSource;
  const fixtureFences:Array<{schema:string;table:string}>=[];
  const quote=(s:string)=>'"'+s.replace(/"/g,'""')+'"';
  const service=()=>new AccountErasureService(db,{enabled:true,inventoryReviewed:true,systemYears:1,systemBasis:'isolated-system',personalBuckets:[]});
  beforeAll(async()=>{
    db=new DataSource({type:'postgres',host:'127.0.0.1',port:55469,username:'agent',database:'o4o_erasure_fixture',entities:[],synchronize:false});await db.initialize();
    const gaps=await db.query(`SELECT n.nspname AS schema,c.relname AS table FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.oid IN (${ERASURE_WRITER_GAPS_SQL})`);
    // Unchanged domains are isolated fixture assumptions, NOT a migration or an operational repair.
    for(const gap of gaps){await db.query(`CREATE TRIGGER account_erasure_write_fence BEFORE INSERT OR UPDATE ON ${quote(gap.schema)}.${quote(gap.table)} FOR EACH ROW EXECUTE FUNCTION public.account_erasure_write_fence()`);fixtureFences.push(gap);}
  });
  afterAll(async()=>{
    if(!db?.isInitialized)return;
    for(const gap of fixtureFences)await db.query(`DROP TRIGGER account_erasure_write_fence ON ${quote(gap.schema)}.${quote(gap.table)}`);
    await db.destroy();
  });
  it('forward migration repairs each of the three non-AI tables and the new counter table',async()=>{
    for(const table of ['cooperatives','member_paid_service_entitlements','store_consultation_stations','auth_rate_limit_counters']){
      const [row]=await db.query(`SELECT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=to_regclass($1) AND tgname='account_erasure_write_fence' AND tgenabled='O' AND tgfoid=to_regproc('public.account_erasure_write_fence')) AS ready`,['public.'+table]);expect(row.ready).toBe(true);
    }
    expect(await service().capabilities()).toEqual({enabled:true});
  });
  it('a disabled writer fence denies readiness and request BEFORE account deactivation or operation creation',async()=>{
    const id=randomUUID(),actor=randomUUID();await db.query(`INSERT INTO users(id,email,"isActive",status) VALUES($1,$2,true,'active')`,[id,id+'@fixture.invalid']);
    await db.query('ALTER TABLE public.store_consultation_stations DISABLE TRIGGER account_erasure_write_fence');
    try{
      expect(await service().capabilities()).toEqual({enabled:false});
      await expect(service().request(id,actor)).rejects.toMatchObject({code:'ACCOUNT_ERASURE_MIGRATION_REQUIRED'});
      expect((await db.query('SELECT "isActive" FROM users WHERE id=$1',[id]))[0].isActive).toBe(true);
      expect(await db.query('SELECT id FROM account_erasure_operations WHERE subject_id=$1',[id])).toHaveLength(0);
    }finally{await db.query('ALTER TABLE public.store_consultation_stations ENABLE TRIGGER account_erasure_write_fence');await db.query('DELETE FROM users WHERE id=$1',[id]);}
  });
  it('a misleading same-name trigger with a different function never establishes readiness',async()=>{
    await db.query('CREATE FUNCTION fixture_wrong_fence() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$');
    await db.query('DROP TRIGGER account_erasure_write_fence ON cooperatives');
    await db.query('CREATE TRIGGER account_erasure_write_fence BEFORE INSERT OR UPDATE ON cooperatives FOR EACH ROW EXECUTE FUNCTION fixture_wrong_fence()');
    try{expect(await service().capabilities()).toEqual({enabled:false});}
    finally{
      await db.query('DROP TRIGGER account_erasure_write_fence ON cooperatives');
      await db.query('CREATE TRIGGER account_erasure_write_fence BEFORE INSERT OR UPDATE ON cooperatives FOR EACH ROW EXECUTE FUNCTION public.account_erasure_write_fence()');
      await db.query('DROP FUNCTION fixture_wrong_fence()');
    }
  });
  it('a newly introduced unfenced writer table blocks readiness rather than being silently skipped',async()=>{
    await db.query('CREATE TABLE fixture_new_domain_writer(id uuid)');
    try{expect(await service().capabilities()).toEqual({enabled:false});}
    finally{await db.query('DROP TABLE fixture_new_domain_writer');}
    expect(await service().capabilities()).toEqual({enabled:true});
  });
  it('the right function on an AFTER or insert-only trigger is not a complete writer fence',async()=>{
    for(const events of ['AFTER INSERT OR UPDATE','BEFORE INSERT']){
      await db.query('DROP TRIGGER account_erasure_write_fence ON cooperatives');
      await db.query(`CREATE TRIGGER account_erasure_write_fence ${events} ON cooperatives FOR EACH ROW EXECUTE FUNCTION public.account_erasure_write_fence()`);
      try{expect(await service().capabilities()).toEqual({enabled:false});}
      finally{
        await db.query('DROP TRIGGER account_erasure_write_fence ON cooperatives');
        await db.query('CREATE TRIGGER account_erasure_write_fence BEFORE INSERT OR UPDATE ON cooperatives FOR EACH ROW EXECUTE FUNCTION public.account_erasure_write_fence()');
      }
    }
  });
});
