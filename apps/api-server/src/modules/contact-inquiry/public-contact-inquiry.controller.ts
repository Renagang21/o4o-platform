/**
 * Public Contact Inquiry Controller (no auth)
 *
 * WO-O4O-CONTACT-DELIVERY-AND-NOTIFICATION-V1
 *
 * Mount: /api/v1/public/services
 *   POST /:serviceKey/contact-inquiries — 공개 문의 접수 + 운영자 in-app 알림
 *
 * 범위: GlycoPharm / K-Cosmetics (기존 contact 백엔드 없던 서비스).
 *   Neture(/neture/contact) / KPA(/kpa/contact-requests) 는 기존 경로 유지 — 본 컨트롤러 미사용.
 *
 * 정책:
 *   - 인증 없음. validation + 개인정보 동의 필수 + honeypot spam guard.
 *   - 저장 후 role_assignments 기반 운영자(`{prefix}:operator|admin`)에게 in-app 알림(contact.new) best-effort.
 *   - 수신자 없거나 알림 실패해도 접수(저장)는 성공 — notification_status 기록.
 *   - IP 원문 미저장(sha256 hash). 본문은 plain 저장(HTML 렌더 안 함).
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { createHash } from 'crypto';
import { ContactInquiry } from './entities/ContactInquiry.entity.js';
import { notificationService } from '../../services/NotificationService.js';
import logger from '../../utils/logger.js';

/** 본 공통 문의 API 가 받는 serviceKey → role prefix. (Neture/KPA 는 자체 경로 사용 → 제외) */
const SERVICE_ROLE_PREFIX: Record<string, string> = {
  glycopharm: 'glycopharm',
  'k-cosmetics': 'cosmetics',
};

const VALID_INQUIRY_TYPES = [
  'service_usage',
  'account_permission',
  'partnership',
  'technical_issue',
  'other',
] as const;

const INQUIRY_TYPE_LABELS: Record<string, string> = {
  service_usage: '서비스 이용 문의',
  account_permission: '가입/권한 문의',
  partnership: '공급·제휴 문의',
  technical_issue: '오류 신고',
  other: '기타 문의',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ipHash(ip: string | undefined): string | null {
  if (!ip) return null;
  try { return createHash('sha256').update(ip).digest('hex'); } catch { return null; }
}

export function createPublicContactInquiryController(dataSource: DataSource): Router {
  const router = Router();
  const repo = dataSource.getRepository(ContactInquiry);

  router.post('/:serviceKey/contact-inquiries', async (req: Request, res: Response) => {
    const serviceKey = req.params.serviceKey;
    const rolePrefix = SERVICE_ROLE_PREFIX[serviceKey];
    if (!rolePrefix) {
      return res.status(404).json({
        success: false,
        error: { code: 'UNKNOWN_SERVICE', message: '지원하지 않는 서비스입니다.' },
      });
    }

    const {
      inquiryType = 'other',
      name,
      email,
      phone,
      organizationName,
      subject,
      message,
      privacyConsent,
      sourcePath,
      // honeypot: 실제 사용자에게 비표시 필드. 채워져 오면 봇으로 간주.
      company_website,
    } = req.body ?? {};

    // ── honeypot: 봇이면 저장/알림 없이 성공처럼 응답(공격자에게 단서 미제공) ──
    if (typeof company_website === 'string' && company_website.trim().length > 0) {
      return res.status(201).json({ success: true, data: { id: null, status: 'received' } });
    }

    // ── validation ──
    const cleanName = typeof name === 'string' ? name.trim() : '';
    const cleanEmail = typeof email === 'string' ? email.trim() : '';
    const cleanSubject = typeof subject === 'string' ? subject.trim() : '';
    const cleanMessage = typeof message === 'string' ? message.trim() : '';

    if (!cleanName || !cleanEmail || !cleanSubject || !cleanMessage) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_REQUIRED_FIELDS', message: '필수 항목을 입력해 주세요.' },
      });
    }
    if (!EMAIL_RE.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_EMAIL', message: '올바른 이메일 주소를 입력해 주세요.' },
      });
    }
    if (privacyConsent !== true) {
      return res.status(400).json({
        success: false,
        error: { code: 'PRIVACY_CONSENT_REQUIRED', message: '개인정보 수집·이용 동의가 필요합니다.' },
      });
    }
    if (cleanSubject.length > 300) {
      return res.status(400).json({
        success: false,
        error: { code: 'SUBJECT_TOO_LONG', message: '제목이 너무 깁니다.' },
      });
    }
    if (cleanMessage.length < 10) {
      return res.status(400).json({
        success: false,
        error: { code: 'MESSAGE_TOO_SHORT', message: '문의 내용을 10자 이상 입력해 주세요.' },
      });
    }
    if (cleanMessage.length > 5000) {
      return res.status(400).json({
        success: false,
        error: { code: 'MESSAGE_TOO_LONG', message: '문의 내용이 너무 깁니다.' },
      });
    }
    const type = (VALID_INQUIRY_TYPES as readonly string[]).includes(inquiryType) ? inquiryType : 'other';

    try {
      const entity = repo.create({
        service_key: serviceKey,
        inquiry_type: type,
        name: cleanName,
        email: cleanEmail,
        phone: typeof phone === 'string' && phone.trim() ? phone.trim() : null,
        organization_name: typeof organizationName === 'string' && organizationName.trim() ? organizationName.trim() : null,
        subject: cleanSubject,
        message: cleanMessage,
        privacy_consent: true,
        status: 'received',
        source_path: typeof sourcePath === 'string' && sourcePath.trim() ? sourcePath.trim().slice(0, 300) : null,
        user_agent: req.headers['user-agent'] || null,
        ip_hash: ipHash(req.ip || req.socket?.remoteAddress || undefined),
      });
      await repo.save(entity);

      logger.info(`[ContactInquiry] new: ${entity.id} (${serviceKey}/${type})`);

      // ── 운영자 in-app 알림 (best-effort) ──
      let notificationStatus = 'skipped_no_recipient';
      try {
        const operators: { userId: string }[] = await dataSource.query(
          `SELECT DISTINCT user_id AS "userId"
             FROM role_assignments
            WHERE role IN ($1, $2)
              AND is_active = true
            LIMIT 50`,
          [`${rolePrefix}:operator`, `${rolePrefix}:admin`],
        );
        if (operators.length > 0) {
          const typeLabel = INQUIRY_TYPE_LABELS[type] || type;
          await Promise.allSettled(
            operators.map((op) =>
              notificationService.createNotification({
                userId: op.userId,
                type: 'contact.new',
                title: '새 문의가 접수되었습니다',
                message: `[${typeLabel}] ${cleanSubject}`,
                serviceKey,
                metadata: { contactInquiryId: entity.id, inquiryType: type },
              }),
            ),
          );
          notificationStatus = 'sent';
        }
      } catch (notifyError) {
        notificationStatus = 'failed';
        logger.warn('[ContactInquiry] operator notification failed (best-effort):', notifyError);
      }

      // 알림 결과 기록(접수 자체는 이미 성공).
      try {
        entity.notification_status = notificationStatus;
        await repo.save(entity);
      } catch { /* 무시 — 상태 기록 실패가 접수 성공을 바꾸지 않음 */ }

      return res.status(201).json({ success: true, data: { id: entity.id, status: entity.status } });
    } catch (error) {
      logger.error('[ContactInquiry] submit error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '문의 접수 중 오류가 발생했습니다.' },
      });
    }
  });

  return router;
}
