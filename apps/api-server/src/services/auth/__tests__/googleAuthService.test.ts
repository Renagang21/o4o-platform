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

// ── in-memory fake DB ───────────────────────────────────────────────────────
type Row = Record<string, any>;
type Store = { users: Row[]; linked: Row[]; activities: Row[] };

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
      const staged: Store = { users: [...store.users], linked: [...store.linked], activities: [...store.activities] };
      const stagedRepos = new Map<unknown, ReturnType<typeof repoFor>>();
      const manager = {
        getRepository: (entity: unknown) => {
          if (!stagedRepos.has(entity)) stagedRepos.set(entity, repoFor(staged, entity));
          return stagedRepos.get(entity)!;
        },
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
        sub: SUB_A, audience: 'web', issuer: 'https://accounts.google.com', expiresAt: new Date(Date.now() + 3600_000),
        ...entry,
      } as VerifiedGoogleIdentity;
    }),
    findGoogleIdentityBySub: jest.fn(async (sub: string) =>
      (store.linked.find((r) => r.provider === 'google' && r.providerId === sub) as LinkedAccount | undefined) ?? null),
  };
}

const META = { ipAddress: '127.0.0.1', userAgent: 'jest' };
const CONSENTS = { terms: true, privacy: true };

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
        roles: [],
        memberships: [],
      }),
    });
  };

  beforeEach(() => {
    store = { users: [], linked: [], activities: [] };
    ds = makeDataSource(store);
  });

  // ── signup ────────────────────────────────────────────────────────────────
  it('signup · 신규 sub → users + linked_accounts 생성, password/name NULL, picture 미저장, role/membership 0', async () => {
    build({ 'tok-a': { sub: SUB_A, email: 'new@example.test', emailVerified: true } });

    const session = await svc.signup({ idToken: 'tok-a', consents: { ...CONSENTS, marketing: true }, ...META });

    expect(store.users).toHaveLength(1);
    expect(store.linked).toHaveLength(1);
    const u = store.users[0];
    const l = store.linked[0];
    expect(u.password).toBeNull();
    expect(u.name).toBeNull();
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
      const staged: Store = { users: [], linked: [], activities: [] };
      const manager = {
        getRepository: (entity: unknown) => {
          const repo = repoFor(staged, entity);
          if (entity === LinkedAccount) {
            repo.save.mockImplementation(async () => { throw uniqueViolation('UQ_linked_accounts_provider_providerId', 'Key (provider, "providerId")'); });
          }
          return repo;
        },
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

  // ── link (WO-O4O-GOOGLE-IDENTITY-OPERATOR-EXPLICIT-LINK-V1) ─────────────
  describe('link · 로그인된 계정에 Google Identity 명시 연결', () => {
    const PW_HASH = '$2b$operator-hash';
    const verifyPassword = jest.fn(async (plain: string, hash: string) => hash === PW_HASH && plain === 'correct-pw');
    const buildLink = (map: Parameters<typeof identityFor>[0]) => {
      identity = identityFor(map, store);
      svc = new GoogleAuthService({ identity, dataSource: ds as any, verifyPassword, issueSession: async () => { throw new Error('link 는 세션을 발급하지 않는다'); } });
    };

    beforeEach(() => verifyPassword.mockClear());

    it('Case A · password 재인증 + 검증된 sub → linked_accounts 1행, users 신설 0 · email 불일치여도 연결', async () => {
      const op = seedUser(store, { email: 'operator@example.test', password: PW_HASH, name: '운영자' });
      buildLink({ 'tok-a': { sub: SUB_A, email: 'different-google@example.test', emailVerified: true } });

      const result = await svc.link({ userId: op.id, idToken: 'tok-a', currentPassword: 'correct-pw', ...META });

      expect(result).toEqual({ linked: true, alreadyLinked: false });
      expect(store.users).toHaveLength(1);
      expect(op.email).toBe('operator@example.test');
      expect(op.password).toBe(PW_HASH);
      expect(op.name).toBe('운영자');
      expect(store.linked).toHaveLength(1);
      expect(store.linked[0]).toMatchObject({ userId: op.id, provider: 'google', providerId: SUB_A, isVerified: true, isPrimary: true });
      expect(store.linked[0].email).toBeUndefined();
      expect(store.linked[0].displayName).toBeUndefined();
      expect(verifyPassword).toHaveBeenCalledWith('correct-pw', PW_HASH);
      // 순서: password 재인증이 token 검증보다 먼저
      expect(verifyPassword.mock.invocationCallOrder[0]).toBeLessThan(identity.verifyGoogleIdToken.mock.invocationCallOrder[0]);
      // activity: link_google · email NULL
      await new Promise((r) => setImmediate(r));
      expect(store.activities.at(-1)).toMatchObject({ type: 'link_google', email: null, success: true, details: { provider: 'google', reason: 'google_link' } });
    });

    it('Case B · 같은 sub 가 이미 같은 user 에 연결 → 멱등 200 alreadyLinked, row 0 추가', async () => {
      const op = seedUser(store, { password: PW_HASH });
      store.linked.push({ id: uuid(), userId: op.id, provider: 'google', providerId: SUB_A });
      buildLink({ 'tok-a': { sub: SUB_A } });

      const result = await svc.link({ userId: op.id, idToken: 'tok-a', currentPassword: 'correct-pw', ...META });
      expect(result).toEqual({ linked: true, alreadyLinked: true });
      expect(store.linked).toHaveLength(1);
    });

    it('Case C · 같은 user 에 다른 sub 가 이미 연결 → 409 GOOGLE_ACCOUNT_ALREADY_LINKED (교체 없음)', async () => {
      const op = seedUser(store, { password: PW_HASH });
      store.linked.push({ id: uuid(), userId: op.id, provider: 'google', providerId: SUB_A });
      buildLink({ 'tok-b': { sub: SUB_B } });

      await expect(svc.link({ userId: op.id, idToken: 'tok-b', currentPassword: 'correct-pw', ...META }))
        .rejects.toMatchObject({ code: 'GOOGLE_ACCOUNT_ALREADY_LINKED', statusCode: 409 });
      expect(store.linked).toHaveLength(1);
      expect(store.linked[0].providerId).toBe(SUB_A);
    });

    it('Case D · 해당 sub 가 다른 users.id 에 연결(테스트 계정) → 409 GOOGLE_IDENTITY_IN_USE, 이동·merge 0', async () => {
      const op = seedUser(store, { email: 'operator@example.test', password: PW_HASH });
      const tester = seedUser(store, { email: 'tester@example.test', password: null });
      store.linked.push({ id: uuid(), userId: tester.id, provider: 'google', providerId: SUB_A });
      buildLink({ 'tok-a': { sub: SUB_A } });

      await expect(svc.link({ userId: op.id, idToken: 'tok-a', currentPassword: 'correct-pw', ...META }))
        .rejects.toMatchObject({ code: 'GOOGLE_IDENTITY_IN_USE', statusCode: 409 });
      expect(store.linked).toHaveLength(1);
      expect(store.linked[0].userId).toBe(tester.id);
      expect(store.users).toHaveLength(2);
    });

    it('Case D(race) · INSERT 시 (provider, providerId) unique 충돌 → GOOGLE_IDENTITY_IN_USE, 부분 row 0', async () => {
      const op = seedUser(store, { password: PW_HASH });
      const other = seedUser(store, { email: 'other@example.test' });
      buildLink({ 'tok-a': { sub: SUB_A } });
      // 사전 조회는 통과했지만 save 직전에 다른 user 가 같은 sub 를 가져간 상황: 트랜잭션 안 repo 의 save 가 23505 를 던진다.
      const original = ds.transaction.getMockImplementation()!;
      ds.transaction.mockImplementationOnce(async (fn: any) => original(async (manager: any) => {
        const repo = manager.getRepository(LinkedAccount);
        repo.save.mockImplementationOnce(async () => {
          throw uniqueViolation('UQ_linked_accounts_provider_providerId', 'Key (provider, "providerId")=(…) already exists.');
        });
        return fn(manager);
      }));

      await expect(svc.link({ userId: op.id, idToken: 'tok-a', currentPassword: 'correct-pw', ...META }))
        .rejects.toMatchObject({ code: 'GOOGLE_IDENTITY_IN_USE' });
      expect(store.linked.filter((r) => r.userId === op.id)).toHaveLength(0);
      expect(other.id).toBeDefined();
    });

    it('잘못된 currentPassword → 401 INVALID_PASSWORD, token 검증 0 · row 0 · loginAttempts 불변', async () => {
      const op = seedUser(store, { password: PW_HASH, loginAttempts: 0 });
      buildLink({ 'tok-a': { sub: SUB_A } });

      await expect(svc.link({ userId: op.id, idToken: 'tok-a', currentPassword: 'wrong-pw', ...META }))
        .rejects.toMatchObject({ code: 'INVALID_PASSWORD', statusCode: 401 });
      expect(identity.verifyGoogleIdToken).not.toHaveBeenCalled();
      expect(store.linked).toHaveLength(0);
      expect(op.loginAttempts).toBe(0);
      expect(op.lockedUntil).toBeUndefined();
    });

    it('Google-only 계정(password NULL) → 400 PASSWORD_NOT_SET — service_credentials 는 재인증 수단이 아니다', async () => {
      const tester = seedUser(store, { password: null });
      buildLink({ 'tok-b': { sub: SUB_B } });

      await expect(svc.link({ userId: tester.id, idToken: 'tok-b', currentPassword: 'anything', ...META }))
        .rejects.toMatchObject({ code: 'PASSWORD_NOT_SET', statusCode: 400 });
      expect(verifyPassword).not.toHaveBeenCalled();
      expect(identity.verifyGoogleIdToken).not.toHaveBeenCalled();
    });

    it('변조/만료 Google token → GOOGLE_ID_TOKEN_INVALID, row 0', async () => {
      const op = seedUser(store, { password: PW_HASH });
      buildLink({ 'tok-bad': new GoogleIdTokenError('SIGNATURE_INVALID') });

      await expect(svc.link({ userId: op.id, idToken: 'tok-bad', currentPassword: 'correct-pw', ...META }))
        .rejects.toMatchObject({ code: 'GOOGLE_ID_TOKEN_INVALID' });
      expect(store.linked).toHaveLength(0);
    });

    it('세션 user 가 없으면 INVALID_USER — userId 는 입력 계약상 세션에서만 온다', async () => {
      buildLink({ 'tok-a': { sub: SUB_A } });
      await expect(svc.link({ userId: uuid(), idToken: 'tok-a', currentPassword: 'correct-pw', ...META }))
        .rejects.toMatchObject({ code: 'INVALID_USER' });
      const input: Parameters<GoogleAuthService['link']>[0] = { userId: 'u', idToken: 't', currentPassword: 'p', ...META };
      expect(Object.keys(input).sort()).toEqual(['currentPassword', 'idToken', 'ipAddress', 'userAgent', 'userId']);
    });

    it('getLinkStatus · { linked, passwordSet } 만 — Google email/sub 노출 0', async () => {
      const op = seedUser(store, { password: PW_HASH });
      const tester = seedUser(store, { email: 'tester@example.test', password: null });
      store.linked.push({ id: uuid(), userId: tester.id, provider: 'google', providerId: SUB_A });
      buildLink({});

      expect(await svc.getLinkStatus(op.id)).toEqual({ linked: false, passwordSet: true });
      expect(await svc.getLinkStatus(tester.id)).toEqual({ linked: true, passwordSet: false });
    });
  });

  it('login · 클라이언트가 보낸 email/sub/role 은 계약에 없다 — 입력은 idToken(+serviceKey)뿐', () => {
    // 타입 계약 고정: 컴파일 타임 검증. 런타임은 validateDto(forbidNonWhitelisted) 가 담당.
    const input: Parameters<GoogleAuthService['login']>[0] = { idToken: 't', serviceKey: 'neture', ...META };
    expect(Object.keys(input).sort()).toEqual(['idToken', 'ipAddress', 'serviceKey', 'userAgent']);
  });
});
