/**
 * Foreign Visitor Partner QR Code routes
 * WO-O4O-FOREIGN-VISITOR-AFFILIATE-QR-TEMPLATE-V1
 *
 * Mount: /api/v1/foreign-visitor
 *   GET  /partners/:partnerId/qr-codes        목록
 *   POST /partners/:partnerId/qr-codes        생성(entitlement)
 *   GET  /partner-qr-codes/:qrCodeId          상세
 *   PATCH /partner-qr-codes/:qrCodeId         수정(entitlement)
 *   PATCH /partner-qr-codes/:qrCodeId/status  상태(entitlement)
 *   GET  /partner-qr-codes/:qrCodeId/svg      QR SVG (image/svg+xml)
 *
 * 권한: requireAuth + isStoreOwner(serviceKey) → organizationId. client storeId 미신뢰.
 * 파트너 소유권: partnerId 가 같은 (org, serviceKey) 에 속하는지 선검증.
 * entitlement gate: 쓰기(POST/PATCH/status) 는 FOREIGN_VISITOR_SALES_SUPPORT ACTIVE 필요. GET(목록/상세/svg) 허용.
 * ⚠️ landing 본 구현/scan event/결제 와 무관. Neture partner 와 별개.
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../middleware/auth.middleware.js';
import type { AuthRequest } from '../../types/auth.js';
import logger from '../../utils/logger.js';
import { isStoreOwner, type StoreOwnerServiceKey } from '../../utils/store-owner.utils.js';
import { generateQrSvg } from '../../services/qr-print.service.js';
// WO-O4O-FOREIGN-VISITOR-AFFILIATE-LANDING-V1: public landing 의 store slug 연결용(multilingual landing 과 동일 SSOT)
import { StoreSlugService, type StoreSlugServiceKey } from '@o4o/platform-core/store-identity';
import { StorePaidFeatureEntitlementService } from '../store-entitlement/store-paid-feature-entitlement.service.js';
import { ForeignVisitorPartnerService } from './foreign-visitor-partner.service.js';
import { ForeignVisitorPartnerQrCodeService } from './foreign-visitor-partner-qr-code.service.js';
// WO-O4O-FOREIGN-VISITOR-AFFILIATE-QR-SCAN-EVENT-V1: 익명 스캔 이벤트 기록/집계
import { ForeignVisitorPartnerQrScanEventService, hashWithSalt } from './foreign-visitor-partner-qr-scan-event.service.js';
import { FOREIGN_VISITOR_QR_STATUSES, type ForeignVisitorQrStatus } from './foreign-visitor-partner-qr-code.entity.js';

const STORE_OWNER_SERVICE_KEYS: StoreOwnerServiceKey[] = ['kpa', 'glycopharm', 'cosmetics'];
const GATE_PLAN_CODE = 'FOREIGN_VISITOR_SALES_SUPPORT' as const;

function isValidStatus(v: unknown): v is ForeignVisitorQrStatus {
  return typeof v === 'string' && (FOREIGN_VISITOR_QR_STATUSES as readonly string[]).includes(v);
}
function optStr(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

export function createForeignVisitorPartnerQrCodeRoutes(dataSource: DataSource): Router {
  const router = Router();
  const partnerService = new ForeignVisitorPartnerService(dataSource);
  const qrService = new ForeignVisitorPartnerQrCodeService(dataSource);
  const entitlementService = new StorePaidFeatureEntitlementService(dataSource);
  const scanService = new ForeignVisitorPartnerQrScanEventService(dataSource);

  // WO-O4O-FOREIGN-VISITOR-AFFILIATE-QR-SCAN-EVENT-V1:
  //   요청에서 개인정보 최소 스캔 메타 추출 — IP/UA 는 hash 만(원문 미저장).
  function deriveScanMeta(req: Request): {
    ipHash: string | null; userAgentHash: string | null; userAgentSummary: string | null; referrer: string | null;
  } {
    const xff = typeof req.headers['x-forwarded-for'] === 'string' ? req.headers['x-forwarded-for'] : '';
    const clientIp = (xff.split(',')[0] || '').trim() || req.ip || req.socket?.remoteAddress || '';
    const ua = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : '';
    const ref = typeof req.headers['referer'] === 'string' ? req.headers['referer'] : '';
    return {
      ipHash: hashWithSalt(clientIp || null),
      userAgentHash: hashWithSalt(ua || null),
      userAgentSummary: ua ? ua.slice(0, 160) : null,
      referrer: ref ? ref.slice(0, 500) : null,
    };
  }

  async function resolveOwnerStore(
    userId: string,
    serviceKeyRaw: unknown,
  ): Promise<{ serviceKey: StoreOwnerServiceKey; organizationId: string } | { error: { status: number; code: string; message: string } }> {
    const serviceKey = String(serviceKeyRaw || '').trim() as StoreOwnerServiceKey;
    if (!STORE_OWNER_SERVICE_KEYS.includes(serviceKey)) {
      return { error: { status: 400, code: 'UNKNOWN_SERVICE_KEY', message: `unknown serviceKey: ${serviceKey}` } };
    }
    const { isOwner, organizationId } = await isStoreOwner(dataSource, userId, serviceKey);
    if (!isOwner || !organizationId) {
      return { error: { status: 403, code: 'NOT_STORE_OWNER', message: '해당 매장의 경영자 권한이 없습니다.' } };
    }
    return { serviceKey, organizationId };
  }

  async function assertEntitled(organizationId: string, serviceKey: string): Promise<boolean> {
    return entitlementService.hasActiveEntitlement(organizationId, serviceKey, GATE_PLAN_CODE);
  }

  // GET /partners/:partnerId/qr-codes — 파트너별 QR 목록
  router.get('/partners/:partnerId/qr-codes', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' });
      const resolved = await resolveOwnerStore(userId, req.query.serviceKey);
      if ('error' in resolved) return res.status(resolved.error.status).json({ success: false, error: resolved.error.message, code: resolved.error.code });

      const partnerId = String(req.params.partnerId);
      const partner = await partnerService.getById(resolved.organizationId, resolved.serviceKey, partnerId);
      if (!partner) return res.status(404).json({ success: false, error: 'Partner not found', code: 'PARTNER_NOT_FOUND' });

      const result = await qrService.listByPartner({
        organizationId: resolved.organizationId,
        serviceKey: resolved.serviceKey,
        partnerId,
        status: isValidStatus(req.query.status) ? req.query.status : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        page: req.query.page ? parseInt(String(req.query.page), 10) : undefined,
        limit: req.query.limit ? parseInt(String(req.query.limit), 10) : undefined,
      });
      // WO-O4O-FOREIGN-VISITOR-AFFILIATE-QR-SCAN-EVENT-V1: 목록에 scanCount/lastScannedAt 포함(batch).
      const counts = await scanService.getCountsForQrCodeIds(result.items.map((q) => q.id));
      const data = result.items.map((q) => ({
        ...q,
        scanCount: counts.get(q.id)?.scanCount ?? 0,
        lastScannedAt: counts.get(q.id)?.lastScannedAt ?? null,
      }));
      return res.json({
        success: true,
        data,
        pagination: { page: result.page, limit: result.limit, total: result.total, totalPages: Math.ceil(result.total / result.limit) },
      });
    } catch (error) {
      logger.error('[FVPartnerQr] list error:', error);
      return res.status(500).json({ success: false, error: 'Internal error', code: 'INTERNAL_ERROR' });
    }
  });

  // POST /partners/:partnerId/qr-codes — QR 생성 (entitlement)
  router.post('/partners/:partnerId/qr-codes', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' });
      const resolved = await resolveOwnerStore(userId, req.body?.serviceKey);
      if ('error' in resolved) return res.status(resolved.error.status).json({ success: false, error: resolved.error.message, code: resolved.error.code });

      const partnerId = String(req.params.partnerId);
      const partner = await partnerService.getById(resolved.organizationId, resolved.serviceKey, partnerId);
      if (!partner) return res.status(404).json({ success: false, error: 'Partner not found', code: 'PARTNER_NOT_FOUND' });

      const qrCodeName = String(req.body?.qrCodeName || '').trim();
      if (!qrCodeName) return res.status(400).json({ success: false, error: 'qrCodeName is required', code: 'MISSING_QR_NAME' });

      if (!(await assertEntitled(resolved.organizationId, resolved.serviceKey))) {
        return res.status(403).json({ success: false, error: '외국인 여행객 판매지원 이용권이 필요합니다.', code: 'ENTITLEMENT_REQUIRED' });
      }

      const created = await qrService.create(
        resolved.organizationId,
        resolved.serviceKey,
        partnerId,
        {
          qrCodeName,
          campaignName: optStr(req.body?.campaignName),
          language: optStr(req.body?.language),
          validFrom: optStr(req.body?.validFrom),
          validTo: optStr(req.body?.validTo),
        },
        userId,
      );
      return res.status(201).json({ success: true, data: created });
    } catch (error) {
      logger.error('[FVPartnerQr] create error:', error);
      return res.status(500).json({ success: false, error: 'Internal error', code: 'INTERNAL_ERROR' });
    }
  });

  // GET /partner-qr-codes/:qrCodeId — 상세
  router.get('/partner-qr-codes/:qrCodeId', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' });
      const resolved = await resolveOwnerStore(userId, req.query.serviceKey);
      if ('error' in resolved) return res.status(resolved.error.status).json({ success: false, error: resolved.error.message, code: resolved.error.code });

      const qr = await qrService.getById(resolved.organizationId, resolved.serviceKey, String(req.params.qrCodeId));
      if (!qr) return res.status(404).json({ success: false, error: 'QR not found', code: 'QR_NOT_FOUND' });
      return res.json({ success: true, data: qr });
    } catch (error) {
      logger.error('[FVPartnerQr] detail error:', error);
      return res.status(500).json({ success: false, error: 'Internal error', code: 'INTERNAL_ERROR' });
    }
  });

  // PATCH /partner-qr-codes/:qrCodeId — 수정 (entitlement)
  router.patch('/partner-qr-codes/:qrCodeId', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' });
      const resolved = await resolveOwnerStore(userId, req.body?.serviceKey);
      if ('error' in resolved) return res.status(resolved.error.status).json({ success: false, error: resolved.error.message, code: resolved.error.code });

      if (req.body?.qrCodeName !== undefined && !String(req.body.qrCodeName).trim()) {
        return res.status(400).json({ success: false, error: 'qrCodeName cannot be empty', code: 'MISSING_QR_NAME' });
      }
      if (req.body?.status !== undefined && !isValidStatus(req.body.status)) {
        return res.status(400).json({ success: false, error: 'invalid status', code: 'INVALID_STATUS' });
      }
      if (!(await assertEntitled(resolved.organizationId, resolved.serviceKey))) {
        return res.status(403).json({ success: false, error: '외국인 여행객 판매지원 이용권이 필요합니다.', code: 'ENTITLEMENT_REQUIRED' });
      }

      const updated = await qrService.update(
        resolved.organizationId,
        resolved.serviceKey,
        String(req.params.qrCodeId),
        {
          ...(req.body?.qrCodeName !== undefined && { qrCodeName: String(req.body.qrCodeName).trim() }),
          ...(req.body?.campaignName !== undefined && { campaignName: optStr(req.body.campaignName) }),
          ...(req.body?.language !== undefined && { language: optStr(req.body.language) }),
          ...(req.body?.validFrom !== undefined && { validFrom: optStr(req.body.validFrom) }),
          ...(req.body?.validTo !== undefined && { validTo: optStr(req.body.validTo) }),
          ...(req.body?.status !== undefined && { status: req.body.status }),
        },
        userId,
      );
      if (!updated) return res.status(404).json({ success: false, error: 'QR not found', code: 'QR_NOT_FOUND' });
      return res.json({ success: true, data: updated });
    } catch (error) {
      logger.error('[FVPartnerQr] update error:', error);
      return res.status(500).json({ success: false, error: 'Internal error', code: 'INTERNAL_ERROR' });
    }
  });

  // PATCH /partner-qr-codes/:qrCodeId/status — 상태 변경 (entitlement)
  router.patch('/partner-qr-codes/:qrCodeId/status', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' });
      const resolved = await resolveOwnerStore(userId, req.body?.serviceKey);
      if ('error' in resolved) return res.status(resolved.error.status).json({ success: false, error: resolved.error.message, code: resolved.error.code });

      if (!isValidStatus(req.body?.status)) {
        return res.status(400).json({ success: false, error: 'invalid status', code: 'INVALID_STATUS' });
      }
      if (!(await assertEntitled(resolved.organizationId, resolved.serviceKey))) {
        return res.status(403).json({ success: false, error: '외국인 여행객 판매지원 이용권이 필요합니다.', code: 'ENTITLEMENT_REQUIRED' });
      }

      const updated = await qrService.setStatus(resolved.organizationId, resolved.serviceKey, String(req.params.qrCodeId), req.body.status, userId);
      if (!updated) return res.status(404).json({ success: false, error: 'QR not found', code: 'QR_NOT_FOUND' });
      return res.json({ success: true, data: updated });
    } catch (error) {
      logger.error('[FVPartnerQr] setStatus error:', error);
      return res.status(500).json({ success: false, error: 'Internal error', code: 'INTERNAL_ERROR' });
    }
  });

  // GET /partner-qr-codes/:qrCodeId/svg?size=512 — QR SVG (기존 generateQrSvg 재사용)
  router.get('/partner-qr-codes/:qrCodeId/svg', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' });
      const resolved = await resolveOwnerStore(userId, req.query.serviceKey);
      if ('error' in resolved) return res.status(resolved.error.status).json({ success: false, error: resolved.error.message, code: resolved.error.code });

      const qr = await qrService.getById(resolved.organizationId, resolved.serviceKey, String(req.params.qrCodeId));
      if (!qr) return res.status(404).json({ success: false, error: 'QR not found', code: 'QR_NOT_FOUND' });

      const sizeRaw = req.query.size ? parseInt(String(req.query.size), 10) : 512;
      const size = Number.isFinite(sizeRaw) ? Math.min(1024, Math.max(128, sizeRaw)) : 512;
      const svg = await generateQrSvg(qr.landingUrl, size);
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'private, max-age=60');
      return res.send(svg);
    } catch (error) {
      logger.error('[FVPartnerQr] svg error:', error);
      return res.status(500).json({ success: false, error: 'Internal error', code: 'INTERNAL_ERROR' });
    }
  });

  // ── PUBLIC (no auth): WO-O4O-FOREIGN-VISITOR-AFFILIATE-LANDING-V1 / -QR-SCAN-EVENT-V1 ──
  // GET /affiliate/:shortCode/resolve — QR 스캔 landing 해석. shortCode → store 식별(공개 안전 필드만).
  //   resolve 성공 시 익명 scan event 기록(IP/UA hash 만) · partnerId/내부 id 미노출 · 결제 무관 · 비활성/만료/미존재 → 404(미기록).
  router.get('/affiliate/:shortCode/resolve', async (req: Request, res: Response) => {
    try {
      const shortCode = String(req.params.shortCode || '').trim();
      if (!shortCode || shortCode.length > 40) {
        return res.status(404).json({ success: false, error: 'Not found', code: 'AFFILIATE_QR_NOT_FOUND' });
      }
      const qr = await qrService.resolvePublicByShortCode(shortCode);
      if (!qr) {
        return res.status(404).json({ success: false, error: 'Not found', code: 'AFFILIATE_QR_NOT_FOUND' });
      }
      // 조직명(storeName) + store slug — 공개 landing 표시/연결용(둘 다 graceful, 없으면 null).
      let storeName: string | null = null;
      try {
        const rows = await dataSource.query(`SELECT name FROM organizations WHERE id = $1 LIMIT 1`, [qr.organizationId]);
        storeName = rows?.[0]?.name ?? null;
      } catch { /* graceful */ }
      let storeSlug: string | null = null;
      try {
        const slugRecord = await new StoreSlugService(dataSource).findByStoreId(qr.organizationId, qr.serviceKey as StoreSlugServiceKey);
        storeSlug = slugRecord?.slug ?? null;
      } catch { /* graceful */ }

      // WO-O4O-FOREIGN-VISITOR-AFFILIATE-QR-SCAN-EVENT-V1: 익명 스캔 기록(best-effort — 실패해도 resolve 응답 영향 없음).
      try {
        const meta = deriveScanMeta(req);
        await scanService.recordScan({
          organizationId: qr.organizationId,
          serviceKey: qr.serviceKey,
          partnerId: qr.partnerId,
          qrCodeId: qr.id,
          shortCode: qr.shortCode,
          campaignName: qr.campaignName ?? null,
          language: qr.language ?? null,
          landingPath: `/foreign-visitor/affiliate/${qr.shortCode}`,
          referrer: meta.referrer,
          ipHash: meta.ipHash,
          userAgentHash: meta.userAgentHash,
          userAgentSummary: meta.userAgentSummary,
        });
      } catch (scanErr) {
        logger.warn('[FVPartnerQr] scan record failed (non-blocking):', scanErr);
      }

      return res.json({
        success: true,
        data: {
          shortCode: qr.shortCode,
          serviceKey: qr.serviceKey,
          storeName,
          storeSlug,
          campaignName: qr.campaignName ?? null,
          language: qr.language ?? null,
        },
      });
    } catch (error) {
      logger.error('[FVPartnerQr] affiliate resolve error:', error);
      return res.status(500).json({ success: false, error: 'Internal error', code: 'INTERNAL_ERROR' });
    }
  });

  // GET /partner-qr-codes/:qrCodeId/stats — QR 스캔 통계(인증, 자기 매장 QR 만)
  //   WO-O4O-FOREIGN-VISITOR-AFFILIATE-QR-SCAN-EVENT-V1
  router.get('/partner-qr-codes/:qrCodeId/stats', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' });
      const resolved = await resolveOwnerStore(userId, req.query.serviceKey);
      if ('error' in resolved) return res.status(resolved.error.status).json({ success: false, error: resolved.error.message, code: resolved.error.code });

      // 소유권 검증: qrCodeId 가 자기 (org, serviceKey) 스코프인지 선확인(타 매장 접근 차단).
      const qr = await qrService.getById(resolved.organizationId, resolved.serviceKey, String(req.params.qrCodeId));
      if (!qr) return res.status(404).json({ success: false, error: 'QR not found', code: 'QR_NOT_FOUND' });

      const stats = await scanService.getStatsForQr(qr.id);
      return res.json({ success: true, data: stats });
    } catch (error) {
      logger.error('[FVPartnerQr] stats error:', error);
      return res.status(500).json({ success: false, error: 'Internal error', code: 'INTERNAL_ERROR' });
    }
  });

  return router;
}
