import { selectPendingPoliciesForRequest } from '../../../../common/auth/terms-acceptance.policy.js';

const mockSession = () => ({ user: { id: 'synthetic-user', name: 'Fixture' }, tokens: { accessToken: 'synthetic', refreshToken: 'synthetic', expiresIn: 900 }, isNewUser: false });
let mockDemo = false;
const mockPending = ['neture', 'kpa-society'].map(serviceKey => ({ serviceKey, documentType: 'terms', policyDocumentId: serviceKey, version: 1, title: 'Fixture terms' }));
jest.mock('../../../../services/auth/google-auth.service.js', () => ({ googleAuthService: { login: async () => mockSession(), signup: async () => mockSession() }, GoogleAuthError: class extends Error {} }));
jest.mock('../../../../services/auth/kakao-auth.service.js', () => ({ kakaoAuthService: { login: async () => mockSession(), signup: async () => mockSession() } }));
jest.mock('../../../../services/authentication.service.js', () => ({ authenticationService: { setAuthCookies: jest.fn() } }));
jest.mock('../../../../config/kakao-identity.config.js', () => ({ loadKakaoIdentityConfig: () => ({ enabled: true }) }));
jest.mock('../../../../services/auth/social-link.service.js', () => ({ socialLinkService: {} }));
jest.mock('../../../../services/auth/social-flow.service.js', () => ({ socialFlowService: {}, socialDigest: jest.fn() }));
jest.mock('../social-auth.helpers.js', () => ({ socialOrigin: (req: any) => ({ origin: req.get('origin') }), socialBinding: () => 'fixture', clearSocialBinding: jest.fn() }));
jest.mock('../../../policy-acceptance/policy-acceptance.service.js', () => ({
  PolicyAcceptanceError: class extends Error {},
  policyAcceptanceService: {
    getPublishedTermsForService: jest.fn(async () => null),
    getPendingForUser: jest.fn(async () => mockPending),
    getEnforcedPendingForUser: jest.fn(async (_user: string, serviceKey: string) => mockDemo ? [] : selectPendingPoliciesForRequest(mockPending, serviceKey)),
  },
}));
import { GoogleAuthController } from '../google-auth.controller.js';
import { SocialAuthController } from '../social-auth.controller.js';
import { policyAcceptanceService } from '../../../policy-acceptance/policy-acceptance.service.js';

const handlers = [GoogleAuthController.login, GoogleAuthController.signup, SocialAuthController.completeLogin, SocialAuthController.signup];
beforeEach(() => { mockDemo = false; jest.clearAllMocks(); });
it.each(handlers)('Google/Kakao 로그인·가입 응답은 origin의 세션 범위를 적용하고 body의 서비스 선택으로 바꾸지 않는다: %p', async handler => {
  const req: any = { body: { idToken: 'fixture', token: 'fixture', code: 'fixture', serviceKey: 'kpa-society', consents: {} }, ip: '127.0.0.1', headers: {}, get: (name: string) => name === 'origin' ? 'https://neture.co.kr' : 'api.neture.co.kr' };
  const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis(), set: jest.fn().mockReturnThis() };
  await handler(req, res);
  expect(policyAcceptanceService.getEnforcedPendingForUser).toHaveBeenCalledWith('synthetic-user', 'neture');
  expect(policyAcceptanceService.getPendingForUser).not.toHaveBeenCalled();
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ user: expect.objectContaining({ pendingPolicyAcceptances: [mockPending[0]] }) }) }));
});
it.each(handlers)('Demo 예외도 같은 provider 세션 응답 판정을 따른다: %p', async handler => {
  mockDemo = true;
  const req: any = { body: { idToken: 'fixture', token: 'fixture', code: 'fixture', consents: {} }, ip: '127.0.0.1', headers: {}, get: (name: string) => name === 'origin' ? 'https://pharmacy.neture.co.kr' : 'api.neture.co.kr' };
  const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis(), set: jest.fn().mockReturnThis() };
  await handler(req, res);
  expect(policyAcceptanceService.getEnforcedPendingForUser).toHaveBeenCalledWith('synthetic-user', 'kpa-society');
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ user: expect.objectContaining({ pendingPolicyAcceptances: [] }) }) }));
});
