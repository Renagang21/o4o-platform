/**
 * WO-O4O-KPA-OPERATOR-SERVICE-CREDENTIAL-INTEGRITY-AUDIT-AND-RECOVERY-V1
 *
 * KPA operator 계정이 `serviceKey='kpa-society'` 로만 401 `INVALID_CREDENTIALS` 였던 건의
 * **정상 계약**을 실제 로그인 서비스로 고정한다 (재현 아님 — 계약 고정).
 *
 * 고정하는 사실:
 *  1) credential 조회 key 는 요청의 serviceKey **문자열 그대로**다. canonicalization 없음.
 *     → `kpa` 는 membership 이 없으므로 `SERVICE_NOT_MEMBER`, `kpa-society` 만 credential 을 찾는다.
 *  2) KPA credential 이 있으면 그 해시로만 검증한다. users.password 로는 KPA 에 로그인할 수 없다.
 *  3) KPA credential 이 다른 비밀번호로 바뀌어도 k-cosmetics / glycopharm / serviceKey 없는
 *     로그인은 영향을 받지 않는다. → **서비스별 비밀번호 차이는 결함이 아니다.**
 *  4) credential 이 없는 서비스는 users.password 로 fallback 한다 (Phase 1 G-B No Backfill).
 *
 * 실제 `AuthLoginService.handleEmailLogin` 을 태운다. bcrypt 는 mock 하지 않는다.
 */

import { hashPassword } from '../../../utils/auth.utils.js';

const findOneMock = {
  user: jest.fn(),
  linked: jest.fn(),
  membership: jest.fn(),
  credential: jest.fn(),
};

jest.mock('../../../database/connection.js', () => ({
  AppDataSource: {
    getRepository: jest.fn((entity: any) => {
      const name = typeof entity === 'string' ? entity : entity?.name;
      switch (name) {
        case 'User':
          return { findOne: findOneMock.user, save: jest.fn(async (u: any) => u) };
        case 'LinkedAccount':
          return { findOne: findOneMock.linked, save: jest.fn(async (a: any) => a) };
        case 'ServiceMembership':
          return { findOne: findOneMock.membership };
        case 'ServiceCredential':
          return { findOne: findOneMock.credential };
        case 'AccountActivity':
          return { create: jest.fn((x: any) => x), save: jest.fn(async (x: any) => x) };
        default:
          return { findOne: jest.fn(), save: jest.fn(), create: jest.fn() };
      }
    }),
  },
}));

jest.mock('@o4o/action-log-core', () => ({
  ActionLogService: class {
    logSuccess = jest.fn(async () => undefined);
    logFailure = jest.fn(async () => undefined);
  },
}));

jest.mock('../../LoginSecurityService.js', () => ({
  LoginSecurityService: { isLoginAllowed: jest.fn(async () => ({ allowed: true })) },
}));

jest.mock('../../account-linking.service.js', () => ({
  AccountLinkingService: { getMergedProfile: jest.fn(async () => ({ linkedAccounts: [] })) },
}));

jest.mock('../../../modules/auth/services/role-assignment.service.js', () => ({
  roleAssignmentService: { hasAnyRole: jest.fn(async () => false) },
}));

jest.mock('../auth-context.helper.js', () => ({
  generateTokensWithContext: jest.fn(async () => ({
    tokens: { accessToken: 'a', refreshToken: 'r', expiresIn: 900 },
    roles: [],
    memberships: [],
  })),
  persistRefreshTokenFamily: jest.fn(async () => undefined),
  injectRolesIntoPublicData: jest.fn(),
}));

import { AuthLoginService } from '../auth-login.service.js';

const EMAIL = 'operator@example.test';
const PLATFORM_PW = 'PlatformPw12345!';
const KPA_PW_NEW = 'KpaResetPw98765!';
const KCOS_PW = 'KcosPw12345!';

/** service_credentials 를 흉내내는 in-memory 맵 — key 는 serviceKey 문자열 그대로 */
let credentials: Record<string, string> = {};
/** service_memberships 의 serviceKey 집합 */
let memberships: Set<string> = new Set();

const service = new AuthLoginService();

const login = (serviceKey: string | undefined, password: string) =>
  service.login({
    provider: 'email',
    credentials: { email: EMAIL, password, ...(serviceKey && { serviceKey }) },
    ipAddress: '127.0.0.1',
    userAgent: 'jest',
  } as any);

const expectCode = async (p: Promise<unknown>, code: string) => {
  await expect(p).rejects.toMatchObject({ code });
};

describe('KPA operator service credential — 로그인 계약', () => {
  jest.setTimeout(60_000);

  beforeAll(async () => {
    const usersPasswordHash = await hashPassword(PLATFORM_PW);
    const kpaHash = await hashPassword(KPA_PW_NEW);
    const kcosHash = await hashPassword(KCOS_PW);

    credentials = { 'kpa-society': kpaHash, 'k-cosmetics': kcosHash };
    memberships = new Set(['kpa-society', 'k-cosmetics', 'glycopharm']);

    findOneMock.user.mockImplementation(async () => ({
      id: 'u-1',
      email: EMAIL,
      password: usersPasswordHash,
      status: 'active',
      isEmailVerified: true,
      isLocked: false,
      lockedUntil: null,
      loginAttempts: 0,
      linkedAccounts: [],
      toPublicData: () => ({ id: 'u-1', email: EMAIL }),
    }));
    findOneMock.linked.mockResolvedValue(null);
    findOneMock.membership.mockImplementation(async (opts: any) =>
      memberships.has(opts.where.serviceKey) ? { serviceKey: opts.where.serviceKey } : null,
    );
    findOneMock.credential.mockImplementation(async (opts: any) => {
      const hash = credentials[opts.where.serviceKey];
      return hash ? { serviceKey: opts.where.serviceKey, passwordHash: hash } : null;
    });
  });

  beforeEach(() => {
    findOneMock.membership.mockClear();
    findOneMock.credential.mockClear();
  });

  it('kpa-society — 해당 서비스 credential 비밀번호로 로그인 성공', async () => {
    await expect(login('kpa-society', KPA_PW_NEW)).resolves.toMatchObject({ success: true });
  });

  it('kpa-society — 다른 비밀번호(users.password 포함)는 401 INVALID_CREDENTIALS', async () => {
    await expectCode(login('kpa-society', PLATFORM_PW), 'INVALID_CREDENTIALS');
    await expectCode(login('kpa-society', KCOS_PW), 'INVALID_CREDENTIALS');
  });

  it('credential 조회 key 는 요청 serviceKey 문자열 그대로다 (canonicalization 없음)', async () => {
    await login('kpa-society', KPA_PW_NEW);
    expect(findOneMock.credential).toHaveBeenCalledWith({
      where: { userId: 'u-1', serviceKey: 'kpa-society' },
    });
  });

  it('kpa — membership 축(kpa-society)과 달라 SERVICE_NOT_MEMBER · credential 조회 자체가 없다', async () => {
    await expectCode(login('kpa', KPA_PW_NEW), 'SERVICE_NOT_MEMBER');
    expect(findOneMock.credential).not.toHaveBeenCalled();
  });

  it('KPA 비밀번호가 달라도 k-cosmetics 는 자기 credential 로 정상 로그인한다', async () => {
    await expect(login('k-cosmetics', KCOS_PW)).resolves.toMatchObject({ success: true });
    await expectCode(login('k-cosmetics', KPA_PW_NEW), 'INVALID_CREDENTIALS');
  });

  it('credential 없는 서비스(glycopharm)는 users.password 로 fallback 한다', async () => {
    await expect(login('glycopharm', PLATFORM_PW)).resolves.toMatchObject({ success: true });
  });

  it('serviceKey 없는 로그인은 users.password 로 판정한다 (credential 조회 없음)', async () => {
    await expect(login(undefined, PLATFORM_PW)).resolves.toMatchObject({ success: true });
    expect(findOneMock.credential).not.toHaveBeenCalled();
    await expectCode(login(undefined, KPA_PW_NEW), 'INVALID_CREDENTIALS');
  });

  it('membership 이 없으면 credential 이 있어도 SERVICE_NOT_MEMBER 가 먼저다', async () => {
    memberships.delete('kpa-society');
    try {
      await expectCode(login('kpa-society', KPA_PW_NEW), 'SERVICE_NOT_MEMBER');
      expect(findOneMock.credential).not.toHaveBeenCalled();
    } finally {
      memberships.add('kpa-society');
    }
  });
});
