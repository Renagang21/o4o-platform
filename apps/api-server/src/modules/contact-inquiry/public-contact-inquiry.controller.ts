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
import { emailService } from '../../services/email.service.js';
import { loadContactSettings } from './contact-settings.helper.js';
import logger from '../../utils/logger.js';

/** serviceKey → 표시 이름 (이메일 제목용). */
const SERVICE_DISPLAY_NAME: Record<string, string> = {
  glycopharm: 'GlycoPharm',
  'k-cosmetics': 'K-Cosmetics',
};

/** HTML escape — 이메일 본문에 사용자 입력을 넣을 때 XSS/주입 방지. */
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

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

      // ── 알림 정책: service_contact_settings 기반 (WO-O4O-SERVICE-CONTACT-SETTINGS-ADMIN-V1) ──
      // 설정 row 없으면 in-app=on / email=off 기본값. 어떤 경우에도 접수(저장) 성공은 불변.
      const settings = await loadContactSettings(dataSource, serviceKey);
      const typeLabel = INQUIRY_TYPE_LABELS[type] || type;

      // in-app 알림: 설정에서 켜진 경우에만 (best-effort)
      let inappStatus = 'off';
      if (settings.inAppNotificationEnabled) {
        inappStatus = 'none';
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
            await Promise.allSettled(
              operators.map((op) =>
                notificationService.createNotification({
                  userId: op.userId,
                  type: 'contact.new',
                  title: '새 문의가 접수되었습니다',
                  message: `[${typeLabel}] ${cleanSubject}`,
                  serviceKey,
                  // WO-O4O-CONTACT-INQUIRY-ADMIN-MANAGEMENT-V1: 알림 클릭 → Admin 문의 관리
                  metadata: { contactInquiryId: entity.id, inquiryType: type, targetUrl: '/admin/contact-inquiries' },
                }),
              ),
            );
            inappStatus = 'sent';
          }
        } catch (notifyError) {
          inappStatus = 'fail';
          logger.warn('[ContactInquiry] in-app notification failed (best-effort):', notifyError);
        }
      }

      // 이메일 알림: 설정에서 켜졌고 수신자가 있을 때만 (best-effort). emailService 는 미설정 시 throw 없이 실패 반환.
      let emailStatus = 'off';
      if (settings.emailNotificationEnabled) {
        if (settings.recipientEmails.length === 0) {
          emailStatus = 'none';
        } else {
          try {
            const serviceName = SERVICE_DISPLAY_NAME[serviceKey] || serviceKey;
            const html = [
              `<p>새 문의가 접수되었습니다.</p>`,
              `<ul>`,
              `<li>유형: ${esc(typeLabel)}</li>`,
              `<li>제목: ${esc(cleanSubject)}</li>`,
              `<li>이름: ${esc(cleanName)}</li>`,
              `<li>이메일: ${esc(cleanEmail)}</li>`,
              entity.organization_name ? `<li>소속: ${esc(entity.organization_name)}</li>` : '',
              entity.phone ? `<li>연락처: ${esc(entity.phone)}</li>` : '',
              `<li>접수 시각: ${esc(entity.created_at?.toISOString?.() || '')}</li>`,
              `</ul>`,
              `<p><strong>문의 내용</strong></p>`,
              `<pre style="white-space:pre-wrap;font-family:inherit">${esc(cleanMessage)}</pre>`,
              `<p>운영자 관리 화면 &gt; 문의 관리(/admin/contact-inquiries)에서 확인·처리할 수 있습니다.</p>`,
            ].join('\n');
            const result = await emailService.sendEmail({
              to: settings.recipientEmails,
              subject: `[${serviceName}] 새 문의가 접수되었습니다 — ${cleanSubject.slice(0, 80)}`,
              html,
            });
            if (result.success) {
              emailStatus = 'sent';
            } else {
              // transport 미설정(provider 없음) vs 실제 발송 실패 구분
              emailStatus = /disabled/i.test(result.error || '') ? 'noprovider' : 'fail';
              logger.warn(`[ContactInquiry] email notify not sent (${emailStatus}): ${result.error || ''}`);
            }
          } catch (emailError) {
            emailStatus = 'fail';
            logger.warn('[ContactInquiry] email notification error (best-effort):', emailError);
          }
        }
      }

      // 복합 알림 결과 기록(접수 자체는 이미 성공). varchar(40) 이내.
      const notificationStatus = `inapp:${inappStatus};email:${emailStatus}`;
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
