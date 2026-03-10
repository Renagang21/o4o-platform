import type { ApiUser, ParsedAuthResponse } from './types.js';

/**
 * /auth/me, /auth/login 응답에서 user와 tokens 추출
 *
 * 지원 구조:
 *   { data: { user: {...}, tokens: {...} } }   ← 표준
 *   { user: {...}, tokens: {...} }              ← 간소화
 *   { data: { id, email, ... } }               ← user wrapper 없음
 */
export function parseAuthResponse(body: Record<string, unknown>): ParsedAuthResponse {
  const data = (body.data ?? body) as Record<string, unknown>;

  // user 추출: data.user > data 자체 (id 존재 시)
  let user: ApiUser | null = null;
  if (data.user && typeof data.user === 'object' && (data.user as ApiUser).id) {
    user = data.user as ApiUser;
  } else if (data.id && typeof data.id === 'string') {
    user = data as unknown as ApiUser;
  }

  // tokens 추출: data.tokens > body.tokens
  let tokens: ParsedAuthResponse['tokens'] = null;
  const rawTokens = (data.tokens ?? body.tokens) as Record<string, string> | undefined;
  if (rawTokens?.accessToken && rawTokens?.refreshToken) {
    tokens = { accessToken: rawTokens.accessToken, refreshToken: rawTokens.refreshToken };
  }

  return { user, tokens };
}
