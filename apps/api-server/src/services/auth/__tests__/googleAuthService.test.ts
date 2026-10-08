/**
 * WO-O4O-GOOGLE-ONLY-SIGNUP-LOGIN-V1 (WO-2D) §6
 *
 * GoogleAuthService 의 로그인·가입 계약을 실제 Google/DB 없이 고정한다.
 *  - Identity lookup 은 linked_accounts(provider='google', providerId=sub) 뿐이다. email 로 users 를 찾지 않는다.
 *  - 미등록 sub → GOOGLE_SIGNUP_REQUIRED (email 이 기존 사용자와 같아도 병합 0).
 *  - 가입은 단일 트랜잭션 — users + linked_accounts 가 함께 생기거나 함께 사라진다(orphan 0).
 *  - 신규 사용자: password NULL · name NULL · picture 미저장 · role/membership 0 · 동의 스냅샷.
 *  - email UNIQUE 충돌 → EMAIL_IN_USE(자동 연결 0) · sub 중복 → GOOGLE_ALREADY_REGISTERED.
 *
 * DB 는 in-memory fake(unique 제약 포함) 로 대체한다. 세션 토큰은 실제 tokenUtils 로 발급해
 * JWT sub = users.id · refresh family 기록을 함께 검증한다.
 */

import { GoogleAuthService, GoogleAuthError } from '../google-auth.service.js';
import { GoogleIdTokenError, type VerifiedGoogleIdentity } from '../google-identity.service.js';
import { User } from '../../../entities/User.js';
import { LinkedAccount } from '../../../entities/LinkedAccount.js';
import { AccountActivity } from '../../../entities/AccountActivity.js';
import * as tokenUtils from '../../../utils/token.utils.js';
import { decideSemiFranchiseAccess } from '../../../modules/neture-pharmacy/services/semi-franchise-service-access.js';

// ── in-memory fake DB ───────────────────────────────────────────────────────
type Row = Record<string, any>;
type Store = { users: Row[]; linked: Row[]; activities: Row[]; demoUserIds: string[] };

let seq = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;

function uniqueViolation(constraint: string, detail: string) {
  return Object.assign(new Error('duplicate key value violates unique constraint'), {
    code: '23505', constraint, detail, driverError: { code: '23505', constraint, detail },
  });
}

function matches(row: Row, where: Row): boolean {
  return Object.entries(where).every(([k, v]) => row[k] === v);
}

function repoFor(store: Store, entity: unknown) {
  const table: Row[] =
    entity === User ? store.users
    : entity === LinkedAccount ? store.linked
    : entity === AccountActivity ? store.activities
    : (() => { throw new Error(`unexpected repository: ${String(entity)}`); })();

  return {
    findOne: jest.fn(async ({ where }: { where: Row }) => table.find((r) => matches(r, where)) ?? null),
    create: jest.fn((data: Row) => {
      if (entity === User) return Object.assign(new User(), data);
      return { ...data };
    }),
    save: jest.fn(async (row: Row) => {
      if (entity === User) {
        if (table.some((r) => r !== row && r.email === row.email)) {
          throw uniqueViolation('IDX_97672ac88f789774dd47f7c8be', 'Key (email)=(…) already exists.');
        }
      }
      if (entity === LinkedAccount) {
        if (table.some((r) => r !== row && r.provider === row.provider && r.providerId === row.providerId)) {
          throw uniqueViolation('UQ_linked_accounts_provider_providerId', 'Key (provider, "providerId")=(…) already exists.');
        }
      }
      if (!row.id) row.id = uuid();
      if (!table.includes(row)) table.push(row);
      return row;
    }),
    update: jest.fn(async (where: Row, patch: Row) => {
      for (const r of table) if (matches(r, where)) Object.assign(r, patch);
      return { affected: 1 };
    }),
  };
}

function makeDataSource(store: Store) {
  const repos = new Map<unknown, ReturnType<typeof repoFor>>();
  const getRepository = (entity: unknown) => {
    if (!repos.has(entity)) repos.set(entity, repoFor(store, entity));
    return repos.get(entity)!;
  };
  return {
    getRepository: jest.fn(getRepository),
    // 트랜잭션: 스냅샷 위에서 실행하고 성공 시에만 커밋한다(실패 → orphan 0 증명).
    transaction: jest.fn(async (fn: (manager: any) => Promise<any>) => {
        const staged: Store = { users: [...store.users], linked: [...store.linked], activities: [...store.activities], demoUserIds: [...store.demoUserIds] };
      const stagedRepos = new Map<unknown, ReturnType<typeof repoFor>>();
      const manager = {
        getRepository: (entity: unknown) => {
          if (!stagedRepos.has(entity)) stagedRepos.set(entity, repoFor(staged, entity));
          return stagedRepos.get(entity)!;
        },
        // 가입 시 대소문자만 다른 기존 주소 확인(`lower(email) = $1`) — 그 외 raw SQL 은 쓰지 않는다.
        query: jest.fn(async (sql: string, params: unknown[]) => {
          // Demo 계정 판정(`demo_accounts` JOIN `users`) — 판정 정본은 user_id 다.
          if (/FROM demo_accounts/.test(sql)) {
            const target = String(params[0]);
            return staged.users
              .filter((u) => staged.demoUserIds.includes(String(u.id)) && String(u.email).toLowerCase() === target)
              .slice(0, 1)
              .map(() => ({ '?column?': 1 }));
          }
          if (!/FROM users WHERE lower\(email\) = \$1/.test(sql)) throw new Error(`unexpected query: ${sql}`);
          return staged.users.filter((u) => String(u.email).toLowerCase() === params[0]).slice(0, 1).map(() => ({ '?column?': 1 }));
        }),
      };
      const result = await fn(manager);
      store.users.splice(0, store.users.length, ...staged.users);
      store.linked.splice(0, store.linked.length, ...staged.linked);
      return result;
    }),
  };
}

// ── identity fake ───────────────────────────────────────────────────────────
const SUB_A = '111111111111111111111';
const SUB_B = '222222222222222222222';

function identityFor(map: Record<string, Partial<VerifiedGoogleIdentity> | GoogleIdTokenError>, store: Store) {
  return {
    verifyGoogleIdToken: jest.fn(async (idToken: string) => {
      const entry = map[idToken];
      if (!entry) throw new GoogleIdTokenError('SIGNATURE_INVALID');
      if (entry instanceof GoogleIdTokenError) throw entry;
      return {
        // 기본 fixture 는 Google 이 이메일을 확인한 계정이다 — 미확인은 테스트가 명시한다(S1).
        sub: SUB_A, audience: 'web', issuer: 'https://accounts.google.com', expiresAt: new Date(Date.now() + 3600_000),
        emailVerified: true,
        ...entry,
      } as VerifiedGoogleIdentity;
    }),
    findGoogleIdentityBySub: jest.fn(async (sub: string) =>
      (store.linked.find((r) => r.provider === 'google' && r.providerId === sub) as LinkedAccount | undefined) ?? null),
  };
}

const META = { ipAddress: '127.0.0.1', userAgent: 'jest' };
const CONSENTS = { name: '테스트회원', phone: '01012345678', terms: true, privacy: true };

function seedUser(store: Store, over: Row = {}): Row {
  const u = Object.assign(new User(), {
    id: uuid(), email: 'existing@example.test', password: '$2b$hash', name: 'Existing', status: 'active', isActive: true,
    isEmailVerified: true, loginAttempts: 0, marketingAccepted: false, ...over,
  });
  store.users.push(u);
  return u;
}

describe('GoogleAuthService — Google-only Signup/Login', () => {
  let store: Store;
  let ds: ReturnType<typeof makeDataSource>;
  let identity: ReturnType<typeof identityFor>;
  let svc: GoogleAuthService;
  /** issueSession 이 돌려줄 역할 · membership — 로그인 자격 게이트 테스트용. */
  let sessionRoles: string[];
  let sessionMemberships: { serviceKey: string; status: string }[];
  /** 세미프랜차이즈 자격 fake — Neture 약국 조직별 (기본, 세미프랜차이즈) 가입 상태. */
  let semiFranchiseRows: { basic: string | null; semi: string | null }[];
  let semiFranchiseResolver: jest.Mock;

  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-google-auth';
    process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret-google-auth';
  });

  const build = (map: Parameters<typeof identityFor>[0]) => {
    identity = identityFor(map, store);
    svc = new GoogleAuthService({
      identity,
      dataSource: ds as any,
      issueSession: async (user) => ({
        tokens: tokenUtils.generateTokens(user, [], 'neture.co.kr', []),
        roles: sessionRoles,
        memberships: sessionMemberships,
      }),
      resolveSemiFranchiseAccess: semiFranchiseResolver,
    });
  };

  beforeEach(() => {
    store = { users: [], linked: [], activities: [], demoUserIds: [] };
    ds = makeDataSource(store);
    sessionRoles = [];
    sessionMemberships = [];
    semiFranchiseRows = [];
    semiFranchiseResolver = jest.fn(async (_userId: string, key: string) => decideSemiFranchiseAccess(key, semiFranchiseRows));
  });

  it.each(['', '   ', 'x'.repeat(101)])('signup rejects a missing or oversized name before creating an account', async (name) => {
    build({ 'tok-a': { sub: SUB_A, email: 'new@example.test', emailVerified: true } });
    await expect(svc.signup({ idToken: 'tok-a', consents: { ...CONSENTS, name }, ...META })).rejects.toMatchObject({ code: 'INVALID_NAME' });
    expect(store.users).toHaveLength(0);
    expect(store.linked).toHaveLength(0);
  });

  // ── signup ────────────────────────────────────────────────────────────────
  it('signup · 신규 sub → users + linked_accounts 생성, password 키 자체 없음, 입력 이름·모바일 저장, picture 미저장, role/membership 0', async () => {
    build({ 'tok-a': { sub: SUB_A, email: 'new@example.test', emailVerified: true } });

    const session = await svc.signup({ idToken: 'tok-a', consents: { ...CONSENTS, marketing: true }, ...META });

    expect(store.users).toHaveLength(1);
    expect(store.linked).toHaveLength(1);
    const u = store.users[0];
    const l = store.linked[0];
    // WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1 Phase B-1:
    //   구 계약은 `password: null` 을 명시적으로 기록하는 것이었다. 컬럼이 B-2 에서 사라지므로
    //   이제는 **키 자체를 만들지 않는다**. 다시 생기면 password 축이 부활한 것이다.
    expect('password' in u).toBe(false);
    expect(u.name).toBe('테스트회원');
    expect(u.phone).toBe('01012345678');
    expect(u.status).toBe('active');
    expect(u.isEmailVerified).toBe(true);
    expect(u.tosAcceptedAt).toBeInstanceOf(Date);
    expect(u.privacyAcceptedAt).toBeInstanceOf(Date);
    expect(u.marketingAccepted).toBe(true);
    expect(l).toMatchObject({ provider: 'google', providerId: SUB_A, userId: u.id });
    // 스냅샷 컬럼은 비어 있어야 한다(picture/email/displayName 미저장).
    expect(l.email).toBeUndefined();
    expect(l.displayName).toBeUndefined();
    expect(l.profileImage).toBeUndefined();
    expect(l.providerData).toBeUndefined();
    // 세션: JWT sub = users.id · refresh family 기록
    const payload = tokenUtils.verifyAccessToken(session.tokens.accessToken)!;
    expect(payload.sub ?? (payload as any).userId).toBe(u.id);
    expect(u.refreshTokenFamily).toBe(tokenUtils.getTokenFamily(session.tokens.refreshToken));
    expect(u.lastLoginAt).toBeInstanceOf(Date);
    expect(session.isNewUser).toBe(true);
    expect(session.user.roles).toEqual([]);
    expect(session.user.memberships).toEqual([]);
    expect(session.user).not.toHaveProperty('password');
  });

  it('signup · terms/privacy 미동의 → CONSENT_REQUIRED, 토큰 검증조차 하지 않음', async () => {
    build({ 'tok-a': { sub: SUB_A, email: 'new@example.test' } });
    await expect(svc.signup({ idToken: 'tok-a', consents: { terms: true, privacy: false }, ...META }))
      .rejects.toMatchObject({ code: 'CONSENT_REQUIRED', statusCode: 400 });
    expect(identity.verifyGoogleIdToken).not.toHaveBeenCalled();
    expect(store.users).toHaveLength(0);
  });

  it('signup · email claim 없음 → GOOGLE_EMAIL_MISSING (placeholder email 생성 0)', async () => {
    build({ 'tok-a': { sub: SUB_A } });
    await expect(svc.signup({ idToken: 'tok-a', consents: CONSENTS, ...META }))
      .rejects.toMatchObject({ code: 'GOOGLE_EMAIL_MISSING', statusCode: 400 });
    expect(store.users).toHaveLength(0);
    expect(store.linked).toHaveLength(0);
  });

  // WO-O4O-EMAIL-PASSWORD-AUTH-S1-CLOSURE-V1 — Google 이 확인한 주소만 users 를 만든다.
  it('S1-G1 signup · email_verified=true → 가입 허용, isEmailVerified=true', async () => {
    build({ 'tok-a': { sub: SUB_A, email: 'verified@example.test', emailVerified: true } });
    await svc.signup({ idToken: 'tok-a', consents: CONSENTS, ...META });
    expect(store.users).toHaveLength(1);
    expect(store.users[0].isEmailVerified).toBe(true);
    expect(store.linked).toHaveLength(1);
  });

  it.each([
    ['false', false],
    ['claim 없음', undefined],
  ])('S1-G2 signup · email_verified=%s → GOOGLE_EMAIL_UNVERIFIED, users/linked_accounts 0, 세션 0', async (_l, emailVerified) => {
    build({ 'tok-a': { sub: SUB_A, email: 'unverified@example.test', emailVerified } });
    await expect(svc.signup({ idToken: 'tok-a', consents: CONSENTS, ...META }))
      .rejects.toMatchObject({ code: 'GOOGLE_EMAIL_UNVERIFIED', statusCode: 400 });
    expect(store.users).toHaveLength(0);
    expect(store.linked).toHaveLength(0);
  });

  it('S1-G2 createGoogleUser 직접 호출(초대 수락 경로)도 미확인 주소는 거절', async () => {
    build({});
    const manager = { getRepository: (e: unknown) => ds.getRepository(e) };
    await expect(svc.createGoogleUser(manager as any, {
      sub: SUB_A, email: 'invitee@example.test', emailVerified: false,
      audience: 'web', issuer: 'https://accounts.google.com', expiresAt: new Date(Date.now() + 3600_000),
    } as VerifiedGoogleIdentity, CONSENTS)).rejects.toMatchObject({ code: 'GOOGLE_EMAIL_UNVERIFIED' });
    expect(store.users).toHaveLength(0);
    expect(store.linked).toHaveLength(0);
  });

  it('S1-G3 이미 가입한 sub 의 login 은 email_verified=false 토큰이어도 영향 없음', async () => {
    build({ 'tok-a': { sub: SUB_A, email: 'existing.g@example.test', emailVerified: true } });
    await svc.signup({ idToken: 'tok-a', consents: CONSENTS, ...META });
    build({ 'tok-a2': { sub: SUB_A, email: 'existing.g@example.test', emailVerified: false } });
    const session = await svc.login({ idToken: 'tok-a2', ...META });
    expect(session.isNewUser).toBe(false);
    expect(store.users).toHaveLength(1);
  });

  // WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1 — Google 가입도 로그인 이메일 정규화를 쓴다(대소문자 중복 users 0 · 병합 0).
  describe('이메일 대소문자 정규화', () => {
    it('Google `A@X.com` 가입 → users.email 은 `a@x.com` 으로 저장', async () => {
      build({ 'tok-a': { sub: SUB_A, email: ' New.User@Example.TEST ' } });
      await svc.signup({ idToken: 'tok-a', consents: CONSENTS, ...META });
      expect(store.users.map((u) => u.email)).toEqual(['new.user@example.test']);
      expect(store.linked).toHaveLength(1);
    });

    it('기존 비밀번호 계정 `a@x.com` + Google `A@X.com` 가입 → EMAIL_IN_USE · users 증가 0 · 연결 0 · 세션 0', async () => {
      const existing = seedUser(store, { email: 'same@example.test' });
      build({ 'tok-b': { sub: SUB_B, email: 'Same@Example.TEST' } });
      await expect(svc.signup({ idToken: 'tok-b', consents: CONSENTS, ...META }))
        .rejects.toMatchObject({ code: 'EMAIL_IN_USE', statusCode: 409 });
      expect(store.users).toEqual([existing]);
      expect(store.linked).toHaveLength(0); // 기존 users.id 로 자동 연결하지 않는다
      expect(existing.refreshTokenFamily).toBeUndefined();
      expect(existing.lastLoginAt).toBeUndefined();
    });

    it('기존 Google `a@x.com` + 다른 sub 의 Google `A@X.com` 가입 → EMAIL_IN_USE · 기존 연결만 유지', async () => {
      build({
        'tok-a': { sub: SUB_A, email: 'shared@example.test' },
        'tok-b': { sub: SUB_B, email: 'SHARED@example.test' },
      });
      await svc.signup({ idToken: 'tok-a', consents: CONSENTS, ...META });
      await expect(svc.signup({ idToken: 'tok-b', consents: CONSENTS, ...META }))
        .rejects.toMatchObject({ code: 'EMAIL_IN_USE' });
      expect(store.users).toHaveLength(1);
      expect(store.linked.map((l) => l.providerId)).toEqual([SUB_A]);
    });

    it('정규화 전 저장된 기존 행 `A@x.com` 도 같은 주소로 본다 → EMAIL_IN_USE', async () => {
      seedUser(store, { email: 'Legacy@Example.test' });
      build({ 'tok-b': { sub: SUB_B, email: 'legacy@example.test' } });
      await expect(svc.signup({ idToken: 'tok-b', consents: CONSENTS, ...META }))
        .rejects.toMatchObject({ code: 'EMAIL_IN_USE' });
      expect(store.users).toHaveLength(1);
      expect(store.linked).toHaveLength(0);
    });

    it('기존 Google sub 로그인은 영향 없음 — 저장된 원문 대소문자 주소도 그대로 · 재기록 0', async () => {
      const u = seedUser(store, { email: 'Old.Case@Example.test' });
      store.linked.push({ id: uuid(), userId: u.id, provider: 'google', providerId: SUB_A, isVerified: true, isPrimary: true });
      build({ 'tok-a': { sub: SUB_A, email: 'Old.Case@Example.test' } });
      const session = await svc.login({ idToken: 'tok-a', ...META });
      expect(session.isNewUser).toBe(false);
      expect(session.user.id).toBe(u.id);
      expect(u.email).toBe('Old.Case@Example.test');
    });

    it('S1 차단 유지 — 대소문자와 무관하게 email_verified=false 는 GOOGLE_EMAIL_UNVERIFIED', async () => {
      build({ 'tok-a': { sub: SUB_A, email: 'Unverified@Example.test', emailVerified: false } });
      await expect(svc.signup({ idToken: 'tok-a', consents: CONSENTS, ...META }))
        .rejects.toMatchObject({ code: 'GOOGLE_EMAIL_UNVERIFIED' });
      expect(store.users).toHaveLength(0);
    });
  });

  it('signup · 같은 sub 재가입 → GOOGLE_ALREADY_REGISTERED, users 증가 0', async () => {
    build({ 'tok-a': { sub: SUB_A, email: 'new@example.test' } });
    await svc.signup({ idToken: 'tok-a', consents: CONSENTS, ...META });
    await expect(svc.signup({ idToken: 'tok-a', consents: CONSENTS, ...META }))
      .rejects.toMatchObject({ code: 'GOOGLE_ALREADY_REGISTERED', statusCode: 409 });
    expect(store.users).toHaveLength(1);
    expect(store.linked).toHaveLength(1);
  });

  it('signup · 기존 사용자와 email 동일 + 새 sub → EMAIL_IN_USE, 자동 연결 0, email 로 users 조회 0', async () => {
    const existing = seedUser(store, { email: 'same@example.test' });
    build({ 'tok-b': { sub: SUB_B, email: 'same@example.test' } });

    await expect(svc.signup({ idToken: 'tok-b', consents: CONSENTS, ...META }))
      .rejects.toMatchObject({ code: 'EMAIL_IN_USE', statusCode: 409 });

    expect(store.users).toHaveLength(1);
    expect(store.linked).toHaveLength(0); // 기존 사용자에게 Google identity 가 붙지 않았다
    expect(store.users[0].id).toBe(existing.id);
    // email 을 where 로 쓰는 users 조회가 없어야 한다
    const userRepoCalls = ds.getRepository.mock.results
      .filter((r) => r.value?.findOne)
      .flatMap((r) => r.value.findOne.mock.calls as any[]);
    expect(userRepoCalls.some((c) => c[0]?.where && 'email' in c[0].where)).toBe(false);
  });

  it('signup · linked_accounts insert 실패 시 트랜잭션 롤백 → users orphan 0', async () => {
    build({ 'tok-a': { sub: SUB_A, email: 'new@example.test' } });
    // sub 중복 사전 확인은 통과하지만 insert 에서 unique 충돌이 나는 race 를 재현한다.
    identity.findGoogleIdentityBySub.mockResolvedValue(null);
    ds.transaction.mockImplementationOnce(async (fn: any) => {
      const staged: Store = { users: [], linked: [], activities: [], demoUserIds: [] };
      const manager = {
        getRepository: (entity: unknown) => {
          const repo = repoFor(staged, entity);
          if (entity === LinkedAccount) {
            repo.save.mockImplementation(async () => { throw uniqueViolation('UQ_linked_accounts_provider_providerId', 'Key (provider, "providerId")'); });
          }
          return repo;
        },
        query: jest.fn(async () => []), // 대소문자만 다른 기존 주소 없음
      };
      try {
        return await fn(manager);
      } finally {
        // 롤백: staged 를 버린다 — store 는 손대지 않는다
      }
    });
    await expect(svc.signup({ idToken: 'tok-a', consents: CONSENTS, ...META }))
      .rejects.toMatchObject({ code: 'GOOGLE_ALREADY_REGISTERED' });
    expect(store.users).toHaveLength(0);
    expect(store.linked).toHaveLength(0);
  });

  it('signup · 잘못된 ID token → GoogleIdTokenError 그대로 전파, 생성 0', async () => {
    build({ 'tok-bad': new GoogleIdTokenError('AUDIENCE_NOT_ALLOWED') });
    await expect(svc.signup({ idToken: 'tok-bad', consents: CONSENTS, ...META }))
      .rejects.toMatchObject({ code: 'GOOGLE_ID_TOKEN_INVALID', reason: 'AUDIENCE_NOT_ALLOWED' });
    expect(store.users).toHaveLength(0);
  });

  // ── login ─────────────────────────────────────────────────────────────────
  it('login · 등록된 sub → 세션(JWT sub=users.id) · lastUsedAt 갱신 · serviceKey membership 동봉', async () => {
    build({ 'tok-a': { sub: SUB_A, email: 'new@example.test' } });
    await svc.signup({ idToken: 'tok-a', consents: CONSENTS, ...META });
    const userId = store.users[0].id;
    store.linked[0].lastUsedAt = new Date(0);

    const session = await svc.login({ idToken: 'tok-a', serviceKey: 'neture', ...META });

    const payload = tokenUtils.verifyAccessToken(session.tokens.accessToken)!;
    expect(payload.sub ?? (payload as any).userId).toBe(userId);
    expect(session.isNewUser).toBe(false);
    expect(session.serviceMembership).toEqual({ serviceKey: 'neture', status: null });
    expect(store.linked[0].lastUsedAt.getTime()).toBeGreaterThan(0);
    expect(store.users).toHaveLength(1);
  });

  it('login · 미등록 sub → GOOGLE_SIGNUP_REQUIRED (email 동일 사용자가 있어도 병합 0 · 힌트 없음)', async () => {
    seedUser(store, { email: 'same@example.test' });
    build({ 'tok-b': { sub: SUB_B, email: 'same@example.test' } });

    const p = svc.login({ idToken: 'tok-b', ...META });
    await expect(p).rejects.toBeInstanceOf(GoogleAuthError);
    await expect(p).rejects.toMatchObject({ code: 'GOOGLE_SIGNUP_REQUIRED', statusCode: 404 });
    await expect(p).rejects.not.toHaveProperty('existingAccountByEmail');
    expect(store.linked).toHaveLength(0);
    expect(identity.findGoogleIdentityBySub).toHaveBeenCalledWith(SUB_B);
  });

  it.each(['inactive', 'suspended', 'rejected', 'deleted'])('login · 차단 상태(%s) → ACCOUNT_NOT_ACTIVE', async (status) => {
    const u = seedUser(store, { email: 'blocked@example.test', status });
    store.linked.push({ id: uuid(), userId: u.id, provider: 'google', providerId: SUB_A });
    build({ 'tok-a': { sub: SUB_A } });

    await expect(svc.login({ idToken: 'tok-a', ...META })).rejects.toMatchObject({ code: 'ACCOUNT_NOT_ACTIVE' });
    expect(u.refreshTokenFamily).toBeUndefined();
  });

  it('login · 잘못된 토큰(만료/서명/issuer/allowlist) → GOOGLE_ID_TOKEN_INVALID, DB 조회 0', async () => {
    for (const reason of ['TOKEN_EXPIRED', 'SIGNATURE_INVALID', 'ISSUER_MISMATCH', 'ALLOWLIST_EMPTY', 'SUB_MISSING'] as const) {
      build({ 'tok-bad': new GoogleIdTokenError(reason) });
      await expect(svc.login({ idToken: 'tok-bad', ...META })).rejects.toMatchObject({ code: 'GOOGLE_ID_TOKEN_INVALID', reason });
      expect(identity.findGoogleIdentityBySub).not.toHaveBeenCalled();
    }
  });

  // WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1:
  //   `link()` / `getLinkStatus()`(users.password 재인증 기반 명시 연결) 계약 테스트는 함께 은퇴했다.
  //   그 경로는 "password 로 로그인한 계정에 Google 을 붙인다" 는 전환기 전제 위에 있었고,
  //   이제 계정 생성 자체가 Google signup 하나다.

  it('login · 클라이언트가 보낸 email/sub/role 은 계약에 없다 — 입력은 idToken(+serviceKey)뿐', () => {
    // 타입 계약 고정: 컴파일 타임 검증. 런타임은 validateDto(forbidNonWhitelisted) 가 담당.
    const input: Parameters<GoogleAuthService['login']>[0] = { idToken: 't', serviceKey: 'neture', ...META };
    expect(Object.keys(input).sort()).toEqual(['idToken', 'ipAddress', 'serviceKey', 'userAgent']);
  });
  // WO-O4O-CANONICAL-DEMO-ACCOUNT-FOUNDATION-AND-EXPERIENCE-LOGIN-V1
  //   Demo 계정의 인증 수단은 비밀번호 하나로 고정이다 — Google 연결을 만들지 않는다.
  describe('Demo 계정 보호', () => {
    it('Demo 주소로 Google 가입 → DEMO_ACCOUNT_FORBIDDEN · users 증가 0 · 연결 0', async () => {
      const demo = seedUser(store, { email: 'teststoreowner@example.com' });
      store.demoUserIds.push(String(demo.id));
      build({ 'tok-b': { sub: SUB_B, email: 'TestStoreOwner@Example.com' } });

      await expect(svc.signup({ idToken: 'tok-b', consents: CONSENTS, ...META }))
        .rejects.toMatchObject({ code: 'DEMO_ACCOUNT_FORBIDDEN', statusCode: 403 });

      // 사유가 "이미 쓰는 주소"(EMAIL_IN_USE)가 아니라 Demo 보호로 끝난다 — 순서가 지켜진다.
      expect(store.users).toEqual([demo]);
      expect(store.linked).toHaveLength(0);
    });

    it('registry 행이 없으면 같은 주소도 일반 계정 규칙을 따른다 — 판정은 user_id 다', async () => {
      const existing = seedUser(store, { email: 'teststoreowner@example.com' });
      build({ 'tok-b': { sub: SUB_B, email: 'teststoreowner@example.com' } });

      // 이메일 문자열 비교였다면 여기서도 DEMO_ACCOUNT_FORBIDDEN 이 났을 것이다.
      await expect(svc.signup({ idToken: 'tok-b', consents: CONSENTS, ...META }))
        .rejects.toMatchObject({ code: 'EMAIL_IN_USE' });
      expect(store.users).toEqual([existing]);
    });
  });

  // WO-O4O-SERVICE-NOT-MEMBER-AUTH-CONTRACT-RESTORATION-V1
  describe('로그인 자격 게이트 (SERVICE_NOT_MEMBER)', () => {
    const GATED = { ...META, sessionServiceKey: 'k-cosmetics', loginMembershipGateKey: 'k-cosmetics' };
    const linkedUser = () => {
      const u = seedUser(store, { email: 'member@example.test' });
      store.linked.push({ id: uuid(), userId: u.id, provider: 'google', providerId: SUB_A, lastUsedAt: new Date(0) });
      build({ 'tok-a': { sub: SUB_A } });
      return u;
    };

    it('인증 성공 + 게이트 서비스 membership 없음 → 403 SERVICE_NOT_MEMBER, 세션 · lastUsedAt 흔적 없음', async () => {
      const u = linkedUser();
      sessionMemberships = [{ serviceKey: 'neture', status: 'active' }];
      const p = svc.login({ idToken: 'tok-a', ...GATED });
      await expect(p).rejects.toBeInstanceOf(GoogleAuthError);
      await expect(p).rejects.toMatchObject({ code: 'SERVICE_NOT_MEMBER', statusCode: 403 });
      expect(u.refreshTokenFamily).toBeUndefined();
      expect(store.linked[0].lastUsedAt.getTime()).toBe(0);
    });

    it('Google 인증 실패는 게이트와 무관하게 GOOGLE_ID_TOKEN_INVALID', async () => {
      linkedUser();
      build({ 'tok-bad': new GoogleIdTokenError('TOKEN_EXPIRED') });
      await expect(svc.login({ idToken: 'tok-bad', ...GATED })).rejects.toMatchObject({ code: 'GOOGLE_ID_TOKEN_INVALID' });
    });

    it.each(['active', 'pending', 'rejected'])('해당 서비스 row(status=%s) 가 있으면 세션 발급', async (status) => {
      linkedUser();
      sessionMemberships = [{ serviceKey: 'k-cosmetics', status }];
      const session = await svc.login({ idToken: 'tok-a', ...GATED });
      expect(session.tokens.accessToken).toBeTruthy();
    });

    it('platform:super_admin 은 통과', async () => {
      linkedUser();
      sessionRoles = ['platform:super_admin'];
      const session = await svc.login({ idToken: 'tok-a', ...GATED });
      expect(session.tokens.accessToken).toBeTruthy();
    });

    it('가입(signup)은 게이트 대상이 아니다 — 계정만 만들고 세션을 준다', async () => {
      build({ 'tok-a': { sub: SUB_A, email: 'new@example.test' } });
      const session = await svc.signup({ idToken: 'tok-a', consents: CONSENTS, ...GATED });
      expect(session.isNewUser).toBe(true);
    });
  });

  // WO-NETURE-PHARMACY-CUTOVER-COMPAT-V1 — pharmacy.neture.co.kr(kpa-society) 게이트의 세미프랜차이즈 자격
  describe('세미프랜차이즈 자격 (kpa-society 게이트)', () => {
    const GATED = { ...META, sessionServiceKey: 'kpa-society', loginMembershipGateKey: 'kpa-society' };
    const linkedUser = () => {
      const u = seedUser(store, { email: 'pharmacy@example.test' });
      store.linked.push({ id: uuid(), userId: u.id, provider: 'google', providerId: SUB_A, lastUsedAt: new Date(0) });
      build({ 'tok-a': { sub: SUB_A } });
      return u;
    };

    it('Neture 기본 active ∧ pharmacy active → kpa-society membership 없이 세션 발급', async () => {
      const u = linkedUser();
      semiFranchiseRows = [{ basic: 'active', semi: 'active' }];
      const session = await svc.login({ idToken: 'tok-a', ...GATED });
      expect(session.tokens.accessToken).toBeTruthy();
      expect(semiFranchiseResolver).toHaveBeenCalledWith(u.id, 'pharmacy');
    });

    it('세미프랜차이즈 대기 → SERVICE_NOT_MEMBER + serviceAccess(next=semi_franchise_pending), 흔적 없음', async () => {
      const u = linkedUser();
      semiFranchiseRows = [{ basic: 'active', semi: 'pending' }];
      const err = await svc.login({ idToken: 'tok-a', ...GATED }).catch((e) => e);
      expect(err).toBeInstanceOf(GoogleAuthError);
      expect(err).toMatchObject({ code: 'SERVICE_NOT_MEMBER', statusCode: 403 });
      expect(err.serviceAccess).toEqual({
        semiFranchiseKey: 'pharmacy',
        pharmacyMembershipStatus: 'active',
        semiFranchiseMembershipStatus: 'pending',
        next: 'semi_franchise_pending',
      });
      expect(u.refreshTokenFamily).toBeUndefined();
      expect(store.linked[0].lastUsedAt.getTime()).toBe(0);
    });

    it('Neture 약국 미가입 → next=apply_pharmacy', async () => {
      linkedUser();
      const err = await svc.login({ idToken: 'tok-a', ...GATED }).catch((e) => e);
      expect(err.serviceAccess).toMatchObject({ next: 'apply_pharmacy', pharmacyMembershipStatus: null });
    });

    it('기존 kpa-society row 는 기존 규칙대로 통과 — 세미프랜차이즈 조회 없음', async () => {
      linkedUser();
      sessionMemberships = [{ serviceKey: 'kpa-society', status: 'active' }];
      const session = await svc.login({ idToken: 'tok-a', ...GATED });
      expect(session.tokens.accessToken).toBeTruthy();
      expect(semiFranchiseResolver).not.toHaveBeenCalled();
    });
  });
});
