/**
 * Foreign Visitor Partner routes
 * WO-O4O-FOREIGN-VISITOR-PARTNER-MODEL-V1
 *
 * Mount: /api/v1/foreign-visitor/partners
 * 외국인 관광객 유입 파트너 등록/조회/수정/상태변경 (매장 경영자 전용).
 *
 * 권한: requireAuth + isStoreOwner(serviceKey) → organizationId. client storeId 미신뢰.
 * entitlement gate(후보 A): 조회(GET)는 허용, 쓰기(POST/PATCH/status)는 FOREIGN_VISITOR_SALES_SUPPORT
 *   ACTIVE 이용권 필요(403 ENTITLEMENT_REQUIRED).
 * ⚠️ Neture seller/supplier partner 와 무관한 독립 도메인.
 */
import { Router } from 'express';
import type { Response } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../middleware/auth.middleware.js';
import type { AuthRequest } from '../../types/auth.js';
import logger from '../../utils/logger.js';
import { isStoreOwner, type StoreOwnerServiceKey } from '../../utils/store-owner.utils.js';
import { StorePaidFeatureEntitlementService } from '../store-entitlement/store-paid-feature-entitlement.service.js';
import { ForeignVisitorPartnerService } from './foreign-visitor-partner.service.js';
import {
  FOREIGN_VISITOR_PARTNER_TYPES,
  FOREIGN_VISITOR_PARTNER_STATUSES,
  type ForeignVisitorPartnerType,
  type ForeignVisitorPartnerStatus,
} from './foreign-visitor-partner.entity.js';

const STORE_OWNER_SERVICE_KEYS: StoreOwnerServiceKey[] = ['kpa', 'glycopharm', 'cosmetics'];
const GATE_PLAN_CODE = 'FOREIGN_VISITOR_SALES_SUPPORT' as const;

function isValidType(v: unknown): v is ForeignVisitorPartnerType {
  return typeof v === 'string' && (FOREIGN_VISITOR_PARTNER_TYPES as readonly string[]).includes(v);
}
function isValidStatus(v: unknown): v is ForeignVisitorPartnerStatus {
  return typeof v === 'string' && (FOREIGN_VISITOR_PARTNER_STATUSES as readonly string[]).includes(v);
}
/** 선택 문자열 정규화 — 빈 문자열은 null. */
function optStr(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

export function createForeignVisitorPartnerRoutes(dataSource: DataSource): Router {
  const router = Router();
  const service = new ForeignVisitorPartnerService(dataSource);
  const entitlementService = new StorePaidFeatureEntitlementService(dataSource);

  /** serviceKey 검증 + store_owner 소유권 해석 → organizationId. */
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

  /** 쓰기 작업 entitlement gate(후보 A). */
  async function assertEntitled(organizationId: string, serviceKey: string): Promise<boolean> {
    return entitlementService.hasActiveEntitlement(organizationId, serviceKey, GATE_PLAN_CODE);
  }

  // GET /  — 목록 (조회는 entitlement 불요)
  router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' });
      const resolved = await resolveOwnerStore(userId, req.query.serviceKey);
      if ('error' in resolved) return res.status(resolved.error.status).json({ success: false, error: resolved.error.message, code: resolved.error.code });

      const statusQ = req.query.status;
      const typeQ = req.query.partnerType;
      const result = await service.list({
        organizationId: resolved.organizationId,
        serviceKey: resolved.serviceKey,
        status: isValidStatus(statusQ) ? statusQ : undefined,
        partnerType: isValidType(typeQ) ? typeQ : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        page: req.query.page ? parseInt(String(req.query.page), 10) : undefined,
        limit: req.query.limit ? parseInt(String(req.query.limit), 10) : undefined,
      });
      return res.json({
        success: true,
        data: result.items,
        pagination: { page: result.page, limit: result.limit, total: result.total, totalPages: Math.ceil(result.total / result.limit) },
      });
    } catch (error) {
      logger.error('[ForeignVisitorPartner] list error:', error);
      return res.status(500).json({ success: false, error: 'Internal error', code: 'INTERNAL_ERROR' });
    }
  });

  // GET /:partnerId — 상세 (조회는 entitlement 불요)
  router.get('/:partnerId', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' });
      const resolved = await resolveOwnerStore(userId, req.query.serviceKey);
      if ('error' in resolved) return res.status(resolved.error.status).json({ success: false, error: resolved.error.message, code: resolved.error.code });

      const partner = await service.getById(resolved.organizationId, resolved.serviceKey, String(req.params.partnerId));
      if (!partner) return res.status(404).json({ success: false, error: 'Partner not found', code: 'PARTNER_NOT_FOUND' });
      return res.json({ success: true, data: partner });
    } catch (error) {
      logger.error('[ForeignVisitorPartner] detail error:', error);
      return res.status(500).json({ success: false, error: 'Internal error', code: 'INTERNAL_ERROR' });
    }
  });

  // POST / — 생성 (쓰기 → entitlement ACTIVE 필요)
  router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' });
      const resolved = await resolveOwnerStore(userId, req.body?.serviceKey);
      if ('error' in resolved) return res.status(resolved.error.status).json({ success: false, error: resolved.error.message, code: resolved.error.code });

      if (!isValidType(req.body?.partnerType)) {
        return res.status(400).json({ success: false, error: 'invalid partnerType', code: 'INVALID_PARTNER_TYPE' });
      }
      const partnerName = String(req.body?.partnerName || '').trim();
      if (!partnerName) {
        return res.status(400).json({ success: false, error: 'partnerName is required', code: 'MISSING_PARTNER_NAME' });
      }
      if (!(await assertEntitled(resolved.organizationId, resolved.serviceKey))) {
        return res.status(403).json({ success: false, error: '외국인 여행객 판매지원 이용권이 필요합니다.', code: 'ENTITLEMENT_REQUIRED' });
      }

      const created = await service.create(
        resolved.organizationId,
        resolved.serviceKey,
        {
          partnerType: req.body.partnerType,
          partnerName,
          contactName: optStr(req.body?.contactName),
          contactPhone: optStr(req.body?.contactPhone),
          contactEmail: optStr(req.body?.contactEmail),
          memo: optStr(req.body?.memo),
        },
        userId,
      );
      return res.status(201).json({ success: true, data: created });
    } catch (error) {
      logger.error('[ForeignVisitorPartner] create error:', error);
      return res.status(500).json({ success: false, error: 'Internal error', code: 'INTERNAL_ERROR' });
    }
  });

  // PATCH /:partnerId — 부분 수정 (쓰기 → entitlement ACTIVE 필요)
  router.patch('/:partnerId', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' });
      const resolved = await resolveOwnerStore(userId, req.body?.serviceKey);
      if ('error' in resolved) return res.status(resolved.error.status).json({ success: false, error: resolved.error.message, code: resolved.error.code });

      if (req.body?.partnerType !== undefined && !isValidType(req.body.partnerType)) {
        return res.status(400).json({ success: false, error: 'invalid partnerType', code: 'INVALID_PARTNER_TYPE' });
      }
      if (req.body?.status !== undefined && !isValidStatus(req.body.status)) {
        return res.status(400).json({ success: false, error: 'invalid status', code: 'INVALID_STATUS' });
      }
      if (req.body?.partnerName !== undefined && !String(req.body.partnerName).trim()) {
        return res.status(400).json({ success: false, error: 'partnerName cannot be empty', code: 'MISSING_PARTNER_NAME' });
      }
      if (!(await assertEntitled(resolved.organizationId, resolved.serviceKey))) {
        return res.status(403).json({ success: false, error: '외국인 여행객 판매지원 이용권이 필요합니다.', code: 'ENTITLEMENT_REQUIRED' });
      }

      const updated = await service.update(
        resolved.organizationId,
        resolved.serviceKey,
        String(req.params.partnerId),
        {
          ...(req.body?.partnerType !== undefined && { partnerType: req.body.partnerType }),
          ...(req.body?.partnerName !== undefined && { partnerName: String(req.body.partnerName).trim() }),
          ...(req.body?.contactName !== undefined && { contactName: optStr(req.body.contactName) }),
          ...(req.body?.contactPhone !== undefined && { contactPhone: optStr(req.body.contactPhone) }),
          ...(req.body?.contactEmail !== undefined && { contactEmail: optStr(req.body.contactEmail) }),
          ...(req.body?.memo !== undefined && { memo: optStr(req.body.memo) }),
          ...(req.body?.status !== undefined && { status: req.body.status }),
        },
        userId,
      );
      if (!updated) return res.status(404).json({ success: false, error: 'Partner not found', code: 'PARTNER_NOT_FOUND' });
      return res.json({ success: true, data: updated });
    } catch (error) {
      logger.error('[ForeignVisitorPartner] update error:', error);
      return res.status(500).json({ success: false, error: 'Internal error', code: 'INTERNAL_ERROR' });
    }
  });

  // PATCH /:partnerId/status — 상태 변경 (쓰기 → entitlement ACTIVE 필요). hard delete 대신 INACTIVE.
  router.patch('/:partnerId/status', requireAuth, async (req: AuthRequest, res: Response) => {
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

      const updated = await service.setStatus(resolved.organizationId, resolved.serviceKey, String(req.params.partnerId), req.body.status, userId);
      if (!updated) return res.status(404).json({ success: false, error: 'Partner not found', code: 'PARTNER_NOT_FOUND' });
      return res.json({ success: true, data: updated });
    } catch (error) {
      logger.error('[ForeignVisitorPartner] setStatus error:', error);
      return res.status(500).json({ success: false, error: 'Internal error', code: 'INTERNAL_ERROR' });
    }
  });

  return router;
}
