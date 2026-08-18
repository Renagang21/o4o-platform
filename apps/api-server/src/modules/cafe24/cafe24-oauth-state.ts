/**
 * Cafe24 OAuth state (CSRF 방지)
 * WO-O4O-CAFE24-OAUTH-PRODUCT-CENSUS-V1 §5-2
 *
 * state 저장용 테이블·세션을 새로 만들지 않는다 — client_secret 으로 HMAC 서명한
 * stateless state 를 쓴다 (5분 만료). 서명 키는 DB 에 없고 환경 secret 에만 있다.
 */

import crypto from 'crypto';

const STATE_TTL_MS = 5 * 60 * 1000;

interface StatePayload {
  mallId: string;
  shopNo: number;
  nonce: string;
  exp: number;
}

function sign(secret: string, body: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('base64url');
}

export function issueState(secret: string, mallId: string, shopNo: number): string {
  const payload: StatePayload = {
    mallId,
    shopNo,
    nonce: crypto.randomBytes(12).toString('base64url'),
    exp: Date.now() + STATE_TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(secret, body)}`;
}

/** 유효하면 payload, 아니면 null. 만료·서명불일치·형식오류를 구분하지 않는다(정보 최소화). */
export function verifyState(secret: string, state: string): StatePayload | null {
  const parts = (state || '').split('.');
  if (parts.length !== 2) return null;
  const [body, mac] = parts;

  const expected = sign(secret, body);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as StatePayload;
    if (!payload?.mallId || typeof payload.exp !== 'number') return null;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
