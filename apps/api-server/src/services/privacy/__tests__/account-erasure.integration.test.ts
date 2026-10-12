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
jest.mock('../../../database/connection.js', () => ({ AppDataSource: {
  query: (...args: any[]) => (db.query as any)(...args), getRepository: () => repository,
  transaction: (cb:any) => db.transaction(cb),
  get manager() { return db?.manager ?? {query:(...args:any[])=>(db.query as any)(...args)}; },
} }));
jest.mock('../../../modules/auth/services/role-assignment.service.js', () => ({ roleAssignmentService: {
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
  const service = (storage?: PersonalStorage, years: 1|2 = 1) => {
    const core=new AccountErasureService(db,{enabled:true,inventoryReviewed:true,systemYears:years,systemBasis:'isolated-synthetic-system',personalBuckets:['fixture-private'],storage});
    return {
      request:(id:string,actorId=fixtureAdminId)=>core.request(id,actorId),
      resume:(id:string,actorId=fixtureAdminId)=>core.resume(id,actorId),get:(id:string)=>core.get(id),
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
    expect((await db.query("SELECT to_regclass('public.account_erasure_operations') AS name"))[0].name).toBe('account_erasure_operations');
    const app=express();app.use(express.json());app.use('/api/v1/admin/users',adminUsersRouter);app.use('/api/v1/users',usersRouter);
    server=await new Promise<Server>(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
    origin=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
  });
  beforeEach(async () => { await db.query('TRUNCATE users,account_erasure_operations,account_erasure_community_evidence,account_erasure_audit_events CASCADE'); const admin=await user();fixtureAdminId=admin.id;await db.query("INSERT INTO role_assignments(user_id,role,is_active) VALUES($1,'platform:super_admin',true)",[fixtureAdminId]); });
  afterAll(async () => { if(server)await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve())); if(db?.isInitialized) { await db.query('TRUNCATE users,account_erasure_operations,account_erasure_community_evidence,account_erasure_audit_events CASCADE'); await db.destroy(); } });

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
  it('stage one requires active service stop; inactive membership/history never blocks',async()=>{
    const u=await user();
    await db.query("INSERT INTO service_memberships(user_id,service_key,role,status) VALUES($1,'community','member','active')",[u.id]);
    await expect(service().request(u.id)).rejects.toMatchObject({code:'SERVICE_STOP_REQUIRED'});
    expect(await db.query('SELECT id FROM account_erasure_operations')).toHaveLength(0);
    await db.query("UPDATE service_memberships SET status='suspended' WHERE user_id=$1",[u.id]);
    const r=await service().request(u.id);expect(r.erased).toBe(true);
    expect(await db.query('SELECT id FROM users WHERE id=$1',[u.id])).toHaveLength(0);
  });
  it('Operator stop materialises derived Neture access without touching another service/account',async()=>{
    const u=await user({netureStopped:false});
    await db.query("INSERT INTO service_memberships(user_id,service_key,role,status) VALUES($1,'lecture','member','active')",[u.id]);
    await expect(service().request(u.id)).rejects.toMatchObject({code:'SERVICE_STOP_REQUIRED'});
    await db.transaction(async manager=>{
      await new MembershipApprovalService().suspendMembership({userId:u.id,suspendedBy:fixtureAdminId,isPlatformAdmin:false,serviceKeys:['neture'],manager});
    });
    const memberships=await db.query('SELECT service_key,status FROM service_memberships WHERE user_id=$1 ORDER BY service_key',[u.id]);
    expect(memberships).toEqual([{service_key:'lecture',status:'active'},{service_key:'neture',status:'suspended'}]);
    expect((await db.query('SELECT "isActive",status FROM users WHERE id=$1',[u.id]))[0]).toEqual({isActive:true,status:'active'});
    await expect(service().request(u.id)).rejects.toMatchObject({code:'SERVICE_STOP_REQUIRED'});
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
    expect((await service().get(r.operationId)).state).toBe('review_required');
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
      expect((await service().get(r.operationId)).state).toBe('review_required');
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
    await db.query('INSERT INTO forum_post(title,slug,author_id) VALUES($1,$2,$3)',['Synthetic own content',randomUUID(),u.id]);
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
    expect(storage.generation).toHaveBeenCalledTimes(1);expect(storage.deleteGeneration).toHaveBeenLastCalledWith('fixture-private','personal-avatar.png','7');
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
