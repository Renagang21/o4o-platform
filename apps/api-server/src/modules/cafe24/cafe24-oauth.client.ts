/**
 * Cafe24 OAuth Client
 * WO-O4O-CAFE24-OAUTH-PRODUCT-CENSUS-V1 §5
 *
 * Cafe24 는 몰마다 API host 가 다르다 (https://{mall_id}.cafe24api.com).
 * client_id/secret 은 앱 단위 1쌍이며 **환경 secret 으로만** 관리한다 (WO §3).
 *
 * 이 파일은 HTTP 경계만 담당한다 — DB 접근 없음, 로깅 시 token 값 출력 금지.
 */

import logger from '../../utils/logger.js';

/** 상품 조회에 필요한 최소 scope. 주문/회원/결제 scope 를 추가하지 않는다 (WO §2·§3). */
export const CAFE24_MIN_SCOPES = ['mall.read_product'] as const;

export interface Cafe24OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  /** Cafe24 Admin API 버전 (X-Cafe24-Api-Version) */
  apiVersion: string;
  scopes: string[];
}

/** 환경변수에서 앱 자격정보를 읽는다. 없으면 null — 호출부가 503 으로 처리한다. */
export function loadCafe24OAuthConfig(): Cafe24OAuthConfig | null {
  const clientId = process.env.CAFE24_CLIENT_ID;
  const clientSecret = process.env.CAFE24_CLIENT_SECRET;
  const redirectUri = process.env.CAFE24_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) return null;

  const rawScopes = (process.env.CAFE24_SCOPES || '').trim();
  const scopes = rawScopes ? rawScopes.split(/[,\s]+/).filter(Boolean) : [...CAFE24_MIN_SCOPES];

  return {
    clientId,
    clientSecret,
    redirectUri,
    // 등록된 Cafe24 앱의 기본 버전. 앱에 없는 버전을 보내면 모든 Admin API 가 400 이다
    // ("... version you requested is not available"). 실측 기준값 = 2026-03-01.
    apiVersion: process.env.CAFE24_API_VERSION || '2026-03-01',
    scopes,
  };
}

export function cafe24ApiBase(mallId: string): string {
  // mall_id 는 host 구성요소이므로 문자 클래스를 강하게 제한한다 (SSRF/host injection 방지)
  if (!/^[a-zA-Z0-9_-]{2,64}$/.test(mallId)) {
    throw new Error('INVALID_MALL_ID');
  }
  return `https://${mallId}.cafe24api.com`;
}

export interface Cafe24TokenResponse {
  access_token: string;
  expires_at: string;
  refresh_token: string;
  refresh_token_expires_at: string;
  client_id: string;
  mall_id: string;
  user_id?: string;
  scopes?: string[];
  issued_at?: string;
  shop_no?: string | number;
}

/**
 * Cafe24 token 응답의 만료시각을 Date 로 바꾼다.
 * WO-O4O-CAFE24-TOKEN-EXPIRY-TIMEZONE-FIX-V1
 *
 * Cafe24 는 `expires_at` / `refresh_token_expires_at` 를 **offset 없는 KST 벽시계 문자열**로 준다
 * (예: `2026-09-04T15:34:52.000`). 이걸 `new Date(...)` 에 그대로 넣으면 Node 가 **실행 호스트의
 * 로컬 시간대**로 해석한다. 개발 PC(KST)에서는 맞고 **Cloud Run(UTC)에서는 9시간 뒤로** 저장된다.
 *
 * 그 결과 프로덕션은 이미 죽은 access token 을 "아직 8시간 남았다"고 믿고 refresh 를 건너뛰며,
 * 모든 Cafe24 Admin API 가 401 로 떨어진다 (2026-09-04 실측: 저장 만료 +8.45h, 실제 호출 401,
 * 강제 refresh 후 정상).
 *
 * 그래서 offset 이 없는 값은 KST 로 못박아 해석한다. offset(Z / ±hh:mm)이 이미 붙어 있으면
 * Cafe24 가 명시한 것이므로 그대로 신뢰한다.
 */
export function parseCafe24Timestamp(value: string): Date {
  const raw = (value ?? '').trim();
  if (!raw) throw new Error('CAFE24_INVALID_TIMESTAMP');
  const hasOffset = /(?:Z|[+-]\d{2}:?\d{2})$/.test(raw);
  const parsed = new Date(hasOffset ? raw : `${raw}+09:00`);
  if (Number.isNaN(parsed.getTime())) throw new Error('CAFE24_INVALID_TIMESTAMP');
  return parsed;
}

function basicAuthHeader(cfg: Cafe24OAuthConfig): string {
  return 'Basic ' + Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64');
}

/**
 * mall 관리자 승인 화면 URL.
 * state 는 호출부가 서명해서 넣는다 (이 파일은 상태를 보관하지 않는다).
 */
export function buildAuthorizeUrl(cfg: Cafe24OAuthConfig, mallId: string, state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: cfg.clientId,
    state,
    redirect_uri: cfg.redirectUri,
    scope: cfg.scopes.join(','),
  });
  return `${cafe24ApiBase(mallId)}/api/v2/oauth/authorize?${params.toString()}`;
}

async function postToken(
  cfg: Cafe24OAuthConfig,
  mallId: string,
  body: URLSearchParams,
): Promise<Cafe24TokenResponse> {
  const res = await fetch(`${cafe24ApiBase(mallId)}/api/v2/oauth/token`, {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(cfg),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const text = await res.text();
  if (!res.ok) {
    // 응답 본문에 token 이 실릴 여지가 없는 실패 경로지만, 방어적으로 상태코드만 남긴다.
    logger.error(`[cafe24] token request failed mall=${mallId} status=${res.status}`);
    throw new Error(`CAFE24_TOKEN_REQUEST_FAILED_${res.status}`);
  }

  let parsed: Cafe24TokenResponse;
  try {
    parsed = JSON.parse(text) as Cafe24TokenResponse;
  } catch {
    throw new Error('CAFE24_TOKEN_RESPONSE_PARSE_FAILED');
  }
  if (!parsed.access_token || !parsed.refresh_token) {
    throw new Error('CAFE24_TOKEN_RESPONSE_INCOMPLETE');
  }
  return parsed;
}

/** authorization_code → token */
export async function exchangeAuthorizationCode(
  cfg: Cafe24OAuthConfig,
  mallId: string,
  code: string,
): Promise<Cafe24TokenResponse> {
  return postToken(
    cfg,
    mallId,
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: cfg.redirectUri,
    }),
  );
}

/**
 * refresh_token → token.
 * Cafe24 는 갱신 시 **새 refresh token 을 발급하고 기존 것을 폐기**하므로
 * 호출부는 반드시 반환값 전체를 원자적으로 저장해야 한다.
 */
export async function refreshAccessToken(
  cfg: Cafe24OAuthConfig,
  mallId: string,
  refreshToken: string,
): Promise<Cafe24TokenResponse> {
  return postToken(
    cfg,
    mallId,
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  );
}
