import { AuthTokenSessionService } from '../auth-token-session.service.js';
import * as tokenUtils from '../../../utils/token.utils.js';
import { freshenUserContext } from '../auth-context.helper.js';
import { isBrowserSessionLive } from '../browser-session.service.js';
import type { RefreshTokenPayload } from '../../../types/auth.js';
import type { User } from '../../../entities/User.js';

jest.mock('../../../utils/token.utils.js', () => ({
  verifyRefreshToken: jest.fn(), isTokenExpired: jest.fn(), generateTokens: jest.fn(),
}));
jest.mock('../auth-context.helper.js', () => ({ freshenUserContext: jest.fn() }));
jest.mock('../browser-session.service.js', () => ({ isBrowserSessionLive: jest.fn(), revokeBrowserSession: jest.fn() }));

describe('refresh validation precedence and effects', () => {
  let payload: RefreshTokenPayload | null;
  let account: User | null;
  let expired: boolean;
  let browserLive: boolean;
  let roles: string[];
  let calls: string[];
  let findOne: jest.Mock;
  const query = jest.fn();
  let service: AuthTokenSessionService;
  beforeEach(() => {
    jest.clearAllMocks(); calls = []; expired = false; browserLive = true; roles = [];
    payload = {
      userId: '00000000-0000-4000-8000-000000000001', tokenVersion: 1,
      tokenFamily: 'fixture-generation', serviceKey: 'neture', sessionEpoch: 7,
      authMethod: 'password', sessionId: '00000000-0000-4000-8000-000000000002',
    };
    account = { id: payload.userId, status: 'active', isActive: true, refreshTokenFamily: payload.tokenFamily } as User;
    jest.mocked(tokenUtils.verifyRefreshToken).mockImplementation(() => { calls.push('verify'); return payload; });
    jest.mocked(tokenUtils.isTokenExpired).mockImplementation(() => { calls.push('expiry'); return expired; });
    findOne = jest.fn(async () => { calls.push('account'); return account; });
    jest.mocked(isBrowserSessionLive).mockImplementation(async () => { calls.push('browser'); return browserLive; });
    jest.mocked(freshenUserContext).mockImplementation(async () => { calls.push('context'); return { roles, memberships: [] }; });
    jest.mocked(tokenUtils.generateTokens).mockImplementation(() => {
      calls.push('issue'); return { accessToken: 'fixture-access', refreshToken: 'fixture-refresh', expiresIn: 60 };
    });
    service = new AuthTokenSessionService();
    Object.assign(service, { _userRepo: { findOne, manager: { query } } });
  });

  const rejected = async (code: string, message: string, expectedCalls: string[]) => {
    await expect(service.refreshTokens('fixture-input')).rejects.toMatchObject({ code, message });
    expect(calls).toEqual(expectedCalls);
    expect(tokenUtils.generateTokens).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  };

  it('unverified claims never reach expiry or the database', async () => {
    payload = null; expired = true; account = null;
    await rejected('REFRESH_TOKEN_INVALID', 'Invalid or expired refresh token', ['verify']);
  });
  it('retired signed scope wins over expiry and never reads a user', async () => {
    payload!.serviceKey = 'pharmacy-hub'; expired = true;
    await rejected('SERVICE_SESSION_REVOKED', '세션이 종료되었습니다. 다시 로그인해 주세요.', ['verify']);
  });
  it('explicit expiry precedes account and family checks', async () => {
    expired = true; account = null; payload!.tokenFamily = undefined;
    await rejected('REFRESH_TOKEN_EXPIRED', 'Refresh token has expired', ['verify', 'expiry']);
  });
  it('missing account precedes malformed family', async () => {
    account = null; payload!.tokenFamily = undefined;
    await rejected('USER_NOT_FOUND', 'User not found or inactive', ['verify', 'expiry', 'account']);
  });
  it('blocked account precedes family errors', async () => {
    account!.status = 'suspended' as User['status']; payload!.tokenFamily = undefined;
    await rejected('ACCOUNT_NOT_ACTIVE', '계정 상태가 유효하지 않습니다. 다시 로그인해 주세요.', ['verify', 'expiry', 'account']);
  });
  it('missing signed family precedes a revoked account family', async () => {
    payload!.tokenFamily = undefined; account!.refreshTokenFamily = null;
    await rejected('REFRESH_TOKEN_INVALID', 'Refresh token has no token family', ['verify', 'expiry', 'account']);
  });
  it('revoked account generation precedes browser and method checks', async () => {
    account!.refreshTokenFamily = null; browserLive = false; roles = ['platform:super_admin'];
    await rejected('TOKEN_FAMILY_REVOKED', '세션이 종료되었습니다. 다시 로그인해 주세요.', ['verify', 'expiry', 'account']);
  });
  it('family mismatch never reads browser state or fresh roles', async () => {
    account!.refreshTokenFamily = 'new-fixture-generation'; browserLive = false;
    await rejected('TOKEN_FAMILY_MISMATCH', 'Token family mismatch - please login again', ['verify', 'expiry', 'account']);
  });
  it('revoked browser precedes a platform method rejection', async () => {
    browserLive = false; roles = ['platform:super_admin'];
    await rejected('SERVICE_SESSION_REVOKED', '세션이 종료되었습니다. 다시 로그인해 주세요.', ['verify', 'expiry', 'account', 'browser']);
  });
  it('fresh platform roles reject password without issuance', async () => {
    roles = ['platform:super_admin'];
    await rejected('PASSWORD_SESSION_NOT_ALLOWED', '관리자 계정은 Google 로그인만 사용할 수 있습니다. Google 로 다시 로그인해 주세요.',
      ['verify', 'expiry', 'account', 'browser', 'context']);
  });
  it('success preserves the signed fields and performs no database write', async () => {
    await expect(service.refreshTokens('fixture-input')).resolves.toMatchObject({ accessToken: 'fixture-access' });
    expect(calls).toEqual(['verify', 'expiry', 'account', 'browser', 'context', 'issue']);
    expect(findOne).toHaveBeenCalledWith({ where: { id: payload!.userId, isActive: true } });
    expect(isBrowserSessionLive).toHaveBeenCalledWith(account!.id, payload, account!.refreshTokenFamily, { query });
    expect(tokenUtils.generateTokens).toHaveBeenCalledWith(account, [], 'neture.co.kr', [],
      payload!.tokenFamily, 'neture', 7, 'password', payload!.sessionId);
    expect(query).not.toHaveBeenCalled();
  });
});
