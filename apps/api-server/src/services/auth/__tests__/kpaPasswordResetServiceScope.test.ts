/**
 * WO-O4O-KPA-OPERATOR-SERVICE-CREDENTIAL-INTEGRITY-AUDIT-AND-RECOVERY-V1 §14/§15
 *
 * 비밀번호 재설정 write 경로가 서비스 축을 벗어나지 않는지 고정한다.
 *   - token.serviceKey='kpa-society' → service_credentials(kpa-society) 만 upsert
 *   - users.password 는 건드리지 않는다 (legacy fallback 보존)
 *   - 다른 서비스(k-cosmetics / glycopharm) credential 은 write 대상이 아니다
 *   - token.serviceKey 없음 → users.password (V1 fallback)
 *   - 다른 서비스 토큰 재사용 거부
 */

const upsertMock = jest.fn(async () => undefined);
const userSaveMock = jest.fn(async (u: any) => u);
const tokenSaveMock = jest.fn(async (t: any) => t);
const tokenFindOneMock = jest.fn();

jest.mock('../../../database/connection.js', () => ({
  AppDataSource: {
    getRepository: jest.fn((entity: any) => {
      const name = typeof entity === 'string' ? entity : entity?.name;
      switch (name) {
        case 'User':
          return { findOne: jest.fn(), save: userSaveMock };
        case 'PasswordResetToken':
          return { findOne: tokenFindOneMock, save: tokenSaveMock };
        case 'ServiceCredential':
          return { upsert: upsertMock };
        default:
          return { findOne: jest.fn(), save: jest.fn(), upsert: jest.fn() };
      }
    }),
    query: jest.fn(async () => []),
  },
}));

jest.mock('../../email.service.js', () => ({ emailService: { sendEmail: jest.fn(async () => true) } }));

import crypto from 'crypto';
import { PasswordResetService } from '../../passwordResetService.js';

const RAW_TOKEN = 'raw-reset-token';
const HASHED = crypto.createHash('sha256').update(RAW_TOKEN).digest('hex');

function makeToken(serviceKey: string | null) {
  return {
    token: HASHED,
    userId: 'u-1',
    serviceKey,
    usedAt: null as Date | null,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    user: {
      id: 'u-1',
      email: 'op@example.com',
      password: 'LEGACY_USERS_PASSWORD_HASH',
      loginAttempts: 3,
      lockedUntil: new Date(),
    },
  };
}

describe('KPA 비밀번호 재설정 — 서비스 축 격리 계약', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('kpa-society 토큰은 service_credentials(kpa-society) 만 upsert 한다', async () => {
    const token = makeToken('kpa-society');
    tokenFindOneMock.mockResolvedValue(token);

    await PasswordResetService.resetPassword(RAW_TOKEN, 'NewPassw0rd!', 'kpa-society');

    expect(upsertMock).toHaveBeenCalledTimes(1);
    const [payload, conflictKeys] = upsertMock.mock.calls[0] as any[];
    expect(payload.userId).toBe('u-1');
    expect(payload.serviceKey).toBe('kpa-society');
    expect(typeof payload.passwordHash).toBe('string');
    expect(payload.passwordHash).not.toBe('NewPassw0rd!'); // 평문 저장 금지
    expect(conflictKeys).toEqual(['userId', 'serviceKey']);
  });

  it('kpa-society 재설정은 users.password 를 덮어쓰지 않는다', async () => {
    const token = makeToken('kpa-society');
    tokenFindOneMock.mockResolvedValue(token);

    await PasswordResetService.resetPassword(RAW_TOKEN, 'NewPassw0rd!', 'kpa-society');

    expect(token.user.password).toBe('LEGACY_USERS_PASSWORD_HASH');
    // lockout 은 user-global 이므로 함께 해제된다
    expect(token.user.loginAttempts).toBe(0);
    expect(token.user.lockedUntil).toBeNull();
    expect(userSaveMock).toHaveBeenCalled();
  });

  it('kpa-society 재설정은 다른 서비스 credential 을 write 하지 않는다', async () => {
    tokenFindOneMock.mockResolvedValue(makeToken('kpa-society'));

    await PasswordResetService.resetPassword(RAW_TOKEN, 'NewPassw0rd!', 'kpa-society');

    const writtenKeys = upsertMock.mock.calls.map((c: any[]) => c[0].serviceKey);
    expect(writtenKeys).toEqual(['kpa-society']);
    expect(writtenKeys).not.toContain('k-cosmetics');
    expect(writtenKeys).not.toContain('glycopharm');
  });

  it('serviceKey 없는 토큰은 users.password (V1 fallback) 로 쓴다', async () => {
    const token = makeToken(null);
    tokenFindOneMock.mockResolvedValue(token);

    await PasswordResetService.resetPassword(RAW_TOKEN, 'NewPassw0rd!');

    expect(upsertMock).not.toHaveBeenCalled();
    expect(token.user.password).not.toBe('LEGACY_USERS_PASSWORD_HASH');
    expect(token.user.password).not.toBe('NewPassw0rd!');
  });

  it('다른 서비스 토큰 재사용은 거부한다 (credential write 0)', async () => {
    tokenFindOneMock.mockResolvedValue(makeToken('k-cosmetics'));

    await expect(
      PasswordResetService.resetPassword(RAW_TOKEN, 'NewPassw0rd!', 'kpa-society'),
    ).rejects.toThrow('Invalid or expired reset token');

    expect(upsertMock).not.toHaveBeenCalled();
    expect(userSaveMock).not.toHaveBeenCalled();
  });
});
