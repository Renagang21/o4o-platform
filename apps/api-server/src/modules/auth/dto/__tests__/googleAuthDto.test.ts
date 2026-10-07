/**
 * WO-O4O-GOOGLE-ONLY-SIGNUP-LOGIN-V1 (WO-2D) §2 — 클라이언트 identity 필드 금지 증빙.
 * validateDto 와 동일 옵션(whitelist + forbidNonWhitelisted)으로 userId/email/sub/audience/role/membership 이 거절됨을 고정한다.
 */
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import * as GoogleAuthDto from '../google-auth.dto.js';
import { GoogleLoginRequestDto, GoogleSignupRequestDto } from '../google-auth.dto.js';

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
  // WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1: GoogleLinkRequestDto(currentPassword 재인증) 계약은 은퇴했다.
  /**
   * WO-O4O-GOOGLE-ONLY-AUTH-CLEANUP-V1 — 계약 반전
   *   구 계약은 `GoogleAdminBootstrapRequestDto` 의 입력 whitelist 를 고정했다.
   *   Admin Google Bootstrap 경로가 은퇴해 DTO 자체가 사라졌으므로 **부재**를 고정한다.
   *   세션 없이 열리는 연결 경로가 다시 생기면 여기서 먼저 깨진다.
   */
  it('bootstrap-admin DTO 가 없다 (전환기 1회용 경로 은퇴)', () => {
    expect('GoogleAdminBootstrapRequestDto' in GoogleAuthDto).toBe(false);
    // 로그인·가입 DTO 는 그대로 있어야 한다(은퇴가 본체로 번지지 않았다).
    expect('GoogleLoginRequestDto' in GoogleAuthDto).toBe(true);
    expect('GoogleSignupRequestDto' in GoogleAuthDto).toBe(true);
  });
});
