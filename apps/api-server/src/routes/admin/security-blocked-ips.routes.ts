/**
 * Admin — Blocked IP 조회 · 개별 해제
 *
 * WO-O4O-SECURITY-IP-BLOCK-TTL-AND-UNBLOCK-V1
 *
 *   GET  /api/v1/admin/security/blocked-ips           현재 인스턴스 차단 목록
 *   POST /api/v1/admin/security/blocked-ips/unblock   IP 1건 해제 (멱등)
 *
 * 권한: 기존 관리자 allowlist 를 그대로 쓴다 — 신규 권한 구조를 만들지 않는다.
 *   `platform:admin` / `platform:super_admin`
 *
 * ⚠️ 알려진 한계 (설계상):
 *   차단 상태는 **in-memory / 현재 Cloud Run 인스턴스 범위**다. 인스턴스 간 공유되지 않고
 *   재배포 시 초기화된다. 또한 이미 차단된 IP 에서는 이 API 자체에 도달할 수 없으므로
 *   해제하려면 다른 회선이 필요하다. (공유 저장소 도입은 별도 WO)
 *
 * 이번 WO 에서 제공하지 않는 것: 전체 해제 · CIDR · 일괄 해제 · 수동 차단 · allowlist.
 */
import { Router, type Request, type Response } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { securityAuditService } from '../../services/SecurityAuditService.js';
import { normalizeIp } from '../../utils/trusted-client-ip.js';
import logger from '../../utils/logger.js';

const router: Router = Router();

const ADMIN_ROLES = ['platform:admin', 'platform:super_admin'];

/** IPv4 / IPv6 최소 형식 검증 — 임의 문자열을 해제 키로 받지 않는다. */
const IPV4_RE = /^\d{1,3}(\.\d{1,3}){3}$/;
const IPV6_RE = /^[0-9a-f:]+$/i;

function isValidIp(value: string): boolean {
  if (!value) return false;
  if (IPV4_RE.test(value)) {
    return value.split('.').every((o) => Number(o) >= 0 && Number(o) <= 255);
  }
  return value.includes(':') && IPV6_RE.test(value);
}

/**
 * GET /api/v1/admin/security/blocked-ips
 * 응답에 요청 payload 등 민감 정보는 담지 않는다 (ip · 시각 · 남은 시간 · 사유 · 출처만).
 */
router.get('/blocked-ips', authenticate, requireRole(ADMIN_ROLES), (_req: Request, res: Response) => {
  const items = securityAuditService.getBlockedIPs();
  return res.json({
    success: true,
    data: {
      scope: 'current-instance',
      count: items.length,
      items,
    },
  });
});

/**
 * POST /api/v1/admin/security/blocked-ips/unblock
 * body: { ip: string }
 *
 * IPv6 는 `:` 를 포함해 path parameter 로 두면 인코딩이 불안정하므로 **body 방식**을 쓴다.
 * 멱등: 이미 없거나 만료된 IP 도 200 `changed=false` 로 응답한다.
 */
router.post('/blocked-ips/unblock', authenticate, requireRole(ADMIN_ROLES), (req: Request, res: Response) => {
  const raw = (req.body ?? {}) as Record<string, unknown>;
  const ip = normalizeIp(typeof raw.ip === 'string' ? raw.ip : '');

  if (!isValidIp(ip)) {
    return res.status(400).json({
      success: false,
      error: 'IP 형식이 올바르지 않습니다.',
      code: 'INVALID_IP',
    });
  }

  const changed = securityAuditService.unblockIP(ip);
  logger.info('[SECURITY] admin unblock request', {
    actorId: (req as any).user?.id,
    targetIp: ip,
    action: 'unblock',
    changed,
  });

  return res.json({
    success: true,
    data: { ip, changed, blocked: false },
  });
});

export default router;
