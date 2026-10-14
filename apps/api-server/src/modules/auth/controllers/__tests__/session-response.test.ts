const mockCookies = jest.fn();
const mockPending = jest.fn(async () => [] as unknown[]);
const mockDemo = jest.fn(async () => ({ isDemo: true, demoType: 'STORE_OWNER' }));
jest.mock('../../../../services/authentication.service.js', () => ({ authenticationService: { setAuthCookies: mockCookies } }));
jest.mock('../../../../services/auth/demo-account.service.js', () => ({ demoAccountService: { getDemoMetadata: mockDemo } }));
jest.mock('../../../policy-acceptance/policy-acceptance.service.js', () => ({ policyAcceptanceService: { getEnforcedPendingForUser: mockPending } }));
jest.mock('../auth-helpers.js', () => ({ isCrossOriginRequest: () => false }));
import { SessionResponse } from '../session-response.js';

const req: any = { get: () => 'https://neture.co.kr' };
const session = () => ({ user: { id: 'synthetic', name: 'Fixture', memberships: [{ serviceKey: 'supplier', status: 'pending' }] }, tokens: { accessToken: 'synthetic', refreshToken: 'synthetic', expiresIn: 900 }, isNewUser: false });
function response() { return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any; }
beforeEach(() => { jest.clearAllMocks(); mockPending.mockResolvedValue([]); });
it('cookie response sets cookies and keeps tokens out of the body', async () => {
  const res = response(); const current = session();
  await SessionResponse.send(req, res, current, { message: 'Login' });
  expect(mockCookies).toHaveBeenCalledWith(req, res, current.tokens);
  expect(res.json.mock.calls[0][0].data).not.toHaveProperty('tokens');
  expect(mockDemo).not.toHaveBeenCalled();
});
it('explicit localStorage response includes the existing token envelope', async () => {
  const res = response(); const current = session();
  await SessionResponse.send(req, res, current, { message: 'Login', includeLegacyTokens: true });
  expect(res.json.mock.calls[0][0].data.tokens).toEqual(current.tokens);
});
it('signup keeps the 201 response and new-user marker', async () => {
  const res = response();
  await SessionResponse.send(req, res, { ...session(), isNewUser: true }, { message: 'Signup', status: 201 });
  expect(res.status).toHaveBeenCalledWith(201);
  expect(res.json.mock.calls[0][0].data.isNewUser).toBe(true);
});
it('only the explicit Demo metadata consumer requests registry metadata', async () => {
  const res = response();
  await SessionResponse.send(req, res, session(), { message: 'Login', includeDemoMetadata: true });
  expect(mockDemo).toHaveBeenCalledWith('synthetic');
  expect(res.json.mock.calls[0][0].data.user.demo.isDemo).toBe(true);
});
it('optional policy lookup failure retains the established response contract', async () => {
  mockPending.mockRejectedValueOnce(new Error('Fixture lookup failure'));
  const res = response();
  await SessionResponse.send(req, res, session(), { message: 'Login' });
  expect(res.json.mock.calls[0][0].data.user.pendingPolicyAcceptances).toEqual([]);
});
it('response enrichment cannot approve or replace service memberships', async () => {
  const res = response(); const current = session(); const before = JSON.stringify(current.user.memberships);
  await SessionResponse.send(req, res, current, { message: 'Login' });
  expect(JSON.stringify(res.json.mock.calls[0][0].data.user.memberships)).toBe(before);
});
