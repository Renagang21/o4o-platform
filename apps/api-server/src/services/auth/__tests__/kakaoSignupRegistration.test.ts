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
import { KakaoAuthService } from '../kakao-auth.service.js';
import { User } from '../../../entities/User.js';
import { LinkedAccount } from '../../../entities/LinkedAccount.js';
it('stores an unselected reviewed-signup marker only on the newly created Kakao user, before email verification', async () => {
  const userCreate = jest.fn((v: any) => ({ ...v, id: randomUUID() })),
    linkCreate = jest.fn((v: any) => v);
  const manager = {
    query: jest.fn(async () => []),
    getRepository: (entity: unknown) => ({
      create:
        entity === User
          ? userCreate
          : entity === LinkedAccount
            ? linkCreate
            : jest.fn(),
      save: jest.fn(async (v: any) => v),
    }),
  };
  const db = {
    getRepository: manager.getRepository,
    transaction: async (work: any) => work(manager),
  };
  const flows = {
    consume: jest.fn(async () => ({
      service_key: 'neture',
      payload: { providerId: 'synthetic-provider', emailVerified: false },
    })),
  };
  const service = new KakaoAuthService(
    db as any,
    { exchangeCode: jest.fn() } as any,
    flows as any,
  );
  const result = await service.signup(
    'synthetic-flow',
    'synthetic-binding',
    'https://neture.co.kr',
    {
      email: 'signup@fixture.invalid',
      name: 'Synthetic member',
      nickname: 'Synthetic nick',
      phone: '01012345678',
      consents: { terms: true, privacy: true },
    },
  );
  expect(result).toMatchObject({ nextStep: 'verify-email' });
  expect(userCreate).toHaveBeenCalledWith(
    expect.objectContaining({
      businessInfo: {
        o4oMembershipRegistrationV1: {
          type: null,
          state: 'pending',
          fields: {},
        },
      },
    }),
  );
  expect(linkCreate).toHaveBeenCalledWith(
    expect.objectContaining({
      provider: 'kakao',
      providerId: 'synthetic-provider',
    }),
  );
  expect(
    manager.query.mock.calls.some((args) =>
      /INSERT INTO (role_assignments|service_memberships)/.test(
        String(args[0]),
      ),
    ),
  ).toBe(false);
});

// WO-O4O-AUTH-ONBOARDING-UX-CLEANUP-V1 T2: 이름 · 휴대전화는 가입 선택 항목이다.
function kakaoHarness() {
  const userCreate = jest.fn((v: any) => ({ ...v, id: randomUUID() }));
  const manager = {
    query: jest.fn(async () => []),
    getRepository: (entity: unknown) => ({
      create: entity === User ? userCreate : jest.fn((v: any) => v),
      save: jest.fn(async (v: any) => v),
    }),
  };
  const db = { getRepository: manager.getRepository, transaction: async (work: any) => work(manager) };
  const flows = {
    consume: jest.fn(async () => ({ service_key: 'neture', payload: { providerId: 'synthetic-provider', emailVerified: false } })),
  };
  const service = new KakaoAuthService(db as any, { exchangeCode: jest.fn() } as any, flows as any);
  return { service, userCreate, flows };
}

it.each([[{}], [{ name: '', phone: '' }], [{ name: '  ', phone: '  ' }]])(
  'Kakao signup without name and phone stores them unset (%j)',
  async (over) => {
    const h = kakaoHarness();
    await h.service.signup('synthetic-flow', 'synthetic-binding', 'https://neture.co.kr', {
      email: 'signup@fixture.invalid', nickname: 'Synthetic nick', consents: { terms: true, privacy: true }, ...over,
    } as any);
    const created = h.userCreate.mock.calls[0][0];
    expect(created.name ?? null).toBeNull();
    expect(created.phone ?? null).toBeNull();
  },
);

it('Kakao signup rejects a malformed phone when one is given, before consuming the flow', async () => {
  const h = kakaoHarness();
  await expect(
    h.service.signup('synthetic-flow', 'synthetic-binding', 'https://neture.co.kr', {
      email: 'signup@fixture.invalid', phone: '02-123-4567', consents: { terms: true, privacy: true },
    } as any),
  ).rejects.toMatchObject({ code: 'INVALID_PHONE' });
  expect(h.flows.consume).not.toHaveBeenCalled();
});
