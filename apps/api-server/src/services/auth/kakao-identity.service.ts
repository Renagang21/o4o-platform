import axios from 'axios';
import { loadKakaoIdentityConfig, type KakaoIdentityConfig } from '../../config/kakao-identity.config.js';
import { SocialAuthError } from './social-auth-error.js';

export interface VerifiedKakaoIdentity { providerId: string; email?: string; emailVerified: boolean }
type ProviderHttp = Pick<typeof axios, 'post' | 'get'>;

/** Server-only code exchange followed by bearer-authenticated user/me. No token persistence. */
export class KakaoIdentityService {
  constructor(private readonly http: ProviderHttp = axios,
    private readonly config: () => KakaoIdentityConfig = loadKakaoIdentityConfig) {}

  authorizationUrl(state: string, reauthenticate = false): string {
    const config = this.requireConfig();
    const url = new URL('https://kauth.kakao.com/oauth/authorize');
    url.search = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.redirectUri,
      response_type: 'code', state, ...(reauthenticate ? { prompt: 'login' } : {}) }).toString();
    return url.href;
  }

  private requireConfig(): KakaoIdentityConfig {
    const config = this.config();
    if (!config.enabled) throw new SocialAuthError('KAKAO_NOT_CONFIGURED', '카카오 로그인은 준비 중입니다.', 503);
    return config;
  }

  async exchangeCode(code: string): Promise<VerifiedKakaoIdentity> {
    const config = this.requireConfig();
    if (typeof code !== 'string' || !code || code.length > 2048) throw new SocialAuthError('KAKAO_AUTH_INVALID', '카카오 인증에 실패했습니다.', 401);
    try {
      const response = await this.http.post('https://kauth.kakao.com/oauth/token', new URLSearchParams({
        grant_type: 'authorization_code', client_id: config.clientId, client_secret: config.clientSecret,
        redirect_uri: config.redirectUri, code,
      }).toString(), { timeout: 10000, maxRedirects: 0, maxContentLength: 65536,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' } });
      const access = response.data?.access_token;
      if (typeof access !== 'string' || !access || access.length > 8192) throw new Error('invalid provider token');
      const me = await this.http.get('https://kapi.kakao.com/v2/user/me', {
        timeout: 10000, maxRedirects: 0, maxContentLength: 65536, headers: { Authorization: `Bearer ${access}` },
      });
      return parseKakaoIdentity(me.data);
    } catch {
      // Axios errors include request bodies/headers. Never log or expose them.
      throw new SocialAuthError('KAKAO_AUTH_INVALID', '카카오 인증에 실패했습니다. 다시 시도해 주세요.', 401);
    }
  }
}

export function parseKakaoIdentity(data: unknown): VerifiedKakaoIdentity {
  const me = data as { id?: unknown; kakao_account?: { email?: unknown; is_email_valid?: unknown; is_email_verified?: unknown } };
  const id = me?.id;
  if (!(typeof id === 'number' && Number.isSafeInteger(id) && id > 0) &&
      !(typeof id === 'string' && /^[1-9]\d{0,19}$/.test(id))) {
    throw new SocialAuthError('KAKAO_AUTH_INVALID', '카카오 사용자 식별자를 확인할 수 없습니다.', 401);
  }
  const account = me.kakao_account;
  const email = typeof account?.email === 'string' ? account.email : undefined;
  return { providerId: String(id), ...(email ? { email } : {}),
    emailVerified: !!email && account?.is_email_valid === true && account?.is_email_verified === true };
}
export const kakaoIdentityService = new KakaoIdentityService();
