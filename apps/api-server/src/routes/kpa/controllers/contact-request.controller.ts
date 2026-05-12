/**
 * ContactRequest Controller — KPA-Society 협업·교육 문의
 *
 * WO-O4O-KPA-CONTACT-FORM-WORKFLOW-V1
 *
 * kpa.routes.ts에서 직접 핸들러로 등록:
 *   POST /contact-requests           — 공개
 *   GET  /operator/contact-requests  — kpa:operator 이상
 */

import { Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { ContactRequest } from '../../../entities/ContactRequest.js';
import { notificationService } from '../../../services/NotificationService.js';
import { asyncHandler } from '../../../middleware/error-handler.js';
import logger from '../../../utils/logger.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** POST /api/v1/kpa/contact-requests — 공개 */
export function createContactRequestHandler(dataSource: DataSource): RequestHandler {
  const repo = () => dataSource.getRepository(ContactRequest);

  return asyncHandler(async (req: Request, res: Response) => {
    const {
      type,
      organization_name,
      name,
      email,
      phone,
      subject,
      message,
    } = req.body as Record<string, string | undefined>;

    // ── Validation ──────────────────────────────────────────────────────────
    const errors: string[] = [];
    if (!type || !['partner', 'education'].includes(type)) {
      errors.push('유효하지 않은 문의 유형입니다. (partner | education)');
    }
    if (!name || name.trim().length < 2) {
      errors.push('이름은 2자 이상이어야 합니다.');
    }
    if (!email || !EMAIL_RE.test(email)) {
      errors.push('올바른 이메일 주소를 입력해 주세요.');
    }
    if (!message || message.trim().length < 10) {
      errors.push('문의 내용은 10자 이상이어야 합니다.');
    }
    if (type === 'partner' && (!organization_name || organization_name.trim().length < 2)) {
      errors.push('단체/회사명을 입력해 주세요.');
    }
    if (errors.length > 0) {
      return res.status(400).json({ success: false, error: errors[0], code: 'VALIDATION_ERROR' });
    }

    // ── Create record ────────────────────────────────────────────────────────
    const user = (req as any).user;
    const entity = repo().create({
      service_key: 'kpa-society',
      type: type as 'partner' | 'education',
      organization_name: organization_name?.trim() || null,
      name: name!.trim(),
      email: email!.trim().toLowerCase(),
      phone: phone?.trim() || null,
      subject: subject?.trim() || null,
      message: message!.trim(),
      status: 'pending',
      created_by: user?.id ?? null,
    });
    const saved = await repo().save(entity);

    // ── Operator notification (best-effort) ──────────────────────────────────
    try {
      const operators: { userId: string }[] = await dataSource.query(
        `SELECT DISTINCT user_id AS "userId"
           FROM role_assignments
          WHERE role IN ('kpa:operator','kpa:admin')
            AND is_active = true
          LIMIT 20`,
      );
      const typeLabel = type === 'partner' ? '협력 문의' : '강의 개설 문의';
      await Promise.allSettled(
        operators.map((op) =>
          notificationService.createNotification({
            userId: op.userId,
            type: 'contact.new',
            title: `새 문의: ${typeLabel}`,
            message: `${name!.trim()} 님이 문의를 남겼습니다.`,
            serviceKey: 'kpa-society',
            metadata: { contactRequestId: saved.id, contactType: type },
          }),
        ),
      );
    } catch (err) {
      logger.warn('[ContactRequest] operator notification failed (best-effort)', err);
    }

    return res.status(201).json({
      success: true,
      data: { id: saved.id, status: saved.status },
    });
  });
}

/** PATCH /api/v1/kpa/operator/contact-requests/:id/status — kpa:operator+ */
export function updateContactRequestStatusHandler(dataSource: DataSource): RequestHandler {
  const repo = () => dataSource.getRepository(ContactRequest);

  return asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body as { status?: string };

    if (!status || !['pending', 'reviewing', 'done'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: '유효하지 않은 상태값입니다. (pending | reviewing | done)',
        code: 'VALIDATION_ERROR',
      });
    }

    const entity = await repo().findOne({
      where: { id, service_key: 'kpa-society' },
    });
    if (!entity) {
      return res.status(404).json({ success: false, error: '문의를 찾을 수 없습니다.', code: 'NOT_FOUND' });
    }

    entity.status = status as ContactRequest['status'];
    const saved = await repo().save(entity);

    return res.json({ success: true, data: { id: saved.id, status: saved.status } });
  });
}

/** GET /api/v1/kpa/operator/contact-requests — kpa:operator+ */
export function listContactRequestsHandler(dataSource: DataSource): RequestHandler {
  const repo = () => dataSource.getRepository(ContactRequest);

  return asyncHandler(async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10)));
    const skip = (page - 1) * limit;
    const statusFilter = req.query.status as string | undefined;
    const typeFilter = req.query.type as string | undefined;

    const qb = repo()
      .createQueryBuilder('cr')
      .where('cr.service_key = :sk', { sk: 'kpa-society' })
      .orderBy('cr.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (statusFilter && ['pending', 'reviewed', 'closed'].includes(statusFilter)) {
      qb.andWhere('cr.status = :status', { status: statusFilter });
    }
    if (typeFilter && ['partner', 'education'].includes(typeFilter)) {
      qb.andWhere('cr.type = :type', { type: typeFilter });
    }

    const [items, total] = await qb.getManyAndCount();

    return res.json({
      success: true,
      data: {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  });
}
