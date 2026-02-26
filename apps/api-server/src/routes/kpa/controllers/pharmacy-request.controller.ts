/**
 * PharmacyRequestController - 약국 서비스 신청 (개인 신원 확장)
 *
 * WO-KPA-A-PHARMACY-REQUEST-STRUCTURE-REALIGN-V1
 *
 * pharmacy_join은 조직 가입이 아니라 개인 속성 변경.
 * OrganizationJoinRequest와 완전 분리.
 *
 * WO-ROLE-NORMALIZATION-PHASE3-A-V1: organization_members 기반 relation-based ownership
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
import { KpaPharmacyRequest } from '../entities/kpa-pharmacy-request.entity.js';

export function createPharmacyRequestRoutes(
  dataSource: DataSource,
  requireAuth: RequestHandler,
  requireScope: (scope: string) => RequestHandler
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

      // Enrich with user info
      const enriched = await Promise.all(
        items.map(async (item) => {
          const [userData] = await dataSource.query(
            `SELECT name, email FROM users WHERE id = $1`,
            [item.user_id]
          );
          return { ...item, user: userData || null };
        })
      );

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

      // WO-ROLE-NORMALIZATION-PHASE3-A-V1: relation-based ownership via organization_members
      const [kpaMember] = await dataSource.query(
        `SELECT organization_id FROM kpa_members WHERE user_id = $1 LIMIT 1`,
        [request.user_id]
      );
      if (kpaMember?.organization_id) {
        await dataSource.query(
          `INSERT INTO organization_members (id, organization_id, user_id, role, is_primary, joined_at, created_at, updated_at)
           VALUES (uuid_generate_v4(), $1, $2, 'owner', false, NOW(), NOW(), NOW())
           ON CONFLICT (organization_id, user_id) DO NOTHING`,
          [kpaMember.organization_id, request.user_id]
        );
      }

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

      return res.json({ success: true, data: request });
    } catch (error: any) {
      console.error('[PharmacyRequest] Reject error:', error);
      return res.status(500).json({ success: false, error: '서버 오류' });
    }
  });

  return router;
}
