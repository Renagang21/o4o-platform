/**
 * Cafe24 쇼핑몰 **회원** 인증 client (Customer Access Token)
 *
 * WO-O4O-CAFE24-B2B-STORE-MEMBER-LOGIN-PILOT-V1 §3 · §11
 *
 * 운영자(Admin) OAuth 와 다른 축이다. 섞지 않는다.
 *
 *   운영자 축 (cafe24-oauth.client.ts)   회원 축 (이 파일)
 *   ─────────────────────────────────   ────────────────────────────────────
 *   host  {mall}.cafe24api.com          몰 대표도메인 ({mall}.cafe24.com 등)
 *   주체  쇼핑몰 운영자                  쇼핑몰 회원
 *   scope mall.read_product             mall.read_customer_identifier
 *   결과  Cafe24Connection (mall 연결)   user_identifier (회원 식별자)
 *
 * scope 는 `mall.read_customer_identifier` **하나만** 쓴다 (§3).
 * `mall.read_customer` 는 쓰지 않는다 — 회원 이름/email/전화번호를 가져오지 않는다.
 *
 * timestamp 는 기존 `parseCafe24Timestamp()` 를 재사용한다 (§11 — 새 파서 작성 금지).
 * Cafe24 는 offset 없는 KST 벽시계 문자열을 주므로 `new Date()` 직접 파싱은 금지다
 * (CHECK-O4O-CAFE24-TOKEN-EXPIRY-KST-PARSE-FIX-V1).
 */

import logger from '../../utils/logger.js';
import type { Cafe24TokenResponse } from './cafe24-oauth.client.js';

/** 회원 인증에 필요한 유일한 scope (§3). 확대 금지. */
export const CAFE24_MEMBER_SCOPES = ['mall.read_customer_identifier'] as const;

export interface Cafe24MemberAuthConfig {
  clientId: string;
  clientSecret: string;
  /** 회원 인증 전용 redirect URI. 운영자 축과 분리한다. */
  redirectUri: string;
  apiVersion: string;
  scopes: string[];
}

/**
 * 회원 인증 설정. 운영자 축과 **credential 은 공유하고 redirect URI 만 분리**한다
 * (Cafe24 앱 1개 = client_id 1개이며, D3 에 따라 client_id 는 immutable namespace 다).
 */
export function loadCafe24MemberAuthConfig(): Cafe24MemberAuthConfig | null {
  const clientId = process.env.CAFE24_CLIENT_ID;
  const clientSecret = process.env.CAFE24_CLIENT_SECRET;
  const redirectUri = process.env.CAFE24_MEMBER_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) return null;

  return {
    clientId,
    clientSecret,
    redirectUri,
    apiVersion: process.env.CAFE24_API_VERSION || '2026-03-01',
    scopes: [...CAFE24_MEMBER_SCOPES],
  };
}

/**
 * 회원 인증 host = 몰 **대표도메인**.
 *
 * 운영자 축의 `{mall}.cafe24api.com` 을 쓰면 회원 로그인 화면이 뜨지 않는다.
 * 기본값은 Cafe24 기본 도메인 규칙(`{mall}.cafe24.com`)이며, 자체 도메인을 쓰는 몰은
 * `CAFE24_MALL_PRIMARY_DOMAIN` 으로 덮는다.
 *
 * host 구성요소이므로 문자 클래스를 강하게 제한한다 (SSRF / host injection 방지 —
 * 운영자 축 `cafe24ApiBase()` 와 동일 정책).
 */
export function cafe24MemberApiBase(mallId: string): string {
  if (!/^[a-zA-Z0-9_-]{2,64}$/.test(mallId)) throw new Error('INVALID_MALL_ID');

  const override = (process.env.CAFE24_MALL_PRIMARY_DOMAIN || '').trim();
  if (override) {
    if (!/^[a-zA-Z0-9.-]{4,253}$/.test(override) || override.includes('..')) {
      throw new Error('INVALID_MALL_PRIMARY_DOMAIN');
    }
    return `https://${override}`;
  }
  return `https://${mallId}.cafe24.com`;
}

/** 회원 로그인·동의 화면 URL. 브라우저를 이 주소로 보낸다. */
export function buildMemberAuthorizeUrl(
  cfg: Cafe24MemberAuthConfig,
  mallId: string,
  state: string,
): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: cfg.clientId,
    state,
    redirect_uri: cfg.redirectUri,
    scope: cfg.scopes.join(','),
  });
  return `${cafe24MemberApiBase(mallId)}/api/v2/oauth/authorize?${params.toString()}`;
}

function basicAuthHeader(cfg: Cafe24MemberAuthConfig): string {
  return 'Basic ' + Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64');
}

/**
 * authorization code → Customer Access Token.
 *
 * 응답 형태는 운영자 축과 동일하므로 `Cafe24TokenResponse` 를 재사용한다.
 * 실패 로그에 code/token 을 싣지 않는다 (§10).
 */
export async function exchangeMemberAuthorizationCode(
  cfg: Cafe24MemberAuthConfig,
  mallId: string,
  code: string,
): Promise<Cafe24TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: cfg.redirectUri,
  });

  const res = await fetch(`${cafe24MemberApiBase(mallId)}/api/v2/oauth/token`, {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(cfg),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const text = await res.text();
  if (!res.ok) {
    logger.error(`[cafe24-b2b] member token request failed mall=${mallId} status=${res.status}`);
    throw new Error(`CAFE24_MEMBER_TOKEN_REQUEST_FAILED_${res.status}`);
  }

  let parsed: Cafe24TokenResponse;
  try {
    parsed = JSON.parse(text) as Cafe24TokenResponse;
  } catch {
    throw new Error('CAFE24_MEMBER_TOKEN_RESPONSE_PARSE_FAILED');
  }
  if (!parsed.access_token) throw new Error('CAFE24_MEMBER_TOKEN_RESPONSE_INCOMPLETE');
  return parsed;
}

export interface Cafe24CustomerIdentifier {
  shopNo: number;
  /** 앱 스코프 가명 식별자. **원문을 저장·로그·표시하지 않는다** (§4·§10). */
  userIdentifier: string;
}

/**
 * `GET /api/v2/customers/identifier` — 회원 식별자 조회.
 *
 * 인증 헤더는 Bearer 를 먼저 시도하고 401/403 이면 Basic 으로 한 번 재시도한다.
 * Cafe24 문서가 회원 API 헤더 표기를 개정한 이력이 있어, 한쪽에 고정하면 몰/버전에 따라
 * 전량 실패한다. 재시도는 1회로 제한하며 두 경로 모두 token 값을 로그에 남기지 않는다.
 */
export async function fetchCustomerIdentifier(
  cfg: Cafe24MemberAuthConfig,
  mallId: string,
  customerAccessToken: string,
  shopNo = 1,
): Promise<Cafe24CustomerIdentifier> {
  const url = `${cafe24MemberApiBase(mallId)}/api/v2/customers/identifier?shop_no=${encodeURIComponent(String(shopNo))}`;

  const call = (scheme: 'Bearer' | 'Basic') =>
    fetch(url, {
      headers: {
        Authorization: `${scheme} ${customerAccessToken}`,
        'Content-Type': 'application/json',
        'X-Cafe24-Api-Version': cfg.apiVersion,
      },
    });

  let res = await call('Bearer');
  if (res.status === 401 || res.status === 403) {
    logger.warn(`[cafe24-b2b] identifier Bearer rejected (${res.status}) — retrying with Basic`);
    res = await call('Basic');
  }
  if (!res.ok) {
    logger.error(`[cafe24-b2b] customer identifier failed mall=${mallId} status=${res.status}`);
    throw new Error(`CAFE24_CUSTOMER_IDENTIFIER_FAILED_${res.status}`);
  }

  const json = (await res.json()) as {
    identifier?: { shop_no?: number | string; user_identifier?: string };
  };
  const userIdentifier = json?.identifier?.user_identifier;
  if (!userIdentifier || typeof userIdentifier !== 'string') {
    throw new Error('CAFE24_CUSTOMER_IDENTIFIER_INCOMPLETE');
  }

  return {
    shopNo: Number(json?.identifier?.shop_no ?? shopNo) || shopNo,
    userIdentifier,
  };
}
