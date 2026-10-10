import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { signupPolicyKeyFromOrigin } from '../signup-policy.service.js';
import { EmailSignupRequestDto } from '../../../modules/auth/dto/email-auth.dto.js';
import { GoogleSignupRequestDto } from '../../../modules/auth/dto/google-auth.dto.js';
import { SocialSignupDto } from '../../../modules/auth/dto/social-auth.dto.js';

const policy = { policyDocumentId: '11111111-1111-4111-8111-111111111111', version: 1 };
describe('signup policy boundary', () => {
  it.each(['neture.co.kr','supplier.neture.co.kr','community.neture.co.kr','funding.neture.co.kr','study.neture.co.kr','store.neture.co.kr','kpa.neture.co.kr'])('uses the account-center agreement for %s', host => {
    expect(signupPolicyKeyFromOrigin(`https://${host}`)).toBe('neture');
  });
  it('uses Society published row and supports catalog www alias', () => {
    expect(signupPolicyKeyFromOrigin('https://pharmacy.neture.co.kr')).toBe('kpa-society');
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
