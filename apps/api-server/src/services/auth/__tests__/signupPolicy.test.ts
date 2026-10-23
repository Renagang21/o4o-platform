import 'reflect-metadata';
import { AppDataSource } from '../../../database/connection.js';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { signupPolicyKeyFromOrigin, resolveSignupPolicyServiceKey, recordSignupTerms } from '../signup-policy.service.js';
import { policyAcceptanceService } from '../../../modules/policy-acceptance/policy-acceptance.service.js';
import { EmailSignupRequestDto } from '../../../modules/auth/dto/email-auth.dto.js';
import { GoogleSignupRequestDto } from '../../../modules/auth/dto/google-auth.dto.js';
import { SocialSignupDto } from '../../../modules/auth/dto/social-auth.dto.js';
import { SignupTermsController } from '../../../modules/auth/controllers/signup-terms.controller.js';
import { socialOrigin } from '../../../modules/auth/controllers/social-auth.helpers.js';

const policy = { policyDocumentId: '11111111-1111-4111-8111-111111111111', version: 1 };
describe('signup policy boundary', () => {
  it('CarePharm uses the existing account signup and social session scope', () => {
    const origin = 'https://carepharm.neture.co.kr';
    expect(signupPolicyKeyFromOrigin(origin)).toBe('neture');
    expect(socialOrigin({ get: () => origin } as never)).toEqual({ origin, serviceKey: 'neture' });
  });
  it('MegaPharm reuses the pharmacy app with the existing account signup and social session scope', () => {
    const origin = 'https://megapharm.neture.co.kr';
    expect(signupPolicyKeyFromOrigin(origin)).toBe('neture');
    expect(socialOrigin({ get: () => origin } as never)).toEqual({ origin, serviceKey: 'neture' });
  });
  it.each(['https://carepharm.neture.co.kr.attacker.invalid', 'https://carepharm.neture.co.kr/path'])('CarePharm lookalike or path origin remains rejected: %s', origin => {
      expect(() => signupPolicyKeyFromOrigin(origin)).toThrow(expect.objectContaining({ code: 'SIGNUP_ORIGIN_NOT_ALLOWED' }));
      expect(() => socialOrigin({ get: () => origin } as never)).toThrow(expect.objectContaining({ code: 'SOCIAL_ORIGIN_NOT_ALLOWED' }));
    });
  it.each(['neture.co.kr','supplier.neture.co.kr','community.neture.co.kr','funding.neture.co.kr','study.neture.co.kr','store.neture.co.kr','kpa.neture.co.kr','pharmacy.neture.co.kr','megapharm.neture.co.kr','pharmcoop.neture.co.kr'])('preserves the pre-rollout signup agreement for %s', host => {
    expect(signupPolicyKeyFromOrigin(`https://${host}`)).toBe('neture');
  });
  it('uses the same account agreement for Society and catalog www alias', () => {
    expect(signupPolicyKeyFromOrigin('https://pharmacy.neture.co.kr')).toBe('neture');
    expect(signupPolicyKeyFromOrigin('https://www.neture.co.kr')).toBe('neture');
  });
  it.each([undefined, 'https://admin.neture.co.kr', 'https://unknown.invalid', 'https://neture.co.kr/path', 'https://neture.co.kr.evil.invalid', 'https://retail.neture.co.kr'])('rejects unknown/admin/retired origin %s', origin => {
    expect(() => signupPolicyKeyFromOrigin(origin)).toThrow(expect.objectContaining({ code: 'SIGNUP_ORIGIN_NOT_ALLOWED' }));
  });
  it('allows local HTTP only outside production', () => {
    const before = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'development';
      expect(signupPolicyKeyFromOrigin('http://localhost:3000')).toBe('neture');
      process.env.NODE_ENV = 'production';
      expect(() => signupPolicyKeyFromOrigin('http://localhost:3000')).toThrow();
      expect(() => signupPolicyKeyFromOrigin('http://neture.co.kr')).toThrow();
    } finally { process.env.NODE_ENV = before; }
  });
  it.each([
    [EmailSignupRequestDto, { email: 'fixture@example.invalid', password: 'Synthetic123!', name: 'Fixture', phone: '01000000000' }],
    [GoogleSignupRequestDto, { idToken: 'fixture' }],
    [SocialSignupDto, { token: 'fixture', email: 'fixture@example.invalid', name: 'Fixture', phone: '01000000000' }],
  ])('requires a nested ID/version and rejects client service/identity injection for %p', async (Dto, fields) => {
    const run = (termsPolicy: unknown, extra = {}) => validate(plainToInstance(Dto as any, { ...fields, consents: { terms: true, privacy: true, ...(Dto === GoogleSignupRequestDto ? { name: 'Fixture', phone: '01000000000' } : {}), termsPolicy }, ...extra }), { whitelist: true, forbidNonWhitelisted: true });
    const good = { ...fields, consents: { terms: true, privacy: true, termsPolicy: policy, ...(Dto === GoogleSignupRequestDto ? { name: 'Fixture', phone: '01000000000' } : {}) } };
    expect(await validate(plainToInstance(Dto as any, good), { whitelist: true, forbidNonWhitelisted: true })).toHaveLength(0);
    for (const bad of [undefined, { ...policy, version: '1' }, { ...policy, version: 0 }, { ...policy, policyDocumentId: 'invalid' }, { ...policy, serviceKey: 'admin' }]) expect((await run(bad)).length).toBeGreaterThan(0);
    for (const field of ['serviceKey', 'policyServiceKey', 'userId', 'roles']) expect((await run(policy, { [field]: 'admin' })).some(error => error.property === field)).toBe(true);
  });
});


describe('published common-account rollout', () => {
  it.each([false, true])('Pharmacy signup uses the Neture account policy regardless of the legacy rollout marker=%s', async active => {
    const common = { id: 'common-doc', serviceKey: 'neture', documentType: 'terms', title: 'Common', contentHash: 'h', version: active ? 2 : 1, slug: active ? 'neture-account-terms' : null };
    const pharmacy = { ...common, id: 'pharmacy-doc', serviceKey: 'kpa-society', title: 'Pharmacy', version: 1, slug: null };
    const spy = jest.spyOn(policyAcceptanceService, 'getPublishedTermsForService').mockImplementation(async key => key === 'neture' ? common : pharmacy);
    const privacyQuery = jest.spyOn(AppDataSource, 'query').mockImplementation(async (_sql: string, params?: any[]) => [{
      id: 'privacy-doc', service_key: params?.[0], document_type: 'privacy', version: params?.[0] === 'neture' && active ? 2 : 1,
      title: 'Privacy fixture', content: 'Privacy body', slug: params?.[0] === 'neture' && active ? 'neture-account-privacy' : null,
    }]);
    const req: any = { get: () => 'https://pharmacy.neture.co.kr' };
    const res: any = { set: jest.fn().mockReturnThis(), status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    try {
      await SignupTermsController.get(req, res);
      const doc = common;
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ policyDocumentId: doc.id, version: doc.version, privacyHref: 'https://neture.co.kr/privacy', privacyPolicy: expect.objectContaining({ version: doc.version }), termsHref: 'https://neture.co.kr/terms' }) }));
      expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-store');
    } finally { privacyQuery.mockRestore(); spy.mockRestore(); }
  });

  it.each([
    [null, 'kpa-society'],
    [{ version: 1, slug: null }, 'kpa-society'],
    [{ version: 2, slug: 'legacy-neture' }, 'kpa-society'],
    [{ version: 1, slug: 'neture-account-terms' }, 'kpa-society'],
    [{ version: 2, slug: 'neture-account-terms' }, 'neture'],
    [{ version: 3, slug: 'neture-account-terms' }, 'neture'],
  ])('%j selects %s without reinterpreting legacy policies', async (marker, expected) => {
    const doc = marker ? { id: 'fixture-doc', serviceKey: 'neture', documentType: 'terms', title: 'T', contentHash: 'h', ...marker } : null;
    const spy = jest.spyOn(policyAcceptanceService, 'getPublishedTermsForService').mockResolvedValue(doc);
    try { expect(await resolveSignupPolicyServiceKey('kpa-society')).toBe(expected); }
    finally { spy.mockRestore(); }
  });

  it('rejects a stale pharmacy signup reference after common-account publication', async () => {
    const spy = jest.spyOn(policyAcceptanceService, 'getPublishedTermsForService').mockResolvedValue({ id: 'fixture-common', serviceKey: 'neture', documentType: 'terms', title: 'T', contentHash: 'h', version: 2, slug: 'neture-account-terms' });
    const manager = { query: jest.fn() };
    try {
      await expect(recordSignupTerms('fixture-user', 'kpa-society', policy, manager as any)).rejects.toMatchObject({ code: 'POLICY_VERSION_MISMATCH' });
      expect(manager.query).toHaveBeenCalledTimes(2);
      expect(manager.query.mock.calls.every(([sql]) => sql.includes('pg_advisory_xact_lock_shared'))).toBe(true);
      expect(manager.query.mock.calls.map(([,params]) => params[0])).toEqual(['service-policy:neture', 'service-policy:kpa-society']);
    } finally { spy.mockRestore(); }
  });
});
