const logout = jest.fn(); const refreshTokens = jest.fn(); const clearAuthCookies = jest.fn();
const verifyAccessToken = jest.fn();
jest.mock('../services/authentication.service.js', () => ({ authenticationService: { logout, refreshTokens, clearAuthCookies, setAuthCookies: jest.fn() } }));
jest.mock('../utils/token.utils.js', () => ({ verifyAccessToken: (token: string) => verifyAccessToken(token) }));
import { AuthSessionController } from '../modules/auth/controllers/auth-session.controller.js';
import { mockHandoffRes } from './support/handoff-http.js';
const SESSION = '00000000-0000-4000-8000-000000000001';
const req = (body = {}, origin = 'https://neture.co.kr') => ({ body, user: { id: 'fixture-user' }, headers: { authorization: 'Bearer fixture' }, cookies: {}, get: () => origin } as any);
beforeEach(() => { jest.clearAllMocks(); logout.mockResolvedValue(undefined); verifyAccessToken.mockReturnValue({ serviceKey: 'neture', sessionId: SESSION }); });
describe('browser logout and refresh HTTP contract', () => {
  it('authenticates expired access using the cookie refresh snapshot without publishing fresh credentials', async () => {
    verifyAccessToken.mockReturnValueOnce(null);
    refreshTokens.mockResolvedValueOnce({ accessToken: 'internal-access', refreshToken: 'internal-refresh' });
    const request = req(); request.cookies.refreshToken = 'captured-cookie-refresh';
    const next = jest.fn(); const res = mockHandoffRes();
    await AuthSessionController.prepareLogoutAuth(request, res, next);
    expect(refreshTokens).toHaveBeenCalledWith('captured-cookie-refresh');
    expect(request.headers.authorization).toBe('Bearer internal-access');
    expect(next).toHaveBeenCalledTimes(1); expect(clearAuthCookies).not.toHaveBeenCalled();
  });
  it('does not replace a valid signed access scope with a forged refresh body', async () => {
    const next = jest.fn(); await AuthSessionController.prepareLogoutAuth(req({ refreshToken: 'unrelated' }), mockHandoffRes(), next);
    expect(next).toHaveBeenCalled(); expect(refreshTokens).not.toHaveBeenCalled();
  });
  it('failed logout authentication is retryable and never bypasses requireAuth', async () => {
    verifyAccessToken.mockReturnValueOnce(null); refreshTokens.mockRejectedValueOnce(new Error('DB outage'));
    const next = jest.fn(); const res = mockHandoffRes();
    await AuthSessionController.prepareLogoutAuth(req({ refreshToken: 'captured' }), res, next);
    expect(next).not.toHaveBeenCalled(); expect(res.statusCode).toBe(503); expect(clearAuthCookies).not.toHaveBeenCalled();
  });
  it('uses signed scope/identity and ignores a forged body logout target', async () => {
    const res = mockHandoffRes(); await AuthSessionController.logout(req({ serviceKey: 'supplier', sessionId: 'other-session' }), res);
    expect(logout).toHaveBeenCalledWith('fixture-user', 'neture', SESSION);
    expect(res.body.data.scope).toMatchObject({ serverRevoked: true, currentBrowserOnly: true });
  });
  it('rejects an origin inconsistent with the signed service', async () => {
    const res = mockHandoffRes(); await AuthSessionController.logout(req({}, 'https://supplier.neture.co.kr'), res);
    expect(res.statusCode).toBe(401); expect(logout).not.toHaveBeenCalled();
  });
  it('reports failed server revocation while clearing browser cookies', async () => {
    logout.mockRejectedValueOnce(new Error('fixture DB unavailable')); const res = mockHandoffRes();
    await AuthSessionController.logout(req(), res);
    expect([res.statusCode, res.body.code]).toEqual([500, 'LOGOUT_REVOCATION_FAILED']); expect(clearAuthCookies).toHaveBeenCalled();
  });
  it('a database outage is retryable and does not clear a valid cookie session', async () => {
    refreshTokens.mockRejectedValueOnce(new Error('fixture DB unavailable')); const res = mockHandoffRes();
    await AuthSessionController.refresh(req({ refreshToken: 'fixture-refresh' }), res);
    expect([res.statusCode, res.body.code, res.body.retryable]).toEqual([503, 'AUTH_SERVICE_UNAVAILABLE', true]);
    expect(clearAuthCookies).not.toHaveBeenCalled();
  });
  it('a revoked refresh is nonretryable and clears cookies', async () => {
    refreshTokens.mockRejectedValueOnce(Object.assign(new Error('ended'), { code: 'SERVICE_SESSION_REVOKED' })); const res = mockHandoffRes();
    await AuthSessionController.refresh(req({ refreshToken: 'fixture-refresh' }), res);
    expect([res.statusCode, res.body.code, res.body.retryable]).toEqual([401, 'SERVICE_SESSION_REVOKED', false]);
    expect(clearAuthCookies).toHaveBeenCalled();
  });
  it('an explicit bearer-client refresh wins over an unrelated legacy cookie', async () => {
    refreshTokens.mockRejectedValueOnce(Object.assign(new Error('ended'), { code: 'REFRESH_TOKEN_INVALID' })); const request = req({ refreshToken: 'body-refresh' });
    request.cookies.refreshToken = 'cookie-refresh'; await AuthSessionController.refresh(request, mockHandoffRes());
    expect(refreshTokens).toHaveBeenCalledWith('body-refresh');
  });
});
