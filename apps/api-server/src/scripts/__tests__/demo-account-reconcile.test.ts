import { Client } from 'pg';
import { PUBLIC_DEMO_ACCOUNTS } from '@o4o/auth-utils';
import { runDemoAccountReconcile, assertFoundationDemoProvisionIdentity } from '../demo-account-reconcile.service';
import { passwordCredentialService } from '../../services/auth/password-credential.service';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
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
  it('plans and audits retirement of only the registered owner legacy role, preserving current role and links',async()=>{
    const legacy=(await query("INSERT INTO role_assignments(user_id,role,is_active,valid_from) VALUES($1,'kpa:store_owner',true,now()) RETURNING id",[owner]))[0].id;
    const plan=await runDemoAccountReconcile(client);
    expect(plan.accounts.find(account=>account.type==='STORE_OWNER')!.legacyOwnerRolesToRetire).toBe(1);
    expect((await query('SELECT is_active FROM role_assignments WHERE id=$1',[legacy]))[0].is_active).toBe(true);
    await runDemoAccountReconcile(client,{apply:true,expectedDigest:plan.digest});
    expect((await query('SELECT is_active FROM role_assignments WHERE id=$1',[legacy]))[0].is_active).toBe(false);
    expect((await query('SELECT role FROM role_assignments WHERE user_id=$1 AND is_active',[owner])).map(row=>row.role)).toEqual(['neture:store_owner']);
    expect((await query("SELECT user_id FROM organization_members WHERE organization_id=$1 AND role='owner'",[store]))[0].user_id).toBe(owner);
    const snapshot=(await query('SELECT snapshot FROM canonical_demo_repair_snapshots'))[0].snapshot;
    expect(snapshot.before.roles.find((row:{id:string})=>row.id===legacy).is_active).toBe(true);
    expect(snapshot.after.roles.find((row:{id:string})=>row.id===legacy).is_active).toBe(false);
    expect((await runDemoAccountReconcile(client)).changes).toBe(0);
  },30000);
  it.each(['SUPPLIER','STORE_STAFF'])('does not accept the owner legacy marker on %s',async(type)=>{
    const id=type==='SUPPLIER'?supplier:(await query(`INSERT INTO users(email,name,status,"isActive","isEmailVerified") VALUES($1,'Staff fixture','active',true,true) RETURNING id`,[staff.email]))[0].id;
    await query("INSERT INTO role_assignments(user_id,role,is_active,valid_from) VALUES($1,'kpa:store_owner',true,now())",[id]);
    await expect(runDemoAccountReconcile(client)).rejects.toThrow('PROTECTED_OR_FOREIGN_ROLE');
    expect(Number((await query('SELECT count(*) AS n FROM canonical_demo_repair_snapshots'))[0].n)).toBe(0);
  });
  it('still refuses a privileged role on the registered owner alongside its legacy marker',async()=>{
    for(const role of ['kpa:store_owner','neture:operator']) await query('INSERT INTO role_assignments(user_id,role,is_active,valid_from) VALUES($1,$2,true,now())',[owner,role]);
    await expect(runDemoAccountReconcile(client)).rejects.toThrow('PROTECTED_OR_FOREIGN_ROLE');
    expect((await query('SELECT is_active FROM role_assignments WHERE user_id=$1 AND role=$2',[owner,'kpa:store_owner']))[0].is_active).toBe(true);
  });
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
  it('repairs a partial legacy owner Lecture membership without moving identity or business links',async()=>{
    const first=await runDemoAccountReconcile(client);
    await runDemoAccountReconcile(client,{apply:true,expectedDigest:first.digest});
    await query("DELETE FROM service_memberships WHERE user_id=$1 AND service_key='lecture'",[owner]);
    const partial=await runDemoAccountReconcile(client);
    expect(partial.changes).toBe(1);
    expect(partial.accounts.find(item=>item.type==='STORE_OWNER')!.membershipsReady).toBe(false);
    await runDemoAccountReconcile(client,{apply:true,expectedDigest:partial.digest});
    expect((await query("SELECT status FROM service_memberships WHERE user_id=$1 AND service_key='lecture'",[owner]))[0].status).toBe('active');
    expect((await runDemoAccountReconcile(client)).changes).toBe(0);
    expect((await query("SELECT user_id FROM organization_members WHERE organization_id=$1 AND role='owner'",[store]))[0].user_id).toBe(owner);
  },30000);
  it.each(['STORE_OWNER','SUPPLIER'])('does not reactivate a restricted %s Lecture membership',async(type)=>{
    const id=type==='STORE_OWNER'?owner:supplier;
    await query("INSERT INTO service_memberships(user_id,service_key,status) VALUES($1,'lecture','suspended')",[id]);
    await expect(runDemoAccountReconcile(client)).rejects.toThrow('REQUIRED_DEMO_MEMBERSHIP_NOT_ACTIVE');
    expect((await query("SELECT status FROM service_memberships WHERE user_id=$1 AND service_key='lecture'",[id]))[0].status).toBe('suspended');
    expect(Number((await query('SELECT count(*) AS n FROM canonical_demo_repair_snapshots'))[0].n)).toBe(0);
  });
  it.each(['admin','manager'])('rejects another approved pharmacy %s relation before exposing the shared identity',async(memberRole)=>{
    const foreignUser=(await query("INSERT INTO users(email,name,status,\"isActive\",\"isEmailVerified\") VALUES('foreign-owner@fixture.invalid','Foreign fixture','active',true,true) RETURNING id"))[0].id;
    const foreign=(await query("INSERT INTO organizations(name,code,type) VALUES('Other Pharmacy','fixture-other-pharmacy','pharmacy') RETURNING id"))[0].id;
    await query(`INSERT INTO neture_pharmacy_memberships(organization_id,applicant_user_id,status,pharmacy_name,business_number,pharmacist_license_number)
      VALUES($1,$2,'active','Other Pharmacy','FOREIGN-BUSINESS','FOREIGN-LICENSE')`,[foreign,foreignUser]);
    await query('INSERT INTO organization_members(organization_id,user_id,role,is_primary) VALUES($1,$2,$3,false)',[foreign,owner,memberRole]);
    await expect(runDemoAccountReconcile(client)).rejects.toThrow('AMBIGUOUS_RUNTIME_DEMO_STORE');
    expect((await query('SELECT email FROM users WHERE id=$1',[owner]))[0].email).toBe('teststoreowner@example.com');
    expect(Number((await query('SELECT count(*) AS n FROM canonical_demo_repair_snapshots'))[0].n)).toBe(0);
  });
  it('rejects multiple canonical supplier contexts without selecting or moving data',async()=>{
    const other=(await query("INSERT INTO organizations(name,code,type) VALUES('Other Supplier','fixture-other-supplier','supplier') RETURNING id"))[0].id;
    await query("INSERT INTO organization_members(organization_id,user_id,role,is_primary) VALUES($1,$2,'owner',false)",[other,supplier]);
    await query("INSERT INTO neture_suppliers(organization_id,slug,status) VALUES($1,'fixture-other-supplier','ACTIVE')",[other]);
    await expect(runDemoAccountReconcile(client)).rejects.toThrow('AMBIGUOUS_DEMO_SUPPLIER');
    expect((await query('SELECT email FROM users WHERE id=$1',[supplier]))[0].email).toBe('testsupplier@example.com');
    expect(Number((await query('SELECT count(*) AS n FROM canonical_demo_repair_snapshots'))[0].n)).toBe(0);
  });
  it('does not publish an owner credential when the owner also owns a supplier organization',async()=>{
    const other=(await query("INSERT INTO organizations(name,code,type) VALUES('Cross Supplier','fixture-cross-supplier','supplier') RETURNING id"))[0].id;
    await query("INSERT INTO organization_members(organization_id,user_id,role,is_primary) VALUES($1,$2,'owner',false)",[other,owner]);
    await query("INSERT INTO neture_suppliers(organization_id,slug,status) VALUES($1,'fixture-cross-supplier','ACTIVE')",[other]);
    await expect(runDemoAccountReconcile(client)).rejects.toThrow('UNEXPECTED_DEMO_RUNTIME_RELATION');
    expect((await query('SELECT email FROM users WHERE id=$1',[owner]))[0].email).toBe('teststoreowner@example.com');
    expect(Number((await query('SELECT count(*) AS n FROM canonical_demo_repair_snapshots'))[0].n)).toBe(0);
  });
  it('rejects a supplier with an unrelated store relationship without granting or changing its scope',async()=>{
    await query("INSERT INTO organization_members(organization_id,user_id,role,is_primary) VALUES($1,$2,'manager',false)",[store,supplier]);
    await expect(runDemoAccountReconcile(client)).rejects.toThrow('UNEXPECTED_DEMO_RUNTIME_RELATION');
    expect((await query('SELECT email FROM users WHERE id=$1',[supplier]))[0].email).toBe('testsupplier@example.com');
  });
  it.each(['STORE_OWNER','STORE_STAFF'])('rejects a legacy supplier pointer at the %s identity without exposing identifiers',async(type)=>{
    let id=owner;
    if(type==='STORE_STAFF')id=(await query(`INSERT INTO users(email,name,status,"isActive","isEmailVerified") VALUES($1,'Staff fixture','active',true,true) RETURNING id`,[staff.email]))[0].id;
    const other=(await query("INSERT INTO organizations(name,code,type) VALUES('Legacy Supplier','fixture-cross-legacy','supplier') RETURNING id"))[0].id;
    await query("INSERT INTO neture_suppliers(user_id,organization_id,slug,status) VALUES($1,$2,'fixture-cross-legacy','ACTIVE')",[id,other]);
    await expect(runDemoAccountReconcile(client)).rejects.toThrow('UNEXPECTED_DEMO_SUPPLIER_POINTER');
    expect(Number((await query('SELECT count(*) AS n FROM canonical_demo_repair_snapshots'))[0].n)).toBe(0);
  });
  it('explicitly refuses an inactive staff registry during plan without duplicate inserts or reactivation',async()=>{
    const id=(await query(`INSERT INTO users(email,name,status,"isActive","isEmailVerified") VALUES($1,'Inactive staff fixture','active',true,true) RETURNING id`,[staff.email]))[0].id;
    await query("INSERT INTO demo_accounts(user_id,demo_type,is_active) VALUES($1,'STORE_STAFF',false)",[id]);
    await expect(runDemoAccountReconcile(client)).rejects.toThrow('INACTIVE_DEMO_REGISTRY_REQUIRES_REVIEW');
    expect((await query('SELECT is_active FROM demo_accounts WHERE user_id=$1',[id]))[0].is_active).toBe(false);
    expect(Number((await query('SELECT count(*) AS n FROM canonical_demo_repair_snapshots'))[0].n)).toBe(0);
  });
  it('census includes staff membership, role and creator rows in Store Demo scope exactly once',async()=>{
    const plan=await runDemoAccountReconcile(client);
    await runDemoAccountReconcile(client,{apply:true,expectedDigest:plan.digest});
    // Load the real native ESM producer without changing the repository's CommonJS Jest transform policy.
    const scopedCountQuery=(table:string,columns:string[])=>{
      const moduleUrl=pathToFileURL(resolve(__dirname,'../../../../../scripts/deployment/demo-store-census.mjs')).href;
      const source=`import(${JSON.stringify(moduleUrl)}).then(m=>process.stdout.write(m.scopedCountQuery(${JSON.stringify(table)},${JSON.stringify(columns)})))`;
      return execFileSync(process.execPath,['--input-type=module','-e',source],{encoding:'utf8'});
    };
    const counts=await query(scopedCountQuery('service_memberships',['user_id']));
    expect(counts[0]).toMatchObject({count:12,store_demo_count:8,supplier_demo_count:4,unlinked_to_demo_count:0});
    const roles=await query(scopedCountQuery('role_assignments',['user_id']));
    expect(roles[0]).toMatchObject({count:3,store_demo_count:2,supplier_demo_count:1,unlinked_to_demo_count:0});
    const employee=(await query('SELECT id FROM users WHERE email=$1',[staff.email]))[0].id;
    await query('CREATE TEMP TABLE fixture_demo_creator (created_by uuid)');
    try{
      await query('INSERT INTO fixture_demo_creator(created_by) VALUES($1),($2)',[owner,employee]);
      expect((await query(scopedCountQuery('fixture_demo_creator',['created_by'])))[0]).toMatchObject({count:2,store_demo_count:2,supplier_demo_count:0,unlinked_to_demo_count:0});
    }finally{await query('DROP TABLE fixture_demo_creator');}
  },30000);
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
  it('post-write failure rolls back emails, credentials, registry and staff relationships together',async()=>{
    await query("INSERT INTO role_assignments(user_id,role,is_active,valid_from) VALUES($1,'kpa:store_owner',true,now())",[owner]);
    const planned=await runDemoAccountReconcile(client);
    const broken={query:async(sql:string,params?:unknown[])=>{if(sql.startsWith('UPDATE canonical_demo_repair_snapshots'))throw Error('FORCED_FAILURE');return query(sql,params);}};
    await expect(runDemoAccountReconcile(broken,{apply:true,expectedDigest:planned.digest})).rejects.toThrow('FORCED_FAILURE');
    expect(Number((await query('SELECT count(*) AS n FROM users'))[0].n)).toBe(2);
    expect((await query('SELECT email FROM users WHERE id=$1',[owner]))[0].email).toBe('teststoreowner@example.com');
    expect(await passwordCredentialService.verifyPassword(owner,'old-fixture-password',client)).toBe(true);
    expect((await query('SELECT is_active FROM role_assignments WHERE user_id=$1 AND role=$2',[owner,'kpa:store_owner']))[0].is_active).toBe(true);
    expect(Number((await query('SELECT count(*) AS n FROM demo_accounts'))[0].n)).toBe(2);
    expect(Number((await query('SELECT count(*) AS n FROM canonical_demo_repair_snapshots'))[0].n)).toBe(0);
  },30000);
});
