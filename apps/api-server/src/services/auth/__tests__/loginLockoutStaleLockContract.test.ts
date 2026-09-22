/**
 * WO-O4O-GOOGLE-IDENTITY-OPERATOR-EXPLICIT-LINK-V1 — 로그인 잠금(lockout) 계약
 *
 * 결함(2026-09-22 프로덕션 실측): lockedUntil 이 만료돼도 loginAttempts(≥5) 가 남아
 * 만료 후 첫 실패 1회가 곧바로 6회째 → 다시 30분 잠금. "잠금 만료 ≠ 실패 횟수 초기화".
 *
 * 고정하는 계약:
 *  1) lockedUntil 이 미래 → ACCOUNT_LOCKED (비밀번호 비교 전 · 카운터 불변)
 *  2) lockedUntil 이 과거(stale) + 올바른 비밀번호 → 정상화(0/NULL) 후 로그인 성공
 *  3) lockedUntil 이 과거(stale) + 틀린 비밀번호 → 정상화 후 실패 1회로 계수(재잠금 아님)
 *  4) 5회 실패 → lockedUntil ≈ now+30분 (종전 유지)
 *  5) 성공 로그인 → loginAttempts=0 · lockedUntil=NULL (종전 유지)
 *
 * 실제 `AuthLoginService.login` 을 태운다. bcrypt 는 mock 하지 않는다.
 */

import { hashPassword } from '../../../utils/auth.utils.js';

const findOneMock = { user: jest.fn(), linked: jest.fn() };
const userSaveMock = jest.fn(async (u: any) => u);

jest.mock('../../../database/connection.js', () => ({
  AppDataSource: {
    getRepository: jest.fn((entity: any) => {
      const name = typeof entity === 'string' ? entity : entity?.name;
      switch (name) {
        case 'User':
          return { findOne: findOneMock.user, save: userSaveMock };
        case 'LinkedAccount':
          return { findOne: findOneMock.linked, save: jest.fn(async (a: any) => a) };
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

const EMAIL = 'lockout@example.test';
const PW = 'LockoutPw12345!';
const MIN = 60 * 1000;

let user: any;

const service = new AuthLoginService();

/** users 행 흉내 — 실제 entity 의 isLocked getter 와 동일 의미 */
const makeUser = (hash: string, loginAttempts: number, lockedUntil: Date | null) => ({
  id: 'u-lock',
  email: EMAIL,
  password: hash,
  status: 'active',
  isEmailVerified: true,
  loginAttempts,
  lockedUntil,
  get isLocked() {
    return !!(this.lockedUntil && this.lockedUntil > new Date());
  },
  linkedAccounts: [],
  toPublicData: () => ({ id: 'u-lock', email: EMAIL }),
});

const login = (password: string) =>
  service.login({
    provider: 'email',
    credentials: { email: EMAIL, password },
    ipAddress: '127.0.0.1',
    userAgent: 'jest',
  } as any);

describe('로그인 잠금 — stale lock 정상화 계약', () => {
  jest.setTimeout(60_000);
  let hash: string;

  beforeAll(async () => {
    hash = await hashPassword(PW);
    findOneMock.user.mockImplementation(async () => user);
    findOneMock.linked.mockResolvedValue(null);
  });

  beforeEach(() => {
    userSaveMock.mockClear();
  });

  it('1) lockedUntil 이 미래 → ACCOUNT_LOCKED · 비밀번호가 맞아도 차단 · 카운터 불변', async () => {
    user = makeUser(hash, 5, new Date(Date.now() + 10 * MIN));
    await expect(login(PW)).rejects.toMatchObject({ code: 'ACCOUNT_LOCKED' });
    expect(user.loginAttempts).toBe(5);
    expect(user.lockedUntil).not.toBeNull();
    expect(userSaveMock).not.toHaveBeenCalled();
  });

  it('2) lockedUntil 이 과거(stale) + 올바른 비밀번호 → 정상화 후 로그인 성공', async () => {
    user = makeUser(hash, 5, new Date(Date.now() - 1 * MIN));
    await expect(login(PW)).resolves.toMatchObject({ success: true });
    expect(user.loginAttempts).toBe(0);
    expect(user.lockedUntil).toBeNull();
  });

  it('3) lockedUntil 이 과거(stale) + 틀린 비밀번호 → 실패 1회로 계수 · 재잠금 아님', async () => {
    user = makeUser(hash, 5, new Date(Date.now() - 1 * MIN));
    await expect(login('wrong-password')).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    expect(user.loginAttempts).toBe(1);
    expect(user.lockedUntil).toBeNull();
  });

  it('3-b) 종전 결함 재현 방지: stale lock 상태(5회 잔존)에서 실패해도 6회·재잠금이 되지 않는다', async () => {
    user = makeUser(hash, 7, new Date(Date.now() - 45 * MIN));
    await expect(login('wrong-password')).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    expect(user.loginAttempts).toBe(1);
    expect(user.lockedUntil).toBeNull();
  });

  it('4) 5회 실패 → 30분 잠금 (종전 유지)', async () => {
    user = makeUser(hash, 4, null);
    const before = Date.now();
    await expect(login('wrong-password')).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    expect(user.loginAttempts).toBe(5);
    expect(user.lockedUntil).toBeInstanceOf(Date);
    const delta = user.lockedUntil.getTime() - before;
    expect(delta).toBeGreaterThanOrEqual(29 * MIN);
    expect(delta).toBeLessThanOrEqual(31 * MIN);
    // 잠금 직후 재시도는 ACCOUNT_LOCKED (카운터 그대로)
    await expect(login(PW)).rejects.toMatchObject({ code: 'ACCOUNT_LOCKED' });
    expect(user.loginAttempts).toBe(5);
  });

  it('5) 성공 로그인 → loginAttempts=0 · lockedUntil=NULL (종전 유지)', async () => {
    user = makeUser(hash, 3, null);
    await expect(login(PW)).resolves.toMatchObject({ success: true });
    expect(user.loginAttempts).toBe(0);
    expect(user.lockedUntil).toBeNull();
  });
});
