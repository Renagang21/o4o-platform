import { DataSource, type QueryRunner } from 'typeorm';
import { RenameDrugstoreCooperation1793457683032 as Migration, drugstoreJson } from '../database/migrations/1793457683032-RenameDrugstoreCooperation.js';

const suite = process.env.O4O_DRUGSTORE_RENAME_IT === '1' ? describe : describe.skip;
suite('Drugstore identity transition (isolated PostgreSQL)', () => {
  let db: DataSource, q: QueryRunner;
  const org='00000000-0000-4000-8000-000000000001', business='00000000-0000-4000-8000-000000000002';
  beforeAll(async () => {
    db=new DataSource({type:'postgres',host:'127.0.0.1',port:Number(process.env.DRUGSTORE_TEST_PORT || 55481),username:'postgres',database:'drugstore_rename_test',entities:[]});
    await db.initialize();q=db.createQueryRunner();
    if ((await q.query("SELECT 1 FROM information_schema.tables WHERE table_schema='public'")).length) throw new Error('Use an empty dedicated Drugstore test database');
    await q.query(`CREATE TABLE organizations(id uuid PRIMARY KEY,name text,code text,metadata jsonb);
      CREATE TABLE semi_franchises(id uuid PRIMARY KEY,key text UNIQUE,name text,organization_id uuid REFERENCES organizations,community_key text);
      CREATE TABLE semi_franchise_memberships(id uuid PRIMARY KEY,semi_franchise_id uuid REFERENCES semi_franchises,status text);
      CREATE TABLE role_assignments(id uuid PRIMARY KEY,role text);
      CREATE TABLE notifications(id uuid PRIMARY KEY,"serviceKey" text,metadata jsonb);
      CREATE TABLE service_contact_settings(id uuid PRIMARY KEY,service_key text UNIQUE);
      CREATE TABLE action_logs(id uuid PRIMARY KEY,metadata jsonb)`);
  });
  beforeEach(async () => {
    await q.startTransaction();
    await q.query("INSERT INTO organizations VALUES($1,'메가팜','semi-franchise-megapharm','{}')",[org]);
    await q.query("INSERT INTO semi_franchises VALUES($1,'megapharm','메가팜 · 창고형약국',$2,'business:megapharm')",[business,org]);
    await q.query("INSERT INTO semi_franchise_memberships VALUES($1,$2,'suspended')",[org,business]);
  });
  afterEach(async () => {if(q.isTransactionActive)await q.rollbackTransaction();});
  afterAll(async () => {
    if(q?.isTransactionActive)await q.rollbackTransaction();
    if(q) {await q.query('DROP TABLE action_logs,service_contact_settings,notifications,role_assignments,semi_franchise_memberships,semi_franchises,organizations');await q.release();}
    if(db?.isInitialized)await db.destroy();
  });
  it('keeps UUID relationships and suspended decisions while renaming the business and organization',async () => {
    await new Migration().up(q);
    expect(await q.query('SELECT id,key,name,community_key FROM semi_franchises')).toEqual([{id:business,key:'drugstore',name:'드럭스토어형 약국',community_key:'business:drugstore'}]);
    expect((await q.query('SELECT code FROM organizations'))[0].code).toBe('semi-franchise-drugstore');
    expect((await q.query('SELECT semi_franchise_id,status FROM semi_franchise_memberships'))[0]).toEqual({semi_franchise_id:business,status:'suspended'});
  });
  it('moves roles, inbox scope and nested destinations without changing unrelated business or audit history',async () => {
    await q.query("INSERT INTO role_assignments VALUES($1,'neture:megapharm_operator')",[org]);
    const metadata={businessKey:'megapharm',href:'https://megapharm.neture.co.kr/community',nested:['business:megapharm','neture:megapharm_admin'],other:'carepharm'};
    await q.query('INSERT INTO notifications VALUES($1,$2,$3::jsonb)',[org,'megapharm',JSON.stringify(metadata)]);
    await q.query('INSERT INTO action_logs VALUES($1,$2::jsonb)',[org,JSON.stringify(metadata)]);
    await new Migration().up(q);
    expect((await q.query('SELECT role FROM role_assignments'))[0].role).toBe('neture:drugstore_operator');
    expect((await q.query('SELECT "serviceKey",metadata FROM notifications'))[0]).toEqual({serviceKey:'drugstore',metadata:{businessKey:'drugstore',href:'https://drugstore.neture.co.kr/community',nested:['business:drugstore','neture:drugstore_admin'],other:'carepharm'}});
    expect((await q.query('SELECT metadata FROM action_logs'))[0].metadata).toEqual(metadata);
  });
  it('can be repeated without creating another business or membership',async () => {
    await new Migration().up(q);await new Migration().up(q);
    expect((await q.query('SELECT count(*)::int AS count FROM semi_franchises'))[0].count).toBe(1);
    expect((await q.query('SELECT count(*)::int AS count FROM semi_franchise_memberships'))[0].count).toBe(1);
  });
  it('refuses two existing business identities before modifying either',async () => {
    await q.query("INSERT INTO semi_franchises VALUES($1,'drugstore','기존 대상',$2,null)",[org,org]);
    await expect(new Migration().up(q)).rejects.toThrow('Both legacy');
    expect((await q.query("SELECT name FROM organizations"))[0].name).toBe('메가팜');
  });
  it('rolls back all earlier changes when a destination service scope already exists',async () => {
    await q.query("INSERT INTO service_contact_settings VALUES($1,'megapharm'),($2,'drugstore')",[org,business]);
    await expect(new Migration().up(q)).rejects.toThrow();
    await q.rollbackTransaction();
    expect(await q.query('SELECT id FROM semi_franchises')).toEqual([]);
  });
  it('does not rewrite unrelated values or manufacture consent/approval',() => {
    expect(drugstoreJson({name:'오메가팜',status:'rejected',accepted:false,key:'carepharm'})).toEqual({name:'오메가팜',status:'rejected',accepted:false,key:'carepharm'});
  });
});
