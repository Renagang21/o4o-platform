/**
 * ContactController — WO-O4O-NETURE-CONTACT-PAGE-V1
 *
 * Public:
 *   POST /contact — Submit contact message (no auth required)
 *
 * Admin:
 *   GET    /admin/contact-messages     — List messages
 *   GET    /admin/contact-messages/:id — Detail
 *   PATCH  /admin/contact-messages/:id — Update status/notes
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { createHash } from 'crypto';
import { NetureContactMessage } from '../entities/NetureContactMessage.entity.js';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { requireNetureScope } from '../../../middleware/neture-scope.middleware.js';
import { notificationService } from '../../../services/NotificationService.js';
import { loadContactSettings } from '../../contact-inquiry/contact-settings.helper.js';
import { sendContactEmails } from '../../contact-inquiry/contact-notification.helper.js';
import logger from '../../../utils/logger.js';

const VALID_CONTACT_TYPES = ['supplier', 'partner', 'service', 'other'] as const;
const VALID_STATUSES = ['new', 'in_progress', 'resolved'] as const;

/** contactType → 운영자 알림용 한글 라벨. */
const CONTACT_TYPE_LABELS: Record<string, string> = {
  supplier: '공급자',
  partner: '파트너',
  service: '서비스',
  other: '기타',
};

/** IP → SHA256 hash (개인정보 최소수집 — 원문 미저장). WO-O4O-CONTACT-NETURE-KPA-PRIVACY-CONSENT-V1 */
function ipHash(ip: string | undefined): string | null {
  if (!ip) return null;
  try { return createHash('sha256').update(ip).digest('hex'); } catch { return null; }
}

export function createContactController(dataSource: DataSource): Router {
  const router = Router();
  const repo = dataSource.getRepository(NetureContactMessage);

  // ── PUBLIC: POST /contact ──
  router.post('/contact', async (req: Request, res: Response) => {
    try {
      const { contactType = 'other', name, email, phone, subject, message, privacyConsent } = req.body;

      // Validation
      if (!name || !email || !subject || !message) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_REQUIRED_FIELDS', message: '필수 항목을 입력해 주세요.' },
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_EMAIL', message: '올바른 이메일 주소를 입력해 주세요.' },
        });
      }

      if (!VALID_CONTACT_TYPES.includes(contactType)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_CONTACT_TYPE', message: '유효하지 않은 문의 유형입니다.' },
        });
      }

      // 개인정보 수집·이용 동의 필수 (WO-O4O-CONTACT-NETURE-KPA-PRIVACY-CONSENT-V1).
      // 미동의 시 저장·알림 없이 400.
      if (privacyConsent !== true) {
        return res.status(400).json({
          success: false,
          error: { code: 'PRIVACY_CONSENT_REQUIRED', message: '개인정보 수집·이용 동의가 필요합니다.' },
        });
      }

      const entity = repo.create({
        contactType,
        name: name.trim(),
        email: email.trim(),
        phone: phone?.trim() || null,
        subject: subject.trim(),
        message: message.trim(),
        status: 'new',
        // 개인정보 최소수집: 신규 저장은 IP 원문 미저장 → hash 만 기록 (legacy ipAddress 는 null).
        ipAddress: null,
        ipHash: ipHash(req.ip || req.socket?.remoteAddress || undefined),
        privacyConsent: true,
        userAgent: req.headers['user-agent'] || null,
      });
      await repo.save(entity);

      logger.info(`[Neture Contact] New message: ${entity.id} (${contactType})`);

      // ── 알림: 기존 in-app 유지 + ServiceContactSettings 기반 이메일/자동 회신 추가 ──
      // WO-O4O-CONTACT-NETURE-KPA-SETTINGS-ADAPTER-V1 (기존 저장소/route/UI 불변, 알림만 보강).
      const typeLabel = CONTACT_TYPE_LABELS[entity.contactType] || entity.contactType;

      // (1) in-app: 기존 동작 유지 — 설정과 무관하게 neture:operator + neture:admin 에게 알림.
      //   WO-O4O-NETURE-CONTACT-INQUIRY-OPERATOR-NOTIFICATION-V1: 모든 contactType 알림.
      //   실패가 문의 접수(저장)를 실패시키지 않도록 try/catch 로 격리.
      let inappStatus = 'none';
      try {
        const operators: { userId: string }[] = await dataSource.query(
          `SELECT DISTINCT user_id AS "userId"
             FROM role_assignments
            WHERE role IN ('neture:operator','neture:admin')
              AND is_active = true
            LIMIT 50`,
        );
        if (operators.length > 0) {
          await Promise.allSettled(
            operators.map((op) =>
              notificationService.createNotification({
                userId: op.userId,
                type: 'contact.new',
                title: '새 문의가 접수되었습니다',
                message: `[${typeLabel}] ${entity.subject}`,
                serviceKey: 'neture',
                metadata: {
                  contactMessageId: entity.id,
                  contactType: entity.contactType,
                  targetUrl: '/operator/contact-messages?status=new',
                },
              }),
            ),
          );
          inappStatus = 'sent';
        }
      } catch (notifyError) {
        inappStatus = 'fail';
        logger.warn('[Neture Contact] operator notification failed (best-effort):', notifyError);
      }

      // (2) 이메일 알림 + 문의자 자동 회신: ServiceContactSettings(neture) 기반, best-effort.
      let emailStatus = 'off';
      let autoReplyStatus = 'off';
      try {
        const settings = await loadContactSettings(dataSource, 'neture');
        const r = await sendContactEmails(settings, {
          serviceName: 'Neture',
          typeLabel,
          subject: entity.subject,
          name: entity.name,
          email: entity.email,
          organizationName: null,
          phone: entity.phone,
          message: entity.message,
          createdAt: entity.createdAt,
          adminManageUrl: '/admin/contact-messages',
        });
        emailStatus = r.emailStatus;
        autoReplyStatus = r.autoReplyStatus;
      } catch (notifyErr) {
        logger.warn('[Neture Contact] email/auto-reply dispatch failed (best-effort):', notifyErr);
      }

      // (3) 알림 결과 기록 (접수 자체는 이미 성공 — 기록 실패가 성공을 바꾸지 않음).
      try {
        entity.notificationStatus = `inapp:${inappStatus};email:${emailStatus};autoreply:${autoReplyStatus}`;
        await repo.save(entity);
      } catch { /* 무시 */ }

      return res.status(201).json({
        success: true,
        data: { id: entity.id, message: '문의가 접수되었습니다.' },
      });
    } catch (error) {
      logger.error('[Neture Contact] Error submitting:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '문의 접수 중 오류가 발생했습니다.' },
      });
    }
  });

  // ── ADMIN: GET /admin/contact-messages ──
  router.get(
    '/admin/contact-messages',
    requireAuth,
    requireNetureScope('neture:admin'),
    async (req: Request, res: Response) => {
      try {
        const { contactType, status, page = '1', limit = '20' } = req.query;

        const qb = repo.createQueryBuilder('msg');

        if (contactType && typeof contactType === 'string') {
          qb.andWhere('msg.contactType = :contactType', { contactType });
        }
        if (status && typeof status === 'string') {
          qb.andWhere('msg.status = :status', { status });
        }

        const pageNum = Math.max(1, Number(page));
        const limitNum = Math.min(Math.max(1, Number(limit)), 100);

        qb.orderBy('msg.createdAt', 'DESC')
          .skip((pageNum - 1) * limitNum)
          .take(limitNum);

        const [items, total] = await qb.getManyAndCount();

        res.json({
          success: true,
          data: {
            items,
            pagination: {
              page: pageNum,
              limit: limitNum,
              total,
              totalPages: Math.ceil(total / limitNum),
            },
          },
        });
      } catch (error) {
        logger.error('[Neture Contact Admin] Error listing:', error);
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: '문의 목록 조회 실패' },
        });
      }
    },
  );

  // ── ADMIN: GET /admin/contact-messages/:id ──
  router.get(
    '/admin/contact-messages/:id',
    requireAuth,
    requireNetureScope('neture:admin'),
    async (req: Request, res: Response) => {
      try {
        const msg = await repo.findOne({ where: { id: req.params.id } });
        if (!msg) {
          return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: '문의를 찾을 수 없습니다.' },
          });
        }
        res.json({ success: true, data: msg });
      } catch (error) {
        logger.error('[Neture Contact Admin] Error fetching:', error);
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: '문의 조회 실패' },
        });
      }
    },
  );

  // ── ADMIN: PATCH /admin/contact-messages/:id ──
  router.patch(
    '/admin/contact-messages/:id',
    requireAuth,
    requireNetureScope('neture:admin'),
    async (req: Request, res: Response) => {
      try {
        const msg = await repo.findOne({ where: { id: req.params.id } });
        if (!msg) {
          return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: '문의를 찾을 수 없습니다.' },
          });
        }

        const { status, adminNotes } = req.body;

        if (status) {
          if (!(VALID_STATUSES as readonly string[]).includes(status)) {
            return res.status(400).json({
              success: false,
              error: { code: 'INVALID_STATUS', message: '유효하지 않은 상태입니다.' },
            });
          }
          msg.status = status;
          if (status === 'resolved') {
            msg.resolvedAt = new Date();
          }
        }

        if (adminNotes !== undefined) {
          msg.adminNotes = adminNotes;
        }

        await repo.save(msg);
        res.json({ success: true, data: msg });
      } catch (error) {
        logger.error('[Neture Contact Admin] Error updating:', error);
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: '문의 수정 실패' },
        });
      }
    },
  );

  return router;
}
