/**
 * WO-O4O-GOOGLE-IDENTITY-OPERATOR-EXPLICIT-LINK-V1 §15 — Admin Google Bootstrap(전환기 1회용) 계약
 *
 * 이 경로는 세션도 비밀번호도 요구할 수 없는 유일한 연결 경로이므로 게이트를 테스트로 고정한다.
 *  - 플래그/코드가 없으면 `GOOGLE_ADMIN_BOOTSTRAP_DISABLED`(404) — ID token 검증조차 하지 않는다.
 *  - 코드 불일치 → `GOOGLE_ADMIN_BOOTSTRAP_CODE_INVALID`(401) — DB 접근 0.
 *  - 대상 users.id 는 **서버가** `platform:super_admin` 보유자로 결정한다(정확히 1명). 클라이언트 지정 불가.
 *  - 대상에 이미 Google 연결이 있으면 409 — 성공 후 재사용 불가(1회성).
 *  - 다른 user 의 sub → `GOOGLE_IDENTITY_IN_USE`(이동·merge 0) · email 은 어디에도 쓰지 않는다.
 *  - 세션(토큰) 발급 0 · users 신설 0 · users.email/password/role 변경 0.
 */

import { GoogleAuthService } from '../google-auth.service.js';
import { GoogleIdTokenError, type VerifiedGoogleIdentity } from '../google-identity.service.js';
import {
  loadGoogleAdminBootstrapConfig,
  GOOGLE_ADMIN_BOOTSTRAP_ENABLED_ENV,
  GOOGLE_ADMIN_BOOTSTRAP_CODE_ENV,
  GOOGLE_ADMIN_BOOTSTRAP_MIN_CODE_LENGTH,
} from '../../../config/google-admin-bootstrap.config.js';
import { User } from '../../../entities/User.js';
import { LinkedAccount } from '../../../entities/LinkedAccount.js';
import { AccountActivity } from '../../../entities/AccountActivity.js';

const CODE = 'bootstrap-code-1234567890-abcdef';
const SUB_ADMIN = '333333333333333333333';
const SUB_OTHER = '444444444444444444444';
const ADMIN_ID = '00000000-0000-4000-8000-00000000ad01';
const TESTER_ID = '00000000-0000-4000-8000-00000000ad02';
const META = { ipAddress: '127.0.0.1', userAgent: 'jest' };

type Row = Record<string, any>;
type Store = { users: Row[]; linked: Row[]; activities: Row[]; roles: Row[] };

let seq = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;

function uniqueViolation() {
  const detail = 'Key (provider, "providerId")=(…) already exists.';
  return Object.assign(new Error('duplicate key'), {
    code: '23505', constraint: 'UQ_linked_accounts_provider_providerId', detail,
    driverError: { code: '23505', constraint: 'UQ_linked_accounts_provider_providerId', detail },
  });
}

const matches = (row: Row, where: Row) => Object.entries(where).every(([k, v]) => row[k] === v);

function repoFor(store: Store, entity: unknown) {
  const table: Row[] =
    entity === User ? store.users
    : entity === LinkedAccount ? store.linked
    : entity === AccountActivity ? store.activities
    : (() => { throw new Error(`unexpected repository: ${String(entity)}`); })();
  return {
    findOne: jest.fn(async ({ where }: { where: Row }) => table.find((r) => matches(r, where)) ?? null),
    create: jest.fn((data: Row) => (entity === User ? Object.assign(new User(), data) : { ...data })),
    save: jest.fn(async (row: Row) => {
      if (entity === LinkedAccount
        && table.some((r) => r !== row && r.provider === row.provider && r.providerId === row.providerId)) {
        throw uniqueViolation();
      }
      if (!row.id) row.id = uuid();
      if (!table.includes(row)) table.push(row);
      return row;
    }),
    update: jest.fn(async () => ({ affected: 1 })),
  };
}

/** role_assignments 는 entity 가 없어 raw query 로 읽는다 — fake 도 같은 계약(파라미터 바인딩)으로 답한다. */
function makeDataSource(store: Store) {
  const repos = new Map<unknown, ReturnType<typeof repoFor>>();
  const getRepository = (entity: unknown) => {
    if (!repos.has(entity)) repos.set(entity, repoFor(store, entity));
    return repos.get(entity)!;
  };
  const query = jest.fn(async (sql: string, params: unknown[] = []) => {
    if (/FROM role_assignments/i.test(sql)) {
      const role = params[0];
      const ids = store.roles.filter((r) => r.role === role && r.is_active).map((r) => r.user_id);
      return Array.from(new Set(ids)).map((user_id) => ({ user_id }));
    }
    throw new Error(`unexpected query: ${sql}`);
  });
  return {
    getRepository: jest.fn(getRepository),
    query,
    transaction: jest.fn(async (fn: (manager: any) => Promise<any>) => {
      const staged: Store = {
        users: [...store.users], linked: [...store.linked], activities: [...store.activities], roles: [...store.roles],
      };
      const stagedRepos = new Map<unknown, ReturnType<typeof repoFor>>();
      const manager = {
        getRepository: (entity: unknown) => {
          if (!stagedRepos.has(entity)) stagedRepos.set(entity, repoFor(staged, entity));
          return stagedRepos.get(entity)!;
        },
        query,
      };
      const result = await fn(manager);
      store.users.splice(0, store.users.length, ...staged.users);
      store.linked.splice(0, store.linked.length, ...staged.linked);
      return result;
    }),
  };
}

function identityFor(map: Record<string, Partial<VerifiedGoogleIdentity> | GoogleIdTokenError>) {
  return {
    verifyGoogleIdToken: jest.fn(async (idToken: string) => {
      const entry = map[idToken];
      if (!entry) throw new GoogleIdTokenError('SIGNATURE_INVALID');
      if (entry instanceof GoogleIdTokenError) throw entry;
      return {
        sub: SUB_ADMIN, audience: 'web', issuer: 'https://accounts.google.com',
        expiresAt: new Date(Date.now() + 3600_000), ...entry,
      } as VerifiedGoogleIdentity;
    }),
    findGoogleIdentityBySub: jest.fn(async () => null),
  };
}

describe('GoogleAdminBootstrap config — env 게이트', () => {
  const base = { [GOOGLE_ADMIN_BOOTSTRAP_ENABLED_ENV]: 'true', [GOOGLE_ADMIN_BOOTSTRAP_CODE_ENV]: CODE };

  it('플래그 true + 충분히 긴 코드일 때만 활성', () => {
    expect(loadGoogleAdminBootstrapConfig(base as any).isEnabled()).toBe(true);
    expect(loadGoogleAdminBootstrapConfig({} as any).isEnabled()).toBe(false);
    expect(loadGoogleAdminBootstrapConfig({ ...base, [GOOGLE_ADMIN_BOOTSTRAP_ENABLED_ENV]: 'TRUE' } as any).isEnabled()).toBe(false);
    expect(loadGoogleAdminBootstrapConfig({ ...base, [GOOGLE_ADMIN_BOOTSTRAP_ENABLED_ENV]: '1' } as any).isEnabled()).toBe(false);
    expect(loadGoogleAdminBootstrapConfig({ [GOOGLE_ADMIN_BOOTSTRAP_CODE_ENV]: CODE } as any).isEnabled()).toBe(false);
    // 짧은 코드는 활성화되지 않는다
    const short = 'x'.repeat(GOOGLE_ADMIN_BOOTSTRAP_MIN_CODE_LENGTH - 1);
    expect(loadGoogleAdminBootstrapConfig({ ...base, [GOOGLE_ADMIN_BOOTSTRAP_CODE_ENV]: short } as any).isEnabled()).toBe(false);
  });

  it('코드 비교는 정확 일치만 통과 — 부분 일치·빈 값·미설정 모두 false', () => {
    const cfg = loadGoogleAdminBootstrapConfig(base as any);
    expect(cfg.verifyCode(CODE)).toBe(true);
    expect(cfg.verifyCode(` ${CODE} `)).toBe(true); // 복사/붙여넣기 공백만 허용
    expect(cfg.verifyCode(CODE.slice(0, -1))).toBe(false);
    expect(cfg.verifyCode(`${CODE}x`)).toBe(false);
    expect(cfg.verifyCode('')).toBe(false);
    expect(cfg.verifyCode(undefined)).toBe(false);
    expect(loadGoogleAdminBootstrapConfig({} as any).verifyCode(CODE)).toBe(false);
  });
});

describe('GoogleAuthService.bootstrapAdminLink — 전환기 1회용 Admin 연결', () => {
  let store: Store;
  let ds: ReturnType<typeof makeDataSource>;
  let identity: ReturnType<typeof identityFor>;
  let svc: GoogleAuthService;

  const enabledGate = { isEnabled: () => true, verifyCode: (c: string | undefined) => c?.trim() === CODE };
  const disabledGate = { isEnabled: () => false, verifyCode: () => false };

  const build = (gate: typeof enabledGate | typeof disabledGate, map: Parameters<typeof identityFor>[0] = { 'tok-admin': { sub: SUB_ADMIN } }) => {
    identity = identityFor(map);
    svc = new GoogleAuthService({
      identity,
      dataSource: ds as any,
      adminBootstrap: gate,
      issueSession: async () => { throw new Error('bootstrap 은 세션을 발급하지 않는다'); },
      verifyPassword: async () => { throw new Error('bootstrap 은 비밀번호를 쓰지 않는다'); },
    });
  };

  beforeEach(() => {
    store = {
      users: [
        Object.assign(new User(), { id: ADMIN_ID, email: 'admin@example.test', password: '$2b$hash', name: null, status: 'active' }),
        Object.assign(new User(), { id: TESTER_ID, email: 'tester@example.test', password: null, name: null, status: 'active' }),
      ],
      linked: [],
      activities: [],
      roles: [{ user_id: ADMIN_ID, role: 'platform:super_admin', is_active: true }],
    };
    ds = makeDataSource(store);
  });

  it('성공 · 서버가 platform:super_admin 대상을 결정해 linked_accounts 1행 · users/권한/email 불변 · 세션 0', async () => {
    build(enabledGate);
    const before = { email: store.users[0].email, password: store.users[0].password };

    const result = await svc.bootstrapAdminLink({ idToken: 'tok-admin', bootstrapCode: CODE, ...META });

    expect(result).toEqual({ linked: true, userId: ADMIN_ID });
    expect(store.users).toHaveLength(2);
    expect(store.users[0].email).toBe(before.email);
    expect(store.users[0].password).toBe(before.password);
    expect(store.linked).toHaveLength(1);
    expect(store.linked[0]).toMatchObject({
      userId: ADMIN_ID, provider: 'google', providerId: SUB_ADMIN, isVerified: true, isPrimary: true,
    });
    expect(store.linked[0].email).toBeUndefined();
    expect(store.linked[0].displayName).toBeUndefined();
    // 대상 판정은 role 기반 parameterized query 로만 한다(email 조회 0)
    expect(ds.query).toHaveBeenCalledWith(expect.stringContaining('FROM role_assignments'), ['platform:super_admin']);
    await new Promise((r) => setImmediate(r));
    expect(store.activities.at(-1)).toMatchObject({
      type: 'link_google', email: null, success: true, details: { provider: 'google', reason: 'admin_bootstrap' },
    });
  });

  it('플래그/코드 미설정 → 404 GOOGLE_ADMIN_BOOTSTRAP_DISABLED · ID token 검증 0 · DB 접근 0', async () => {
    build(disabledGate);
    await expect(svc.bootstrapAdminLink({ idToken: 'tok-admin', bootstrapCode: CODE, ...META }))
      .rejects.toMatchObject({ code: 'GOOGLE_ADMIN_BOOTSTRAP_DISABLED', statusCode: 404 });
    expect(identity.verifyGoogleIdToken).not.toHaveBeenCalled();
    expect(ds.transaction).not.toHaveBeenCalled();
    expect(store.linked).toHaveLength(0);
  });

  it('코드 불일치 → 401 · ID token 검증 0 · DB 접근 0 · row 0', async () => {
    build(enabledGate);
    await expect(svc.bootstrapAdminLink({ idToken: 'tok-admin', bootstrapCode: 'wrong-code-wrong-code-wrong', ...META }))
      .rejects.toMatchObject({ code: 'GOOGLE_ADMIN_BOOTSTRAP_CODE_INVALID', statusCode: 401 });
    expect(identity.verifyGoogleIdToken).not.toHaveBeenCalled();
    expect(ds.transaction).not.toHaveBeenCalled();
    expect(store.linked).toHaveLength(0);
  });

  it('변조/만료 Google token → GOOGLE_ID_TOKEN_INVALID · row 0', async () => {
    build(enabledGate, { 'tok-bad': new GoogleIdTokenError('TOKEN_EXPIRED') });
    await expect(svc.bootstrapAdminLink({ idToken: 'tok-bad', bootstrapCode: CODE, ...META }))
      .rejects.toMatchObject({ code: 'GOOGLE_ID_TOKEN_INVALID' });
    expect(store.linked).toHaveLength(0);
  });

  it('1회성 · 대상에 이미 Google 연결 → 409 GOOGLE_ACCOUNT_ALREADY_LINKED, 교체/추가 0', async () => {
    build(enabledGate, { 'tok-admin': { sub: SUB_ADMIN }, 'tok-other': { sub: SUB_OTHER } });
    store.linked.push({ id: uuid(), userId: ADMIN_ID, provider: 'google', providerId: SUB_ADMIN });

    // 같은 sub 재시도도, 다른 sub 교체 시도도 모두 거절된다(연결 성공 후 경로 폐쇄).
    for (const tok of ['tok-admin', 'tok-other']) {
      await expect(svc.bootstrapAdminLink({ idToken: tok, bootstrapCode: CODE, ...META }))
        .rejects.toMatchObject({ code: 'GOOGLE_ACCOUNT_ALREADY_LINKED', statusCode: 409 });
    }
    expect(store.linked).toHaveLength(1);
    expect(store.linked[0].providerId).toBe(SUB_ADMIN);
  });

  it('그 sub 가 다른 user(테스트 계정)에 연결돼 있으면 → 409 GOOGLE_IDENTITY_IN_USE, 이동·merge 0', async () => {
    build(enabledGate);
    store.linked.push({ id: uuid(), userId: TESTER_ID, provider: 'google', providerId: SUB_ADMIN });

    await expect(svc.bootstrapAdminLink({ idToken: 'tok-admin', bootstrapCode: CODE, ...META }))
      .rejects.toMatchObject({ code: 'GOOGLE_IDENTITY_IN_USE', statusCode: 409 });
    expect(store.linked).toHaveLength(1);
    expect(store.linked[0].userId).toBe(TESTER_ID);
  });

  it('INSERT race(unique 충돌) → GOOGLE_IDENTITY_IN_USE · 부분 row 0', async () => {
    build(enabledGate);
    const original = ds.transaction.getMockImplementation()!;
    ds.transaction.mockImplementationOnce(async (fn: any) => original(async (manager: any) => {
      const repo = manager.getRepository(LinkedAccount);
      repo.save.mockImplementationOnce(async () => { throw uniqueViolation(); });
      return fn(manager);
    }));

    await expect(svc.bootstrapAdminLink({ idToken: 'tok-admin', bootstrapCode: CODE, ...META }))
      .rejects.toMatchObject({ code: 'GOOGLE_IDENTITY_IN_USE' });
    expect(store.linked).toHaveLength(0);
  });

  it.each([
    ['보유자 0명', [] as Row[]],
    ['보유자 2명', [
      { user_id: ADMIN_ID, role: 'platform:super_admin', is_active: true },
      { user_id: TESTER_ID, role: 'platform:super_admin', is_active: true },
    ]],
  ])('대상이 유일하지 않으면(%s) → 409 ADMIN_TARGET_AMBIGUOUS · row 0', async (_label, roles) => {
    store.roles = roles;
    build(enabledGate);
    await expect(svc.bootstrapAdminLink({ idToken: 'tok-admin', bootstrapCode: CODE, ...META }))
      .rejects.toMatchObject({ code: 'ADMIN_TARGET_AMBIGUOUS', statusCode: 409 });
    expect(store.linked).toHaveLength(0);
  });

  it('비활성 role assignment 는 대상이 아니다(is_active=false → 보유자 0)', async () => {
    store.roles = [{ user_id: ADMIN_ID, role: 'platform:super_admin', is_active: false }];
    build(enabledGate);
    await expect(svc.bootstrapAdminLink({ idToken: 'tok-admin', bootstrapCode: CODE, ...META }))
      .rejects.toMatchObject({ code: 'ADMIN_TARGET_AMBIGUOUS' });
    expect(store.linked).toHaveLength(0);
  });

  it('입력 계약: userId/email/sub 를 받지 않는다 — idToken + bootstrapCode(+meta) 뿐', () => {
    const input: Parameters<GoogleAuthService['bootstrapAdminLink']>[0] = {
      idToken: 't', bootstrapCode: CODE, ...META,
    };
    expect(Object.keys(input).sort()).toEqual(['bootstrapCode', 'idToken', 'ipAddress', 'userAgent']);
  });
});
