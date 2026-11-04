import {randomUUID} from 'node:crypto';
import {DataSource} from 'typeorm';
jest.mock('../../../database/connection.js',()=>({AppDataSource:{}}));
import {MemberVerificationService} from '../member-verification.service.js';
import {CentralMemberWorkspaceService} from '../central-member-workspace.service.js';
import {EmailAuthRecovery} from '../../auth/email-auth.recovery.js';
import {MemberCredentialRecoveryService} from '../member-credential-recovery.service.js';
import {passwordCredentialService} from '../../auth/password-credential.service.js';
import {PharmacistQualificationService} from '../../qualifications/pharmacist-qualification.service.js';
import {AddTemporaryPasswordExpiry1793750400000} from '../../../database/migrations/1793750400000-AddTemporaryPasswordExpiry.js';
import {checkPasswordPolicy} from '@o4o/auth-utils';
const url=process.env.MEMBER_WORKSPACE_TEST_DATABASE_URL;
const integration=url?describe:describe.skip;
integration('member profile and temporary recovery PostgreSQL',()=>{
 const schema='profile_recovery_'+randomUUID().replaceAll('-','');
 const admin=randomUUID(),operator=randomUUID(),target=randomUUID(),other=randomUUID();
 let db:DataSource,profiles:CentralMemberWorkspaceService,recovery:MemberCredentialRecoveryService;
 const reason='합성 본인 요청·제출 근거 확인';
 beforeAll(async()=>{
  if(!['127.0.0.1','localhost'].includes(new URL(url!).hostname))throw new Error('LOCAL_FIXTURE_REQUIRED');
  const setup=new DataSource({type:'postgres',url});await setup.initialize();await setup.query(`CREATE SCHEMA ${schema}`);await setup.destroy();
  db=new DataSource({type:'postgres',url,extra:{options:`-c search_path=${schema}`}});await db.initialize();
  await db.query(`CREATE TABLE users(id uuid PRIMARY KEY,name text,nickname text,email text UNIQUE,phone text,status text,"isActive" boolean,"isEmailVerified" boolean,"createdAt" timestamp DEFAULT now(),"updatedAt" timestamp DEFAULT now(),"businessInfo" json,"refreshTokenFamily" text);
   CREATE TABLE role_assignments(id uuid PRIMARY KEY,user_id uuid,role text,scope_type text,is_active boolean,valid_from timestamp,valid_until timestamp);
   CREATE TABLE central_operation_menu_grants(assignment_id uuid,menu_keys text[],admin_operations boolean DEFAULT false);
   CREATE TABLE service_memberships(user_id uuid,service_key text,status text);
   CREATE TABLE demo_accounts(user_id uuid,is_active boolean);
   CREATE TABLE user_password_credentials(user_id uuid PRIMARY KEY,password_hash varchar(255),algo text,password_changed_at timestamp,created_at timestamp,updated_at timestamp,temporary_expires_at timestamptz);
   CREATE TABLE password_reset_tokens(user_id uuid,consumed_at timestamp);
   CREATE TABLE email_verification_tokens(user_id uuid,consumed_at timestamp);
   CREATE TABLE kpa_pharmacist_profiles(user_id uuid PRIMARY KEY,license_number text,license_verified boolean,qualification_status text,qualification_reason text,verified_at timestamp,verified_by uuid,updated_at timestamp DEFAULT now());
   CREATE TABLE organizations(id uuid PRIMARY KEY,address text,phone text,metadata jsonb,name text,business_number text,"updatedAt" timestamp);
   CREATE TABLE neture_pharmacy_memberships(id uuid,organization_id uuid,applicant_user_id uuid,pharmacy_name text,business_number text,pharmacist_license_number text,status text,reason text,applied_at timestamp,decided_at timestamp,decided_by uuid,updated_at timestamp DEFAULT now());
   CREATE TABLE notifications("userId" uuid,"serviceKey" text,type text,title text,message text,metadata jsonb,channel text,"isRead" boolean);
   CREATE TABLE action_logs(id bigserial,service_key text,user_id uuid,action_key text,source text,status text,meta jsonb,created_at timestamp DEFAULT now());`);
  for(const id of [admin,operator,target,other])await db.query(`INSERT INTO users(id,name,email,status,"isActive","isEmailVerified","businessInfo","refreshTokenFamily") VALUES($1,'합성 회원',$2,'active',true,true,'{}','old-family')`,[id,id+'@example.test']);
  await db.query(`INSERT INTO role_assignments(id,user_id,role,is_active) VALUES($1,$2,'platform:super_admin',true)`,[randomUUID(),admin]);
  const assignment=randomUUID();await db.query(`INSERT INTO role_assignments VALUES($1,$2,'neture:operator','o4o-direct',true,NULL,NULL)`,[assignment,operator]);
  await db.query(`INSERT INTO central_operation_menu_grants(assignment_id,menu_keys) VALUES($1,ARRAY['neture.members','neture.qualifications','neture.pharmacies'])`,[assignment]);
  for(const id of [operator,target,other])await db.query(`INSERT INTO service_memberships VALUES($1,'neture','active')`,[id]);
  profiles=new CentralMemberWorkspaceService(db);recovery=new MemberCredentialRecoveryService(db);
 });
 beforeEach(async()=>{
  await db.query('TRUNCATE kpa_pharmacist_profiles,user_password_credentials,password_reset_tokens,email_verification_tokens,demo_accounts,action_logs,notifications');
  await db.query(`UPDATE users SET name='합성 회원',email=id::text||'@example.test',"isEmailVerified"=true,"isActive"=true,status='active',"refreshTokenFamily"='old-family',"updatedAt"=clock_timestamp()`);
 });
 afterAll(async()=>{if(db?.isInitialized){await db.query(`DROP SCHEMA ${schema} CASCADE`);await db.destroy();}});
 const input=async(id=target)=>({name:'정정 회원',nickname:'별칭',phone:'01012345678',reason,version:(await profiles.detail(admin,id)).member.version});
 const resetInput=async(id=target)=>({version:(await input(id)).version,reason,evidenceConfirmed:true as const});
 it('corrects email atomically, requires re-verification and consumes old links/sessions',async()=>{
  await db.query('INSERT INTO password_reset_tokens VALUES($1,NULL);',[target]);await db.query('INSERT INTO email_verification_tokens VALUES($1,NULL)',[target]);
  const result=await profiles.correct(operator,target,{...await input(),email:'corrected@example.test',evidenceConfirmed:true});
  expect(result.emailChanged).toBe(true);
  const [row]=await db.query('SELECT * FROM users WHERE id=$1',[target]);expect(row.email).toBe('corrected@example.test');expect(row.isEmailVerified).toBe(false);expect(row.refreshTokenFamily).not.toBe('old-family');
  for(const table of ['password_reset_tokens','email_verification_tokens'])expect((await db.query(`SELECT consumed_at FROM ${table} WHERE user_id=$1`,[target]))[0].consumed_at).not.toBeNull();
 });
 it('rolls back profile writes on duplicate email, missing evidence or stale version',async()=>{
  for(const patch of [{email:other+'@example.test',evidenceConfirmed:true},{email:'new@example.test'},{version:'stale'}])await expect(profiles.correct(operator,target,{...await input(),...patch})).rejects.toMatchObject({status:expect.any(Number)});
  expect((await profiles.detail(admin,target)).member.name).toBe('합성 회원');
 });
 it('records operator-supplied missing license as pending and permits the normal evidence-based approval afterwards',async()=>{
  await profiles.correct(operator,target,{...await input(),licenseNumber:'correct-license',qualificationVersion:null,evidenceConfirmed:true});
  const pending=await profiles.detail(admin,target);expect(pending.qualification.status).toBe('pending');
  await new PharmacistQualificationService(db).decide(admin,target,{action:'approve',reason,version:pending.qualification.version,licenseEvidenceChecked:true});
  expect((await profiles.detail(admin,target)).qualification.status).toBe('approved');
 });
 it('changing an approved license clears approval and rejects duplicate or stale qualification evidence',async()=>{
  await db.query(`INSERT INTO kpa_pharmacist_profiles(user_id,license_number,license_verified,qualification_status,verified_at,verified_by) VALUES($1,'old',true,'approved',now(),$2),($3,'taken',true,'approved',now(),$2)`,[target,admin,other]);
  const before=await profiles.detail(admin,target);
  await expect(profiles.correct(operator,target,{...await input(),licenseNumber:'taken',qualificationVersion:before.qualification.version,evidenceConfirmed:true})).rejects.toMatchObject({code:'LICENSE_REVIEW_REQUIRED'});
  await profiles.correct(operator,target,{...await input(),licenseNumber:'corrected',qualificationVersion:before.qualification.version,evidenceConfirmed:true});
  const [row]=await db.query('SELECT * FROM kpa_pharmacist_profiles WHERE user_id=$1',[target]);expect(row.qualification_status).toBe('pending');expect(row.license_verified).toBe(false);expect(row.verified_by).toBeNull();
  await expect(profiles.correct(operator,target,{...await input(),licenseNumber:'another',qualificationVersion:before.qualification.version,evidenceConfirmed:true})).rejects.toMatchObject({code:'QUALIFICATION_CHANGED'});
 });
 it('issues a random, expiring hashed credential and invalidates the old password and sessions',async()=>{
  await passwordCredentialService.setPassword(target,'Original123!',db.manager);
  const issued=await recovery.issue(operator,target,await resetInput());expect(checkPasswordPolicy(issued.temporaryPassword)).toEqual([]);
  expect(await passwordCredentialService.verifyPassword(target,issued.temporaryPassword,db.manager)).toBe(true);
  expect(await passwordCredentialService.verifyPassword(target,'Original123!',db.manager)).toBe(false);
  const [row]=await db.query('SELECT * FROM user_password_credentials WHERE user_id=$1',[target]);expect(row.password_hash).not.toContain(issued.temporaryPassword);expect(row.password_hash).toMatch(/^\$2/);expect(new Date(row.temporary_expires_at).getTime()-Date.now()).toBeGreaterThan(23*60*60*1000);
  expect(JSON.stringify(await db.query('SELECT meta FROM action_logs'))).not.toContain(issued.temporaryPassword);
  expect((await db.query('SELECT "refreshTokenFamily" FROM users WHERE id=$1',[target]))[0].refreshTokenFamily).not.toBe('old-family');
 });
 it('denies expired temporary passwords and clears expiry when the member sets a new password',async()=>{
  await passwordCredentialService.setPassword(target,'Original123!',db.manager);
  const issued=await recovery.issue(operator,target,await resetInput());
  await db.query("UPDATE user_password_credentials SET temporary_expires_at=now()-interval '1 second' WHERE user_id=$1",[target]);
  expect(await passwordCredentialService.verifyPassword(target,issued.temporaryPassword,db.manager)).toBe(false);
  await passwordCredentialService.setPassword(target,'MemberNew123!',db.manager);
  expect(await passwordCredentialService.temporaryStatus(target,db.manager)).toBeNull();expect(await passwordCredentialService.verifyPassword(target,'MemberNew123!',db.manager)).toBe(true);
 });
 it('does not add a first password to social-only members or recover protected/self/demo accounts',async()=>{
  await expect(recovery.issue(operator,target,await resetInput())).rejects.toMatchObject({code:'PASSWORD_METHOD_REQUIRED'});
  await expect(recovery.issue(admin,admin,await resetInput(admin))).rejects.toMatchObject({status:403});
  await expect(recovery.issue(operator,admin,await resetInput(admin))).rejects.toMatchObject({status:403});
  await db.query('INSERT INTO demo_accounts VALUES($1,true)',[target]);
  await expect(recovery.issue(operator,target,await resetInput())).rejects.toMatchObject({code:'DEMO_ACCOUNT_FORBIDDEN'});
  expect(await passwordCredentialService.hasPassword(target,db.manager)).toBe(false);
 });
 it('does not let a directory operator change another privileged identity or an unconfirmed recovery request',async()=>{
  await expect(profiles.correct(operator,admin,{...await input(admin),email:'hijack@example.test',evidenceConfirmed:true})).rejects.toMatchObject({status:403});
  await passwordCredentialService.setPassword(target,'Original123!',db.manager);
  await expect(recovery.issue(operator,target,{...await resetInput(),evidenceConfirmed:false as true})).rejects.toMatchObject({status:400});
  await expect(recovery.issue(operator,target,{...await resetInput(),version:'stale'})).rejects.toMatchObject({status:409});
  const duty=randomUUID();await db.query("INSERT INTO role_assignments(id,user_id,role,is_active) VALUES($1,$2,'neture:pharmcoop_admin',true)",[duty,target]);
  try{await expect(recovery.issue(operator,target,await resetInput())).rejects.toMatchObject({code:'PRIVILEGED_ACCOUNT_PROTECTED'});}finally{await db.query('DELETE FROM role_assignments WHERE id=$1',[duty]);}
 });
 it('refuses schema rollback while an issued temporary credential exists',async()=>{
  await passwordCredentialService.setPassword(target,'Original123!',db.manager);
  await recovery.issue(operator,target,await resetInput());
  const q=db.createQueryRunner();try{await expect(new AddTemporaryPasswordExpiry1793750400000().down(q)).rejects.toThrow('TEMPORARY_CREDENTIALS_REQUIRE_REVIEW');}finally{await q.release();}
  expect(await passwordCredentialService.temporaryStatus(target,db.manager)).not.toBeNull();
 });

 it('changes an issued temporary password through the real My Home auth service',async()=>{
  await passwordCredentialService.setPassword(target,'Original123!',db.manager);
  const issued=await recovery.issue(operator,target,await resetInput());
  const auth=new EmailAuthRecovery({dataSource:()=>db,passwords:passwordCredentialService,now:()=>new Date(),readRoles:async()=>[],revokeAllSessions:async(id,m)=>{await m!.query('UPDATE users SET "refreshTokenFamily"=$2 WHERE id=$1',[id,randomUUID()]);},findUserByLoginEmail:async()=>null,sendTokenMail:async()=>false,consumeToken:async()=>null,mailer:async()=>({sendEmail:async()=>({success:false})})});
  await auth.setPasswordForUser(target,{currentPassword:issued.temporaryPassword,newPassword:'MyHomePersonal123!'});
  expect(await passwordCredentialService.temporaryStatus(target,db.manager)).toBeNull();
  expect(await passwordCredentialService.verifyPassword(target,issued.temporaryPassword,db.manager)).toBe(false);
  expect(await passwordCredentialService.verifyPassword(target,'MyHomePersonal123!',db.manager)).toBe(true);
 });
 it('corrects a pending pharmacy license but refuses unverified changes to an approved pharmacy',async()=>{
  const org=randomUUID(),pharmacy=randomUUID();
  await db.query(`INSERT INTO organizations(id,name,business_number,metadata,"updatedAt") VALUES($1,'합성 약국','1234567890','{}',now())`,[org]);
  await db.query(`INSERT INTO neture_pharmacy_memberships(id,organization_id,applicant_user_id,pharmacy_name,business_number,pharmacist_license_number,status,applied_at) VALUES($1,$2,$3,'합성 약국','1234567890','old','pending',now())`,[pharmacy,org,target]);
  const fields={name:'합성 약국',businessNumber:'1234567890',licenseNumber:'correct-license',representativeName:'대표',businessType:'약국',businessCategory:'의약품',address:'합성 주소',phone:'',contactName:'담당',managerPhone:'',contactEmail:'',taxInvoiceEmail:''};
  const detail=await profiles.detail(admin,target);
  await profiles.correctPharmacy(operator,target,pharmacy,{fields,version:detail.pharmacies[0].version,reason,evidenceConfirmed:true});
  expect((await profiles.detail(admin,target)).pharmacies[0].licenseNumber).toBe('correct-license');
  await db.query("UPDATE neture_pharmacy_memberships SET status='active' WHERE id=$1",[pharmacy]);
  const active=await profiles.detail(admin,target);
  await expect(profiles.correctPharmacy(operator,target,pharmacy,{fields:{...fields,licenseNumber:'unverified'},version:active.pharmacies[0].version,reason,evidenceConfirmed:true})).rejects.toMatchObject({code:'QUALIFICATION_LICENSE_MISMATCH'});
 });

 it('requests verification for the corrected social-only identity without adding a password or approving it',async()=>{
  await profiles.correct(operator,target,{...await input(),email:'social-corrected@example.test',evidenceConfirmed:true});
  const mail=jest.fn(async()=>true);const verification=new MemberVerificationService(db,mail);
  const current=await profiles.detail(admin,target);
  expect(await verification.request(operator,target,current.member.version)).toEqual({requested:true,alreadyVerified:false});
  expect(mail).toHaveBeenCalledWith({id:target,email:'social-corrected@example.test'});
  expect(await passwordCredentialService.hasPassword(target,db.manager)).toBe(false);
  expect((await profiles.detail(admin,target)).member.emailVerified).toBe(false);
 });
 it('does not claim delivery on a failed verification request or send a stale target',async()=>{
  await db.query('UPDATE users SET "isEmailVerified"=false WHERE id=$1',[target]);
  const mail=jest.fn(async()=>false);const verification=new MemberVerificationService(db,mail);
  await expect(verification.request(operator,target,'stale')).rejects.toMatchObject({code:'MEMBER_CHANGED'});expect(mail).not.toHaveBeenCalled();
  await expect(verification.request(operator,target,(await input()).version)).rejects.toMatchObject({code:'VERIFICATION_MAIL_UNAVAILABLE'});
  await expect(verification.request(other,target,(await input()).version)).rejects.toMatchObject({status:403});
 });

});
