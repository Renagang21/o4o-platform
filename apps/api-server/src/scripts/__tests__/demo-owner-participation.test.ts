import { Client } from 'pg';
import { PUBLIC_DEMO_ACCOUNTS } from '@o4o/auth-utils';
import { runDemoOwnerParticipation } from '../demo-owner-participation.service';

it('requires an exact digest before any apply query',async()=>{
  const client={query:jest.fn()};
  await expect(runDemoOwnerParticipation(client,{apply:true})).rejects.toThrow('EXACT_PLAN_DIGEST_REQUIRED');
  expect(client.query).not.toHaveBeenCalled();
});

// Owned, disposable PostgreSQL only. Never accept production connection bindings.
const enabled=process.env.O4O_DEMO_PARTICIPATION_TEST_DB==='o4o_demo_participation_fixture';
(enabled?describe:describe.skip)('owner participation on isolated PostgreSQL 15',()=>{
  const pg=new Client({host:'127.0.0.1',port:55447,user:'postgres',database:'o4o_demo_participation_fixture'});
  const client={query:async(sql:string,params?:unknown[])=>(await pg.query(sql,params)).rows};
  let owner:string,other:string,org:string;
  beforeAll(async()=>{
    await pg.connect();
    await pg.query(`CREATE TABLE users(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),email text,status text,"isActive" boolean,"isEmailVerified" boolean);
      CREATE TABLE demo_accounts(user_id uuid REFERENCES users(id),demo_type text,is_active boolean);
      CREATE TABLE organization_members(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid,user_id uuid REFERENCES users(id),role text,left_at timestamptz);
      CREATE TABLE neture_pharmacy_memberships(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid UNIQUE,applicant_user_id uuid REFERENCES users(id),status text);
      CREATE TABLE service_memberships(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES users(id),service_key text,status text,role text,UNIQUE(user_id,service_key));
      CREATE TABLE semi_franchises(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),key text UNIQUE,status text);
      CREATE TABLE semi_franchise_memberships(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),semi_franchise_id uuid REFERENCES semi_franchises(id),organization_id uuid,status text,applied_by uuid,applied_at timestamptz,decided_at timestamptz,reason text,UNIQUE(semi_franchise_id,organization_id));
      CREATE TABLE canonical_demo_repair_snapshots(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),migration text UNIQUE,snapshot jsonb);
      CREATE TABLE organizations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),type text);
      CREATE TABLE neture_suppliers(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid REFERENCES organizations(id),status text);
      CREATE TABLE kpa_organizations(id uuid PRIMARY KEY DEFAULT gen_random_uuid());
      CREATE TABLE branch_memberships(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid REFERENCES kpa_organizations(id),user_id uuid REFERENCES users(id),status text);
      CREATE TABLE protected_fixture_data(id text PRIMARY KEY,credential text,role text,owner_id uuid);`);
  });
  afterAll(async()=>{await pg.end();});
  beforeEach(async()=>{
    await pg.query('TRUNCATE users,demo_accounts,organization_members,neture_pharmacy_memberships,service_memberships,semi_franchises,semi_franchise_memberships,canonical_demo_repair_snapshots,protected_fixture_data,organizations,neture_suppliers,kpa_organizations,branch_memberships CASCADE');
    owner=(await pg.query(`INSERT INTO users(email,status,"isActive","isEmailVerified") VALUES($1,'active',true,true) RETURNING id`,[PUBLIC_DEMO_ACCOUNTS.find(a=>a.type==='STORE_OWNER')!.email])).rows[0].id;
    other=(await pg.query(`INSERT INTO users(email,status,"isActive","isEmailVerified") VALUES('unrelated@example.test','active',true,true) RETURNING id`)).rows[0].id;
    org=(await pg.query('SELECT gen_random_uuid() AS id')).rows[0].id;
    await pg.query("INSERT INTO demo_accounts VALUES($1,'STORE_OWNER',true)",[owner]);
    await pg.query("INSERT INTO organization_members(organization_id,user_id,role) VALUES($1,$2,'owner')",[org,owner]);
    await pg.query("INSERT INTO neture_pharmacy_memberships(organization_id,applicant_user_id,status) VALUES($1,$2,'active')",[org,owner]);
    await pg.query("INSERT INTO service_memberships(user_id,service_key,status,role) VALUES($1,'neture','active','customer'),($2,'community','suspended','member')",[owner,other]);
    await pg.query("INSERT INTO semi_franchises(key,status) VALUES('carepharm','active'),('drugstore','active')");
    await pg.query("INSERT INTO protected_fixture_data VALUES('sentinel','never-touch','platform:super_admin',$1)",[other]);
  });
  const count=async(table:string)=>Number((await pg.query(`SELECT count(*) AS n FROM ${table}`)).rows[0].n);

  it('plans read-only, applies four scoped rows plus recovery, preserves others, and is idempotent',async()=>{
    const original=(await pg.query('SELECT * FROM service_memberships ORDER BY id')).rows;
    const protectedRows=(await pg.query('SELECT * FROM protected_fixture_data')).rows;
    const plan=await runDemoOwnerParticipation(client);
    expect(plan.participationWrites).toBe(4);
    expect(await count('canonical_demo_repair_snapshots')).toBe(0);
    expect((await pg.query('SELECT * FROM service_memberships ORDER BY id')).rows).toEqual(original);
    const result=await runDemoOwnerParticipation(client,{apply:true,expectedDigest:plan.digest});
    expect(result).toMatchObject({verified:true,writes:5});
    expect((await pg.query('SELECT * FROM protected_fixture_data')).rows).toEqual(protectedRows);
    for(const row of original) expect((await pg.query('SELECT * FROM service_memberships WHERE id=$1',[row.id])).rows[0]).toEqual(row);
    const recovery=(await pg.query('SELECT snapshot FROM canonical_demo_repair_snapshots')).rows[0].snapshot;
    expect(recovery.added).toHaveLength(4);
    expect(recovery.before.registry[0].user_id).toBe(owner);
    expect(JSON.stringify(result)).not.toContain(owner);
    expect(JSON.stringify(result)).not.toContain(org);
    const next=await runDemoOwnerParticipation(client);
    expect(next.participationWrites).toBe(0);
    expect(await runDemoOwnerParticipation(client,{apply:true,expectedDigest:next.digest})).toMatchObject({verified:true,writes:0});
    expect(await count('canonical_demo_repair_snapshots')).toBe(1);
  });

  it.each(['pending','suspended','rejected','withdrawn'])('refuses existing %s service state',async(status)=>{
    await pg.query("INSERT INTO service_memberships(user_id,service_key,status,role) VALUES($1,'community',$2,'member')",[owner,status]);
    await expect(runDemoOwnerParticipation(client)).rejects.toThrow('EXISTING_SERVICE_STATE_REQUIRES_REVIEW');
    expect(await count('semi_franchise_memberships')).toBe(0);
  });
  it('refuses existing nonactive business state',async()=>{
    await pg.query("INSERT INTO semi_franchise_memberships(semi_franchise_id,organization_id,status) SELECT id,$1,'suspended' FROM semi_franchises WHERE key='carepharm'",[org]);
    await expect(runDemoOwnerParticipation(client)).rejects.toThrow('EXISTING_BUSINESS_STATE_REQUIRES_REVIEW');
  });
  it('refuses changed before-image without partial writes',async()=>{
    const plan=await runDemoOwnerParticipation(client);
    await pg.query("INSERT INTO service_memberships(user_id,service_key,status,role) VALUES($1,'lecture','active','customer')",[owner]);
    await expect(runDemoOwnerParticipation(client,{apply:true,expectedDigest:plan.digest})).rejects.toThrow('BEFORE_IMAGE_CHANGED_REPLAN');
    expect(await count('semi_franchise_memberships')).toBe(0);
    expect(await count('canonical_demo_repair_snapshots')).toBe(0);
  });
  it('rejects ambiguous registry and foreign identity',async()=>{
    await pg.query("INSERT INTO demo_accounts VALUES($1,'STORE_OWNER',true)",[other]);
    await expect(runDemoOwnerParticipation(client)).rejects.toThrow('AMBIGUOUS_OWNER_DEMO');
  });
  it('rejects an unverified account',async()=>{
    await pg.query('UPDATE users SET "isEmailVerified"=false WHERE id=$1',[owner]);
    await expect(runDemoOwnerParticipation(client)).rejects.toThrow('OWNER_NOT_ACTIVE');
  });
  it('rolls back inserted memberships if recovery storage fails',async()=>{
    const plan=await runDemoOwnerParticipation(client);
    const broken={query:async(sql:string,params?:unknown[])=>{
      if(sql.startsWith('INSERT INTO canonical_demo_repair_snapshots')) throw Error('RECOVERY_WRITE_FAILED');
      return client.query(sql,params);
    }};
    await expect(runDemoOwnerParticipation(broken,{apply:true,expectedDigest:plan.digest})).rejects.toThrow('RECOVERY_WRITE_FAILED');
    expect((await runDemoOwnerParticipation(client)).participationWrites).toBe(4);
    expect(await count('canonical_demo_repair_snapshots')).toBe(0);
  });
});
