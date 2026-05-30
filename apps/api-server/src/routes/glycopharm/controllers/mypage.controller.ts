/**
 * GlycoPharm MyPage Controller
 *
 * WO-O4O-MYPAGE-MY-REQUESTS-INBOX-GLYCO-KCOS-ROUTE-V1
 * WO-O4O-GLYCOPHARM-PHARMACY-PROFILE-EDIT-PAGE-V1
 *
 * Routes:
 *   GET   /mypage/my-requests   — 통합 신청 내역 (membership + service applications)
 *   GET   /mypage/business-info — 약국 경영자 사업자 정보 조회 (users.businessInfo)
 *   PATCH /mypage/business-info — 약국 경영자 사업자 정보 수정 (users.businessInfo JSONB merge)
 *
 * Read-only / write 모두 약국 경영자 (pharmacy_owner subRole) 만 접근.
 */

import { Router, Request, Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { GlycopharmMemberService } from '../services/glycopharm-member.service.js';
import { GlycopharmApplication } from '../entities/glycopharm-application.entity.js';
import {
  glycopharmMemberToCanonical,
  glycopharmApplicationToCanonical,
} from '../utils/canonical-status.js';

interface AuthRequest extends Request {
  user?: { userId?: string; id?: string };
}

function getUserId(req: AuthRequest): string | null {
  return req.user?.userId ?? req.user?.id ?? null;
}

export function createGlycopharmMypageController(
  dataSource: DataSource,
  requireAuth: RequestHandler,
): Router {
  const router = Router();
  const memberService = new GlycopharmMemberService(dataSource);

  /**
   * GET /glycopharm/mypage/my-requests
   *
   * 현재 로그인 사용자의 통합 신청 내역을 반환한다.
   * - membership (glycopharm_members)
   * - service applications (glycopharm_applications)
   * createdAt DESC 정렬.
   */
  router.get('/my-requests', requireAuth, async (req: Request, res: Response) => {
    const userId = getUserId(req as AuthRequest);
    if (!userId) {
      res.status(401).json({ success: false, error: '인증이 필요합니다.' });
      return;
    }

    try {
      const [member, applications] = await Promise.all([
        memberService.getMyMembership(userId),
        dataSource.getRepository(GlycopharmApplication).find({
          where: { userId },
          order: { submittedAt: 'DESC' },
        }),
      ]);

      const items: Record<string, unknown>[] = [];

      if (member) {
        const subRoleLabel =
          member.subRole === 'pharmacy_owner' ? '약국경영자' :
          member.subRole === 'staff_pharmacist' ? '근무약사' : null;

        items.push({
          id: member.id,
          entityType: 'membership',
          status: glycopharmMemberToCanonical(member.status),
          displayTitle: '약사 회원 신청',
          displayDescription: subRoleLabel,
          reviewComment: member.rejectionReason ?? null,
          revisionNote: null,
          reviewedAt: member.approvedAt?.toISOString() ?? null,
          resultEntityId: null,
          resultMetadata: null,
          submittedAt: member.createdAt.toISOString(),
          createdAt: member.createdAt.toISOString(),
          updatedAt: member.updatedAt.toISOString(),
          payload: {
            subRole: member.subRole ?? null,
            membershipType: member.membershipType,
          },
          serviceKey: 'glycopharm',
        });
      }

      for (const app of applications) {
        const serviceTypesLabel = Array.isArray(app.serviceTypes)
          ? app.serviceTypes.join(', ')
          : null;

        items.push({
          id: app.id,
          entityType: 'service_application',
          status: glycopharmApplicationToCanonical(app.status),
          displayTitle: app.organizationName || '약국 참여 신청',
          displayDescription: serviceTypesLabel,
          reviewComment: app.rejectionReason ?? null,
          revisionNote: null,
          reviewedAt: app.decidedAt?.toISOString() ?? null,
          resultEntityId: null,
          resultMetadata: null,
          submittedAt: app.submittedAt?.toISOString() ?? null,
          createdAt: app.submittedAt?.toISOString() ?? new Date().toISOString(),
          updatedAt: app.decidedAt?.toISOString() ?? app.submittedAt?.toISOString() ?? new Date().toISOString(),
          payload: {
            organizationType: app.organizationType,
            organizationName: app.organizationName,
            serviceTypes: app.serviceTypes,
            note: app.note ?? null,
          },
          serviceKey: 'glycopharm',
        });
      }

      // createdAt DESC
      items.sort((a, b) =>
        new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime(),
      );

      res.json({ success: true, data: items });
    } catch (err) {
      res.status(500).json({ success: false, error: '신청 내역 조회 중 오류가 발생했습니다.' });
    }
  });

  // ─── WO-O4O-GLYCOPHARM-PHARMACY-PROFILE-EDIT-PAGE-V1 ──────────────────
  //   약국 경영자가 가입 후 자신의 사업자 정보를 확인·수정할 수 있는 endpoint.
  //   SSOT: users.businessInfo JSONB (가입 시 저장된 canonical source).

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

  /**
   * GET /glycopharm/mypage/business-info
   *
   * 약국 경영자 (pharmacy_owner) 만 접근.
   * users.businessInfo JSONB 에 저장된 사업자 정보를 canonical 필드로 반환.
   */
  router.get('/business-info', requireAuth, async (req: Request, res: Response) => {
    const userId = getUserId(req as AuthRequest);
    if (!userId) {
      res.status(401).json({ success: false, error: '인증이 필요합니다.' });
      return;
    }

    try {
      const member = await memberService.getMyMembership(userId);
      if (!member || member.subRole !== 'pharmacy_owner') {
        res.status(403).json({ success: false, error: '약국 경영자만 접근 가능합니다.' });
        return;
      }

      const rows = await dataSource.query(
        `SELECT "businessInfo" FROM users WHERE id = $1`,
        [userId],
      );
      const biz = (rows[0]?.businessInfo as Record<string, unknown> | null) || {};

      res.json({
        success: true,
        data: {
          pharmacyName: (biz.pharmacyName as string) ?? null,
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
          pharmacistLicenseNumber: (biz.pharmacistLicenseNumber as string) ?? null,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, error: '사업자 정보 조회 중 오류가 발생했습니다.' });
    }
  });

  /**
   * PATCH /glycopharm/mypage/business-info
   *
   * 약국 경영자 (pharmacy_owner) 만 접근.
   * users.businessInfo JSONB 에 canonical 필드 merge 저장.
   *
   * Read-only (수정 거부):
   *   businessRegistrationNumber (변경 불가 정책)
   *   pharmacistLicenseNumber    (자격 확인 흐름 보호)
   * Editable:
   *   pharmacyName / businessName / representativeName / businessAddress / businessPhone /
   *   businessType / businessItem / businessEntityType / businessStartDate / taxInvoiceEmail
   *
   * 미포함 필드는 변경 없음. 계좌 정보는 수신 거부 (silently dropped).
   */
  router.patch('/business-info', requireAuth, async (req: Request, res: Response) => {
    const userId = getUserId(req as AuthRequest);
    if (!userId) {
      res.status(401).json({ success: false, error: '인증이 필요합니다.' });
      return;
    }

    try {
      const member = await memberService.getMyMembership(userId);
      if (!member || member.subRole !== 'pharmacy_owner') {
        res.status(403).json({ success: false, error: '약국 경영자만 접근 가능합니다.' });
        return;
      }

      const body = (req.body && typeof req.body === 'object') ? req.body as Record<string, unknown> : {};
      const errors: string[] = [];
      const patch: Record<string, unknown> = {};

      if ('pharmacyName' in body) patch.pharmacyName = SAFE_STRING(body.pharmacyName, 200);
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

      res.json({
        success: true,
        data: {
          pharmacyName: (biz.pharmacyName as string) ?? null,
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
          pharmacistLicenseNumber: (biz.pharmacistLicenseNumber as string) ?? null,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, error: '사업자 정보 수정 중 오류가 발생했습니다.' });
    }
  });

  return router;
}
