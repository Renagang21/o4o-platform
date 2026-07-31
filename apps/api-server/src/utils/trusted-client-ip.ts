/**
 * Trusted Client IP
 *
 * WO-O4O-TRUSTED-CLIENT-IP-AND-SECURITY-LOG-REDACTION-V1
 *
 * ── 배경 ─────────────────────────────────────────────────────────────────────
 * `app.set('trust proxy', true)` 는 `req.ip` 를 **X-Forwarded-For 최좌측**으로 만든다.
 * 최좌측은 클라이언트가 임의로 주입할 수 있는 위치이므로, 이 값을 IP 차단·rate-limit 키로
 * 쓰면 공격자가 **임의 IP를 차단**시키거나 **자신의 차단을 회피**할 수 있다.
 *
 * ── 프로덕션 실측 (2026-08-01, GET /admin/diagnostics/proxy-chain) ────────────
 * 경로: client → 글로벌 외부 HTTPS LB(o4o-global-lb) → serverless NEG → Cloud Run
 *
 *   A. XFF 미주입 :  [ <client-ip>, <lb-ip> ]                 (2개)
 *   B. XFF 주입   :  [ <주입값>, <client-ip>, <lb-ip> ]        (3개)
 *
 * 즉 인프라가 신뢰 가능하게 덧붙이는 항목은 **오른쪽 2개**이고, 실제 클라이언트 IP 는
 * **오른쪽에서 두 번째**다. (Google 외부 ALB 의 문서화된 형식 `<supplied>,<client>,<lb>` 와 일치)
 *
 * 따라서 신뢰 hop 수는 **2** 다.
 *   - `1` 로 두면 `req.ip` 가 LB IP 하나로 고정되어 **전 사용자가 같은 IP** 로 취급된다(치명적).
 *   - `true` 로 두면 위조값을 신뢰한다(현 상태).
 *
 * ── 사용 원칙 ────────────────────────────────────────────────────────────────
 * XFF 를 직접 파싱해 첫 값을 고르는 방식은 금지한다. Express 의 trust proxy 판정을 거친
 * `req.ip` 만 사용하고, 그 접근을 이 헬퍼 하나로 통일한다.
 */
import type { Request } from 'express';

/** 기본 신뢰 hop 수 — 프로덕션 실측값 (LB 가 client-ip + lb-ip 를 덧붙임) */
export const DEFAULT_TRUSTED_PROXY_HOPS = 2;

/**
 * 환경변수로 조정 가능한 신뢰 hop 수.
 * 토폴로지가 바뀌면(LB 제거·프록시 추가) 재배포 없이 값만 조정한다.
 * 잘못된 값은 무시하고 기본값으로 폴백한다.
 */
export function resolveTrustedProxyHops(raw = process.env.TRUSTED_PROXY_HOPS): number {
  const n = Number(raw);
  if (!raw || !Number.isInteger(n) || n < 0 || n > 10) return DEFAULT_TRUSTED_PROXY_HOPS;
  return n;
}

/**
 * 보안 판정(차단 · rate-limit · 감사 로그)에 쓸 **신뢰 가능한 클라이언트 IP**.
 *
 * `req.ip` 는 `app.set('trust proxy', resolveTrustedProxyHops())` 아래에서
 * 신뢰 구간의 최좌측 = 실제 클라이언트 IP 가 된다. 프록시가 없는 로컬/직결 환경에서는
 * TCP 피어 주소로 자연 폴백한다.
 *
 * 값이 없으면 `'unknown'` 을 돌려준다 — 호출부가 임의 문자열을 키로 쓰지 않도록
 * 폴백 문자열을 한 곳에서 고정한다.
 */
export function getTrustedClientIp(req: Request): string {
  const ip = req.ip || req.socket?.remoteAddress || '';
  return normalizeIp(ip) || 'unknown';
}

/**
 * 동일 주소가 표기 차이로 다른 키가 되지 않도록 정규화한다.
 *   `::ffff:127.0.0.1` → `127.0.0.1`   (IPv4-mapped IPv6)
 *   대문자 IPv6        → 소문자
 *   앞뒤 공백          → 제거
 */
export function normalizeIp(raw: string | undefined | null): string {
  const value = String(raw ?? '').trim();
  if (!value) return '';
  const unmapped = value.replace(/^::ffff:/i, '');
  // IPv4 는 그대로, IPv6 는 소문자로 통일
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(unmapped) ? unmapped : unmapped.toLowerCase();
}
