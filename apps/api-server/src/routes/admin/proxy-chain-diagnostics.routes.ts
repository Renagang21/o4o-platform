/**
 * Proxy Chain Diagnostics — **임시 측정용 엔드포인트**
 *
 * WO-O4O-TRUSTED-CLIENT-IP-AND-SECURITY-LOG-REDACTION-V1
 *
 * ⚠️ 이 라우트는 **측정이 끝나면 제거한다.** 실제 프록시 체인을 반환하는 기능은 공격 표면이므로
 *    별도의 운영 진단 체계가 생기기 전까지 상시 기능으로 남기지 않는다.
 *
 * 목적:
 *   api.neture.co.kr → 글로벌 외부 HTTPS LB(o4o-global-lb) → serverless NEG → Cloud Run
 *   경로에서 **컨테이너가 실제로 인식하는 프록시 체인**과 필요한 `trust proxy` hop 수를 확정한다.
 *   현재 `app.set('trust proxy', true)` 이므로 `req.ip` 가 클라이언트 주입값을 채택할 수 있는데,
 *   hop 수를 추정으로 바꾸면 반대로 모든 사용자가 LB IP 하나로 접히는 위험이 있어 실측이 필요하다.
 *
 * 안전 계약:
 *   - `platform:admin` / `platform:super_admin` 만 접근
 *   - **호출자 자신의 현재 요청 정보만** 반환 (임의 IP 조회·입력 기능 없음)
 *   - 쿠키 · Authorization · 전체 헤더 · 전체 요청 객체를 반환하거나 로그에 남기지 않음
 *   - IP 는 마스킹해서 반환 (`203.0.113.7` → `203.0.*.*`)
 *   - X-Forwarded-For 원문을 로그에 남기지 않음
 *   - DB read/write · migration 없음
 */
import { Router, type Request, type Response } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';

const router: Router = Router();

const ADMIN_ROLES = ['platform:admin', 'platform:super_admin'];

/**
 * IP 마스킹 — 어느 대역인지 구분할 수 있을 만큼만 남기고 나머지는 가린다.
 *   IPv4            `203.0.113.7`            → `203.0.*.*`
 *   IPv4-mapped v6  `::ffff:112.153.205.95`  → `203.0.*.*` 형태로 동일 처리
 *   IPv6            `2001:db8:1:2::1`        → `2001:db8:*`
 */
function maskIp(raw: string): string {
  const value = String(raw ?? '').trim();
  if (!value) return '(empty)';

  const v4mapped = value.replace(/^::ffff:/i, '');
  const v4 = v4mapped.match(/^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (v4) return `${v4[1]}.${v4[2]}.*.*`;

  if (value.includes(':')) {
    const groups = value.split(':').filter(Boolean);
    return groups.length >= 2 ? `${groups[0]}:${groups[1]}:*` : `${groups[0] ?? ''}:*`;
  }
  // IP 형식이 아니면 값 자체를 노출하지 않는다
  return '(non-ip)';
}

/**
 * GET /api/v1/admin/diagnostics/proxy-chain
 *
 * 응답에는 마스킹된 값만 담는다. 측정자는 두 번 호출해 비교한다:
 *   A. X-Forwarded-For 를 붙이지 않은 정상 요청
 *   B. X-Forwarded-For: 203.0.113.7 을 붙인 정상 요청 (→ `203.0.*.*` 로 식별)
 */
router.get(
  '/proxy-chain',
  authenticate,
  requireRole(ADMIN_ROLES),
  (req: Request, res: Response) => {
    const app = req.app;
    const trustProxySetting = app.get('trust proxy');
    const rawXff = req.headers['x-forwarded-for'];
    const xffEntries = (Array.isArray(rawXff) ? rawXff.join(',') : (rawXff ?? ''))
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    // req.ips 는 trust proxy 설정에 따라 "신뢰된 것으로 간주된" 체인이다.
    const trustedChain = Array.isArray(req.ips) ? req.ips : [];

    return res.json({
      success: true,
      data: {
        note: 'temporary diagnostic — remove after trust proxy hop count is confirmed',
        trustProxySetting: typeof trustProxySetting === 'function' ? '[function]' : trustProxySetting,
        // 컨테이너가 받은 XFF 전체 항목 수와 순서 (값은 마스킹)
        xff: {
          count: xffEntries.length,
          entries: xffEntries.map((ip, index) => ({
            index,                                   // 0 = 최좌측(클라이언트가 주입 가능한 위치)
            fromRight: xffEntries.length - index,    // 1 = 최우측(가장 가까운 프록시가 추가)
            masked: maskIp(ip),
          })),
        },
        // 현재 설정에서 Express 가 계산한 값
        express: {
          reqIp: maskIp(req.ip ?? ''),
          reqIpsCount: trustedChain.length,
          reqIps: trustedChain.map(maskIp),
        },
        // TCP 피어 (프록시 뒤에서는 항상 프록시 주소)
        socketRemoteAddress: maskIp(req.socket?.remoteAddress ?? ''),
      },
    });
  },
);

export default router;
