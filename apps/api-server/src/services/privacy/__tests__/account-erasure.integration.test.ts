import {mayEraseSupplierProfileFile} from '../../../modules/neture/services/supplier-account-erasure.js';
import { connectDefaultPharmacyMembership } from '../../../modules/neture-pharmacy/services/default-pharmacy-membership.js';
import { BusinessRegistrationDocumentService } from '../../../modules/neture-pharmacy/services/business-registration-document.service.js';
import { purgeClosureDocuments } from '../../store/store-closure-files.js';
import { hardDeleteLectureCourse,lectureDeletionPlan } from '../../../modules/lms/services/lecture-course-cleanup.service.js';
import { applyCommunityDeletion,planCommunityDeletion } from '../../community/community-management.service.js';
import {mkdtemp,writeFile,readFile,unlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import { MemberLifecycleService } from '../../admin/member-lifecycle.service.js';
import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import express from 'express';
import type { Server } from 'node:http';
import { User } from '../../../entities/User.js';
import { AccountErasureService, calendarExpiry, type PersonalStorage } from '../account-erasure.service.js';
import { AccountErasureError } from '../account-erasure.service.js';
import { CALENDAR_EXPIRY_SQL } from '../calendar-retention.js';
import { CreateAccountErasureOperations1791777540800 } from '../../../database/migrations/1791777540800-CreateAccountErasureOperations.js';
import { RetireLegacyErasureIdentityHashes1791795139475 } from '../../../database/migrations/1791795139475-RetireLegacyErasureIdentityHashes.js';

let db: DataSource;
const repository = {
  findOne: async ({ where }: { where: { id: string; isActive?: boolean } }) => {
    const [r] = await db.query('SELECT * FROM users WHERE id=$1', [where.id]);
    return r && (where.isActive === undefined || r.isActive === where.isActive) ? Object.assign(new User(),r) : null;
  },
  get manager() { return db.manager; },
};
jest.mock('@google-cloud/storage',()=>({Storage:jest.fn(()=>({bucket:jest.fn(()=>({
  getFiles:jest.fn(async()=>[[],null]),file:jest.fn(()=>{throw new Error('Unexpected storage access outside synthetic fixture');}),
}))}))}));
jest.mock('../../../database/connection.js', () => ({ AppDataSource: {
  query: (...args: any[]) => (db.query as any)(...args), getRepository: () => repository,
  transaction: (cb:any) => db.transaction(cb),
  get manager() { return db?.manager ?? {query:(...args:any[])=>(db.query as any)(...args)}; },
} }));
jest.mock('../../../modules/auth/services/role-assignment.service.js', () => ({ roleAssignmentService: {
  removeRole: async(id:string,role:string,manager:any=db)=>manager.query('UPDATE role_assignments SET is_active=false WHERE user_id=$1 AND role=$2',[id,role]),
  assignRole: async(input:any,manager:any=db)=>manager.query('INSERT INTO role_assignments(user_id,role,assigned_by) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[input.userId,input.role,input.assignedBy]),
  getRoleNames: async (id: string) => (await db.query('SELECT role FROM role_assignments WHERE user_id=$1 AND is_active=true AND valid_from<=statement_timestamp() AND (valid_until IS NULL OR valid_until>=statement_timestamp())',[id])).map((r: {role:string})=>r.role),
  hasAnyRole: async (id: string,roles:string[]) => (await db.query('SELECT 1 FROM role_assignments WHERE user_id=$1 AND is_active=true AND valid_from<=statement_timestamp() AND (valid_until IS NULL OR valid_until>=statement_timestamp()) AND role=ANY($2)',[id,roles])).length>0,
  getActiveRoles: async (id: string) => db.query('SELECT * FROM role_assignments WHERE user_id=$1 AND is_active=true AND valid_from<=statement_timestamp() AND (valid_until IS NULL OR valid_until>=statement_timestamp())',[id]),
} }));
jest.mock('../../../modules/policy-acceptance/policy-acceptance.service.js', () => ({ policyAcceptanceService: { getEnforcedPendingForUser: async () => [] } }));
jest.mock('../../../utils/logger.js', () => ({ __esModule: true, default: { info: jest.fn(),warn: jest.fn(),error: jest.fn(),debug: jest.fn() } }));
import { generateTokensWithContext } from '../../auth/auth-context.helper.js';
import { AuthTokenSessionService } from '../../auth/auth-token-session.service.js';
import { requireAuth } from '../../../common/middleware/auth/authentication.middleware.js';
import { handoffTokenService } from '../../handoff-token.service.js';
import adminUsersRouter from '../../../routes/admin/users.routes.js';
import usersRouter from '../../../routes/users.routes.js';
import { MembershipApprovalService } from '../../approval/MembershipApprovalService.js';

// Explicit, dedicated disposable cluster only. Never load .env or use 5432/5442.
const port = Number(process.env.O4O_ERASURE_TEST_PORT);
const integration = port === 55469 ? describe : describe.skip;
integration('account erasure — isolated PostgreSQL schema/real sessions', () => {
  let server:Server;let origin:string;
  let fixtureAdminId:string;
  let fixtureTables:string[]=[];
  async function clearFixtures(){
    if(port!==55469||(await db.query('SELECT current_database() AS name'))[0].name!=='o4o_erasure_fixture')throw new Error('SYNTHETIC_DATABASE_ONLY');
    // Non-FK writer tables and purpose-separated journals must not leak between cases.
    await db.query('TRUNCATE '+fixtureTables.join(',')+' CASCADE');
  }
  const service = (storage?: PersonalStorage, years: 1|2 = 1) => {
    const core=new AccountErasureService(db,{enabled:true,inventoryReviewed:true,systemYears:years,systemBasis:'isolated-synthetic-system',personalBuckets:['fixture-private'],storage});
    return {
      request:(id:string,actorId=fixtureAdminId)=>core.request(id,actorId),
      resume:(id:string,actorId=fixtureAdminId)=>core.resume(id,actorId),get:(id:string)=>core.get(id,fixtureAdminId),
      retentionReport:(now?:Date,apply=false)=>core.retentionReport(now,apply),
    };
  };
  const user = async (extra: Record<string,unknown>={}) => {
    const id=randomUUID();
    const [r]=await db.query(`INSERT INTO users(id,email,name,status,"isActive","isEmailVerified",avatar)
      VALUES($1,$2,$3,'active',true,true,$4) RETURNING *`,[id,extra.email??`${id}@fixture.invalid`,extra.name??`Privacy fixture ${id}`,extra.avatar??null]);
    if(extra.netureStopped!==false) await db.query("INSERT INTO service_memberships(user_id,service_key,role,status) VALUES($1,'neture','member','suspended')",[id]);
    return Object.assign(new User(),r);
  };
  const community = async (ownerId: string,actorId: string,action='approve') => {
    const c=randomUUID(),m=randomUUID();
    await db.query('INSERT INTO communities(id,slug,name) VALUES($1,$2,$3)',[c,randomUUID(),'Isolated community']);
    await db.query("INSERT INTO community_memberships(id,community_id,user_id,role,status) VALUES($1,$2,$3,'member','suspended')",[m,c,ownerId]);
    const [h]=await db.query(`INSERT INTO community_membership_changes(community_id,membership_id,actor_user_id,action,after_role,after_status,reason)
      VALUES($1,$2,$3,$4,'member','suspended','Synthetic private reason') RETURNING id`,[c,m,actorId,action]);
    return {c,m,event:h.id};
  };
  beforeAll(async () => {
    process.env.JWT_SECRET ||= randomUUID(); process.env.JWT_REFRESH_SECRET ||= randomUUID();
    db=new DataSource({type:'postgres',host:'127.0.0.1',port,username:'agent',database:'o4o_erasure_fixture',entities:[],synchronize:false});
    await db.initialize();
    fixtureTables=(await db.query("SELECT quote_ident(schemaname)||'.'||quote_ident(tablename) AS name FROM pg_tables WHERE schemaname IN ('public','neture','cosmetics') AND tablename NOT IN ('typeorm_migrations','o4o_schema_baselines')")).map((row:{name:string})=>row.name);
    expect((await db.query("SELECT to_regclass('public.account_erasure_operations') AS name"))[0].name).toBe('account_erasure_operations');
    const app=express();app.use(express.json());app.use('/api/v1/admin/users',adminUsersRouter);app.use('/api/v1/users',usersRouter);
    server=await new Promise<Server>(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
    origin=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
  });
  beforeEach(async () => { await clearFixtures(); const admin=await user();fixtureAdminId=admin.id;await db.query("INSERT INTO role_assignments(user_id,role,is_active) VALUES($1,'platform:super_admin',true)",[fixtureAdminId]); });
  afterAll(async () => { if(server)await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve())); if(db?.isInitialized) { await clearFixtures(); await db.destroy(); } });

  const organization = async (ownerId:string) => {
    const id=randomUUID();
    await db.query(`INSERT INTO organizations(id,name,code,type,created_by_user_id) VALUES($1,'Synthetic pharmacy',$2,'pharmacy',$3)`,[id,id,ownerId]);
    await db.query(`INSERT INTO organization_members(organization_id,user_id,role) VALUES($1,$2,'owner')`,[id,ownerId]);
    return id;
  };
  async function defaultPharmacyConnection(organizationId:string,applicantId:string){
    const businessOrg=await organization(fixtureAdminId);await db.query("UPDATE organizations SET type='semi_franchise' WHERE id=$1",[businessOrg]);
    const [business]=await db.query(`INSERT INTO semi_franchises(key,name,organization_id) VALUES('pharmacy','Synthetic default Pharmacy',$1) RETURNING id`,[businessOrg]);
    await connectDefaultPharmacyMembership(db.manager,{organizationId,applicantId,approvedBy:fixtureAdminId,actorId:fixtureAdminId});
    return business.id;
  }
  it('normal signup/login records are minimized without retaining a profile or resetting retention clocks',async()=>{
    const target=await user(),peer=await user(),anchor='2026-10-20T09:00:00.000Z';
    const [login]=await db.query(`INSERT INTO login_attempts(email,"userAgent","failureReason",success,"createdAt") VALUES($1,$2::text,$2::text,false,$3) RETURNING id`,[target.email,target.email,anchor]);
    const [mail]=await db.query(`INSERT INTO email_logs(recipient,sender,subject,body,"htmlBody",response,error,attachments,metadata,"sentAt","createdAt",status) VALUES($1::text,$1::text,$1::text,$1::text,$1::text,json_build_object('address',$1::text),$1,json_build_array($1::text),json_build_object('address',$1::text),$2,$2,'sent') RETURNING id`,[target.email,anchor]);
    const [peerMail]=await db.query(`INSERT INTO email_logs(recipient,subject,"createdAt") VALUES($1,'Retained peer delivery',$2) RETURNING id`,[peer.email,anchor]);
    const [audit]=await db.query(`INSERT INTO audit_logs("entityType","entityId",action,"userId",changes,reason,"userAgent","createdAt") VALUES('User',$1,'update',$2,jsonb_build_object('email',$3::text),$3,$3,$4) RETURNING id`,[target.id,fixtureAdminId,target.email,anchor]);
    const [usage]=await db.query(`INSERT INTO ai_usage_logs("userId",provider,model,status,"errorMessage","createdAt") VALUES($1,'gemini','synthetic','error',$2,$3) RETURNING id`,[target.id,target.email,anchor]);
    const [policy]=await db.query(`INSERT INTO service_policy_documents(service_key,document_type,title) VALUES('neture','terms','Synthetic policy') RETURNING id`);
    await db.query(`INSERT INTO user_policy_acceptances(user_id,service_key,policy_document_id,document_type,version,content_hash) VALUES($1,'neture',$2,'terms',1,$3)`,[target.id,policy.id,'f'.repeat(64)]);
    const [application]=await db.query(`INSERT INTO action_logs(service_key,user_id,action_key,source,status,meta,created_at) VALUES('neture',$1,'service:application_policy','test','success',$2,$3) RETURNING id`,[target.id,JSON.stringify({application:{type:'pharmacy',id:target.id,resourceId:policy.id},policies:[{documentId:policy.id,version:1,contentHash:'f'.repeat(64)}]}),anchor]);
    try{
      const result=await service().request(target.id);expect(result).toMatchObject({state:'completed',erased:true});
      expect(await db.query('SELECT id FROM users WHERE id=$1',[target.id])).toHaveLength(0);
      expect(await db.query('SELECT id FROM user_policy_acceptances WHERE user_id=$1',[target.id])).toHaveLength(0);
      const [l]=await db.query('SELECT * FROM login_attempts WHERE id=$1',[login.id]);expect(l.email).toMatch(/^erased:[a-f0-9]{64}$/);expect(l.userAgent).toBeNull();expect(l.failureReason).toBeNull();expect(l.createdAt.toISOString()).toBe(anchor);
      const [e]=await db.query('SELECT * FROM email_logs WHERE id=$1',[mail.id]);expect(e.recipient).toBe(l.email);for(const field of ['sender','body','htmlBody','response','error','attachments','userId'])expect(e[field]).toBeNull();expect(e.sentAt.toISOString()).toBe(anchor);expect(e.createdAt.toISOString()).toBe(anchor);expect(e.status).toBe('sent');
      const [p]=await db.query('SELECT recipient,subject FROM email_logs WHERE id=$1',[peerMail.id]);expect(p).toEqual({recipient:peer.email,subject:'Retained peer delivery'});
      const [a]=await db.query('SELECT * FROM audit_logs WHERE id=$1',[audit.id]);expect(a.entityId).toBe(target.id);expect(a.changes).toBeNull();expect(a.reason).toBeNull();expect(a.userId).toBe(fixtureAdminId);expect(a.createdAt.toISOString()).toBe(anchor);
      const [u]=await db.query('SELECT "errorMessage","createdAt" FROM ai_usage_logs WHERE id=$1',[usage.id]);expect(u.errorMessage).toBeNull();expect(u.createdAt.toISOString()).toBe(anchor);
      const [applicationRow]=await db.query('SELECT user_id,meta,created_at FROM action_logs WHERE id=$1',[application.id]);expect(applicationRow.user_id).toBeNull();expect(applicationRow.meta.application.id).toBeUndefined();expect(applicationRow.meta.policies[0].documentId).toBe(policy.id);expect(applicationRow.created_at.toISOString()).toBe(anchor);
    }finally{
      await db.query('DELETE FROM login_attempts WHERE id=$1',[login.id]);await db.query('DELETE FROM email_logs WHERE id=ANY($1)',[[mail.id,peerMail.id]]);await db.query('DELETE FROM audit_logs WHERE id=$1',[audit.id]);await db.query('DELETE FROM ai_usage_logs WHERE id=$1',[usage.id]);await db.query('DELETE FROM action_logs WHERE id=$1',[application.id]);await db.query('DELETE FROM user_policy_acceptances WHERE policy_document_id=$1',[policy.id]);await db.query('DELETE FROM service_policy_documents WHERE id=$1',[policy.id]);
    }
  });
  it('unknown business audit copies require review and are never silently discarded',async()=>{
    const target=await user(),[audit]=await db.query(`INSERT INTO audit_logs("entityType","entityId",action,changes) VALUES('Order',$1,'update',jsonb_build_object('contact',$2::text)) RETURNING id`,[randomUUID(),target.email]);
    try{const result=await service().request(target.id);expect(result).toMatchObject({state:'review_required',erased:false});expect(result.reviewCodes).toContain('REVIEW:public.audit_logs');expect((await db.query('SELECT changes FROM audit_logs WHERE id=$1',[audit.id]))[0].changes.contact).toBe(target.email);}finally{await db.query('DELETE FROM audit_logs WHERE id=$1',[audit.id]);}
  });
  it('invalid security-log retention anchors block completion without changing source records',async()=>{
    const target=await user(),[login]=await db.query(`INSERT INTO login_attempts(email,"createdAt") VALUES($1,now()+interval '2 days') RETURNING id`,[target.email]);
    try{const result=await service().request(target.id);expect(result).toMatchObject({state:'review_required',erased:false});expect(result.reviewCodes).toContain('SYSTEM_LOG_RETENTION_ANCHOR_REVIEW_REQUIRED');expect((await db.query('SELECT email FROM login_attempts WHERE id=$1',[login.id]))[0].email).toBe(target.email);}finally{await db.query('DELETE FROM login_attempts WHERE id=$1',[login.id]);}
  });
  it('database single-employer guard serializes concurrent direct writers and leaves one employment',async()=>{
    const ownerA=await user(),ownerB=await user(),employee=await user(),a=await organization(ownerA.id),b=await organization(ownerB.id);
    const first=db.createQueryRunner(),second=db.createQueryRunner();await first.connect();await second.connect();
    try{
      await first.startTransaction();await second.startTransaction();
      await first.query(`INSERT INTO organization_members(organization_id,user_id,role) VALUES($1,$2,'staff')`,[a,employee.id]);
      const waiting=second.query(`INSERT INTO organization_members(organization_id,user_id,role) VALUES($1,$2,'accepted')`,[b,employee.id]);
      const outcome=waiting.then(()=>({ok:true}),error=>({ok:false,code:error.code,message:error.message}));
      await first.commitTransaction();
      expect(await outcome).toMatchObject({ok:false,code:'P0001',message:'OTHER_EMPLOYER_EXISTS'});
      await second.rollbackTransaction();
      expect(await db.query('SELECT organization_id FROM organization_members WHERE user_id=$1 AND left_at IS NULL',[employee.id])).toEqual([{organization_id:a}]);
    }finally{if(first.isTransactionActive)await first.rollbackTransaction();if(second.isTransactionActive)await second.rollbackTransaction();await first.release();await second.release();}
  });
  it('temporary suspension retains employment and another service while termination is a separate state',async()=>{
    const owner=await user(),employee=await user({netureStopped:false}),org=await organization(owner.id);
    await db.query(`INSERT INTO organization_members(organization_id,user_id,role) VALUES($1,$2,'staff')`,[org,employee.id]);
    await db.query(`INSERT INTO service_memberships(user_id,service_key,role,status) VALUES($1,'lecture','member','active')`,[employee.id]);
    const [before]=await db.query(`SELECT to_char("updatedAt",'YYYY-MM-DD"T"HH24:MI:SS.US') AS version,"refreshTokenFamily" FROM users WHERE id=$1`,[employee.id]);
    expect(await new MemberLifecycleService(db).stopAccess(fixtureAdminId,employee.id,{reason:'Synthetic suspension',version:before.version})).toMatchObject({serviceStatus:'suspended',employmentReleased:false});
    expect((await db.query('SELECT left_at FROM organization_members WHERE organization_id=$1 AND user_id=$2',[org,employee.id]))[0].left_at).toBeNull();
    expect((await db.query(`SELECT status FROM service_memberships WHERE user_id=$1 AND service_key='lecture'`,[employee.id]))[0].status).toBe('active');
    expect((await db.query('SELECT "refreshTokenFamily" FROM users WHERE id=$1',[employee.id]))[0].refreshTokenFamily).toBe(before.refreshTokenFamily);
  });
  it.each(['staff','admin','manager'])('%s account erasure detaches business attribution while preserving products, peer replies and courses',async(role)=>{
    const owner=await user(),employee=await user(),peer=await user(),org=await organization(owner.id);
    await db.query('INSERT INTO organization_members(organization_id,user_id,role) VALUES($1,$2,$3)',[org,employee.id,role]);
    const [catalog]=await db.query(`INSERT INTO catalog_products(name,regulatory_type,created_by) VALUES('Synthetic catalog','other',$1) RETURNING id`,[owner.id]);
    const [product]=await db.query(`INSERT INTO store_products(organization_id,catalog_product_id,name,price,created_by) VALUES($1,$2,'Synthetic employer product',0,$3) RETURNING id`,[org,catalog.id,employee.id]);
    const [post]=await db.query(`INSERT INTO forum_post(title,slug,author_id) VALUES('Synthetic resource',$1,$2) RETURNING id`,[randomUUID(),employee.id]);
    const [comment]=await db.query(`INSERT INTO forum_comment("postId",author_id,content) VALUES($1,$2,'Employee response') RETURNING id`,[post.id,employee.id]);
    const [reply]=await db.query(`INSERT INTO forum_comment("postId",author_id,content,"parentId") VALUES($1,$2,'Peer response',$3) RETURNING id`,[post.id,peer.id,comment.id]);
    const [course]=await db.query(`INSERT INTO lms_courses(title,"instructorId",service_key) VALUES('Synthetic retained course',$1,'lecture') RETURNING id`,[employee.id]);
    const [task]=await db.query(`INSERT INTO assistant_tasks(requested_by_user_id,ownership_scope,organization_id,status) VALUES($1,'ORGANIZATION',$2,'completed') RETURNING id`,[employee.id,org]);
    expect((await service().request(employee.id)).erased).toBe(true);
    expect((await db.query('SELECT created_by FROM store_products WHERE id=$1',[product.id]))[0].created_by).toBeNull();
    expect((await db.query('SELECT author_id FROM forum_comment WHERE id=$1',[comment.id]))[0].author_id).toBeNull();
    expect((await db.query('SELECT author_id,"parentId" FROM forum_comment WHERE id=$1',[reply.id]))[0]).toEqual({author_id:peer.id,parentId:comment.id});
    expect((await db.query('SELECT "instructorId" FROM lms_courses WHERE id=$1',[course.id]))[0].instructorId).toBeNull();
    expect((await db.query('SELECT requested_by_user_id FROM assistant_tasks WHERE id=$1',[task.id]))[0].requested_by_user_id).toBeNull();
  });
  it('personal mailbox and external connection children are deleted without touching peer or global clients',async()=>{
    const target=await user(),peer=await user(),account=randomUUID(),peerAccount=randomUUID(),connection=randomUUID(),client='fixture-'+randomUUID();
    await db.query(`INSERT INTO external_ai_clients(id,metadata) VALUES($1,'{}')`,[client]);
    await db.query(`INSERT INTO external_ai_connections(id,user_id,client_id,workspaces,scopes,expires_at) VALUES($1,$2,$3,'[]','[]',now()+interval '1 hour')`,[connection,target.id,client]);
    await db.query(`INSERT INTO external_ai_credentials(hash,kind,client_id,connection_id,data,expires_at) VALUES($1,'access',$2,$3,$4,now()+interval '1 hour')`,[randomUUID(),client,connection,JSON.stringify({subject:target.id})]);
    await db.query(`INSERT INTO external_ai_requests(connection_id,request_id,fingerprint,result,expires_at) VALUES($1,$2,'synthetic',$3,now()+interval '1 hour')`,[connection,randomUUID(),JSON.stringify({subject:target.id})]);
    for(const [id,subject] of [[account,target],[peerAccount,peer]]){
      await db.query(`INSERT INTO personal_mail_accounts(id,user_id,provider,address,credential_cipher) VALUES($1,$2,'gmail',$3,'synthetic-not-a-secret')`,[id,subject.id,subject.email]);
      await db.query(`INSERT INTO personal_mail_messages(account_id,provider_id,sender,received_at) VALUES($1,'synthetic',$2,now())`,[id,subject.email]);
      await db.query(`INSERT INTO personal_mail_rules(id,account_id,sender,action) VALUES($1,$2,$3,'keep')`,[randomUUID(),id,subject.email]);
    }
    expect((await service().request(target.id)).erased).toBe(true);
    expect(await db.query('SELECT id FROM external_ai_connections WHERE id=$1',[connection])).toHaveLength(0);
    expect(await db.query('SELECT hash FROM external_ai_credentials WHERE connection_id=$1',[connection])).toHaveLength(0);
    expect(await db.query('SELECT id FROM external_ai_clients WHERE id=$1',[client])).toHaveLength(1);
    expect(await db.query('SELECT provider_id FROM personal_mail_messages WHERE account_id=$1',[peerAccount])).toHaveLength(1);
    await db.query('DELETE FROM external_ai_clients WHERE id=$1',[client]);
  });
  it('known personal KYC storage failure preserves the document and generation; retry removes the actual fixture',async()=>{
    const target=await user(),documentId=randomUUID();
    await db.query(`INSERT INTO kyc_documents(id,user_id,"documentType","fileUrl","fileName") VALUES($1,$2,'id_card','gcs://fixture-private/kyc/identity.pdf','synthetic.pdf')`,[documentId,target.id]);
    let exists=true,fail=true;
    const storage={generation:jest.fn(async()=>exists?'19':null),deleteGeneration:jest.fn(async()=>{if(fail)throw new Error('synthetic failure');exists=false;})};
    const requested=await service(storage).request(target.id);expect(requested).toMatchObject({state:'retry_required',erased:false});
    expect(await db.query('SELECT id FROM kyc_documents WHERE id=$1',[documentId])).toHaveLength(1);
    expect((await db.query('SELECT generation FROM account_erasure_file_tasks WHERE operation_id=$1',[requested.operationId]))[0].generation).toBe('19');
    fail=false;expect((await service(storage).resume(requested.operationId)).erased).toBe(true);expect(exists).toBe(false);
    expect(await db.query('SELECT id FROM kyc_documents WHERE id=$1',[documentId])).toHaveLength(0);
  });
  it('history stays read-only while execution is OFF and current privilege is checked for every read',async()=>{
    const target=await user();await db.query(`UPDATE users SET "businessInfo"=jsonb_build_object('unclassified',$1::text) WHERE id=$2`,[target.id,fixtureAdminId]);
    const requested=await service().request(target.id);
    const disabled=new AccountErasureService(db,{enabled:false,personalBuckets:[]});
    expect(await disabled.get(requested.operationId,fixtureAdminId)).toMatchObject({state:'review_required',erased:false,remainingFileTasks:0});
    const history=await disabled.list(fixtureAdminId);expect(history.items).toHaveLength(1);expect(history.items[0].operationId).toBe(requested.operationId);
    expect(Object.keys(history.items[0])).not.toContain('subject_id');
    await expect(disabled.list(fixtureAdminId,0)).rejects.toMatchObject({code:'INVALID_ERASURE_FILTER'});
    await db.query(`UPDATE role_assignments SET is_active=false WHERE user_id=$1`,[fixtureAdminId]);
    await expect(disabled.list(fixtureAdminId)).rejects.toMatchObject({code:'FORBIDDEN'});
    await expect(disabled.get(requested.operationId,fixtureAdminId)).rejects.toMatchObject({code:'FORBIDDEN'});
  });
  it('a peer file reference waits for the generation pin and blocks deletion on the next pass',async()=>{
    const target=await user({avatar:'gcs://fixture-private/race-avatar.png'}),peer=await user();
    const writer=db.createQueryRunner();await writer.connect();const [{pid}]=await writer.query('SELECT pg_backend_pid() AS pid');
    let waiting:Promise<unknown>|undefined;
    const storage={generation:jest.fn(async()=>{
      waiting=writer.query(`INSERT INTO notifications("userId",type,title,message,metadata) VALUES($1,'info','Peer retained','Peer retained',$2)`,[peer.id,JSON.stringify({attachment:'gcs://fixture-private/race-avatar.png'})]);
      let blocked=false;
      for(let i=0;i<30;i++){
        const [status]=await db.query('SELECT cardinality(pg_blocking_pids($1))>0 AS blocked',[pid]);
        if(status.blocked){blocked=true;break;}
        await new Promise(resolve=>setImmediate(resolve));
      }
      expect(blocked).toBe(true);return '37';
    }),deleteGeneration:jest.fn(async()=>{})};
    try{
      const result=await service(storage).request(target.id);await waiting;
      expect(result).toMatchObject({state:'review_required',erased:false});
      expect(result.reviewCodes).toContain('PERSONAL_FILE_SHARED_USAGE_REVIEW_REQUIRED');
      expect(storage.deleteGeneration).not.toHaveBeenCalled();
      expect(await db.query('SELECT id FROM notifications WHERE "userId"=$1',[peer.id])).toHaveLength(1);
    }finally{if(waiting)await waiting;await writer.release();}
  });
  it('a private attachment manifest removes a real isolated file only after the committed generation pin',async()=>{
    const target=await user();const directory=await mkdtemp(join(tmpdir(),'o4o-personal-fixture-')),file=join(directory,'synthetic.pdf'),orphan=join(directory,'orphan.pdf');
    await writeFile(file,'synthetic attachment only');await writeFile(orphan,'synthetic orphan only');
    try{
      await db.query(`INSERT INTO notifications("userId",type,title,message,metadata) VALUES($1,'info','Synthetic','Synthetic',$2)`,[target.id,JSON.stringify({attachment:'gcs://fixture-private/attachment.pdf'})]);
      const storage={discover:async()=>[`gcs://fixture-private/business-registration/${target.id}/orphan.pdf`],generation:async(_bucket:string,path:string)=>{await readFile(path==='attachment.pdf'?file:orphan);return '23';},deleteGeneration:async(_bucket:string,path:string,generation:string)=>{expect(generation).toBe('23');await unlink(path==='attachment.pdf'?file:orphan);}};
      const result=await service(storage).request(target.id);expect(result.reviewCodes).toEqual([]);expect(result).toMatchObject({erased:true,state:'completed'});
      await expect(readFile(file)).rejects.toMatchObject({code:'ENOENT'});await expect(readFile(orphan)).rejects.toMatchObject({code:'ENOENT'});
    }finally{await rm(directory,{recursive:true,force:true});}
  });
  it('closure file failures and changed generations retain the durable document until a successful retry',async()=>{
    const target=await user(),org=await organization(target.id),documentId=randomUUID();
    const [caseRow]=await db.query(`INSERT INTO store_owner_termination_cases(service_key,organization_id,user_id,status) VALUES('kpa-society',$1,$2,'failed') RETURNING id`,[org,target.id]);
    await db.query(`INSERT INTO kyc_documents(id,user_id,"documentType","fileUrl","fileName") VALUES($1,$2,'business_registration','gcs://o4o-private-documents/synthetic-closure.pdf','synthetic.pdf')`,[documentId,target.id]);
    await db.query(`UPDATE organizations SET "isActive"=false,metadata=jsonb_build_object('businessProfile',jsonb_build_object('businessRegistrationDocumentId',$1::text)) WHERE id=$2`,[documentId,org]);
    const directory=await mkdtemp(join(tmpdir(),'o4o-closure-fixture-')),file=join(directory,'synthetic.pdf');await writeFile(file,'synthetic closure document');
    let generation='31',fail=true;
    const storage={inspect:async()=>{try{await readFile(file);return generation;}catch{return null;}},remove:jest.fn(async()=>{if(fail)throw new Error('synthetic storage failure');await unlink(file);})};
    try{
      await purgeClosureDocuments(db,caseRow.id,org,storage);expect(storage.remove).not.toHaveBeenCalled();
      expect((await db.query('SELECT generation FROM store_closure_file_tasks WHERE case_id=$1',[caseRow.id]))[0].generation).toBe('31');
      await expect(purgeClosureDocuments(db,caseRow.id,org,storage)).rejects.toThrow('STORE_CLOSURE_FILE_DELETE_FAILED');
      expect(await db.query('SELECT id FROM kyc_documents WHERE id=$1',[documentId])).toHaveLength(1);
      generation='32';await expect(purgeClosureDocuments(db,caseRow.id,org,storage)).rejects.toThrow('STORE_CLOSURE_FILE_GENERATION_CHANGED');
      generation='31';fail=false;await purgeClosureDocuments(db,caseRow.id,org,storage);
      expect(await db.query('SELECT id FROM kyc_documents WHERE id=$1',[documentId])).toHaveLength(0);
      expect((await db.query('SELECT state FROM store_closure_file_tasks WHERE case_id=$1',[caseRow.id]))[0].state).toBe('deleted');
      await expect(readFile(file)).rejects.toMatchObject({code:'ENOENT'});
    }finally{await rm(directory,{recursive:true,force:true});}
  });
  it('Admin final deletion removes a selected forum and course dependents while retaining peers and accounts',async()=>{
    const author=await user(),learner=await user(),board=randomUUID();
    await db.query(`INSERT INTO forum_category_requests(id,name,description,status,service_code,requester_id,requester_name) VALUES($1,'Synthetic archived board','Synthetic','archived','community',$2,'Synthetic author')`,[board,author.id]);
    const [post]=await db.query(`INSERT INTO forum_post(title,slug,author_id,forum_id) VALUES('Selected forum post',$1,$2,$3) RETURNING id`,[randomUUID(),author.id,board]);
    await db.query(`INSERT INTO forum_comment("postId",author_id,content) VALUES($1,$2,'Selected forum reply')`,[post.id,learner.id]);
    const [peer]=await db.query(`INSERT INTO forum_post(title,slug,author_id) VALUES('Peer post',$1,$2) RETURNING id`,[randomUUID(),learner.id]);
    const plan=await db.transaction('REPEATABLE READ',m=>planCommunityDeletion(m,fixtureAdminId,'boards',board));
    expect(plan.blockers).toHaveLength(0);
    expect((await db.transaction('SERIALIZABLE',m=>applyCommunityDeletion(m,fixtureAdminId,'boards',board,plan.digest))).applied).toBe(true);
    expect(await db.query('SELECT id FROM forum_post WHERE id=$1',[post.id])).toHaveLength(0);
    expect(await db.query('SELECT id FROM forum_comment WHERE "postId"=$1',[post.id])).toHaveLength(0);
    expect(await db.query('SELECT id FROM forum_post WHERE id=$1',[peer.id])).toHaveLength(1);
    const [course]=await db.query(`INSERT INTO lms_courses(title,status,service_key) VALUES('Selected archived course','archived','lecture') RETURNING id`);
    await db.query(`INSERT INTO lms_lessons(title,"courseId") VALUES('Selected lesson',$1)`,[course.id]);
    await db.query(`INSERT INTO lms_enrollments("userId","courseId") VALUES($1,$2)`,[learner.id,course.id]);
    const coursePlan=await lectureDeletionPlan(db.manager,course.id);
    expect(coursePlan.counts.lms_lessons).toBe(1);expect(coursePlan.blockers).toHaveLength(0);
    await expect(hardDeleteLectureCourse(db,course.id,fixtureAdminId,'Synthetic cleanup','stale')).rejects.toMatchObject({code:'DELETION_PLAN_CHANGED'});
    expect((await hardDeleteLectureCourse(db,course.id,fixtureAdminId,'Synthetic cleanup',coursePlan.digest)).deleted).toBe(true);
    expect(await db.query('SELECT id FROM lms_lessons WHERE "courseId"=$1',[course.id])).toHaveLength(0);
    expect(await db.query('SELECT id FROM lms_enrollments WHERE "courseId"=$1',[course.id])).toHaveLength(0);
    expect(await db.query('SELECT id FROM users WHERE id=ANY($1::uuid[])',[[author.id,learner.id]])).toHaveLength(2);
  });
  it('lifecycle mutations reject missing central authority and stale member versions before changes',async()=>{
    const actor=await user(),target=await user({netureStopped:false});
    const lifecycle=new MemberLifecycleService(db);
    await expect(lifecycle.stopAccess(actor.id,target.id,{reason:'Synthetic stop',version:'stale'})).rejects.toMatchObject({status:403});
    await expect(lifecycle.stopAccess(fixtureAdminId,target.id,{reason:'Synthetic stop',version:'stale'})).rejects.toMatchObject({code:'MEMBER_CHANGED'});
    expect(await db.query(`SELECT 1 FROM service_memberships WHERE user_id=$1 AND status='suspended'`,[target.id])).toHaveLength(0);
    expect((await db.query('SELECT "isActive" FROM users WHERE id=$1',[target.id]))[0].isActive).toBe(true);
  });
  it('employee access termination preserves business content and later erasure removes personal links',async()=>{
    const owner=await user(),employee=await user({netureStopped:false}),org=await organization(owner.id);
    await db.query(`INSERT INTO organization_members(organization_id,user_id,role) VALUES($1,$2,'staff')`,[org,employee.id]);
    await db.query(`INSERT INTO role_assignments(user_id,role) VALUES($1,'kpa:store_member')`,[employee.id]);
    await db.query(`INSERT INTO store_local_products(organization_id,name) VALUES($1,'Business document sentinel')`,[org]);
    const [version]=await db.query(`SELECT to_char("updatedAt",'YYYY-MM-DD"T"HH24:MI:SS.US') AS version FROM users WHERE id=$1`,[employee.id]);
    const stopped=await new MemberLifecycleService(db).terminateAccess(fixtureAdminId,employee.id,{reason:'Synthetic employment termination',version:version.version});
    expect(stopped.serviceStatus).toBe('withdrawn');
    expect(stopped.businessDataDeleted).toBe(false);
    expect((await db.query(`SELECT left_at FROM organization_members WHERE user_id=$1`,[employee.id]))[0].left_at).not.toBeNull();
    expect((await service().request(employee.id)).erased).toBe(true);
    expect(await db.query('SELECT 1 FROM organization_members WHERE user_id=$1',[employee.id])).toHaveLength(0);
    expect(await db.query('SELECT 1 FROM store_local_products WHERE organization_id=$1',[org])).toHaveLength(1);
  });
  it('pharmacy sale keeps the organization and content while moving ownership and approved license',async()=>{
    const previous=await user(),next=await user({netureStopped:false}),org=await organization(previous.id);
    await db.query(`INSERT INTO kpa_pharmacist_profiles(user_id,license_number,license_verified,verified_at,verified_by,qualification_status,qualification_reason)
      VALUES($1,$2,true,now(),$3,'approved','Synthetic evidence')`,[next.id,randomUUID().slice(0,20),fixtureAdminId]);
    await db.query(`INSERT INTO neture_pharmacy_memberships(organization_id,applicant_user_id,status,pharmacy_name,business_number,pharmacist_license_number)
      VALUES($1,$2,'active','Synthetic pharmacy',$3,'old-license')`,[org,previous.id,randomUUID().slice(0,10)]);
    await db.query(`INSERT INTO role_assignments(user_id,role) VALUES($1,'neture:store_owner')`,[previous.id]);
    await db.query(`INSERT INTO store_local_products(organization_id,name) VALUES($1,'Preserved sale content')`,[org]);
    const documentId=randomUUID();
    await db.query(`INSERT INTO kyc_documents(id,user_id,"documentType","fileUrl","fileName") VALUES($1,$2,'business_registration',$3,'synthetic.pdf')`,[documentId,previous.id,`gcs://o4o-private-documents/business-registration/${previous.id}/proof`]);
    await db.query(`UPDATE organizations SET metadata=jsonb_build_object('businessProfile',jsonb_build_object('businessRegistrationDocumentId',$1::text)) WHERE id=$2`,[documentId,org]);
    await defaultPharmacyConnection(org,previous.id);
    const lifecycle=new MemberLifecycleService(db);
    await lifecycle.transferPharmacy(fixtureAdminId,previous.id,org,{nextOwnerEmail:next.email,reason:'Synthetic sale confirmed',transferConfirmed:true});
    expect((await db.query('SELECT applicant_user_id FROM neture_pharmacy_memberships WHERE organization_id=$1',[org]))[0].applicant_user_id).toBe(next.id);
    expect((await db.query(`SELECT is_active FROM role_assignments WHERE user_id=$1 AND role='neture:store_owner'`,[next.id]))[0].is_active).toBe(true);
    expect(await db.query(`SELECT id FROM role_assignments WHERE user_id=$1 AND role='kpa:store_owner'`,[next.id])).toHaveLength(0);
    expect((await db.query("SELECT user_id FROM organization_members WHERE organization_id=$1 AND role='owner' AND left_at IS NULL",[org]))[0].user_id).toBe(next.id);
    const documents=new BusinessRegistrationDocumentService(db);
    expect(await documents.canReadDocument(previous.id,documentId)).toBe(false);
    expect(await documents.canReadDocument(next.id,documentId)).toBe(true);
    expect((await service().request(previous.id)).erased).toBe(true);
    expect((await db.query('SELECT user_id FROM kyc_documents WHERE id=$1',[documentId]))[0].user_id).toBeNull();
    expect(await documents.canReadDocument(next.id,documentId)).toBe(true);
    expect(await db.query('SELECT 1 FROM store_local_products WHERE organization_id=$1',[org])).toHaveLength(1);
    expect(await db.query('SELECT 1 FROM neture_pharmacy_memberships WHERE organization_id=$1',[org])).toHaveLength(1);
    expect((await db.query('SELECT applied_by FROM semi_franchise_memberships WHERE organization_id=$1',[org]))[0].applied_by).toBeNull();
  });
  it('supplier account erasure retains the supplier business identity and removes its private profile',async()=>{
    const target=await user(),supplier=randomUUID(),org=await organization(target.id);
    await db.query("UPDATE organizations SET type='supplier' WHERE id=$1",[org]);
    await db.query(`INSERT INTO neture_suppliers(id,slug,user_id,contact_email,manager_name,settlement_account_number,organization_id)
      VALUES($1::uuid,$1::text,$2,$3,'Synthetic private contact','synthetic-account',$4)`,[supplier,target.id,target.email,org]);
    const master=randomUUID(),offer=randomUUID();
    await db.query(`INSERT INTO product_masters(id,regulatory_name,name,manufacturer_name) VALUES($1,'Synthetic regulatory name','Synthetic product','Synthetic manufacturer')`,[master]);
    await db.query(`INSERT INTO supplier_product_offers(id,master_id,supplier_id,slug) VALUES($1,$2,$3,$4)`,[offer,master,supplier,offer]);
    expect((await service().request(target.id)).erased).toBe(true);
    expect(await db.query('SELECT 1 FROM supplier_product_offers WHERE id=$1 AND supplier_id=$2',[offer,supplier])).toHaveLength(1);
    expect((await db.query('SELECT user_id,contact_email,manager_name,settlement_account_number,status FROM neture_suppliers WHERE id=$1',[supplier]))[0]).toEqual({user_id:null,contact_email:null,manager_name:null,settlement_account_number:null,status:'INACTIVE'});
  });
  it('supplier proof-file ownership uses canonical organization membership and rejects shared documents',async()=>{
    const target=await user(),peer=await user(),org=await organization(target.id),supplier=randomUUID(),document=randomUUID();
    await db.query("UPDATE organizations SET type='supplier' WHERE id=$1",[org]);
    const path=`neture/suppliers/${supplier}/kyc/business-registration/${document}.pdf`;
    await db.query(`INSERT INTO kyc_documents(id,user_id,"documentType","fileUrl","fileName") VALUES($1,$2,'business_registration',$3,'synthetic.pdf')`,[document,target.id,`gcs://fixture-private/${path}`]);
    await db.query(`INSERT INTO neture_suppliers(id,slug,organization_id,user_id,business_registration_document_id) VALUES($1::uuid,$1::text,$2,NULL,$3)`,[supplier,org,document]);
    const metadata={o4o_resource_kind:'supplier',o4o_asset_purpose:'business',o4o_resource_id:supplier,o4o_document_id:document};
    expect(await mayEraseSupplierProfileFile(db.manager,target.id,'fixture-private',path,metadata)).toBe(true);
    expect(await mayEraseSupplierProfileFile(db.manager,peer.id,'fixture-private',path,metadata)).toBe(false);
    const peerOrg=await organization(peer.id);
    await db.query(`UPDATE organizations SET metadata=jsonb_build_object('businessProfile',jsonb_build_object('businessRegistrationDocumentId',$2::text)) WHERE id=$1`,[peerOrg,document]);
    expect(await mayEraseSupplierProfileFile(db.manager,target.id,'fixture-private',path,metadata)).toBe(false);
  });
  it('canonical supplier ownership works with a NULL legacy pointer and removes the typed manager email',async()=>{
    const target=await user(),org=await organization(target.id),supplier=randomUUID();
    await db.query("UPDATE organizations SET type='supplier',metadata=jsonb_build_object('businessProfile',jsonb_build_object('managerEmail',$2::text,'businessEntityType','corporation')) WHERE id=$1",[org,target.email]);
    await db.query(`INSERT INTO neture_suppliers(id,slug,organization_id,user_id,contact_email) VALUES($1::uuid,$1::text,$2,NULL,$3)`,[supplier,org,target.email]);
    expect(await service().request(target.id)).toMatchObject({erased:true,state:'completed'});
    expect((await db.query('SELECT contact_email,status FROM neture_suppliers WHERE id=$1',[supplier]))[0]).toEqual({contact_email:null,status:'INACTIVE'});
    expect((await db.query('SELECT metadata FROM organizations WHERE id=$1',[org]))[0].metadata.businessProfile).toEqual({businessEntityType:'corporation'});
  });
  it('a legacy supplier pointer never authorizes erasing another canonical owner’s business profile',async()=>{
    const target=await user(),peer=await user(),org=await organization(peer.id),supplier=randomUUID();
    await db.query("UPDATE organizations SET type='supplier' WHERE id=$1",[org]);
    await db.query(`INSERT INTO neture_suppliers(id,slug,organization_id,user_id,contact_email) VALUES($1::uuid,$1::text,$2,$3,$4)`,[supplier,org,target.id,peer.email]);
    const result=await service().request(target.id);expect(result).toMatchObject({erased:false,state:'review_required'});expect(result.reviewCodes).toContain('REVIEW:public.neture_suppliers');
    expect((await db.query('SELECT contact_email,status FROM neture_suppliers WHERE id=$1',[supplier]))[0].contact_email).toBe(peer.email);
  });
  it('shared supplier ownership requires domain disposition and preserves the shared profile',async()=>{
    const target=await user(),peer=await user(),org=await organization(target.id),supplier=randomUUID();
    await db.query("UPDATE organizations SET type='supplier' WHERE id=$1",[org]);
    await db.query(`INSERT INTO organization_members(organization_id,user_id,role) VALUES($1,$2,'owner')`,[org,peer.id]);
    await db.query(`INSERT INTO neture_suppliers(id,slug,organization_id,user_id,contact_email) VALUES($1::uuid,$1::text,$2,$3,$4)`,[supplier,org,target.id,target.email]);
    const result=await service().request(target.id);expect(result).toMatchObject({erased:false,state:'review_required'});expect(result.reviewCodes).toContain('SUPPLIER_OWNER_DISPOSITION_REVIEW_REQUIRED');
    expect((await db.query('SELECT contact_email FROM neture_suppliers WHERE id=$1',[supplier]))[0].contact_email).toBe(target.email);
  });
  it('confirmed complete pharmacy closure purges Store content and allows subsequent personal erasure',async()=>{
    const target=await user(),org=await organization(target.id);
    await db.query(`INSERT INTO platform_services(code,name) VALUES('kpa-society','Synthetic service') ON CONFLICT DO NOTHING`);
    await db.query(`INSERT INTO organization_service_enrollments(organization_id,service_code) VALUES($1,'kpa-society')`,[org]);
    await db.query(`INSERT INTO role_assignments(user_id,role) VALUES($1,'kpa:store_owner')`,[target.id]);
    await db.query(`INSERT INTO neture_pharmacy_memberships(organization_id,applicant_user_id,status,pharmacy_name,business_number,pharmacist_license_number)
      VALUES($1,$2,'active','Synthetic pharmacy',$3,'synthetic-license')`,[org,target.id,randomUUID().slice(0,10)]);
    await db.query(`INSERT INTO store_local_products(organization_id,name) VALUES($1,'Closed pharmacy content')`,[org]);
    const [snapshot]=await db.query(`INSERT INTO store_ai_snapshots(organization_id,snapshot_date) VALUES($1,CURRENT_DATE) RETURNING id`,[org]);
    await db.query(`INSERT INTO store_ai_insights(snapshot_id,organization_id,summary,model) VALUES($1,$2,'Synthetic summary','fixture')`,[snapshot.id,org]);
    expect((await service().request(target.id)).state).toBe('review_required');
    const result=await new MemberLifecycleService(db).closePharmacy(fixtureAdminId,target.id,org,{reason:'Synthetic complete closure',closureConfirmed:true});
    expect(result.storeInventoryPurged).toBe(true);
    expect(await db.query('SELECT id FROM store_ai_insights WHERE organization_id=$1',[org])).toHaveLength(0);
    expect(await db.query('SELECT 1 FROM store_local_products WHERE organization_id=$1',[org])).toHaveLength(0);
    expect((await db.query('SELECT "isActive" FROM organizations WHERE id=$1',[org]))[0].isActive).toBe(false);
    expect((await service().request(target.id)).erased).toBe(true);
    await expect(db.query(`INSERT INTO store_ai_snapshots(organization_id,snapshot_date) VALUES($1,CURRENT_DATE)`,[org])).rejects.toMatchObject({code:'P0001',message:'PHARMACY_FULLY_CLOSED'});
    await expect(db.query('UPDATE organizations SET "isActive"=true WHERE id=$1',[org])).rejects.toMatchObject({code:'P0001',message:'PHARMACY_FULLY_CLOSED'});
  });
  it('closing one pharmacy retains the owner role and access for another active owned pharmacy',async()=>{
    const target=await user(),closed=await organization(target.id),retained=await organization(target.id);
    await db.query(`INSERT INTO platform_services(code,name) VALUES('kpa-society','Synthetic service') ON CONFLICT DO NOTHING`);
    await db.query(`INSERT INTO organization_service_enrollments(organization_id,service_code) VALUES($1,'kpa-society'),($2,'kpa-society')`,[closed,retained]);
    await db.query(`INSERT INTO role_assignments(user_id,role) VALUES($1,'kpa:store_owner'),($1,'neture:store_owner')`,[target.id]);
    await db.query(`INSERT INTO neture_pharmacy_memberships(organization_id,applicant_user_id,status,pharmacy_name,business_number,pharmacist_license_number) VALUES($1,$2,'active','Synthetic retained pharmacy',$3,'synthetic-license')`,[retained,target.id,randomUUID().slice(0,10)]);
    await db.query(`INSERT INTO neture_pharmacy_memberships(organization_id,applicant_user_id,status,pharmacy_name,business_number,pharmacist_license_number) VALUES($1,$2,'active','Synthetic closing pharmacy',$3,'synthetic-license')`,[closed,target.id,randomUUID().slice(0,10)]);
    expect((await new MemberLifecycleService(db).closePharmacy(fixtureAdminId,target.id,closed,{reason:'Synthetic selected pharmacy closure',closureConfirmed:true})).storeInventoryPurged).toBe(true);
    expect((await db.query(`SELECT is_active FROM role_assignments WHERE user_id=$1 AND role='kpa:store_owner'`,[target.id]))[0].is_active).toBe(true);
    expect((await db.query(`SELECT is_active FROM role_assignments WHERE user_id=$1 AND role='neture:store_owner'`,[target.id]))[0].is_active).toBe(true);
    expect((await db.query('SELECT left_at FROM organization_members WHERE organization_id=$1 AND user_id=$2',[retained,target.id]))[0].left_at).toBeNull();
    expect((await db.query('SELECT "isActive" FROM organizations WHERE id=$1',[retained]))[0].isActive).toBe(true);
  });
  it('full closure inventories nonstandard business references and preserves them until native-domain review',async()=>{
    const target=await user(),peer=await user(),org=await organization(target.id);
    await db.query(`INSERT INTO platform_services(code,name) VALUES('kpa-society','Synthetic service') ON CONFLICT DO NOTHING`);
    await db.query(`INSERT INTO organization_service_enrollments(organization_id,service_code) VALUES($1,'kpa-society')`,[org]);
    await db.query(`INSERT INTO role_assignments(user_id,role) VALUES($1,'kpa:store_owner')`,[target.id]);
    await db.query(`INSERT INTO neture_pharmacy_memberships(organization_id,applicant_user_id,status,pharmacy_name,business_number,pharmacist_license_number) VALUES($1,$2,'active','Synthetic pharmacy',$3,'synthetic-license')`,[org,target.id,randomUUID().slice(0,10)]);
    const [order]=await db.query(`INSERT INTO checkout_orders("orderNumber","buyerId","sellerId","sellerOrganizationId","totalAmount") VALUES($1,$2,'synthetic-supplier',$3,0) RETURNING id`,[randomUUID(),peer.id,org]);
    await db.query(`INSERT INTO store_local_products(organization_id,name) VALUES($1,'Preserve until reviewed')`,[org]);
    const lifecycle=new MemberLifecycleService(db);
    expect((await lifecycle.closurePlan(fixtureAdminId,target.id,org)).reviewRows).toBe(1);
    const result=await lifecycle.closePharmacy(fixtureAdminId,target.id,org,{reason:'Synthetic unclassified business reference',closureConfirmed:true});
    expect(result).toMatchObject({storeInventoryPurged:false,errorCode:'STORE_CLOSURE_INVENTORY_REVIEW_REQUIRED'});
    expect(await db.query('SELECT id FROM checkout_orders WHERE id=$1',[order.id])).toHaveLength(1);
    expect(await db.query('SELECT id FROM store_local_products WHERE organization_id=$1',[org])).toHaveLength(1);
  });
  it.each(['active','suspended'])('current %s pharmacy closes without a legacy KPA role or active enrollment prerequisite',async(status)=>{
    const target=await user(),org=await organization(target.id);
    await db.query(`INSERT INTO platform_services(code,name) VALUES('kpa-society','Synthetic service') ON CONFLICT DO NOTHING`);
    await db.query(`INSERT INTO organization_service_enrollments(organization_id,service_code,status) VALUES($1,'kpa-society',$2)`,[org,status==='active'?'active':'inactive']);
    if(status==='active')await db.query(`INSERT INTO role_assignments(user_id,role) VALUES($1,'neture:store_owner')`,[target.id]);
    await db.query(`INSERT INTO neture_pharmacy_memberships(organization_id,applicant_user_id,status,pharmacy_name,business_number,pharmacist_license_number) VALUES($1,$2,$3,'Synthetic current pharmacy',$4,'synthetic-license')`,[org,target.id,status,randomUUID().slice(0,10)]);
    const defaultBusiness=await defaultPharmacyConnection(org,target.id);
    expect(await db.query(`SELECT id FROM role_assignments WHERE user_id=$1 AND role='kpa:store_owner'`,[target.id])).toHaveLength(0);
    expect((await new MemberLifecycleService(db).closePharmacy(fixtureAdminId,target.id,org,{reason:'Synthetic native pharmacy closure',closureConfirmed:true})).storeInventoryPurged).toBe(true);
    expect(await db.query(`SELECT id FROM role_assignments WHERE user_id=$1 AND role='neture:store_owner' AND is_active`,[target.id])).toHaveLength(0);
    expect(await db.query('SELECT id FROM semi_franchise_memberships WHERE organization_id=$1',[org])).toHaveLength(0);
    expect(await db.query('SELECT id FROM semi_franchises WHERE id=$1',[defaultBusiness])).toHaveLength(1);
    expect((await service().request(target.id)).erased).toBe(true);
  });
  async function currentPharmacy(){
    const target=await user({netureStopped:false}),org=await organization(target.id);
    await db.query(`INSERT INTO platform_services(code,name) VALUES('kpa-society','Synthetic service') ON CONFLICT DO NOTHING`);
    await db.query(`INSERT INTO organization_service_enrollments(organization_id,service_code) VALUES($1,'kpa-society')`,[org]);
    await db.query(`INSERT INTO role_assignments(user_id,role) VALUES($1,'neture:store_owner')`,[target.id]);
    await db.query(`INSERT INTO neture_pharmacy_memberships(organization_id,applicant_user_id,status,pharmacy_name,business_number,pharmacist_license_number) VALUES($1,$2,'active','Synthetic current pharmacy',$3,'synthetic-license')`,[org,target.id,randomUUID().slice(0,10)]);
    return {target,org};
  }
  it('explicit complete closure removes all organization service keys while retaining global and peer resources',async()=>{
    const {target,org}=await currentPharmacy(),peer=await user(),peerOrg=await organization(peer.id);
    for(const key of ['kpa','neture','k-cosmetics']){
      for(const table of ['store_pops','store_blog_posts'])await db.query(`INSERT INTO ${table}(store_id,service_key,title,slug,content) VALUES($1,$2,'Synthetic store copy',$3,'Synthetic content')`,[org,key,randomUUID()]);
      await db.query(`INSERT INTO store_videos(store_id,service_key,title,slug,video_url) VALUES($1,$2,'Synthetic video',$3,'https://fixture.invalid/video')`,[org,key,randomUUID()]);
      const [media]=await db.query(`INSERT INTO signage_media("serviceKey","organizationId",name,"mediaType","sourceType","sourceUrl","createdByUserId") VALUES($1,$2,'Synthetic store media','video','url','https://fixture.invalid/video',$3) RETURNING id`,[key,org,target.id]);
      const [playlist]=await db.query(`INSERT INTO signage_playlists("serviceKey","organizationId",name,"createdByUserId") VALUES($1,$2,'Synthetic store playlist',$3) RETURNING id`,[key,org,target.id]);
      await db.query(`INSERT INTO signage_playlist_items("playlistId","mediaId","sortOrder") VALUES($1,$2,0)`,[playlist.id,media.id]);
      await db.query(`INSERT INTO signage_schedules("serviceKey","organizationId",name,"playlistId","daysOfWeek","startTime","endTime") VALUES($1,$2,'Synthetic store schedule',$3,'{1}','09:00','18:00')`,[key,org,playlist.id]);
    }
    const [global]=await db.query(`INSERT INTO signage_playlists("serviceKey",name) VALUES('neture','Global original retained') RETURNING id`);
    const [other]=await db.query(`INSERT INTO signage_playlists("serviceKey","organizationId",name) VALUES('neture',$1,'Peer retained') RETURNING id`,[peerOrg]);
    expect((await service().request(target.id)).state).toBe('review_required');
    expect((await new MemberLifecycleService(db).closePharmacy(fixtureAdminId,target.id,org,{reason:'Synthetic all-service complete closure',closureConfirmed:true})).storeInventoryPurged).toBe(true);
    for(const table of ['store_pops','store_blog_posts','store_videos'])expect(await db.query(`SELECT id FROM ${table} WHERE store_id=$1`,[org])).toHaveLength(0);
    for(const table of ['signage_media','signage_playlists','signage_schedules'])expect(await db.query(`SELECT id FROM ${table} WHERE "organizationId"=$1`,[org])).toHaveLength(0);
    expect(await db.query('SELECT id FROM signage_playlists WHERE id=ANY($1)',[[global.id,other.id]])).toHaveLength(2);
    expect((await service().request(target.id)).erased).toBe(true);
  });
  it.each(['schedule','media'])('complete closure preserves another organization’s %s reference and returns explicit review',async(kind)=>{
    const {target,org}=await currentPharmacy(),peer=await user(),peerOrg=await organization(peer.id);
    const [playlist]=await db.query(`INSERT INTO signage_playlists("serviceKey","organizationId",name) VALUES('neture',$1,'Synthetic source') RETURNING id`,[kind==='schedule'?org:peerOrg]);
    if(kind==='schedule')await db.query(`INSERT INTO signage_schedules("serviceKey","organizationId",name,"playlistId","daysOfWeek","startTime","endTime") VALUES('neture',$1,'Peer schedule',$2,'{1}','09:00','18:00')`,[peerOrg,playlist.id]);
    else{
      const [media]=await db.query(`INSERT INTO signage_media("serviceKey","organizationId",name,"mediaType","sourceType","sourceUrl") VALUES('neture',$1,'Synthetic shared media','video','url','https://fixture.invalid/video') RETURNING id`,[org]);
      await db.query(`INSERT INTO signage_playlist_items("playlistId","mediaId","sortOrder") VALUES($1,$2,0)`,[playlist.id,media.id]);
    }
    const result=await new MemberLifecycleService(db).closePharmacy(fixtureAdminId,target.id,org,{reason:'Synthetic shared content guard',closureConfirmed:true});
    expect(result).toMatchObject({storeInventoryPurged:false,errorCode:'STORE_CLOSURE_SHARED_CONTENT_REVIEW_REQUIRED'});
    expect(await db.query('SELECT id FROM signage_playlists WHERE id=$1',[playlist.id])).toHaveLength(1);
    expect(await db.query(`SELECT id FROM ${kind==='schedule'?'signage_schedules':'signage_playlist_items'} WHERE ${kind==='schedule'?'"organizationId"':'"playlistId"'}=$1`,[kind==='schedule'?peerOrg:playlist.id])).toHaveLength(1);
  });
  it('ordinary KPA contract purge keeps another service’s store content and its original seven-day boundary',async()=>{
    const {target,org}=await currentPharmacy();await db.query(`INSERT INTO role_assignments(user_id,role) VALUES($1,'kpa:store_owner')`,[target.id]);
    const [keep]=await db.query(`INSERT INTO signage_playlists("serviceKey","organizationId",name) VALUES('neture',$1,'Retained Neture content') RETURNING id`,[org]);
    const legacy=new (await import('../../store-owner-termination.service.js')).StoreOwnerTerminationService(db);
    const lifecycle=await legacy.createCase({serviceKey:'kpa-society',organizationId:org,userId:target.id,requestedBy:fixtureAdminId});
    await legacy.terminateCase(lifecycle.id);
    await expect(legacy.purgeCase(lifecycle.id,{dryRun:false})).rejects.toMatchObject({code:'PURGE_NOT_DUE'});
    await legacy.purgeCase(lifecycle.id,{dryRun:false,now:new Date(Date.now()+8*86400000)});
    expect(await db.query('SELECT id FROM signage_playlists WHERE id=$1',[keep.id])).toHaveLength(1);
  });
  it('an inactive pharmacy without completed closure still needs business disposition',async()=>{
    const target=await user(),org=await organization(target.id);
    await db.query('UPDATE organizations SET "isActive"=false WHERE id=$1',[org]);
    expect((await service().request(target.id)).reviewCodes).toContain('PHARMACY_TRANSFER_OR_CLOSURE_REQUIRED');
  });
  it('an active pharmacy owner cannot be erased before sale or closure disposition',async()=>{
    const target=await user();await organization(target.id);
    const result=await service().request(target.id);
    expect(result.erased).toBe(false);expect(result.reviewCodes).toContain('PHARMACY_TRANSFER_OR_CLOSURE_REQUIRED');
  });
  it('disabled rollout performs no deactivation or operation write',async()=>{
    const u=await user();
    await expect(new AccountErasureService(db,{enabled:false,personalBuckets:[]}).request(u.id,fixtureAdminId)).rejects.toMatchObject({code:'ACCOUNT_ERASURE_ROLLOUT_REQUIRED',statusCode:503});
    expect((await db.query('SELECT "isActive" FROM users WHERE id=$1',[u.id]))[0].isActive).toBe(true);
    expect(await db.query('SELECT id FROM account_erasure_operations')).toHaveLength(0);
  });
  it('both actual DELETE routes enforce real JWT/DB platform roles and share completion/status contracts',async()=>{
    process.env.ACCOUNT_ERASURE_MODE='apply';process.env.ACCOUNT_ERASURE_FILE_INVENTORY_REVIEW='confirmed';process.env.ACCOUNT_ERASURE_SYSTEM_YEARS='1';process.env.ACCOUNT_ERASURE_SYSTEM_POLICY_BASIS='isolated-synthetic-system';
    const admin=await user(),operator=await user();await db.query("INSERT INTO role_assignments(user_id,role,is_active) VALUES($1,'platform:super_admin',true),($2,'neture:operator',true)",[admin.id,operator.id]);
    const context={roles:[],memberships:[]};
    const adminToken=(await generateTokensWithContext(admin,'admin.neture.co.kr','admin','google',context)).tokens.accessToken;
    const operatorToken=(await generateTokensWithContext(operator,'neture.co.kr','neture','google',context)).tokens.accessToken;
    try { for(const path of ['/api/v1/admin/users/','/api/v1/users/']){
      const target=await user();
      expect((await fetch(origin+path+target.id,{method:'DELETE'})).status).toBe(401);
      expect((await fetch(origin+path+target.id,{method:'DELETE',headers:{authorization:`Bearer ${operatorToken}`}})).status).toBe(403);
      const done=await fetch(origin+path+target.id,{method:'DELETE',headers:{authorization:`Bearer ${adminToken}`}});
      expect(done.status).toBe(200);const payload=await done.json() as any;expect(payload.data.erased).toBe(true);
      const status=await fetch(origin+'/api/v1/admin/users/erasure-operations/'+payload.data.operationId,{headers:{authorization:`Bearer ${adminToken}`}});
      expect(status.status).toBe(200);expect((await status.json() as any).data.erased).toBe(true);
    }
    const capability=await fetch(origin+'/api/v1/admin/users/erasure-capabilities',{headers:{authorization:`Bearer ${adminToken}`}});
    expect(capability.status).toBe(200);expect((await capability.json() as any).data.enabled).toBe(true);
    delete process.env.ACCOUNT_ERASURE_MODE;delete process.env.ACCOUNT_ERASURE_FILE_INVENTORY_REVIEW;
    const disabled=await fetch(origin+'/api/v1/admin/users/erasure-capabilities',{headers:{authorization:`Bearer ${adminToken}`}});
    expect(disabled.status).toBe(200);expect((await disabled.json() as any).data.enabled).toBe(false);
    } finally {delete process.env.ACCOUNT_ERASURE_MODE;delete process.env.ACCOUNT_ERASURE_FILE_INVENTORY_REVIEW;delete process.env.ACCOUNT_ERASURE_SYSTEM_YEARS;delete process.env.ACCOUNT_ERASURE_SYSTEM_POLICY_BASIS;}
  });
  it('Admin deletion stops an active account without a separate Operator suspension',async()=>{
    const u=await user({netureStopped:false});
    await db.query("INSERT INTO service_memberships(user_id,service_key,role,status) VALUES($1,'community','member','active')",[u.id]);
    const r=await service().request(u.id);expect(r.erased).toBe(true);
    expect(await db.query('SELECT id FROM users WHERE id=$1',[u.id])).toHaveLength(0);
    expect(await db.query('SELECT id FROM service_memberships WHERE user_id=$1',[u.id])).toHaveLength(0);
  });
  it('Operator stop materialises derived Neture access without touching another service/account',async()=>{
    const u=await user({netureStopped:false});
    await db.query("INSERT INTO service_memberships(user_id,service_key,role,status) VALUES($1,'lecture','member','active')",[u.id]);
    await db.transaction(async manager=>{
      await new MembershipApprovalService().suspendMembership({userId:u.id,suspendedBy:fixtureAdminId,isPlatformAdmin:false,serviceKeys:['neture'],manager});
    });
    const memberships=await db.query('SELECT service_key,status FROM service_memberships WHERE user_id=$1 ORDER BY service_key',[u.id]);
    expect(memberships).toEqual([{service_key:'lecture',status:'active'},{service_key:'neture',status:'suspended'}]);
    expect((await db.query('SELECT "isActive",status FROM users WHERE id=$1',[u.id]))[0]).toEqual({isActive:true,status:'active'});
    expect((await service().request(u.id)).erased).toBe(true);
  });
  it('protected super admin and Demo owners are rejected without writes',async()=>{
    const a=await user();await db.query("INSERT INTO role_assignments(user_id,role,is_active) VALUES($1,'platform:super_admin',true)",[a.id]);
    await expect(service().request(a.id)).rejects.toMatchObject({code:'SUPER_ADMIN_PROTECTED'});
    const demo=await user();await db.query("INSERT INTO demo_accounts(user_id,demo_type) VALUES($1,'STORE_OWNER')",[demo.id]);
    await expect(service().request(demo.id)).rejects.toMatchObject({code:'DEMO_ACCOUNT_FORBIDDEN'});
    expect(await db.query('SELECT id FROM account_erasure_operations')).toHaveLength(0);
    const former=await user();await db.query("INSERT INTO role_assignments(user_id,role,is_active,valid_until) VALUES($1,'platform:super_admin',true,statement_timestamp()-interval '1 day')",[former.id]);
    expect((await service().request(former.id)).erased).toBe(true);
    const future=await user();await db.query("INSERT INTO role_assignments(user_id,role,is_active,valid_from) VALUES($1,'platform:super_admin',true,statement_timestamp()+interval '1 day')",[future.id]);
    await expect(service().request(future.id)).rejects.toMatchObject({code:'SUPER_ADMIN_PROTECTED'});
  });
  it('concurrent duplicate requests share one completed operation',async()=>{
    const u=await user();const results=await Promise.all([service().request(u.id),service().request(u.id)]);
    expect(new Set(results.map(r=>r.operationId)).size).toBe(1);
    expect(results.every(r=>r.erased === (r.state==='completed'))).toBe(true);
    expect(results.some(r=>r.erased)).toBe(true);
    expect(await db.query('SELECT id FROM account_erasure_operations')).toHaveLength(1);
    expect((await service().request(u.id)).erased).toBe(true);
  });
  it('retry rechecks current platform authority without changing the operation on revocation',async()=>{
    const u=await user(),other=await user();
    await db.query('UPDATE users SET "businessInfo"=jsonb_build_object(\'subject\',$1::text) WHERE id=$2',[u.id,other.id]);
    const r=await service().request(u.id);expect(r.state).toBe('review_required');
    await db.query("UPDATE role_assignments SET is_active=false WHERE user_id=$1",[fixtureAdminId]);
    await expect(service().resume(r.operationId)).rejects.toMatchObject({code:'FORBIDDEN'});
    await expect(service().get(r.operationId)).rejects.toMatchObject({code:'FORBIDDEN'});
    expect((await db.query('SELECT state FROM account_erasure_operations WHERE id=$1',[r.operationId]))[0].state).toBe('review_required');
  });
  it('expired or not-yet-valid platform grants cannot request or retry removal',async()=>{
    const target=await user(),peer=await user();
    await db.query('UPDATE users SET "businessInfo"=jsonb_build_object(\'subject\',$1::text) WHERE id=$2',[target.id,peer.id]);
    const r=await service().request(target.id);expect(r.state).toBe('review_required');
    for(const future of [false,true]) {
      await db.query(`UPDATE role_assignments SET valid_from=statement_timestamp()+$2::interval,
        valid_until=CASE WHEN $3 THEN NULL ELSE statement_timestamp()-interval '1 second' END WHERE user_id=$1`,
        [fixtureAdminId,future?'1 hour':'-1 hour',future]);
      await expect(service().request(target.id)).rejects.toMatchObject({code:'FORBIDDEN'});
      await expect(service().resume(r.operationId)).rejects.toMatchObject({code:'FORBIDDEN'});
      await expect(service().get(r.operationId)).rejects.toMatchObject({code:'FORBIDDEN'});
      expect((await db.query('SELECT state FROM account_erasure_operations WHERE id=$1',[r.operationId]))[0].state).toBe('review_required');
    }
  });
  it('an already-started non-FK writer commits before the erasure snapshot, never after false completion',async()=>{
    const target=await user(),peer=await user();const q=db.createQueryRunner();await q.startTransaction();
    let pending:Promise<any>|undefined;
    try {
      await q.query('UPDATE users SET "businessInfo"=jsonb_build_object(\'subject\',$1::text) WHERE id=$2',[target.id,peer.id]);
      pending=service().request(target.id);
      let waiting=false;
      for(let i=0;i<100 && !waiting;i++){
        const [r]=await db.query("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE wait_event='advisory' AND query LIKE '%o4o-account-erasure-writes%' AND pid<>pg_backend_pid()) AS waiting");
        waiting=r.waiting;if(!waiting)await new Promise(resolve=>setTimeout(resolve,10));
      }
      expect(waiting).toBe(true);
      await q.commitTransaction();
      const result=await pending;expect(result.erased).toBe(false);expect(result.reviewCodes).toContain('REVIEW:public.users');
    } finally {if(q.isTransactionActive)await q.rollbackTransaction();await q.release();if(pending)await pending;}
  });
  it('subject history is separated without profile/reason or a live-user FK',async()=>{
    const target=await user(),actor=await user();const h=await community(target.id,actor.id);
    expect((await service().request(target.id)).erased).toBe(true);
    expect(await db.query('SELECT id FROM community_membership_changes WHERE id=$1',[h.event])).toHaveLength(0);
    const [e]=await db.query('SELECT * FROM account_erasure_community_evidence WHERE source_event_id=$1',[h.event]);
    expect(e.subject_key).toBe(target.id);expect(e.actor_key).toBe(actor.id);expect(e.retention_years).toBe(1);
    expect(e).not.toHaveProperty('reason');expect(e).not.toHaveProperty('email');
    expect(await db.query('SELECT id FROM users WHERE id=$1',[actor.id])).toHaveLength(1);
    expect(await db.query('SELECT id FROM communities WHERE id=$1',[h.c])).toHaveLength(1);
  });
  it('actor-only erasure removes identifying live reason and preserves the other membership',async()=>{
    const target=await user(),actor=await user();const h=await community(target.id,actor.id);
    expect((await service(undefined,2).request(actor.id)).erased).toBe(true);
    expect(await db.query('SELECT id FROM community_memberships WHERE id=$1',[h.m])).toHaveLength(1);
    expect((await db.query('SELECT retention_years FROM account_erasure_community_evidence WHERE source_event_id=$1',[h.event]))[0].retention_years).toBe(2);
  });
  it('unreviewed business/other-authored references return incomplete, not legacy FK fallback success',async()=>{
    const u=await user(),peer=await user();const h=await community(u.id,peer.id);
    await db.query('INSERT INTO forum_post(title,slug,author_id,metadata) VALUES($1,$2,$3,$4)',['Synthetic own content',randomUUID(),u.id,JSON.stringify({unclassifiedCopy:u.email})]);
    const r=await service().request(u.id);expect(r).toMatchObject({state:'review_required',erased:false});
    expect(r.reviewCodes).toContain('REVIEW:public.forum_post');
    expect((await db.query('SELECT "isActive" FROM users WHERE id=$1',[u.id]))[0].isActive).toBe(false);
    expect(await db.query('SELECT id FROM forum_post WHERE author_id=$1',[u.id])).toHaveLength(1);
    await expect(db.query('INSERT INTO community_memberships(community_id,user_id) VALUES($1,$2)',[h.c,u.id])).rejects.toMatchObject({code:'P0001',message:'ACCOUNT_ERASURE_PENDING'});
    await expect(db.query('UPDATE users SET "businessInfo"=jsonb_build_object(\'staleMembership\',$1::text) WHERE id=$2',[h.m,peer.id])).rejects.toMatchObject({code:'P0001',message:'ACCOUNT_ERASURE_PENDING'});
  });
  it('old access/refresh/handoff and stale token issuance are rejected after completion',async()=>{
    const u=await user();const context={roles:[],memberships:[]};
    const a=await generateTokensWithContext(u,'neture.co.kr','neture','google',context);
    const [fresh]=await db.query('SELECT * FROM users WHERE id=$1',[u.id]);Object.assign(u,fresh);
    const b=await generateTokensWithContext(u,'neture.co.kr','supplier','google',context);
    const tokens=await import('../../../utils/token.utils.js');const claims=tokens.verifyAccessToken(a.tokens.accessToken)!;
    const handoff=await handoffTokenService.generateToken(u.id,'neture','neture',0,'google',claims.sessionId,claims.tokenFamily);
    expect((await service().request(u.id)).erased).toBe(true);
    for(const token of [a.tokens.accessToken,b.tokens.accessToken]){
      const response:any={statusCode:200,status(n:number){this.statusCode=n;return this;},json(body:unknown){this.body=body;return this;}};
      const next=jest.fn();await requireAuth({headers:{authorization:`Bearer ${token}`},cookies:{},method:'GET',originalUrl:'/api/v1/auth/me'} as any,response,next);
      expect(response.statusCode).toBe(401);expect(next).not.toHaveBeenCalled();
    }
    await expect(new AuthTokenSessionService().refreshTokens(a.tokens.refreshToken)).rejects.toBeDefined();
    expect(await handoffTokenService.exchangeToken(handoff)).toBeNull();
    await expect(generateTokensWithContext(u,'neture.co.kr','neture','google',context)).rejects.toMatchObject({code:'SESSION_CHANGED_RETRY_LOGIN'});
  });
  it('a copied Korean profile attributed to the subject remains an unresolved personal reference',async()=>{
    const target=await user({name:'홍길동'}),peer=await user();
    await db.query('UPDATE users SET "businessInfo"=jsonb_build_object(\'contactName\',$1::text,\'sourceUserId\',$3::text) WHERE id=$2',[target.name,peer.id,target.id]);
    const r=await service().request(target.id);expect(r.erased).toBe(false);expect(r.reviewCodes).toContain('REVIEW:public.users');
    expect((await db.query('SELECT "businessInfo" FROM users WHERE id=$1',[peer.id]))[0].businessInfo.contactName).toBe('홍길동');
  });
  it('unrelated people sharing name, nickname, IP and contact values are preserved without blocking erasure',async()=>{
    const target=await user({name:'합성동명이인'}),peer=await user({name:'합성동명이인'});
    await db.query('UPDATE users SET nickname=$1,"lastLoginIp"=$2,phone=$3,"businessInfo"=jsonb_build_object(\'address\',$4::text) WHERE id=ANY($5::uuid[])',
      ['공통 별칭','127.0.0.1','fixture-contact','Synthetic shared address',[target.id,peer.id]]);
    expect((await service().request(target.id)).erased).toBe(true);
    expect((await db.query('SELECT name,nickname,phone,"isActive" FROM users WHERE id=$1',[peer.id]))[0]).toEqual({name:'합성동명이인',nickname:'공통 별칭',phone:'fixture-contact',isActive:true});
    // The deleted person's name is not a general ban on an unrelated person's profile updates.
    await db.query('UPDATE users SET nickname=$1 WHERE id=$2',['합성동명이인',peer.id]);
  });
  it('durable generation + external failure retries without a false completed result',async()=>{
    const u=await user({avatar:'https://storage.googleapis.com/fixture-private/personal-avatar.png'});
    let fail=true;const storage={generation:jest.fn(async()=> '7'),deleteGeneration:jest.fn(async()=>{if(fail)throw new Error('Synthetic storage failure');})};
    const first=await service(storage).request(u.id);expect(first.erased).toBe(false);expect(first.state).toBe('retry_required');
    expect((await db.query('SELECT generation FROM account_erasure_file_tasks'))[0].generation).toBe('7');
    const completingAdmin=await user();await db.query("INSERT INTO role_assignments(user_id,role,is_active) VALUES($1,'platform:super_admin',true)",[completingAdmin.id]);
    fail=false;const last=await service(storage).resume(first.operationId,completingAdmin.id);expect(last.erased).toBe(true);
    const audit=await db.query('SELECT action,actor_key FROM account_erasure_audit_events WHERE operation_id=$1 ORDER BY action',[first.operationId]);
    expect(audit).toEqual([{action:'completed',actor_key:completingAdmin.id},{action:'requested',actor_key:fixtureAdminId}]);
    expect(storage.generation).toHaveBeenCalledTimes(1);expect(storage.deleteGeneration).toHaveBeenLastCalledWith('fixture-private','personal-avatar.png','7',u.id,expect.anything());
    const [f]=await db.query('SELECT bucket,object_path,generation,state FROM account_erasure_file_tasks');
    expect(f).toEqual({bucket:null,object_path:null,generation:null,state:'deleted'});
    expect(await db.query('SELECT id FROM account_erasure_file_tasks')).toHaveLength(1);
  });
  it('missing inventory/ownership proof cannot delete someone else’s file or deactivate an unreviewed account',async()=>{
    const u=await user({avatar:'https://storage.googleapis.com/fixture-private/owned-by-someone-else.png'});
    const unreviewed=new AccountErasureService(db,{enabled:true,systemYears:1,systemBasis:'synthetic-system',personalBuckets:['fixture-private']});
    await expect(unreviewed.request(u.id,fixtureAdminId)).rejects.toMatchObject({code:'PERSONAL_FILE_INVENTORY_REVIEW_REQUIRED'});
    expect((await db.query('SELECT "isActive" FROM users WHERE id=$1',[u.id]))[0].isActive).toBe(true);
    const storage={generation:jest.fn(async()=>{throw new AccountErasureError('PERSONAL_FILE_OWNERSHIP_REVIEW_REQUIRED',409);}),deleteGeneration:jest.fn()};
    const r=await service(storage).request(u.id);expect(r.erased).toBe(false);expect(r.state).toBe('review_required');
    expect(storage.deleteGeneration).not.toHaveBeenCalled();
  });
  it.each([
    'gcs://fixture-private/kyc/synthetic.pdf',
    'https://attachments.fixture.invalid/synthetic.pdf',
    'gs://fixture-private/kyc/synthetic.pdf',
  ])('unreviewed KYC fileUrl %s preserves the manifest without false completion',async fileUrl=>{
    const u=await user();
    const documentId=randomUUID();
    await db.query(`INSERT INTO kyc_documents(id,user_id,"documentType","fileUrl","fileName")
      VALUES($1,$2,'business_registration',$3,'synthetic.pdf')`,[documentId,u.id,fileUrl]);
    const storage={generation:jest.fn(async()=>{throw new AccountErasureError('PERSONAL_FILE_OWNERSHIP_REVIEW_REQUIRED',409);}),deleteGeneration:jest.fn()};
    const result=await service(storage).request(u.id);
    expect(result).toMatchObject({erased:false,state:'review_required',reviewCodes:[fileUrl.startsWith('https:')?'PRIVATE_ATTACHMENT_MANIFEST_REVIEW_REQUIRED':'PERSONAL_FILE_OWNERSHIP_REVIEW_REQUIRED']});
    expect(await db.query('SELECT "fileUrl" FROM kyc_documents WHERE id=$1',[documentId])).toEqual([{fileUrl}]);
    expect(await db.query('SELECT id FROM users WHERE id=$1',[u.id])).toHaveLength(1);
    expect(await db.query("SELECT id FROM account_erasure_audit_events WHERE operation_id=$1 AND action='completed'",[result.operationId])).toHaveLength(0);
    expect(storage.deleteGeneration).not.toHaveBeenCalled();
  });
  it('completed generation fences prevent restoring a deleted identity; malformed IDs cannot affect data',async()=>{
    const u=await user();await service().request(u.id);
    await expect(db.query('INSERT INTO users(id,email) VALUES($1,$2)',[u.id,`${u.id}@fixture.invalid`])).rejects.toMatchObject({code:'P0001'});
    await expect(service().request('invalid')).rejects.toMatchObject({statusCode:400});
    expect(await db.query('SELECT id FROM account_erasure_operations')).toHaveLength(1);
  });
  it('email boundaries preserve an unrelated longer address and identify real embedded copies',async()=>{
    const target=await user({email:'a@fixture.invalid'}),peer=await user({email:'ba@fixture.invalid'});
    expect((await service().request(target.id)).erased).toBe(true);
    await db.query('UPDATE users SET nickname=$1 WHERE id=$2',['Unrelated updated profile',peer.id]);
    const copy=await user({email:'x@fixture.invalid'});
    await db.query('UPDATE users SET "businessInfo"=jsonb_build_object(\'contact\',$1::text) WHERE id=$2',[`Former contact: ${copy.email}.`,peer.id]);
    const r=await service().request(copy.id);expect(r.erased).toBe(false);expect(r.reviewCodes).toContain('REVIEW:public.users');
  });
  it('fresh re-registration can reuse contact without restoring old UUIDs or resetting minimum-history expiry',async()=>{
    const target=await user({email:'synthetic-rejoin@fixture.invalid'}),h=await community(target.id,fixtureAdminId);
    const r=await service().request(target.id);expect(r.erased).toBe(true);
    const [before]=await db.query('SELECT occurred_at,expires_at,subject_key FROM account_erasure_community_evidence WHERE source_event_id=$1',[h.event]);
    const fresh=await user({email:target.email});expect(fresh.id).not.toBe(target.id);
    await db.query("INSERT INTO community_memberships(community_id,user_id,role,status) VALUES($1,$2,'member','suspended')",[h.c,fresh.id]);
    const [after]=await db.query('SELECT occurred_at,expires_at,subject_key FROM account_erasure_community_evidence WHERE source_event_id=$1',[h.event]);expect(after).toEqual(before);
    await expect(db.query('INSERT INTO users(id,email) VALUES($1,$2)',[target.id,`${target.id}-restored@fixture.invalid`])).rejects.toMatchObject({code:'P0001'});
    expect(await db.query("SELECT key_hash FROM account_erasure_reference_keys WHERE operation_id=$1 AND key_kind='identity'",[r.operationId])).toHaveLength(0);
  });
  it('another actor referenced in owned metadata is not misidentified as the erasure subject',async()=>{
    const target=await user();
    await db.query(`INSERT INTO notifications("userId",type,title,metadata)
      VALUES($1,'fixture','Synthetic private notification',jsonb_build_object('assignedByUserId',$2::text))`,[target.id,fixtureAdminId]);
    expect((await service().request(target.id)).erased).toBe(true);
    expect((await db.query('SELECT "isActive" FROM users WHERE id=$1',[fixtureAdminId]))[0].isActive).toBe(true);
    expect(await db.query('SELECT id FROM notifications WHERE "userId"=$1',[target.id])).toHaveLength(0);
  });
  it('typed linked provider IDs and nullable aliases must not survive in another row',async()=>{
    const target=await user(),peer=await user(),providerId='synthetic-provider-identity';
    await db.query(`INSERT INTO linked_accounts("userId",provider,"providerId",email)
      VALUES($1,'google',$2,$3)`,[target.id,providerId,'synthetic-alias@fixture.invalid']);
    await db.query('UPDATE users SET "businessInfo"=jsonb_build_object(\'providerReference\',$1::text) WHERE id=$2',[providerId,peer.id]);
    const first=await service().request(target.id);expect(first.erased).toBe(false);expect(first.reviewCodes).toContain('REVIEW:public.users');
    await db.query('UPDATE users SET "businessInfo"=jsonb_build_object(\'contact\',$1::text) WHERE id=$2',['synthetic-alias@fixture.invalid',peer.id]);
    const second=await service().resume(first.operationId);expect(second.erased).toBe(false);expect(second.reviewCodes).toContain('REVIEW:public.users');
    expect(await db.query('SELECT id FROM linked_accounts WHERE "userId"=$1',[target.id])).toHaveLength(1);
  });
  it('equal provider IDs in a different namespace belong to another account',async()=>{
    const target=await user(),peer=await user(),providerId='123';
    await db.query(`INSERT INTO linked_accounts("userId",provider,"providerId") VALUES($1,'google',$3),($2,'kakao',$3)`,[target.id,peer.id,providerId]);
    await db.query(`UPDATE users SET "businessInfo"=jsonb_build_object('identity',jsonb_build_object('provider','kakao','providerId',$1::text)) WHERE id=$2`,[providerId,peer.id]);
    expect((await service().request(target.id)).erased).toBe(true);
    expect(await db.query('SELECT id FROM linked_accounts WHERE "userId"=$1',[peer.id])).toHaveLength(1);
  });
  it.each(['email','naver','service'])('legacy %s identities with equal IDs remain another subject',async(provider)=>{
    const target=await user(),peer=await user(),providerId='123';
    await db.query(`INSERT INTO linked_accounts("userId",provider,"providerId") VALUES($1,'google',$3),($2,$4,$3)`,[target.id,peer.id,providerId,provider]);
    await db.query(`UPDATE users SET provider=$1,provider_id=$2 WHERE id=$3`,[provider,providerId,peer.id]);
    expect((await service().request(target.id)).erased).toBe(true);
    expect(await db.query('SELECT id FROM linked_accounts WHERE "userId"=$1',[peer.id])).toHaveLength(1);
    expect((await db.query('SELECT provider_id FROM users WHERE id=$1',[peer.id]))[0].provider_id).toBe(providerId);
  });
  it('a copied provider identity in the same namespace still requires review',async()=>{
    const target=await user(),peer=await user(),providerId='123';
    await db.query(`INSERT INTO linked_accounts("userId",provider,"providerId") VALUES($1,'google',$2)`,[target.id,providerId]);
    await db.query(`UPDATE users SET "businessInfo"=jsonb_build_object('identity',jsonb_build_object('provider','google','providerId',$1::text)) WHERE id=$2`,[providerId,peer.id]);
    const result=await service().request(target.id);
    expect(result.erased).toBe(false);expect(result.reviewCodes).toContain('REVIEW:public.users');
  });
  it('legacy snake_case IDs preserve another provider and detect a legacy subject copy',async()=>{
    const target=await user(),peer=await user(),providerId='synthetic-legacy-id';
    await db.query(`INSERT INTO linked_accounts("userId",provider,"providerId") VALUES($1,'google',$2)`,[target.id,providerId]);
    await db.query(`UPDATE users SET provider='kakao',provider_id=$1 WHERE id=$2`,[providerId,peer.id]);
    expect((await service().request(target.id)).erased).toBe(true);
    expect((await db.query('SELECT provider_id FROM users WHERE id=$1',[peer.id]))[0].provider_id).toBe(providerId);
    const legacy=await user();
    await db.query(`UPDATE users SET provider='google',provider_id=$1 WHERE id=$2`,['synthetic-legacy-copy',legacy.id]);
    await db.query(`UPDATE users SET "businessInfo"=jsonb_build_object('provider','google','provider_id',$1::text) WHERE id=$2`,['synthetic-legacy-copy',peer.id]);
    const result=await service().request(legacy.id);
    expect(result.erased).toBe(false);expect(result.reviewCodes).toContain('REVIEW:public.users');
  });
  it('storage provider fields cannot hide a copied authentication identifier',async()=>{
    const target=await user(),peer=await user(),providerId='synthetic-provider-copy';
    await db.query(`INSERT INTO linked_accounts("userId",provider,"providerId") VALUES($1,'google',$2)`,[target.id,providerId]);
    for(const provider of ['gcs','kakao']) {
      await db.query(`UPDATE users SET "businessInfo"=jsonb_build_object('provider',$1::text,'providerId','other-identity','memo',$2::text) WHERE id=$3`,[provider,providerId,peer.id]);
      const result=await service().request(target.id);
      expect(result.erased).toBe(false);expect(result.reviewCodes).toContain('REVIEW:public.users');
    }
  });
  it('provider candidate scanning reaches copies beyond a bounded cursor batch',async()=>{
    const target=await user(),providerId='1';
    await db.query(`INSERT INTO linked_accounts("userId",provider,"providerId") VALUES($1,'kakao',$2)`,[target.id,providerId]);
    for(let n=0;n<70;n++) {
      const peer=await user();
      await db.query(`UPDATE users SET "businessInfo"=jsonb_build_object('provider','google','providerId',$1::text) WHERE id=$2`,[providerId,peer.id]);
    }
    const peer=await user();
    await db.query(`UPDATE users SET "businessInfo"=jsonb_build_object('provider','kakao','providerId',$1::text) WHERE id=$2`,[providerId,peer.id]);
    const result=await service().request(target.id);
    expect(result.erased).toBe(false);expect(result.reviewCodes).toContain('REVIEW:public.users');
    await db.query('UPDATE users SET "businessInfo"=NULL WHERE id=$1',[peer.id]);
    expect((await service().resume(result.operationId)).erased).toBe(true);
  });
  it('punctuation extending another opaque provider ID is not treated as this subject',async()=>{
    const peer=await user(),providerId='synthetic-provider-identity';
    for(const suffix of ['-extra','.extra']) {
      const target=await user();
      await db.query(`INSERT INTO linked_accounts("userId",provider,"providerId") VALUES($1,'google',$2)`,[target.id,providerId]);
      await db.query('UPDATE users SET "businessInfo"=jsonb_build_object(\'providerReference\',$1::text) WHERE id=$2',[providerId+suffix,peer.id]);
      expect((await service().request(target.id)).erased).toBe(true);
      expect((await db.query('SELECT "businessInfo" FROM users WHERE id=$1',[peer.id]))[0].businessInfo.providerReference).toBe(providerId+suffix);
    }
  });
  it('migration 23 or an unvalidated upgrade never advertises erasure readiness',async()=>{
    const target=await user();
    const core=new AccountErasureService(db,{enabled:true,inventoryReviewed:true,systemYears:1,systemBasis:'isolated-synthetic-system',personalBuckets:[]});
    await db.query('ALTER TABLE account_erasure_reference_keys DROP CONSTRAINT account_erasure_uuid_keys_only');
    try {
      expect(await core.capabilities()).toEqual({enabled:false});
      await expect(core.request(target.id,fixtureAdminId)).rejects.toMatchObject({code:'ACCOUNT_ERASURE_MIGRATION_REQUIRED'});
      expect((await db.query('SELECT "isActive" FROM users WHERE id=$1',[target.id]))[0].isActive).toBe(true);
      expect(await db.query('SELECT id FROM account_erasure_operations')).toHaveLength(0);
      await db.query("ALTER TABLE account_erasure_reference_keys ADD CONSTRAINT account_erasure_uuid_keys_only CHECK (key_kind='uuid') NOT VALID");
      expect(await core.capabilities()).toEqual({enabled:false});
      await db.query('ALTER TABLE account_erasure_reference_keys VALIDATE CONSTRAINT account_erasure_uuid_keys_only');
      expect(await core.capabilities()).toEqual({enabled:true});
    } finally {
      await db.query('ALTER TABLE account_erasure_reference_keys DROP CONSTRAINT IF EXISTS account_erasure_uuid_keys_only');
      await db.query("ALTER TABLE account_erasure_reference_keys ADD CONSTRAINT account_erasure_uuid_keys_only CHECK (key_kind='uuid')");
    }
  });
  it('upgrade retires already-completed legacy contact hashes without touching UUID markers or evidence',async()=>{
    const target=await user({email:'legacy-contact@fixture.invalid'}),h=await community(target.id,fixtureAdminId);
    const r=await service().request(target.id);expect(r.erased).toBe(true);
    const evidence=await db.query('SELECT * FROM account_erasure_community_evidence WHERE source_event_id=$1',[h.event]);
    const refs=await db.query("SELECT key_hash FROM account_erasure_reference_keys WHERE operation_id=$1 AND key_kind='uuid' ORDER BY key_hash",[r.operationId]);
    await db.query('ALTER TABLE account_erasure_reference_keys DROP CONSTRAINT IF EXISTS account_erasure_uuid_keys_only');
    await db.query(`INSERT INTO account_erasure_reference_keys(operation_id,key_hash,key_kind,identity_length)
      VALUES($1,encode(digest($2::text,'sha256'),'hex'),'identity',char_length($2::text))`,[r.operationId,target.email]);
    const legacySql:string[]=[];
    await new CreateAccountErasureOperations1791777540800().up({query:async(sql:string)=>{legacySql.push(sql);return [];}} as any);
    const oldFunction=legacySql.find(sql=>sql.startsWith('CREATE FUNCTION account_erasure_write_fence'))!;
    const q=db.createQueryRunner();let upgraded=false;
    try {
      await q.query(oldFunction.replace('CREATE FUNCTION','CREATE OR REPLACE FUNCTION'));
      await expect(user({email:target.email})).rejects.toMatchObject({code:'P0001'});
      await q.startTransaction();
      await new RetireLegacyErasureIdentityHashes1791795139475().up(q);
      await q.commitTransaction();upgraded=true;
    } finally {
      if(q.isTransactionActive)await q.rollbackTransaction();
      if(!upgraded) {
        await q.startTransaction();await new RetireLegacyErasureIdentityHashes1791795139475().up(q);await q.commitTransaction();
      }
      await q.release();
    }
    await expect(db.query(`INSERT INTO account_erasure_reference_keys(operation_id,key_hash,key_kind,identity_length)
      VALUES($1,encode(digest($2::text,'sha256'),'hex'),'identity',char_length($2::text))`,[r.operationId,target.email])).rejects.toMatchObject({code:'23514'});
    expect((await user({email:target.email})).id).not.toBe(target.id);
    expect(await db.query("SELECT key_hash FROM account_erasure_reference_keys WHERE operation_id=$1 AND key_kind='uuid' ORDER BY key_hash",[r.operationId])).toEqual(refs);
    expect(await db.query('SELECT * FROM account_erasure_community_evidence WHERE source_event_id=$1',[h.event])).toEqual(evidence);
    expect(await db.query("SELECT key_hash FROM account_erasure_reference_keys WHERE key_kind='identity'")).toHaveLength(0);
  });
  it('scheduled unexpired protection blocks both metadata lookup and deletion before time can advance',async()=>{
    const target=await user({avatar:'https://storage.googleapis.com/fixture-private/protected-avatar.png'});
    await db.query("INSERT INTO role_assignments(user_id,role,is_active,valid_from) VALUES($1,'platform:super_admin',true,statement_timestamp()+interval '2 seconds')",[target.id]);
    const storage={generation:jest.fn(async()=> '7'),deleteGeneration:jest.fn()};
    await expect(service(storage).request(target.id)).rejects.toMatchObject({code:'SUPER_ADMIN_PROTECTED'});
    expect(storage.generation).not.toHaveBeenCalled();expect(storage.deleteGeneration).not.toHaveBeenCalled();
    expect((await db.query('SELECT "isActive" FROM users WHERE id=$1',[target.id]))[0].isActive).toBe(true);
    expect(await db.query('SELECT id FROM account_erasure_operations')).toHaveLength(0);
  });
  it('calendar boundaries preserve leap-day KST anniversary and original two-year anchor',()=>{
    expect(calendarExpiry(new Date('2024-02-28T15:00:00Z'),1).toISOString()).toBe('2025-02-28T15:00:00.000Z');
    expect(calendarExpiry(new Date('2023-03-01T00:00:00Z'),2).toISOString()).toBe('2025-03-01T00:00:00.000Z');
  });
  it('PG anniversary preserves sub-millisecond precision and uses the exact leap-day KST boundary',async()=>{
    const [r]=await db.query(`SELECT (${CALENDAR_EXPIRY_SQL})='2025-02-28 15:00:00.123456+00'::timestamptz AS exact
      FROM (SELECT '2024-02-28 15:00:00.123456+00'::timestamptz AS source_at,1::integer AS years) inputs`);
    expect(r.exact).toBe(true);
    const [ordinary]=await db.query(`SELECT (${CALENDAR_EXPIRY_SQL})='2024-03-01 00:00:00.123456+00'::timestamptz AS exact
      FROM (SELECT '2023-03-01 00:00:00.123456+00'::timestamptz AS source_at,1::integer AS years) inputs`);
    expect(ordinary.exact).toBe(true);
  });
  it('expired holds require review; dry-run does not delete and an ended hold respects the original expiry',async()=>{
    const id=randomUUID();await db.query(`INSERT INTO account_erasure_community_evidence
      (source_event_id,community_id,subject_key,action,after_role,after_status,occurred_at,expires_at,retention_years,policy_basis,hold_basis,hold_owner_key,hold_end_event,hold_review_at)
      VALUES($1,$2,$3,'approve','member','active','2023-01-01','2024-01-01',1,'synthetic-system','synthetic-dispute',$4,'dispute_closed','2024-01-01')`,[id,randomUUID(),randomUUID(),randomUUID()]);
    const now=new Date('2026-10-12T00:00:00Z');expect(await service().retentionReport(now)).toEqual({eligible:0,overdueReviews:1,deleted:0});
    expect((await service().retentionReport(now,true)).deleted).toBe(0);
    await db.query("UPDATE account_erasure_community_evidence SET hold_ended_at='2026-10-11' WHERE source_event_id=$1",[id]);
    expect(await service().retentionReport(now)).toEqual({eligible:1,overdueReviews:0,deleted:0});
    expect((await service().retentionReport(now,true)).deleted).toBe(1);
  });
});
