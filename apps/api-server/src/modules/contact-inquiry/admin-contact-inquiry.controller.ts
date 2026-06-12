/**
 * Admin Contact Inquiry Controller
 *
 * WO-O4O-CONTACT-INQUIRY-ADMIN-MANAGEMENT-V1
 *
 * GP/KCos 운영자(admin)가 접수된 문의를 조회·상태 처리한다. Mount: /api/v1/admin/services
 *   GET   /:serviceKey/contact-inquiries          — 목록(status/page/limit). 본문 미노출(미리보기만).
 *   GET   /:serviceKey/contact-inquiries/:id       — 상세(본문 포함)
 *   PATCH /:serviceKey/contact-inquiries/:id/status — 상태 변경(+handled_at/handled_by)
 *   PATCH /:serviceKey/contact-inquiries/:id/note   — 내부 메모
 *
 * 권한: requireServiceLegalScope('admin') 재사용(serviceKey 별 `{prefix}:admin`, KPA platformBypass=false 자동 준수).
 *   + serviceKey 화이트리스트 = glycopharm / k-cosmetics (Neture/KPA 는 자체 contact 시스템 → 거부).
 *   operator 기본 접근 없음(admin only). 개인정보(본문/연락처)는 상세에서만.
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { ContactInquiry } from './entities/ContactInquiry.entity.js';
import { requireServiceLegalScope } from '../service-legal/service-legal-scope.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import logger from '../../utils/logger.js';

/** 본 contact 관리가 다루는 serviceKey(공통 ContactInquiry 사용 서비스). */
const CONTACT_ADMIN_SERVICE_KEYS = ['glycopharm', 'k-cosmetics'] as const;
const VALID_STATUSES = ['received', 'in_review', 'answered', 'closed', 'spam'] as const;

function guardServiceKey(req: Request, res: Response): string | null {
  const serviceKey = req.params.serviceKey;
  if (!(CONTACT_ADMIN_SERVICE_KEYS as readonly string[]).includes(serviceKey)) {
    res.status(404).json({ success: false, error: { code: 'UNKNOWN_SERVICE', message: '지원하지 않는 서비스입니다.' } });
    return null;
  }
  return serviceKey;
}

/** 목록 row — 본문(message)/개인정보 일부 제외, 미리보기만. */
function toListRow(i: ContactInquiry) {
  return {
    id: i.id,
    serviceKey: i.service_key,
    inquiryType: i.inquiry_type,
    name: i.name,
    email: i.email,
    organizationName: i.organization_name,
    subject: i.subject,
    status: i.status,
    notificationStatus: i.notification_status,
    createdAt: i.created_at,
    handledAt: i.handled_at,
  };
}

/** 상세 — 본문 포함. */
function toDetail(i: ContactInquiry) {
  return {
    id: i.id,
    serviceKey: i.service_key,
    inquiryType: i.inquiry_type,
    name: i.name,
    email: i.email,
    phone: i.phone,
    organizationName: i.organization_name,
    subject: i.subject,
    message: i.message,
    privacyConsent: i.privacy_consent,
    status: i.status,
    notificationStatus: i.notification_status,
    sourcePath: i.source_path,
    createdAt: i.created_at,
    updatedAt: i.updated_at,
    handledAt: i.handled_at,
    handledBy: i.handled_by,
    internalNote: i.internal_note,
  };
}

export function createAdminContactInquiryController(dataSource: DataSource): Router {
  const router = Router();
  const repo = dataSource.getRepository(ContactInquiry);
  const adminGuard = requireServiceLegalScope('admin');

  // ── 목록 ──
  router.get('/:serviceKey/contact-inquiries', authenticate, adminGuard, async (req: Request, res: Response) => {
    const serviceKey = guardServiceKey(req, res);
    if (!serviceKey) return;
    try {
      const { status, page = '1', limit = '20' } = req.query;
      const qb = repo.createQueryBuilder('i').where('i.service_key = :sk', { sk: serviceKey });
      if (status && typeof status === 'string') qb.andWhere('i.status = :status', { status });
      const pageNum = Math.max(1, Number(page));
      const limitNum = Math.min(Math.max(1, Number(limit)), 100);
      qb.orderBy('i.created_at', 'DESC').skip((pageNum - 1) * limitNum).take(limitNum);
      const [items, total] = await qb.getManyAndCount();
      res.json({
        success: true,
        data: {
          items: items.map(toListRow),
          pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
        },
      });
    } catch (error) {
      logger.error('[ContactInquiry Admin] list error:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '문의 목록 조회 실패' } });
    }
  });

  // ── 상세 ──
  router.get('/:serviceKey/contact-inquiries/:id', authenticate, adminGuard, async (req: Request, res: Response) => {
    const serviceKey = guardServiceKey(req, res);
    if (!serviceKey) return;
    try {
      const item = await repo.findOne({ where: { id: req.params.id, service_key: serviceKey } });
      if (!item) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '문의를 찾을 수 없습니다.' } });
      res.json({ success: true, data: toDetail(item) });
    } catch (error) {
      logger.error('[ContactInquiry Admin] detail error:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '문의 조회 실패' } });
    }
  });

  // ── 상태 변경 ──
  router.patch('/:serviceKey/contact-inquiries/:id/status', authenticate, adminGuard, async (req: Request, res: Response) => {
    const serviceKey = guardServiceKey(req, res);
    if (!serviceKey) return;
    const { status } = req.body ?? {};
    if (!(VALID_STATUSES as readonly string[]).includes(status)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: '유효하지 않은 상태입니다.' } });
    }
    try {
      const item = await repo.findOne({ where: { id: req.params.id, service_key: serviceKey } });
      if (!item) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '문의를 찾을 수 없습니다.' } });
      item.status = status;
      item.handled_at = new Date();
      item.handled_by = (req as any).user?.id ?? null;
      const saved = await repo.save(item);
      res.json({ success: true, data: toDetail(saved) });
    } catch (error) {
      logger.error('[ContactInquiry Admin] status error:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '상태 변경 실패' } });
    }
  });

  // ── 내부 메모 ──
  router.patch('/:serviceKey/contact-inquiries/:id/note', authenticate, adminGuard, async (req: Request, res: Response) => {
    const serviceKey = guardServiceKey(req, res);
    if (!serviceKey) return;
    const { internalNote } = req.body ?? {};
    try {
      const item = await repo.findOne({ where: { id: req.params.id, service_key: serviceKey } });
      if (!item) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '문의를 찾을 수 없습니다.' } });
      item.internal_note = typeof internalNote === 'string' ? internalNote : null;
      item.handled_by = (req as any).user?.id ?? item.handled_by;
      const saved = await repo.save(item);
      res.json({ success: true, data: toDetail(saved) });
    } catch (error) {
      logger.error('[ContactInquiry Admin] note error:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '메모 저장 실패' } });
    }
  });

  return router;
}
