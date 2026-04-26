/**
 * PharmacyRequestController - 약국 서비스 신청 (개인 신원 확장)
 *
 * WO-KPA-A-PHARMACY-REQUEST-STRUCTURE-REALIGN-V1
 *
 * pharmacy_join은 조직 가입이 아니라 개인 속성 변경.
 * OrganizationJoinRequest와 완전 분리.
 *
 * WO-ROLE-NORMALIZATION-PHASE3-A-V1: organization_members 기반 relation-based ownership
 * WO-KPA-PHARMACY-APPROVAL-ENSURE-STORE-LINK-V1: 승인 시 pharmacy organization + member 연결 보장
 *
 * POST /                — 신청 생성
 * GET  /pending         — 대기 목록 (operator)
 * GET  /my              — 내 신청 조회
 * PATCH /:id/approve    — 승인
 * PATCH /:id/reject     — 반려
 */

import { Router } from 'express';
import type { Request, Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import type { ActionLogService } from '@o4o/action-log-core';
import { KpaPharmacyRequest } from '../entities/kpa-pharmacy-request.entity.js';
import { organizationOpsService } from '../../../modules/organization/services/organization-ops.service.js';
import { RoleAssignmentService } from '../../../modules/auth/services/role-assignment.service.js';

export function createPharmacyRequestRoutes(
  dataSource: DataSource,
  requireAuth: RequestHandler,
  requireScope: (scope: string) => RequestHandler,
  actionLogService?: ActionLogService,
): Router {
  const router = Router();
  const getRepo = () => dataSource.getRepository(KpaPharmacyRequest);

  // All endpoints require auth
  router.use(requireAuth);

  // ─── POST / — 약국 서비스 신청 ───
  router.post('/', async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user?.id) {
        return res.status(401).json({ success: false, error: '인증이 필요합니다.', code: 'AUTH_REQUIRED' });
      }

      const { pharmacyName, businessNumber, pharmacyPhone, ownerPhone, taxInvoiceEmail, payload } = req.body;

      if (!pharmacyName || !businessNumber) {
        return res.status(400).json({
          success: false,
          error: '약국명과 사업자번호는 필수입니다.',
          code: 'MISSING_REQUIRED_FIELDS',
        });
      }

      // WO-ROLE-NORMALIZATION-PHASE3-A-V1: organization_members 기반 중복 체크
      const [existingOwner] = await dataSource.query(
        `SELECT 1 FROM organization_members WHERE user_id = $1 AND role = 'owner' AND left_at IS NULL LIMIT 1`,
        [user.id]
      );
      if (existingOwner) {
        return res.status(409).json({
          success: false,
          error: '이미 약국 개설자로 승인된 계정입니다.',
          code: 'ALREADY_MEMBER',
        });
      }

      // Check for existing pending request
      const repo = getRepo();
      const existing = await repo.findOne({
        where: { user_id: user.id, status: 'pending' as const },
      });
      if (existing) {
        return res.status(409).json({
          success: false,
          error: '이미 신청이 접수되어 대기 중입니다.',
          code: 'DUPLICATE_REQUEST',
        });
      }

      const request = repo.create({
        user_id: user.id,
        pharmacy_name: pharmacyName.trim(),
        business_number: businessNumber.replace(/\D/g, ''),
        pharmacy_phone: pharmacyPhone?.replace(/\D/g, '') || null,
        owner_phone: ownerPhone?.replace(/\D/g, '') || null,
        tax_invoice_email: taxInvoiceEmail?.trim() || null,
        payload: payload || null,
        status: 'pending',
      });

      const saved = await repo.save(request);

      return res.status(201).json({ success: true, data: saved });
    } catch (error: any) {
      console.error('[PharmacyRequest] Create error:', error);
      return res.status(500).json({ success: false, error: '서버 오류', code: 'INTERNAL_ERROR' });
    }
  });

  // ─── GET /my — 내 신청 조회 ───
  router.get('/my', async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const repo = getRepo();
      const items = await repo.find({
        where: { user_id: user.id },
        order: { created_at: 'DESC' },
      });
      return res.json({ success: true, data: { items } });
    } catch (error: any) {
      console.error('[PharmacyRequest] My requests error:', error);
      return res.status(500).json({ success: false, error: '서버 오류' });
    }
  });

  // ─── GET /pending — 대기 목록 (operator) ───
  router.get('/pending', requireScope('kpa:operator'), async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const repo = getRepo();
      const [items, total] = await repo.findAndCount({
        where: { status: 'pending' as const },
        order: { created_at: 'ASC' },
        skip: offset,
        take: limit,
      });

      // WO-O4O-SERVICE-DATA-ISOLATION-FIX-V1: batch-fetch with service_memberships filter
      const userIds = items.map((item) => item.user_id).filter(Boolean);
      const userMap = new Map<string, { name: string; email: string }>();
      if (userIds.length > 0) {
        const users: Array<{ id: string; name: string; email: string }> = await dataSource.query(
          `SELECT u.id, u.name, u.email FROM users u
           JOIN service_memberships sm ON sm.user_id = u.id AND sm.service_key = 'kpa-society'
           WHERE u.id = ANY($1)`,
          [userIds],
        );
        for (const u of users) userMap.set(u.id, { name: u.name, email: u.email });
      }
      const enriched = items.map((item) => ({
        ...item,
        user: userMap.get(item.user_id) || null,
      }));

      return res.json({
        success: true,
        data: {
          items: enriched,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error: any) {
      console.error('[PharmacyRequest] Pending list error:', error);
      return res.status(500).json({ success: false, error: '서버 오류' });
    }
  });

  // ─── PATCH /:id/approve — 승인 ───
  router.patch('/:id/approve', requireScope('kpa:operator'), async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const repo = getRepo();
      const request = await repo.findOne({ where: { id: req.params.id } });

      if (!request) {
        return res.status(404).json({ success: false, error: '신청을 찾을 수 없습니다.', code: 'NOT_FOUND' });
      }
      if (request.status !== 'pending') {
        return res.status(400).json({ success: false, error: '이미 처리된 신청입니다.', code: 'ALREADY_PROCESSED' });
      }

      // Update request status
      request.status = 'approved';
      request.approved_by = user.id;
      request.approved_at = new Date();
      request.review_note = req.body.reviewNote || null;
      await repo.save(request);

      // WO-KPA-PHARMACY-APPROVAL-ENSURE-STORE-LINK-V1
      // 승인 = 권한 부여 + 실제 매장 연결 완료 (승인 후 isStoreOwner=true + storeSlug 보장)

      // 1. pharmacy organization ensure (멱등 — business_number 기반 code)
      const orgCode = `kpa-pharm-${request.business_number.replace(/[^0-9]/g, '')}`;
      const orgResult = await organizationOpsService.ensureOrganization({
        name: request.pharmacy_name,
        code: orgCode,
        type: 'pharmacy',
        createdByUserId: request.user_id,
      });

      // 2. kpa_members.organization_id — null인 경우에만 업데이트 (기존 분회 연결 보호)
      await dataSource.query(
        `UPDATE kpa_members SET organization_id = $1, updated_at = NOW()
         WHERE user_id = $2 AND organization_id IS NULL`,
        [orgResult.id, request.user_id],
      );

      // 3. organization_members — role=owner (멱등)
      await organizationOpsService.addMember({
        organizationId: orgResult.id,
        userId: request.user_id,
        role: 'owner',
        isPrimary: false,
      });

      // 4. kpa_pharmacist_profiles.activity_type upsert (isStoreOwner fallback 경로 보장)
      await dataSource.query(
        `INSERT INTO kpa_pharmacist_profiles (id, user_id, activity_type, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, 'pharmacy_owner', NOW(), NOW())
         ON CONFLICT (user_id) DO UPDATE SET activity_type = 'pharmacy_owner', updated_at = NOW()`,
        [request.user_id],
      );

      // 5. WO-O4O-STORE-OWNER-ROLE-BASED-ACCESS-UNIFICATION-V1: kpa:store_owner 역할 부여
      const roleAssignmentService = new RoleAssignmentService();
      await roleAssignmentService.assignRole({
        userId: request.user_id,
        role: 'kpa:store_owner',
        assignedBy: user.id,
      });

      actionLogService?.logSuccess('kpa-society', user.id, 'kpa.operator.pharmacy_approve', {
        meta: { targetId: req.params.id, statusBefore: 'pending', statusAfter: 'approved' },
      }).catch(() => {});
      return res.json({ success: true, data: request });
    } catch (error: any) {
      console.error('[PharmacyRequest] Approve error:', error);
      return res.status(500).json({ success: false, error: '서버 오류' });
    }
  });

  // ─── PATCH /:id/reject — 반려 ───
  router.patch('/:id/reject', requireScope('kpa:operator'), async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const repo = getRepo();
      const request = await repo.findOne({ where: { id: req.params.id } });

      if (!request) {
        return res.status(404).json({ success: false, error: '신청을 찾을 수 없습니다.', code: 'NOT_FOUND' });
      }
      if (request.status !== 'pending') {
        return res.status(400).json({ success: false, error: '이미 처리된 신청입니다.', code: 'ALREADY_PROCESSED' });
      }

      request.status = 'rejected';
      request.approved_by = user.id;
      request.approved_at = new Date();
      request.review_note = req.body.reviewNote || null;
      await repo.save(request);

      actionLogService?.logSuccess('kpa-society', user.id, 'kpa.operator.pharmacy_reject', {
        meta: { targetId: req.params.id, reason: req.body.reviewNote, statusBefore: 'pending', statusAfter: 'rejected' },
      }).catch(() => {});
      return res.json({ success: true, data: request });
    } catch (error: any) {
      console.error('[PharmacyRequest] Reject error:', error);
      return res.status(500).json({ success: false, error: '서버 오류' });
    }
  });

  return router;
}
