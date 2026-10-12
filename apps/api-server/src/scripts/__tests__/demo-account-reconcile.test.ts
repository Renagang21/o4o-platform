import { Client } from 'pg';
import { PUBLIC_DEMO_ACCOUNTS } from '@o4o/auth-utils';
import { runDemoAccountReconcile, assertFoundationDemoProvisionIdentity } from '../demo-account-reconcile.service';
import { passwordCredentialService } from '../../services/auth/password-credential.service';
import { findApprovedStoreMemberCandidates } from '../../utils/store-member-access';

describe('Demo transition transaction gates',()=>{
  it('apply without the exact plan digest sends no query',async()=>{
    const client={query:jest.fn()};
    await expect(runDemoAccountReconcile(client,{apply:true})).rejects.toThrow('EXACT_PLAN_DIGEST_REQUIRED');
    expect(client.query).not.toHaveBeenCalled();
  });
  it('inventory failure rolls back without credential or relationship writes',async()=>{
    const calls:string[]=[];
    const client={query:async(sql:string)=>{calls.push(sql);if(sql.startsWith('SELECT d.id'))throw Error('DATABASE_FAILURE');return [];}};
    await expect(runDemoAccountReconcile(client)).rejects.toThrow('DATABASE_FAILURE');
    expect(calls.at(-1)).toBe('ROLLBACK');
    expect(calls.some(sql=>/^(INSERT|UPDATE|DELETE|ALTER)/.test(sql))).toBe(false);
  });
});

// Real canonical schema fixture is opt-in and refuses any database outside the owned loopback cluster.
const database=process.env.O4O_DEMO_RECONCILE_TEST_DB;
const integration=database==='o4o_demo_reconcile_runner'?describe:describe.skip;
integration('Demo transition on isolated PostgreSQL 15',()=>{
  const pg=new Client({host:'127.0.0.1',port:55443,user:'o4o_demo_fixture',database});
  const client={query:async(sql:string,params?:unknown[])=>(await pg.query(sql,params)).rows};
  let owner:string,supplier:string,store:string;
  const staff=PUBLIC_DEMO_ACCOUNTS.find(account=>account.type==='STORE_STAFF')!;
  const query=(sql:string,params?:unknown[])=>client.query(sql,params);
  beforeAll(async()=>{await pg.connect();});
  afterAll(async()=>{await pg.end();});
  beforeEach(async()=>{
    await query('TRUNCATE users,organizations,canonical_demo_repair_snapshots CASCADE');
    const add=async(email:string,name:string)=>(await query(`INSERT INTO users(email,name,status,"isActive","isEmailVerified") VALUES($1,$2,'active',true,true) RETURNING id`,[email,name]))[0].id;
    owner=await add('teststoreowner@example.com','Fixture Owner');supplier=await add('testsupplier@example.com','Fixture Supplier');
    store=(await query("INSERT INTO organizations(name,code,type) VALUES('Fixture Pharmacy','fixture-demo-store','pharmacy') RETURNING id"))[0].id;
    const org=(await query("INSERT INTO organizations(name,code,type) VALUES('Fixture Supplier','fixture-demo-supplier','supplier') RETURNING id"))[0].id;
    for(const [id,type,organization,role] of [[owner,'STORE_OWNER',store,'neture:store_owner'],[supplier,'SUPPLIER',org,'neture:supplier']]){
      await query('INSERT INTO demo_accounts(user_id,demo_type,is_active) VALUES($1,$2,true)',[id,type]);
      await query("INSERT INTO organization_members(organization_id,user_id,role,is_primary) VALUES($1,$2,'owner',true)",[organization,id]);
      await query('INSERT INTO role_assignments(user_id,role,is_active,valid_from) VALUES($1,$2,true,now())',[id,role]);
      await passwordCredentialService.setPassword(id,'old-fixture-password',client);
      await query('UPDATE users SET "refreshTokenFamily"=gen_random_uuid() WHERE id=$1',[id]);
    }
    await query(`INSERT INTO neture_pharmacy_memberships(organization_id,applicant_user_id,status,pharmacy_name,business_number,pharmacist_license_number)
      VALUES($1,$2,'active','Fixture Pharmacy','DEMO-BUSINESS','DEMO-LICENSE')`,[store,owner]);
    await query("INSERT INTO neture_suppliers(user_id,organization_id,slug,status) VALUES($1,$2,'fixture-demo-supplier','ACTIVE')",[supplier,org]);
  },30000);

  it('plan is read-only; apply preserves UUID/data links, sets all credentials and real staff scope, then becomes no-op',async()=>{
    const before=await query('SELECT id,email,"refreshTokenFamily" FROM users ORDER BY id');
    const planned=await runDemoAccountReconcile(client);
    expect(planned.changes).toBe(3);expect(planned.schemaReady).toBe(true);
    expect(await query('SELECT id,email,"refreshTokenFamily" FROM users ORDER BY id')).toEqual(before);
    expect(Number((await query('SELECT count(*) AS n FROM canonical_demo_repair_snapshots'))[0].n)).toBe(0);
    const applied=await runDemoAccountReconcile(client,{apply:true,expectedDigest:planned.digest});
    expect(applied.verified).toBe(true);
    for(const [type,id] of [['STORE_OWNER',owner],['SUPPLIER',supplier]]){
      const account=PUBLIC_DEMO_ACCOUNTS.find(item=>item.type===type)!;
      expect((await query('SELECT email FROM users WHERE id=$1',[id]))[0].email).toBe(account.email);
      expect(await passwordCredentialService.verifyPassword(id,account.password,client)).toBe(true);
      expect((await query('SELECT "refreshTokenFamily" FROM users WHERE id=$1',[id]))[0].refreshTokenFamily).not.toBe(before.find(row=>row.id===id)!.refreshTokenFamily);
    }
    const employee=(await query('SELECT id FROM users WHERE email=$1',[staff.email]))[0].id;
    expect(await passwordCredentialService.verifyPassword(employee,staff.password,client)).toBe(true);
    expect(await passwordCredentialService.verifyPassword(employee,PUBLIC_DEMO_ACCOUNTS[0].password,client)).toBe(false);
    const access=await findApprovedStoreMemberCandidates(client as never,employee,'kpa');
    expect(access).toEqual([{organizationId:store,memberRole:'staff'}]);
    expect((await query('SELECT role FROM role_assignments WHERE user_id=$1 AND is_active',[employee])).map(row=>row.role)).toEqual(['kpa:store_member']);
    expect((await query('SELECT user_id FROM neture_suppliers'))[0].user_id).toBe(supplier);
    expect((await query("SELECT user_id FROM organization_members WHERE organization_id=$1 AND role='owner'",[store]))[0].user_id).toBe(owner);
    const repeat=await runDemoAccountReconcile(client);
    expect(repeat.changes).toBe(0);
    expect((await runDemoAccountReconcile(client,{apply:true,expectedDigest:repeat.digest})).writes).toBe(0);
  },30000);

  it('foundation provisioning refuses legacy registry identities before any write',async()=>{
    const before=await query('SELECT id,email FROM users ORDER BY id');
    await expect(assertFoundationDemoProvisionIdentity(client)).rejects.toThrow('DEMO_IDENTITY_TRANSITION_REQUIRES_RECONCILE');
    expect(await query('SELECT id,email FROM users ORDER BY id')).toEqual(before);
    const plan=await runDemoAccountReconcile(client);
    await runDemoAccountReconcile(client,{apply:true,expectedDigest:plan.digest});
    await expect(assertFoundationDemoProvisionIdentity(client)).resolves.toBeUndefined();
  },30000);
  it.each([
    ['STORE_OWNER','valid_from',"now()+interval '1 day'"],
    ['SUPPLIER','valid_until',"now()-interval '1 day'"],
  ])('refuses a non-effective %s business role without credential or data writes',async(type,column,value)=>{
    const id=type==='STORE_OWNER'?owner:supplier;
    await query(`UPDATE role_assignments SET ${column}=${value} WHERE user_id=$1`,[id]);
    const before=await query('SELECT id,email FROM users ORDER BY id');
    await expect(runDemoAccountReconcile(client)).rejects.toThrow('BASE_DEMO_ROLE_NOT_EFFECTIVE');
    expect(await query('SELECT id,email FROM users ORDER BY id')).toEqual(before);
    expect(Number((await query('SELECT count(*) AS n FROM canonical_demo_repair_snapshots'))[0].n)).toBe(0);
  });
  it('supplier inventory uses canonical owned organizations, ignoring an unrelated legacy pointer',async()=>{
    const foreign=(await query("INSERT INTO organizations(name,code,type) VALUES('Unrelated Supplier','fixture-foreign-supplier','supplier') RETURNING id"))[0].id;
    // Legacy pointer is unique: clear it on the canonical organization before modeling pointer drift.
    await query('UPDATE neture_suppliers SET user_id=NULL WHERE user_id=$1',[supplier]);
    await query("INSERT INTO neture_suppliers(user_id,organization_id,slug,status) VALUES($1,$2,'fixture-legacy-pointer','PENDING')",[supplier,foreign]);
    const before=await query('SELECT id,email FROM users ORDER BY id');
    const plan=await runDemoAccountReconcile(client);
    expect(plan.changes).toBe(3);
    expect(await query('SELECT id,email FROM users ORDER BY id')).toEqual(before);
    expect((await query("SELECT status FROM neture_suppliers WHERE slug='fixture-legacy-pointer'"))[0].status).toBe('PENDING');
  });
  it('a stale security generation refuses apply and leaves identities untouched',async()=>{
    const planned=await runDemoAccountReconcile(client);
    await query('UPDATE users SET "refreshTokenFamily"=gen_random_uuid() WHERE id=$1',[owner]);
    await expect(runDemoAccountReconcile(client,{apply:true,expectedDigest:planned.digest})).rejects.toThrow('BEFORE_IMAGE_CHANGED_REPLAN');
    expect((await query('SELECT email FROM users WHERE id=$1',[owner]))[0].email).toBe('teststoreowner@example.com');
  });
  it('an existing target identity is never merged or deleted',async()=>{
    await query(`INSERT INTO users(email,status,"isActive","isEmailVerified") VALUES($1,'active',true,true)`,[PUBLIC_DEMO_ACCOUNTS[0].email]);
    await expect(runDemoAccountReconcile(client)).rejects.toThrow('TARGET_IDENTITY_COLLISION');
    expect(Number((await query('SELECT count(*) AS n FROM users'))[0].n)).toBe(3);
  });
  it('an operator at the staff target is protected',async()=>{
    const id=(await query(`INSERT INTO users(email,status,"isActive","isEmailVerified") VALUES($1,'active',true,true) RETURNING id`,[staff.email]))[0].id;
    await query("INSERT INTO role_assignments(user_id,role,is_active,valid_from) VALUES($1,'neture:operator',true,now())",[id]);
    await expect(runDemoAccountReconcile(client)).rejects.toThrow('PROTECTED_OR_FOREIGN_ROLE');
  });
  it('a provider-linked target is not converted to public Demo',async()=>{
    const id=(await query(`INSERT INTO users(email,status,"isActive","isEmailVerified") VALUES($1,'active',true,true) RETURNING id`,[staff.email]))[0].id;
    await query('INSERT INTO linked_accounts("userId",provider,"providerId") VALUES($1,\'google\',\'fixture-subject\')',[id]);
    await expect(runDemoAccountReconcile(client)).rejects.toThrow('PROVIDER_IDENTITY_REQUIRES_REVIEW');
  });
  it('a pending operator invitation reserves the target even without a user or role row',async()=>{
    await query(`INSERT INTO operator_invitations(invited_email,service_key,role,token_hash,status,expires_at,invited_by_user_id)
      VALUES($1,'neture','neture:operator','fixture-invitation-hash','pending',now()+interval '1 day',$2)`,[staff.email,owner]);
    await expect(runDemoAccountReconcile(client)).rejects.toThrow('PROTECTED_OPERATOR_INVITATION');
    expect(Number((await query('SELECT count(*) AS n FROM users'))[0].n)).toBe(2);
  });
  it('post-write failure rolls back emails, credentials, registry and staff relationships together',async()=>{
    const planned=await runDemoAccountReconcile(client);
    const broken={query:async(sql:string,params?:unknown[])=>{if(sql.startsWith('UPDATE canonical_demo_repair_snapshots'))throw Error('FORCED_FAILURE');return query(sql,params);}};
    await expect(runDemoAccountReconcile(broken,{apply:true,expectedDigest:planned.digest})).rejects.toThrow('FORCED_FAILURE');
    expect(Number((await query('SELECT count(*) AS n FROM users'))[0].n)).toBe(2);
    expect((await query('SELECT email FROM users WHERE id=$1',[owner]))[0].email).toBe('teststoreowner@example.com');
    expect(await passwordCredentialService.verifyPassword(owner,'old-fixture-password',client)).toBe(true);
    expect(Number((await query('SELECT count(*) AS n FROM demo_accounts'))[0].n)).toBe(2);
    expect(Number((await query('SELECT count(*) AS n FROM canonical_demo_repair_snapshots'))[0].n)).toBe(0);
  },30000);
});
