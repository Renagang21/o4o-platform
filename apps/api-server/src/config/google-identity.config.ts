/**
 * Google Identity — audience allowlist config (WO-O4O-GOOGLE-IDENTITY-AUTOMATIC-EMAIL-MERGE-REMOVAL-V1 · WO-2B)
 *
 * Google ID token 의 `aud` 는 **서버가 보유한 allowlist** 와만 대조한다. 클라이언트가 보낸 audience 값은
 * 어떤 경로로도 신뢰하지 않는다. env 가 비어 있으면 allowlist 는 빈 배열이며 검증은 fail-closed 로 거절된다
 * (O4O-IDENTITY-ARCHITECTURE-V3 §3 · WO-2B 2-5).
 *
 * env: `GOOGLE_ALLOWED_CLIENT_IDS` — 쉼표 구분 · 여러 Client ID(web · android · ios 등) 허용.
 *      운영 Client ID 값 · secret 은 이 WO 에서 등록하지 않는다(WO-2D 체크리스트).
 *
 * `GOOGLE_CLIENT_ID/SECRET`(app.config.ts socialAuthConfig · passportDynamic) 은 legacy passport 설정이며
 * ID token 검증 allowlist 로 재사용하지 않는다 — Identity 검증 경로와 legacy OAuth 설정을 분리한다.
 */

export const GOOGLE_ALLOWED_CLIENT_IDS_ENV = 'GOOGLE_ALLOWED_CLIENT_IDS';

/** Google ID token issuer — google-auth-library 가 검증하는 값과 동일하게 고정한다. */
export const GOOGLE_ID_TOKEN_ISSUERS = ['accounts.google.com', 'https://accounts.google.com'] as const;

export function parseAllowedClientIds(raw: string | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  for (const part of raw.split(',')) {
    const id = part.trim();
    if (id) seen.add(id);
  }
  return Array.from(seen);
}

export interface GoogleIdentityConfig {
  /** 서버 allowlist. 비어 있으면 검증은 항상 거절된다. */
  allowedClientIds: string[];
  isConfigured(): boolean;
}

export function loadGoogleIdentityConfig(env: NodeJS.ProcessEnv = process.env): GoogleIdentityConfig {
  const allowedClientIds = parseAllowedClientIds(env[GOOGLE_ALLOWED_CLIENT_IDS_ENV]);
  return {
    allowedClientIds,
    isConfigured: () => allowedClientIds.length > 0,
  };
}

export const googleIdentityConfig: GoogleIdentityConfig = loadGoogleIdentityConfig();
