import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
let db: DataSource;
jest.mock('../../../database/connection.js', () => ({ AppDataSource: { query: (...args: any[]) => db.query(...args as [string, any[]]) } }));
jest.mock('../auth-context.helper.js', () => ({ freshenUserContext: jest.fn(async () => ({ roles: [], memberships: [] })), generateTokensWithContext: jest.fn(async () => ({ tokens: { accessToken: 'fixture', refreshToken: 'fixture' } })), injectRolesIntoPublicData: jest.fn() }));
import { GoogleAuthService } from '../google-auth.service.js';
import { EmailAuthService } from '../email-auth.service.js';
import { KakaoAuthService } from '../kakao-auth.service.js';
import { SocialFlowService } from '../social-flow.service.js';
import { User } from '../../../entities/User.js';
import { LinkedAccount } from '../../../entities/LinkedAccount.js';
import { policyAcceptanceService, computePolicyContentHash } from '../../../modules/policy-acceptance/policy-acceptance.service.js';
import { computePendingPolicyAcceptances } from '../../../common/auth/terms-acceptance.policy.js';

const port = Number(process.env.O4O_SIGNUP_TEST_PORT);
const integration = Number.isInteger(port) && port > 1024 && ![5432, 5442].includes(port) ? describe : describe.skip;
integration('signup agreement atomicity (dedicated loopback PostgreSQL)', () => {
  let documentId: string; let email: string; let flows: SocialFlowService;
  const origin = 'https://neture.co.kr';
  function repository(entity: unknown, q: any) {
    return {
      create: (data: any) => entity === User ? Object.assign(new User(), data) : data,
      findOne: async ({ where }: any) => {
        const rows = entity === User ? await q.query('SELECT * FROM users WHERE id=$1', [where.id]) : await q.query('SELECT * FROM linked_accounts WHERE provider=$1 AND "providerId"=$2', [where.provider, where.providerId]);
        return rows[0] ? (entity === User ? Object.assign(new User(), rows[0]) : rows[0]) : null;
      },
      save: async (data: any) => {
        if (entity !== User && entity !== LinkedAccount) return data;
        if (entity === LinkedAccount) return (await q.query('INSERT INTO linked_accounts("userId",provider,"providerId") VALUES($1,$2,$3) RETURNING *', [data.userId, data.provider, data.providerId]))[0];
        const [row] = await q.query('INSERT INTO users(email,name,phone,status,"isActive","isEmailVerified",tos_accepted_at) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *', [data.email, data.name, data.phone, data.status, data.isActive, data.isEmailVerified, data.tosAcceptedAt]);
        return Object.assign(data, row);
      },
      update: async () => ({ affected: 1 }),
    };
  }
  const source = () => ({ query: db.query.bind(db), getRepository: (entity: unknown) => repository(entity, db), transaction: (callback: any) => db.transaction(manager => callback({ query: manager.query.bind(manager), getRepository: (entity: unknown) => repository(entity, manager) })) });
  beforeAll(async () => {
    db = new DataSource({ type: 'postgres', host: '127.0.0.1', port, username: 'o4o_fixture', database: 'o4o_signup_test', entities: [], synchronize: false });
    await db.initialize();
    // Dedicated fixture DB only; no production schema or migration is modified.
    await db.query(`CREATE TABLE IF NOT EXISTS users(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),email text UNIQUE NOT NULL,name text,phone text,status text,"isActive" boolean,"isEmailVerified" boolean,tos_accepted_at timestamptz,"createdAt" timestamptz DEFAULT now());
      CREATE TABLE IF NOT EXISTS linked_accounts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),"userId" uuid REFERENCES users(id) ON DELETE CASCADE,provider text,"providerId" text,UNIQUE(provider,"providerId"));
      CREATE TABLE IF NOT EXISTS user_password_credentials(user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE);
      CREATE TABLE IF NOT EXISTS demo_accounts(user_id uuid REFERENCES users(id),demo_type text,is_active boolean);
      CREATE TABLE IF NOT EXISTS service_policy_documents(id uuid PRIMARY KEY,service_key text,document_type text,version integer,title text,content text,status text,published_at timestamptz DEFAULT now());
      CREATE TABLE IF NOT EXISTS user_policy_acceptances(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,service_key text NOT NULL,policy_document_id uuid NOT NULL REFERENCES service_policy_documents(id),document_type text NOT NULL,version integer NOT NULL,content_hash char(64) NOT NULL,acceptance_kind text NOT NULL,accepted_at timestamptz DEFAULT now(),UNIQUE(user_id,service_key,policy_document_id));
      CREATE TABLE IF NOT EXISTS service_memberships(user_id uuid REFERENCES users(id) ON DELETE CASCADE, service_key text,status text);
      CREATE TABLE IF NOT EXISTS role_assignments(user_id uuid REFERENCES users(id) ON DELETE CASCADE,role text);
      CREATE TABLE IF NOT EXISTS auth_social_flows(token_hash varchar(64) PRIMARY KEY,binding_hash varchar(64) NOT NULL,kind text,provider text,origin text,service_key text,user_id uuid,session_id uuid,token_family text,payload jsonb DEFAULT '{}',created_at timestamptz DEFAULT now(),expires_at timestamptz,used_at timestamptz)`);
  });
  afterAll(async () => { if (db?.isInitialized) await db.destroy(); });
  beforeEach(async () => {
    documentId = randomUUID(); email = `${randomUUID()}@fixture.invalid`; flows = new SocialFlowService(db);
    await db.query("INSERT INTO service_policy_documents(id,service_key,document_type,version,title,content,status) VALUES($1,'neture','terms',1,'Fixture terms','Fixture agreement','published')", [documentId]);
  });
  afterEach(async () => {
    await db.query('DELETE FROM users WHERE email=$1', [email]);
    await db.query('DELETE FROM service_policy_documents WHERE id=$1 OR id IN (SELECT id FROM service_policy_documents WHERE title=$2)', [documentId, 'New fixture terms']);
    await db.query('DELETE FROM auth_social_flows WHERE origin=$1', [origin]);
    policyAcceptanceService.invalidateUser('fixture');
  });
  async function signup(provider: string, reference: any = { policyDocumentId: documentId, version: 1 }) {
    const consents = { terms: true, privacy: true, name: 'Fixture', phone: '01000000000', termsPolicy: reference };
    if (provider === 'google') {
      const service = new GoogleAuthService({ dataSource: source() as any, identity: { verifyGoogleIdToken: async () => ({ sub: randomUUID(), email, emailVerified: true }), findGoogleIdentityBySub: async () => null } as any, readContext: async () => ({ roles: [], memberships: [] }), issueSession: async () => ({ tokens: { accessToken: 'fixture', refreshToken: 'fixture' } }) as any });
      return service.signup({ idToken: 'fixture', consents, policyServiceKey: 'neture', ipAddress: '127.0.0.1', userAgent: 'fixture' });
    }
    if (provider === 'email') {
      const service = new EmailAuthService({ dataSource: source() as any, passwords: { hasPassword: async () => false, setPassword: async (id: string, _password: string, manager: any) => { await manager.query('INSERT INTO user_password_credentials(user_id) VALUES($1)', [id]); } } as any });
      jest.spyOn(service, 'sendVerificationMail').mockResolvedValue(true);
      return service.signup({ email, name: consents.name, phone: consents.phone, password: 'Synthetic123!', consents, policyServiceKey: 'neture', ipAddress: '127.0.0.1', userAgent: 'fixture' });
    }
    const grant = await flows.create('kakao-signup', 'kakao', origin, 'neture', { providerId: randomUUID(), email, emailVerified: true });
    const service = new KakaoAuthService(source() as any, {} as any, flows);
    try { return await service.signup(grant.token, grant.binding, origin, { email, name: consents.name, phone: consents.phone, consents }); }
    catch (error) { expect((await flows.read(grant.token)).used_at).toBeNull(); throw error; }
  }
  it.each(['email', 'google', 'kakao'])('%s stores the viewed document/version/hash without creating memberships or roles', async provider => {
    await signup(provider);
    const [user] = await db.query('SELECT id FROM users WHERE email=$1', [email]);
    const rows = await db.query('SELECT service_key,policy_document_id,version,content_hash,acceptance_kind FROM user_policy_acceptances WHERE user_id=$1', [user.id]);
    expect(rows).toEqual([{ service_key: 'neture', policy_document_id: documentId, version: 1, content_hash: computePolicyContentHash('Fixture agreement'), acceptance_kind: 'agreement' }]);
    for (const table of ['service_memberships', 'role_assignments']) expect(await db.query(`SELECT * FROM ${table} WHERE user_id=$1`, [user.id])).toHaveLength(0);
    const doc = await policyAcceptanceService.getPublishedTermsForService('neture', db);
    expect(computePendingPolicyAcceptances([{ serviceKey: 'neture', status: 'active' }] as any, [doc!], new Set([documentId]))).toEqual([]);
  });
  it.each(['email', 'google', 'kakao'])('%s rejects an agreement belonging to another service', async provider => {
    await db.query("UPDATE service_policy_documents SET service_key='kpa-society' WHERE id=$1", [documentId]);
    await expect(signup(provider)).rejects.toHaveProperty('code', 'POLICY_SERVICE_MISMATCH');
    expect(await db.query('SELECT id FROM users WHERE email=$1', [email])).toHaveLength(0);
    for (const table of ['linked_accounts', 'user_password_credentials', 'user_policy_acceptances']) expect(await db.query(`SELECT * FROM ${table}`)).toHaveLength(0);
  });
  it.each(['email', 'google', 'kakao'])('%s rejects missing and mismatched versions without partial identities', async provider => {
    for (const reference of [null, { policyDocumentId: documentId, version: 2 }]) {
      await expect(signup(provider, reference)).rejects.toHaveProperty('code', reference ? 'POLICY_VERSION_MISMATCH' : 'POLICY_ACCEPTANCE_REQUIRED');
      expect(await db.query('SELECT id FROM users WHERE email=$1', [email])).toHaveLength(0);
      for (const table of ['linked_accounts', 'user_password_credentials', 'user_policy_acceptances']) expect(await db.query(`SELECT * FROM ${table}`)).toHaveLength(0);
    }
  });
  it.each(['email', 'google', 'kakao'])('%s rejects a policy published after the form loaded; allows fresh review', async provider => {
    await db.query("UPDATE service_policy_documents SET status='draft' WHERE id=$1", [documentId]);
    const next = randomUUID();
    await db.query("INSERT INTO service_policy_documents(id,service_key,document_type,version,title,content,status) VALUES($1,'neture','terms',2,'New fixture terms','Next fixture agreement','published')", [next]);
    await expect(signup(provider)).rejects.toHaveProperty('code', 'POLICY_NOT_PUBLISHED');
    expect(await db.query('SELECT id FROM users WHERE email=$1', [email])).toHaveLength(0);
    await signup(provider, { policyDocumentId: next, version: 2 });
    expect((await db.query('SELECT version FROM user_policy_acceptances'))[0].version).toBe(2);
  });
  it.each(['email', 'google', 'kakao'])('%s rolls account/provider/credential back on a database acceptance failure', async provider => {
    await db.query("ALTER TABLE user_policy_acceptances ADD CONSTRAINT fixture_failure CHECK (version <> 1)");
    try {
      await expect(signup(provider)).rejects.toThrow();
      expect(await db.query('SELECT id FROM users WHERE email=$1', [email])).toHaveLength(0);
      for (const table of ['linked_accounts', 'user_password_credentials', 'user_policy_acceptances']) expect(await db.query(`SELECT * FROM ${table}`)).toHaveLength(0);
    } finally { await db.query('ALTER TABLE user_policy_acceptances DROP CONSTRAINT fixture_failure'); }
  });
});
