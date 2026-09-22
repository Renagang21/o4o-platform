/**
 * WO-O4O-GOOGLE-ONLY-SIGNUP-LOGIN-V1 (WO-2D) §2 — 클라이언트 identity 필드 금지 증빙.
 * validateDto 와 동일 옵션(whitelist + forbidNonWhitelisted)으로 userId/email/sub/audience/role/membership 이 거절됨을 고정한다.
 */
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  GoogleAdminBootstrapRequestDto,
  GoogleLinkRequestDto,
  GoogleLoginRequestDto,
  GoogleSignupRequestDto,
} from '../google-auth.dto.js';

const OPTS = { whitelist: true, forbidNonWhitelisted: true, skipMissingProperties: false } as const;
const run = (cls: any, body: unknown) => validate(plainToInstance(cls, body), OPTS);

describe('Google auth DTO — 입력 계약', () => {
  it('login: { idToken, serviceKey? } 만 허용', async () => {
    expect(await run(GoogleLoginRequestDto, { idToken: 't' })).toHaveLength(0);
    expect(await run(GoogleLoginRequestDto, { idToken: 't', serviceKey: 'neture', includeLegacyTokens: true })).toHaveLength(0);
    expect((await run(GoogleLoginRequestDto, { idToken: '' })).length).toBeGreaterThan(0);
  });

  it.each(['userId', 'email', 'sub', 'audience', 'role', 'membership', 'roles'])('login: 클라이언트 필드 %s 는 400', async (field) => {
    const errors = await run(GoogleLoginRequestDto, { idToken: 't', [field]: 'x' });
    expect(errors.some((e) => e.property === field && e.constraints?.whitelistValidation)).toBe(true);
  });

  it('signup: consents.terms/privacy 필수 · marketing 선택 · 그 외 필드 거절', async () => {
    expect(await run(GoogleSignupRequestDto, { idToken: 't', consents: { terms: true, privacy: true } })).toHaveLength(0);
    expect(await run(GoogleSignupRequestDto, { idToken: 't', consents: { terms: true, privacy: true, marketing: false } })).toHaveLength(0);
    expect((await run(GoogleSignupRequestDto, { idToken: 't', consents: { terms: true } })).length).toBeGreaterThan(0);
    expect((await run(GoogleSignupRequestDto, { idToken: 't' })).length).toBeGreaterThan(0);
    for (const field of ['name', 'phone', 'email', 'sub', 'role', 'serviceKey', 'password']) {
      const errors = await run(GoogleSignupRequestDto, { idToken: 't', consents: { terms: true, privacy: true }, [field]: 'x' });
      expect(errors.some((e) => e.property === field)).toBe(true);
    }
  });
  it('link: { idToken, currentPassword } 만 허용 — userId/email/sub/providerId/serviceKey 는 400 (WO-O4O-GOOGLE-IDENTITY-OPERATOR-EXPLICIT-LINK-V1)', async () => {
    expect(await run(GoogleLinkRequestDto, { idToken: 't', currentPassword: 'p' })).toHaveLength(0);
    expect((await run(GoogleLinkRequestDto, { idToken: 't' })).length).toBeGreaterThan(0);
    expect((await run(GoogleLinkRequestDto, { idToken: 't', currentPassword: '' })).length).toBeGreaterThan(0);
    for (const field of ['userId', 'email', 'sub', 'providerId', 'provider', 'role', 'serviceKey', 'includeLegacyTokens']) {
      const errors = await run(GoogleLinkRequestDto, { idToken: 't', currentPassword: 'p', [field]: 'x' });
      expect(errors.some((e) => e.property === field && e.constraints?.whitelistValidation)).toBe(true);
    }
  });
  it('bootstrap-admin: { idToken, bootstrapCode } 만 허용 — 대상 지정 필드는 400 (WO §15)', async () => {
    expect(await run(GoogleAdminBootstrapRequestDto, { idToken: 't', bootstrapCode: 'c' })).toHaveLength(0);
    expect((await run(GoogleAdminBootstrapRequestDto, { idToken: 't' })).length).toBeGreaterThan(0);
    expect((await run(GoogleAdminBootstrapRequestDto, { bootstrapCode: 'c' })).length).toBeGreaterThan(0);
    expect((await run(GoogleAdminBootstrapRequestDto, { idToken: 't', bootstrapCode: '' })).length).toBeGreaterThan(0);
    for (const field of ['userId', 'email', 'sub', 'providerId', 'role', 'serviceKey', 'currentPassword']) {
      const errors = await run(GoogleAdminBootstrapRequestDto, { idToken: 't', bootstrapCode: 'c', [field]: 'x' });
      expect(errors.some((e) => e.property === field && e.constraints?.whitelistValidation)).toBe(true);
    }
  });
});
