/**
 * K-Cosmetics MyPage Controller
 *
 * WO-O4O-KCOSMETICS-STORE-PROFILE-EDIT-PAGE-V1
 *
 * Routes:
 *   GET   /cosmetics/mypage/business-info — 매장 경영자 매장/사업자 정보 조회
 *   PATCH /cosmetics/mypage/business-info — 매장 경영자 매장/사업자 정보 수정
 *
 * 저장 SSOT: users.businessInfo JSONB (canonical signup source).
 * 권한 가드: cosmetics_members.subRole === 'store_owner' (그 외 403).
 *
 * 패턴 동일: apps/api-server/src/routes/glycopharm/controllers/mypage.controller.ts
 */

import { Router, Request, Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { CosmeticsMember } from '../entities/cosmetics-member.entity.js';

interface AuthRequest extends Request {
  user?: { userId?: string; id?: string };
}

function getUserId(req: AuthRequest): string | null {
  return req.user?.userId ?? req.user?.id ?? null;
}

const SAFE_STRING = (v: unknown, max = 255): string | null => {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, max);
};

const VALID_ENTITY_TYPES = [
  'individual', 'corporation', 'simple_taxpayer', 'general_taxpayer',
  'tax_exempt', 'non_profit', 'other',
];

interface CosmeticsBusinessInfoResponse {
  storeName: string | null;
  businessRegistrationNumber: string | null;
  businessName: string | null;
  representativeName: string | null;
  businessAddress: string | null;
  businessPhone: string | null;
  businessType: string | null;
  businessItem: string | null;
  businessEntityType: string | null;
  businessStartDate: string | null;
  taxInvoiceEmail: string | null;
}

function projectBusinessInfo(biz: Record<string, unknown>): CosmeticsBusinessInfoResponse {
  return {
    storeName: (biz.storeName as string) ?? null,
    businessRegistrationNumber: (biz.businessNumber as string) ?? null,
    businessName: (biz.businessName as string) ?? null,
    representativeName: (biz.representativeName as string) ?? (biz.ceoName as string) ?? null,
    businessAddress: (biz.businessAddress as string) ?? (biz.address as string) ?? null,
    businessPhone: (biz.businessPhone as string) ?? (biz.phone as string) ?? null,
    businessType: (biz.businessType as string) ?? null,
    businessItem: (biz.businessItem as string) ?? null,
    businessEntityType: (biz.businessEntityType as string) ?? null,
    businessStartDate: (biz.businessStartDate as string) ?? null,
    taxInvoiceEmail: (biz.taxInvoiceEmail as string) ?? null,
  };
}

export function createCosmeticsMypageController(
  dataSource: DataSource,
  requireAuth: RequestHandler,
): Router {
  const router = Router();
  const memberRepo = dataSource.getRepository(CosmeticsMember);

  async function isStoreOwner(userId: string): Promise<boolean> {
    const member = await memberRepo.findOne({ where: { userId } });
    return !!member && member.subRole === 'store_owner';
  }

  /**
   * GET /cosmetics/mypage/business-info
   *
   * 매장 경영자 (store_owner) 만 접근.
   * users.businessInfo 의 canonical 필드 + storeName + legacy alias fallback.
   */
  router.get('/business-info', requireAuth, async (req: Request, res: Response) => {
    const userId = getUserId(req as AuthRequest);
    if (!userId) {
      res.status(401).json({ success: false, error: '인증이 필요합니다.' });
      return;
    }

    try {
      if (!(await isStoreOwner(userId))) {
        res.status(403).json({ success: false, error: '매장 경영자만 접근 가능합니다.' });
        return;
      }

      const rows = await dataSource.query(
        `SELECT "businessInfo" FROM users WHERE id = $1`,
        [userId],
      );
      const biz = (rows[0]?.businessInfo as Record<string, unknown> | null) || {};

      res.json({ success: true, data: projectBusinessInfo(biz) });
    } catch (err) {
      res.status(500).json({ success: false, error: '사업자 정보 조회 중 오류가 발생했습니다.' });
    }
  });

  /**
   * PATCH /cosmetics/mypage/business-info
   *
   * 매장 경영자 (store_owner) 만 접근.
   * users.businessInfo JSONB 에 canonical 필드 merge.
   *
   * Read-only (수정 거부): businessRegistrationNumber (변경 불가 정책)
   * Editable: storeName / businessName / representativeName / businessAddress /
   *           businessPhone / businessType / businessItem / businessEntityType /
   *           businessStartDate / taxInvoiceEmail
   *
   * 미포함 필드는 변경 없음. 계좌 정보 수신 거부 (silently dropped — whitelist 외 키 무시).
   */
  router.patch('/business-info', requireAuth, async (req: Request, res: Response) => {
    const userId = getUserId(req as AuthRequest);
    if (!userId) {
      res.status(401).json({ success: false, error: '인증이 필요합니다.' });
      return;
    }

    try {
      if (!(await isStoreOwner(userId))) {
        res.status(403).json({ success: false, error: '매장 경영자만 접근 가능합니다.' });
        return;
      }

      const body = (req.body && typeof req.body === 'object') ? req.body as Record<string, unknown> : {};
      const errors: string[] = [];
      const patch: Record<string, unknown> = {};

      if ('storeName' in body) patch.storeName = SAFE_STRING(body.storeName, 200);
      if ('businessName' in body) patch.businessName = SAFE_STRING(body.businessName, 200);
      if ('representativeName' in body) patch.representativeName = SAFE_STRING(body.representativeName, 50);
      if ('businessAddress' in body) patch.businessAddress = SAFE_STRING(body.businessAddress, 500);
      if ('businessPhone' in body) {
        const phone = typeof body.businessPhone === 'string' ? body.businessPhone.replace(/\D/g, '') : null;
        if (phone && phone.length > 20) errors.push('businessPhone: 20자 이내');
        patch.businessPhone = phone || null;
      }
      if ('businessType' in body) patch.businessType = SAFE_STRING(body.businessType, 100);
      if ('businessItem' in body) patch.businessItem = SAFE_STRING(body.businessItem, 100);
      if ('businessEntityType' in body) {
        const v = SAFE_STRING(body.businessEntityType, 30);
        if (v && !VALID_ENTITY_TYPES.includes(v)) errors.push('businessEntityType: 알 수 없는 사업자 유형');
        patch.businessEntityType = v;
      }
      if ('businessStartDate' in body) {
        const v = SAFE_STRING(body.businessStartDate, 10);
        if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) errors.push('businessStartDate: YYYY-MM-DD 형식');
        patch.businessStartDate = v;
      }
      if ('taxInvoiceEmail' in body) {
        const v = SAFE_STRING(body.taxInvoiceEmail, 255);
        if (v && !/^\S+@\S+\.\S+$/.test(v)) errors.push('taxInvoiceEmail: 올바른 이메일 형식이 아닙니다');
        patch.taxInvoiceEmail = v;
      }

      if (errors.length > 0) {
        res.status(400).json({ success: false, error: errors.join('; ') });
        return;
      }
      if (Object.keys(patch).length === 0) {
        res.json({ success: true, data: null, message: '변경 사항이 없습니다.' });
        return;
      }

      await dataSource.query(
        `UPDATE users
           SET "businessInfo" = COALESCE("businessInfo", '{}'::jsonb) || $2::jsonb,
               "updatedAt" = NOW()
         WHERE id = $1`,
        [userId, JSON.stringify(patch)],
      );

      const rows = await dataSource.query(
        `SELECT "businessInfo" FROM users WHERE id = $1`,
        [userId],
      );
      const biz = (rows[0]?.businessInfo as Record<string, unknown> | null) || {};

      res.json({ success: true, data: projectBusinessInfo(biz) });
    } catch (err) {
      res.status(500).json({ success: false, error: '사업자 정보 수정 중 오류가 발생했습니다.' });
    }
  });

  return router;
}
