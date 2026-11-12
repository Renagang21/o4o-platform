import { randomUUID } from 'node:crypto';
jest.mock('../../../database/connection.js', () => ({
  AppDataSource: { getRepository: () => ({}) },
}));
jest.mock('../auth-context.helper.js', () => ({
  freshenUserContext: jest.fn(async () => ({ roles: [], memberships: [] })),
  generateTokensWithContext: jest.fn(),
  injectRolesIntoPublicData: jest.fn(),
}));
jest.mock('../signup-policy.service.js', () => ({
  resolveSignupPolicyServiceKey: jest.fn(async (key: string) => key),
  recordSignupTerms: jest.fn(async () => undefined),
  recordSignupPrivacy: jest.fn(async () => undefined),
}));
jest.mock('../email-auth.service.js', () => ({
  emailAuthService: { sendVerificationMail: jest.fn(async () => true) },
}));
jest.mock('../demo-account.service.js', () => ({
  demoAccountService: { isDemoLoginEmail: jest.fn(async () => false) },
}));
import { KakaoAuthService } from '../kakao-auth.service.js';
import { User } from '../../../entities/User.js';
import { LinkedAccount } from '../../../entities/LinkedAccount.js';
// WO-O4O-SOCIAL-SIGNUP-DIRECT-ROLE-REGISTRATION-V1 (2026-11-11): 카카오 가입은 약관 동의만 받고,
// 카카오가 확인한 이메일만 저장한다. 이메일 · 이름 · 닉네임 · 휴대전화 입력은 받지 않는다.
function kakaoHarness(identity: Record<string, unknown> = { providerId: 'synthetic-provider', emailVerified: false }, duplicate = false) {
  const userCreate = jest.fn((v: any) => ({ ...v, id: randomUUID() }));
  const linkCreate = jest.fn((v: any) => v);
  const manager = {
    query: jest.fn(async (sql: string) => (/FROM users WHERE lower\(email\)/.test(sql) && duplicate ? [{ '?column?': 1 }] : [])),
    getRepository: (entity: unknown) => ({
      create: entity === User ? userCreate : entity === LinkedAccount ? linkCreate : jest.fn((v: any) => v),
      save: jest.fn(async (v: any) => v),
    }),
  };
  const db = { getRepository: manager.getRepository, transaction: async (work: any) => work(manager) };
  const flows = { consume: jest.fn(async () => ({ service_key: 'neture', payload: identity })) };
  const service = new KakaoAuthService(db as any, { exchangeCode: jest.fn() } as any, flows as any);
  const session = jest.spyOn(service as any, 'sessionOrVerification').mockResolvedValue({ user: {}, tokens: {}, isNewUser: true });
  return { service, userCreate, linkCreate, flows, manager, session };
}
const consents = { terms: true, privacy: true };
const signup = (h: ReturnType<typeof kakaoHarness>, input: Record<string, unknown> = {}) =>
  h.service.signup('synthetic-flow', 'synthetic-binding', 'https://neture.co.kr', { consents, ...input } as any);

it('creates the account with only consent: reviewed-signup marker, no email gate, no role or membership rows', async () => {
  const h = kakaoHarness();
  await signup(h);
  const created = h.userCreate.mock.calls[0][0];
  expect(created).toMatchObject({
    email: null, name: null, isEmailVerified: true,
    businessInfo: { o4oMembershipRegistrationV1: { type: null, state: 'pending', fields: {} } },
  });
  expect(created.nickname).toBeUndefined();
  expect(created.phone).toBeUndefined();
  expect(h.linkCreate).toHaveBeenCalledWith(expect.objectContaining({ provider: 'kakao', providerId: 'synthetic-provider' }));
  expect(h.manager.query.mock.calls.some(args => /INSERT INTO (role_assignments|service_memberships)/.test(String(args[0])))).toBe(false);
  expect(h.session).toHaveBeenCalledWith(expect.objectContaining({ isEmailVerified: true }), 'neture', true);
});

it('ignores account fields an older screen still sends (typed email, name, nickname, phone)', async () => {
  const h = kakaoHarness();
  await signup(h, { email: 'typed@fixture.invalid', name: 'Synthetic member', nickname: 'Synthetic nick', phone: '02-123-4567' });
  const created = h.userCreate.mock.calls[0][0];
  expect(created.email).toBeNull();
  expect(created.name).toBeNull();
  expect(created.nickname).toBeUndefined();
  expect(created.phone).toBeUndefined();
});

it('stores the email Kakao verified, normalized', async () => {
  const h = kakaoHarness({ providerId: 'synthetic-provider', email: ' Verified@Fixture.Invalid ', emailVerified: true });
  await signup(h);
  expect(h.userCreate.mock.calls[0][0]).toMatchObject({ email: 'verified@fixture.invalid', isEmailVerified: true });
});

it('does not store an email Kakao has not verified', async () => {
  const h = kakaoHarness({ providerId: 'synthetic-provider', email: 'unverified@fixture.invalid', emailVerified: false });
  await signup(h);
  expect(h.userCreate.mock.calls[0][0].email).toBeNull();
  expect(h.manager.query.mock.calls.some(args => /FROM users WHERE lower\(email\)/.test(String(args[0])))).toBe(false);
});

it('keeps EMAIL_IN_USE for a verified Kakao email that another account already uses (no automatic merge)', async () => {
  const h = kakaoHarness({ providerId: 'synthetic-provider', email: 'taken@fixture.invalid', emailVerified: true }, true);
  await expect(signup(h)).rejects.toMatchObject({ code: 'EMAIL_IN_USE' });
  expect(h.userCreate).not.toHaveBeenCalled();
});

it('requires terms and privacy consent before consuming the flow', async () => {
  const h = kakaoHarness();
  await expect(signup(h, { consents: { terms: true, privacy: false } })).rejects.toMatchObject({ code: 'CONSENT_REQUIRED' });
  expect(h.flows.consume).not.toHaveBeenCalled();
});
