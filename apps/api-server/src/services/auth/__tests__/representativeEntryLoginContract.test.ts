/**
 * WO-O4O-NETURE-UNIFIED-ENTRY-UI-PHASE1-V1 — O4O 대표 진입(neture) 로그인 계약
 *
 * neture.co.kr 은 O4O 대표 홈이다. 다른 O4O 서비스 회원이 Neture membership 없이도
 * 대표 홈에 로그인할 수 있어야 하되, 그 예외는 **로그인 허용**에만 관여한다.
 *
 * 고정하는 사실:
 *  1) neture membership 없음 + 다른 서비스 membership 있음 → serviceKey=neture 로그인 성공
 *     (비밀번호는 identity password = users.password 로 검증 — 비밀번호 복사·저장 없음)
 *  2) 1) 의 상황에서 다른 서비스의 **서비스 전용 비밀번호**는 neture 로그인에 쓰이지 않는다
 *     (neture credential 이 없으므로 users.password 만 유효)
 *  3) 아무 서비스 membership 도 없음 → SERVICE_NOT_MEMBER (예외 미적용)
 *  4) 다른 서비스 membership 이 pending/withdrawn 이어도 row 가 있으면 대표 홈 로그인은 허용
 *     (일반 서비스 로그인의 "row 존재" 규칙과 동일 — 접근 차단은 각 서비스 guard 가 담당)
 *  5) 예외는 neture 에만 적용 — neture 만 가입된 계정이 kpa-society 로 로그인하면 여전히
 *     SERVICE_NOT_MEMBER
 *  6) 예외 경로에서도 membership · role 을 생성·부여하지 않는다 (save/assign 호출 0)
 *
 * 실제 `AuthLoginService.login` 을 태운다. bcrypt 는 mock 하지 않는다.
 */

import { hashPassword } from '../../../utils/auth.utils.js';

const findOneMock = {
  user: jest.fn(),
  linked: jest.fn(),
  membership: jest.fn(),
  credential: jest.fn(),
};
const membershipSaveMock = jest.fn();

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
          return { findOne: findOneMock.membership, save: membershipSaveMock, create: jest.fn() };
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

const assignRoleMock = jest.fn();
jest.mock('../../../modules/auth/services/role-assignment.service.js', () => ({
  roleAssignmentService: { hasAnyRole: jest.fn(async () => false), assignRole: assignRoleMock },
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

const EMAIL = 'other-service-member@example.test';
const IDENTITY_PW = 'IdentityPw12345!';
const KPA_SERVICE_PW = 'KpaServicePw12345!';

/** service_credentials 흉내 — serviceKey → hash */
let credentials: Record<string, string> = {};
/** service_memberships 흉내 — serviceKey → status (row 없음 = 키 부재) */
let memberships: Record<string, string> = {};

const service = new AuthLoginService();

const login = (serviceKey: string, password: string) =>
  service.login({
    provider: 'email',
    credentials: { email: EMAIL, password, serviceKey },
    ipAddress: '127.0.0.1',
    userAgent: 'jest',
  } as any);

const expectCode = async (p: Promise<unknown>, code: string) => {
  await expect(p).rejects.toMatchObject({ code });
};

describe('O4O 대표 진입(neture) 로그인 계약', () => {
  jest.setTimeout(60_000);

  beforeAll(async () => {
    const usersHash = await hashPassword(IDENTITY_PW);
    credentials = { 'kpa-society': await hashPassword(KPA_SERVICE_PW) };

    findOneMock.user.mockImplementation(async () => ({
      id: 'u-1',
      email: EMAIL,
      password: usersHash,
      status: 'active',
      isEmailVerified: true,
      isLocked: false,
      lockedUntil: null,
      loginAttempts: 0,
      linkedAccounts: [],
      toPublicData: () => ({ id: 'u-1', email: EMAIL }),
    }));
    findOneMock.linked.mockResolvedValue(null);
    // where.serviceKey 가 있으면 해당 row, 없으면(= "아무 서비스든") 첫 row
    findOneMock.membership.mockImplementation(async (opts: any) => {
      const key = opts?.where?.serviceKey;
      if (key !== undefined) {
        const status = memberships[key];
        return status ? { serviceKey: key, status } : null;
      }
      const [anyKey] = Object.keys(memberships);
      return anyKey ? { serviceKey: anyKey, status: memberships[anyKey] } : null;
    });
    findOneMock.credential.mockImplementation(async (opts: any) => {
      const hash = credentials[opts.where.serviceKey];
      return hash ? { serviceKey: opts.where.serviceKey, passwordHash: hash } : null;
    });
  });

  beforeEach(() => {
    memberships = { 'kpa-society': 'active' };
    findOneMock.membership.mockClear();
    findOneMock.credential.mockClear();
    membershipSaveMock.mockClear();
    assignRoleMock.mockClear();
  });

  it('1) neture membership 없음 + kpa-society 회원 → neture 로그인 성공 (identity password)', async () => {
    await expect(login('neture', IDENTITY_PW)).resolves.toMatchObject({ success: true });
  });

  it('2) 다른 서비스 전용 비밀번호는 neture 로그인에 쓰이지 않는다', async () => {
    await expectCode(login('neture', KPA_SERVICE_PW), 'INVALID_CREDENTIALS');
    // neture credential 조회는 하되 kpa-society credential 은 조회하지 않는다
    const credKeys = findOneMock.credential.mock.calls.map((c: any[]) => c[0]?.where?.serviceKey);
    expect(credKeys).toEqual(['neture']);
  });

  it('3) 아무 서비스 membership 도 없음 → SERVICE_NOT_MEMBER', async () => {
    memberships = {};
    await expectCode(login('neture', IDENTITY_PW), 'SERVICE_NOT_MEMBER');
    expect(findOneMock.credential).not.toHaveBeenCalled();
  });

  it('4) 다른 서비스 membership 이 pending / withdrawn 이어도 row 가 있으면 대표 홈 로그인 허용', async () => {
    memberships = { 'pharmacy-hub': 'pending' };
    await expect(login('neture', IDENTITY_PW)).resolves.toMatchObject({ success: true });
    memberships = { 'k-cosmetics': 'withdrawn' };
    await expect(login('neture', IDENTITY_PW)).resolves.toMatchObject({ success: true });
  });

  it('5) 예외는 neture 에만 적용 — neture 만 가입된 계정의 kpa-society 로그인은 SERVICE_NOT_MEMBER', async () => {
    memberships = { neture: 'active' };
    await expectCode(login('kpa-society', IDENTITY_PW), 'SERVICE_NOT_MEMBER');
  });

  it('6) 예외 경로에서 membership · role 을 생성·부여하지 않는다', async () => {
    await expect(login('neture', IDENTITY_PW)).resolves.toMatchObject({ success: true });
    expect(membershipSaveMock).not.toHaveBeenCalled();
    expect(assignRoleMock).not.toHaveBeenCalled();
  });
});
