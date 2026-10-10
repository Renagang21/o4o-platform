import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
let db: DataSource;
jest.mock('../../../database/connection.js', () => ({ AppDataSource: { query: (...args: any[]) => (db.query as any)(...args), getRepository: () => ({ findOne: jest.fn() }) } }));
jest.mock('../auth-context.helper.js',()=>({freshenUserContext:jest.fn(async()=>({roles:[],memberships:[]})),generateTokensWithContext:jest.fn(async()=>({tokens:{accessToken:'synthetic-access',refreshToken:'synthetic-refresh'}})),injectRolesIntoPublicData:jest.fn()}));
jest.mock('../email-auth.service.js',()=>({emailAuthService:{sendVerificationMail:jest.fn(async()=>true)}}));
import { KakaoAuthService } from '../kakao-auth.service.js';
import { User } from '../../../entities/User.js';
import { LinkedAccount } from '../../../entities/LinkedAccount.js';
import { freshenUserContext, generateTokensWithContext } from '../auth-context.helper.js';
import { emailAuthService } from '../email-auth.service.js';
import { SocialFlowService, socialDigest } from '../social-flow.service.js';
import { SocialLinkService, type SocialLinkContext } from '../social-link.service.js';
import { passwordCredentialService } from '../password-credential.service.js';
import { revokeBrowserSession } from '../browser-session.service.js';
import { CreateSocialAuthFlows1791592932097 } from '../../../database/migrations/1791592932097-CreateSocialAuthFlows.js';
const termsPolicy = { policyDocumentId: randomUUID(), version: 1 };
const port = Number(process.env.O4O_AUTH_SESSION_TEST_PORT);
const integration = Number.isInteger(port) && port > 1024 && ![5432,5442].includes(port) ? describe : describe.skip;
integration('social proofs and explicit linking (isolated PostgreSQL)', () => {
  let owner: SocialLinkContext; let other: string; let flows: SocialFlowService; let links: SocialLinkService;
  const password = 'SyntheticFixture123!'; const origin = 'https://neture.co.kr';
  beforeAll(async () => { db = new DataSource({ type: 'postgres', host: '127.0.0.1', port, username: 'o4o_fixture', database: 'o4o_auth_phase2_test', entities: [], synchronize: false, logging: false }); await db.initialize();
    await db.query(`CREATE TABLE IF NOT EXISTS service_policy_documents (id uuid PRIMARY KEY, service_key text NOT NULL, document_type text NOT NULL, version integer NOT NULL, title text NOT NULL, content text NOT NULL, status text NOT NULL, published_at timestamptz DEFAULT now());
      CREATE TABLE IF NOT EXISTS user_policy_acceptances (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES users(id) ON DELETE CASCADE, service_key text NOT NULL, policy_document_id uuid REFERENCES service_policy_documents(id), document_type text NOT NULL, version integer NOT NULL, content_hash text NOT NULL, acceptance_kind text NOT NULL, accepted_at timestamptz NOT NULL, UNIQUE(user_id,service_key,policy_document_id))`);
    await db.query("INSERT INTO service_policy_documents(id,service_key,document_type,version,title,content,status,published_at) VALUES($1,'neture','terms',1,'Fixture terms','Fixture agreement','published',now())",[termsPolicy.policyDocumentId]);
  });
  afterAll(async () => { if (db?.isInitialized) { await db.query('DELETE FROM service_policy_documents WHERE id=$1',[termsPolicy.policyDocumentId]); await db.destroy(); } });
  beforeEach(async () => {
    const family = randomUUID();
    const rows = await db.query(`INSERT INTO users(email,name,status,"isActive","isEmailVerified","refreshTokenFamily") VALUES ($1,'Social fixture','active',true,true,$2) RETURNING id`, [`${randomUUID()}@fixture.invalid`,family]);
    other=(await db.query(`INSERT INTO users(email,name,status,"isActive","isEmailVerified") VALUES ($1,'Other fixture','active',true,true) RETURNING id`,[`${randomUUID()}@fixture.invalid`]))[0].id;
    owner={userId:rows[0].id,sessionId:randomUUID(),tokenFamily:family,origin,serviceKey:'neture'};
    await passwordCredentialService.setPassword(owner.userId,password,db.manager);
    flows=new SocialFlowService(db);
    links=new SocialLinkService({db,flows,kakao:{exchangeCode:jest.fn(async()=>({providerId:'123456',emailVerified:false}))},google:{verifyGoogleIdToken:jest.fn(async()=>({sub:'google-fixture',audience:'client',issuer:'https://accounts.google.com',expiresAt:new Date(Date.now()+60000)}))}});
  });
  afterEach(async () => { await db.query('DELETE FROM users WHERE id=ANY($1::uuid[])',[[owner.userId,other]]); await db.query("DELETE FROM auth_social_flows WHERE user_id IS NULL AND origin=$1",[origin]); });
  const verified = async () => {
    const permit=await links.reauthenticatePassword(owner,password);
    const proof=await links.startLink(owner,permit.token,permit.binding,'kakao','/mypage/settings');
    return links.verifyTarget(owner,proof.token,proof.binding,{code:'synthetic-code'});
  };
  it('stores hashes only and rejects binding/origin/purpose/owner changes without consuming the legitimate proof',async()=>{
    const grant=await flows.create('link-permit','google',origin,'neture',{},owner);
    const row=await flows.read(grant.token);expect(row.token_hash).toBe(socialDigest(grant.token));expect(row.binding_hash).toBe(socialDigest(grant.binding));
    for(const [binding,kind,host,context] of [[grant.token,'link-permit',origin,owner],[grant.binding,'link-proof',origin,owner],[grant.binding,'link-permit','https://supplier.neture.co.kr',owner],[grant.binding,'link-permit',origin,{...owner,sessionId:randomUUID()}]] as const){await expect(flows.consume(grant.token,binding,kind,host,context)).rejects.toMatchObject({code:'SOCIAL_FLOW_INVALID'});}
    await expect(flows.consume(grant.token,grant.binding,'link-permit',origin,owner)).resolves.toBeDefined();
    await expect(flows.consume(grant.token,grant.binding,'link-permit',origin,owner)).rejects.toMatchObject({code:'SOCIAL_FLOW_INVALID'});
  });
  it('expires and atomically permits exactly one concurrent consume',async()=>{
    const expired=await flows.create('kakao-login','kakao',origin,'neture');await db.query('UPDATE auth_social_flows SET expires_at=now()-interval \'1 second\' WHERE token_hash=$1',[socialDigest(expired.token)]);
    await expect(flows.consume(expired.token,expired.binding,'kakao-login',origin)).rejects.toMatchObject({code:'SOCIAL_FLOW_INVALID'});
    const grant=await flows.create('kakao-login','kakao',origin,'neture');const results=await Promise.allSettled([flows.consume(grant.token,grant.binding,'kakao-login',origin),flows.consume(grant.token,grant.binding,'kakao-login',origin)]);expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
  });
  it('writes no identity until explicit confirmation and preserves user/role/membership/organization/security family',async()=>{
    const snapshot=async()=>({user:await db.query('SELECT * FROM users WHERE id=$1',[owner.userId]),roles:await db.query('SELECT * FROM role_assignments WHERE user_id=$1',[owner.userId]),memberships:await db.query('SELECT * FROM service_memberships WHERE user_id=$1',[owner.userId])});
    const before=await snapshot();const grant=await verified();expect(await db.query('SELECT * FROM linked_accounts WHERE "userId"=$1',[owner.userId])).toHaveLength(0);
    await expect(links.confirm(owner,grant.token,grant.binding,false)).rejects.toMatchObject({code:'LINK_CONFIRMATION_REQUIRED'});
    await links.confirm(owner,grant.token,grant.binding,true);expect(await snapshot()).toEqual(before);
    expect(await db.query('SELECT provider,"providerId" FROM linked_accounts WHERE "userId"=$1',[owner.userId])).toEqual([{provider:'kakao',providerId:'123456'}]);
    await expect(links.confirm(owner,grant.token,grant.binding,true)).rejects.toMatchObject({code:'SOCIAL_FLOW_INVALID'});
  });
  it('rejects wrong current password and unlinked provider reauthentication',async()=>{
    await expect(links.reauthenticatePassword(owner,'incorrect')).rejects.toMatchObject({code:'CURRENT_PASSWORD_MISMATCH'});
    await expect(links.startReauthentication(owner,'google','/')).rejects.toMatchObject({code:'REAUTH_METHOD_NOT_LINKED'});
  });
  it('rejects provider identity already owned by another users.id even when emails could match',async()=>{
    await db.query(`INSERT INTO linked_accounts(id,"userId",provider,"providerId") VALUES(gen_random_uuid(),$1,'kakao','123456')`,[other]);
    await expect(verified()).rejects.toMatchObject({code:'SOCIAL_IDENTITY_CONFLICT'});
    expect(await db.query('SELECT "userId" FROM linked_accounts WHERE provider=\'kakao\' AND "providerId"=\'123456\'')).toEqual([{userId:other}]);
  });
  it('rechecks concurrent ownership at confirmation and rolls back losing grant/write',async()=>{
    const grant=await verified();await db.query(`INSERT INTO linked_accounts(id,"userId",provider,"providerId") VALUES(gen_random_uuid(),$1,'kakao','123456')`,[other]);
    await expect(links.confirm(owner,grant.token,grant.binding,true)).rejects.toMatchObject({code:'SOCIAL_IDENTITY_CONFLICT'});
    expect(await db.query('SELECT * FROM linked_accounts WHERE "userId"=$1',[owner.userId])).toHaveLength(0);expect((await flows.read(grant.token)).used_at).toBeNull();
  });
  it.each(['family','logout'])('rejects pending confirmation after %s security change',async(change)=>{
    const grant=await verified();if(change==='family')await db.query('UPDATE users SET "refreshTokenFamily"=$1 WHERE id=$2',[randomUUID(),owner.userId]);else await revokeBrowserSession(owner.userId,'neture',owner.sessionId,db.manager);
    await expect(links.confirm(owner,grant.token,grant.binding,true)).rejects.toMatchObject({code:'SOCIAL_FLOW_INVALID'});
    expect(await db.query('SELECT * FROM linked_accounts WHERE "userId"=$1',[owner.userId])).toHaveLength(0);
  });
  it('blocks registered Demo accounts independent of login email',async()=>{
    await db.query(`INSERT INTO demo_accounts(user_id,demo_type,is_active) VALUES($1,'STORE_OWNER',true)`,[owner.userId]);
    expect((await links.status(owner.userId)).canManage).toBe(false);await expect(links.reauthenticatePassword(owner,password)).rejects.toMatchObject({code:'DEMO_ACCOUNT_FORBIDDEN'});
  });
  it('reauthentication requires the same linked provider ID and passes the fresh Google challenge',async()=>{
    await db.query(`INSERT INTO linked_accounts(id,"userId",provider,"providerId") VALUES(gen_random_uuid(),$1,'google','google-fixture')`,[owner.userId]);
    const google={verifyGoogleIdToken:jest.fn(async()=>({sub:'different-user',audience:'client',issuer:'https://accounts.google.com',expiresAt:new Date()}))};links=new SocialLinkService({db,flows,google});
    const grant=await links.startReauthentication(owner,'google','/');await expect(links.completeReauthentication(owner,grant.token,grant.binding,{idToken:'synthetic-id-token'})).rejects.toMatchObject({code:'REAUTH_IDENTITY_MISMATCH'});
    expect(google.verifyGoogleIdToken).toHaveBeenCalledWith('synthetic-id-token',expect.objectContaining({nonce:grant.nonce,issuedAfter:expect.any(Date)}));
    await expect(flows.read(grant.token)).rejects.toMatchObject({code:'SOCIAL_FLOW_INVALID'});
  });
  it('safe rollback refuses existing Kakao identities and active proofs',async()=>{
    const q=db.createQueryRunner();await q.connect();await q.startTransaction();try{await flows.create('kakao-login','kakao',origin,'neture',{},undefined,q);await expect(new CreateSocialAuthFlows1791592932097().down(q)).rejects.toThrow('active proofs');}finally{await q.rollbackTransaction();await q.release();}
  });
  function signupService(identity: {providerId:string;email?:string;emailVerified:boolean}) {
    const repo = (entity: unknown, manager: any) => ({
      create: (data: object) => entity===User ? Object.assign(new User(),data) : data,
      findOne: async ({where}:any) => {
        if(entity===LinkedAccount)return(await manager.query('SELECT * FROM linked_accounts WHERE provider=$1 AND "providerId"=$2',[where.provider,where.providerId]))[0]??null;
        const row=(await manager.query('SELECT * FROM users WHERE id=$1',[where.id]))[0];return row?Object.assign(new User(),row):null;
      },
      save: async (data:any) => {
        if(entity===LinkedAccount){await manager.query(`INSERT INTO linked_accounts(id,"userId",provider,"providerId") VALUES(gen_random_uuid(),$1,$2,$3)`,[data.userId,data.provider,data.providerId]);return data;}
        const row=(await manager.query(`INSERT INTO users(email,name,phone,status,"isActive","isEmailVerified",tos_accepted_at,privacy_accepted_at,marketing_accepted) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,[data.email,data.name,data.phone,data.status,data.isActive,data.isEmailVerified,data.tosAcceptedAt,data.privacyAcceptedAt,data.marketingAccepted]))[0];return Object.assign(data,row);
      },
      update: async()=>{},
    });
    return new KakaoAuthService({getRepository:(entity:any)=>repo(entity,db),transaction:(callback:any)=>db.transaction(manager=>callback({query:manager.query.bind(manager),getRepository:(entity:any)=>repo(entity,manager)}))} as any,{exchangeCode:async()=>identity},flows);
  }
  const signupInput = () => ({email:`${randomUUID()}@fixture.invalid`,name:'Synthetic signup',phone:'01000000000',consents:{terms:true,privacy:true,termsPolicy}});
  async function signupGrant(identity:object) {return flows.create('kakao-signup','kakao',origin,'neture',identity);}
  async function removeSignup(email:string){await db.query('DELETE FROM users WHERE email=$1',[email]);}
  it.each([false,true])('signup requires O4O email verification when provider verification=%s and never creates a session for an unverified address',async verified=>{
    jest.mocked(generateTokensWithContext).mockClear();jest.mocked(emailAuthService.sendVerificationMail).mockClear();
    const input=signupInput();const identity={providerId:'567890',email:verified?'different@fixture.invalid':input.email,emailVerified:verified};const grant=await signupGrant(identity);
    try{const result=await signupService(identity).signup(grant.token,grant.binding,origin,input);expect(result).toMatchObject({nextStep:'verify-email',mailSent:true});expect(generateTokensWithContext).not.toHaveBeenCalled();expect(emailAuthService.sendVerificationMail).toHaveBeenCalled();const rows=await db.query('SELECT "isEmailVerified" FROM users WHERE email=$1',[input.email]);expect(rows).toEqual([{isEmailVerified:false}]);}finally{await removeSignup(input.email);}
  });
  it('only matching provider-proven email issues an explicitly Kakao session, with no password credential/role/membership',async()=>{
    const input=signupInput();const identity={providerId:'567890',email:input.email,emailVerified:true};const grant=await signupGrant(identity);jest.mocked(generateTokensWithContext).mockClear();
    try{const result=await signupService(identity).signup(grant.token,grant.binding,origin,input);expect(result).toHaveProperty('tokens');expect(generateTokensWithContext).toHaveBeenCalledWith(expect.any(User),'neture.co.kr','neture','kakao',expect.anything());const id=(await db.query('SELECT id FROM users WHERE email=$1',[input.email]))[0].id;for(const table of ['user_password_credentials','service_memberships','role_assignments'])expect(await db.query(`SELECT * FROM ${table} WHERE user_id=$1`,[id])).toHaveLength(0);}finally{await removeSignup(input.email);}
  });
  it('same email is never automatically linked; collision rolls back proof and user creation',async()=>{
    const email=(await db.query('SELECT email FROM users WHERE id=$1',[owner.userId]))[0].email;const identity={providerId:'567890',email,emailVerified:true};const grant=await signupGrant(identity);
    await expect(signupService(identity).signup(grant.token,grant.binding,origin,{...signupInput(),email})).rejects.toMatchObject({code:'EMAIL_IN_USE'});expect(await db.query('SELECT * FROM linked_accounts WHERE "userId"=$1',[owner.userId])).toHaveLength(0);expect((await flows.read(grant.token)).used_at).toBeNull();
  });
  it('provider identity duplicate rolls back a newly created user',async()=>{
    await db.query(`INSERT INTO linked_accounts(id,"userId",provider,"providerId") VALUES(gen_random_uuid(),$1,'kakao','567890')`,[other]);const input=signupInput();const identity={providerId:'567890',email:input.email,emailVerified:true};const grant=await signupGrant(identity);
    await expect(signupService(identity).signup(grant.token,grant.binding,origin,input)).rejects.toMatchObject({code:'SOCIAL_IDENTITY_CONFLICT'});expect(await db.query('SELECT id FROM users WHERE email=$1',[input.email])).toHaveLength(0);expect((await flows.read(grant.token)).used_at).toBeNull();
  });
  it('new Kakao identity with an existing email offers signup rather than logging into that email owner',async()=>{
    const email=(await db.query('SELECT email FROM users WHERE id=$1',[owner.userId]))[0].email;const identity={providerId:'567890',email,emailVerified:true};const grant=await flows.create('kakao-login','kakao',origin,'neture');const result=await signupService(identity).login(grant.token,grant.binding,origin,'synthetic-code');expect(result).toMatchObject({nextStep:'signup'});expect(result).not.toHaveProperty('tokens');
  });
  it('fresh platform roles reject a Kakao session and do not promote the identity to Google',async()=>{
    await db.query(`INSERT INTO linked_accounts(id,"userId",provider,"providerId") VALUES(gen_random_uuid(),$1,'kakao','567890')`,[owner.userId]);const grant=await flows.create('kakao-login','kakao',origin,'neture');jest.mocked(freshenUserContext).mockResolvedValueOnce({roles:['platform:super_admin'],memberships:[]});
    await expect(signupService({providerId:'567890',emailVerified:true}).login(grant.token,grant.binding,origin,'synthetic-code')).rejects.toMatchObject({code:'GOOGLE_SESSION_REQUIRED'});
  });

});
