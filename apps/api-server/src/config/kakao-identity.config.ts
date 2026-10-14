export const KAKAO_CALLBACK_PATH = '/api/v1/auth/social/kakao/callback';
export interface KakaoIdentityConfig { clientId: string; clientSecret: string; redirectUri: string; enabled: boolean }

/** Confidential-client REST flow. No legacy passport config, caller-supplied client or redirect. */
export function loadKakaoIdentityConfig(env: NodeJS.ProcessEnv = process.env): KakaoIdentityConfig {
  const clientId = env.KAKAO_CLIENT_ID?.trim() ?? '';
  const clientSecret = env.KAKAO_CLIENT_SECRET?.trim() ?? '';
  const redirectUri = env.KAKAO_REDIRECT_URI?.trim() ?? '';
  let trustedRedirect = false;
  try {
    const url = new URL(redirectUri);
    trustedRedirect = url.pathname === KAKAO_CALLBACK_PATH && !url.search && !url.hash && !url.username && !url.password &&
      (url.origin === 'https://api.neture.co.kr' ||
       (env.NODE_ENV !== 'production' && url.protocol === 'http:' && ['localhost','127.0.0.1'].includes(url.hostname)));
  } catch { /* Unconfigured: fail closed. */ }
  return { clientId, clientSecret, redirectUri, enabled: !!clientId && !!clientSecret && trustedRedirect };
}
