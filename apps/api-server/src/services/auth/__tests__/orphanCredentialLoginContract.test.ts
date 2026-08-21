/**
 * WO-O4O-SERVICE-CREDENTIAL-ORPHAN-LIFECYCLE-INTEGRITY-AUDIT-V1 §7 · §12
 *
 * "membership 없이 남은 service_credentials(orphan)" 가 로그인에 미치는 영향을 계약으로 고정한다.
 *
 * 고정하는 사실:
 *  1) active membership + credential      → 로그인 성공
 *  2) membership row 없음 + credential 잔존 → `SERVICE_NOT_MEMBER` (credential 조회조차 하지 않는다)
 *  3) users.status='deleted' + credential  → 비밀번호가 맞아도 `ACCOUNT_NOT_ACTIVE` (fail-closed)
 *  4) 비활성 membership(withdrawn) + credential → **로그인 토큰은 발급된다.**
 *     서비스 접근 차단은 membership guard(=MEMBERSHIP_NOT_ACTIVE 403) 가 담당한다.
 *     이는 withdraw 가 users.status 를 바꾸지 않는 canonical 설계의 결과다.
 *  5) 서비스 A 의 credential 을 폐기해도 서비스 B 로그인은 영향이 없다 (교차 영향 0).
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
import { createMembershipScopeGuard } from '../../../common/middleware/membership-guard.middleware.js';

const EMAIL = 'withdrawn@example.test';
const KPA_PW = 'KpaOrphanPw12345!';
const KCOS_PW = 'KcosPw12345!';
const PLATFORM_PW = 'PlatformPw12345!';

/** service_credentials 흉내 — serviceKey → hash */
let credentials: Record<string, string> = {};
/** service_memberships 흉내 — serviceKey → status (row 없음 = 키 부재) */
let memberships: Record<string, string> = {};
let userStatus = 'active';

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

describe('orphan service_credentials — 로그인 계약', () => {
  jest.setTimeout(60_000);

  beforeAll(async () => {
    const usersHash = await hashPassword(PLATFORM_PW);
    credentials = {
      'kpa-society': await hashPassword(KPA_PW),
      'k-cosmetics': await hashPassword(KCOS_PW),
    };

    findOneMock.user.mockImplementation(async () => ({
      id: 'u-1',
      email: EMAIL,
      password: usersHash,
      status: userStatus,
      isEmailVerified: true,
      isLocked: false,
      lockedUntil: null,
      loginAttempts: 0,
      linkedAccounts: [],
      toPublicData: () => ({ id: 'u-1', email: EMAIL }),
    }));
    findOneMock.linked.mockResolvedValue(null);
    findOneMock.membership.mockImplementation(async (opts: any) => {
      const status = memberships[opts.where.serviceKey];
      return status ? { serviceKey: opts.where.serviceKey, status } : null;
    });
    findOneMock.credential.mockImplementation(async (opts: any) => {
      const hash = credentials[opts.where.serviceKey];
      return hash ? { serviceKey: opts.where.serviceKey, passwordHash: hash } : null;
    });
  });

  beforeEach(() => {
    userStatus = 'active';
    memberships = { 'kpa-society': 'active', 'k-cosmetics': 'active' };
    findOneMock.membership.mockClear();
    findOneMock.credential.mockClear();
  });

  it('1) active membership + credential → 로그인 성공', async () => {
    await expect(login('kpa-society', KPA_PW)).resolves.toMatchObject({ success: true });
  });

  it('2) membership row 없음 + credential 잔존(orphan) → SERVICE_NOT_MEMBER · credential 조회 없음', async () => {
    delete memberships['kpa-society'];
    await expectCode(login('kpa-society', KPA_PW), 'SERVICE_NOT_MEMBER');
    expect(findOneMock.credential).not.toHaveBeenCalled();
  });

  it('3) users.status=deleted + credential → 비밀번호가 맞아도 ACCOUNT_NOT_ACTIVE (fail-closed)', async () => {
    userStatus = 'deleted';
    await expect(login('kpa-society', KPA_PW)).rejects.toThrow();
    await expectCode(login('kpa-society', KPA_PW), 'ACCOUNT_NOT_ACTIVE');
  });

  it('4) withdrawn membership + credential → 로그인 토큰은 발급된다 (차단은 membership guard 담당)', async () => {
    memberships['kpa-society'] = 'withdrawn';
    await expect(login('kpa-society', KPA_PW)).resolves.toMatchObject({ success: true });
  });

  it('4-b) withdrawn membership 은 membership guard 에서 403 MEMBERSHIP_NOT_ACTIVE 로 차단된다', () => {
    const guard = createMembershipScopeGuard({
      serviceKey: 'kpa',
      platformBypass: false,
    } as any)('kpa:member');

    const json = jest.fn();
    const res: any = { status: jest.fn(() => ({ json })) };
    const next = jest.fn();

    guard(
      { user: { id: 'u-1', roles: [], memberships: [{ serviceKey: 'kpa-society', status: 'withdrawn' }] } } as any,
      res,
      next,
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: 'MEMBERSHIP_NOT_ACTIVE' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('4-c) membership row 자체가 없으면 guard 는 MEMBERSHIP_NOT_FOUND 로 차단한다', () => {
    const guard = createMembershipScopeGuard({
      serviceKey: 'kpa',
      platformBypass: false,
    } as any)('kpa:member');

    const json = jest.fn();
    const res: any = { status: jest.fn(() => ({ json })) };
    const next = jest.fn();

    guard({ user: { id: 'u-1', roles: [], memberships: [] } } as any, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: 'MEMBERSHIP_NOT_FOUND' }));
  });

  it('5) 서비스 A credential 폐기(hard delete) 후에도 서비스 B 로그인은 그대로다', async () => {
    const kpaHash = credentials['kpa-society'];
    delete credentials['kpa-society'];
    delete memberships['kpa-society'];

    await expectCode(login('kpa-society', KPA_PW), 'SERVICE_NOT_MEMBER');
    await expect(login('k-cosmetics', KCOS_PW)).resolves.toMatchObject({ success: true });

    credentials['kpa-society'] = kpaHash;
  });

  it('6) credential 이 폐기된 서비스에 membership 만 다시 만들면 과거 비밀번호는 부활하지 않는다', async () => {
    // hard delete 로 credential 이 사라진 상태에서 membership 만 재생성된 상황
    const kpaHash = credentials['kpa-society'];
    delete credentials['kpa-society'];
    memberships['kpa-society'] = 'active';

    // credential 이 없으므로 users.password(L1) fallback 이며, 과거 서비스 비밀번호는 실패한다
    await expectCode(login('kpa-society', KPA_PW), 'INVALID_CREDENTIALS');

    credentials['kpa-society'] = kpaHash;
  });
});
