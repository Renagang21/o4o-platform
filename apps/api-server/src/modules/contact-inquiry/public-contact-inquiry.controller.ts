import { apiLimiter } from '../../middleware/rateLimiter.js';
import { dispatchContactInquiry } from './contact-delivery.js';
import { contactService } from './contact-service-scope.js';
import { loadPublicContactSettings } from './contact-settings.helper.js';
/**
 * Public Contact Inquiry Controller (no auth)
 *
 * WO-O4O-CONTACT-DELIVERY-AND-NOTIFICATION-V1
 *
 * Mount: /api/v1/public/services
 *   POST /:serviceKey/contact-inquiries — 공개 문의 접수 + 운영자 in-app 알림
 *
 * 범위: CONTACT_SERVICES에 명시된 공개 서비스. 기존 원장은 이동하지 않는다.
 *   이전 Neture(/neture/contact) / KPA(/kpa/contact-requests)는 기존 이력·클라이언트를 위해 유지한다.
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
import logger from '../../utils/logger.js';

const VALID_INQUIRY_TYPES = [
  'service_usage',
  'account_permission',
  'partnership',
  'technical_issue',
  'other',
] as const;


const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ipHash(ip: string | undefined): string | null {
  if (!ip) return null;
  try { return createHash('sha256').update(ip).digest('hex'); } catch { return null; }
}

export function createPublicContactInquiryController(dataSource: DataSource): Router {
  const router = Router();
  const repo = dataSource.getRepository(ContactInquiry);

  router.get('/:serviceKey/contact-settings', apiLimiter, async (req: Request, res: Response) => {
    const serviceKey = req.params.serviceKey;
    if (!contactService(serviceKey)) return res.status(404).json({ success: false, error: { code: 'UNKNOWN_SERVICE', message: '지원하지 않는 서비스입니다.' } });
    res.setHeader('Cache-Control', 'no-store');
    try {
      return res.json({ success: true, data: await loadPublicContactSettings(dataSource, serviceKey) });
    } catch {
      return res.status(503).json({ success: false, error: { code: 'CONTACT_SETTINGS_UNAVAILABLE', message: '문의 설정을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' } });
    }
  });

  router.post('/:serviceKey/contact-inquiries', apiLimiter, async (req: Request, res: Response) => {
    const serviceKey = req.params.serviceKey;
    const service = contactService(serviceKey);
    if (!service) {
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

    if ([name,email,phone,organizationName,subject,message,sourcePath].some(value => typeof value === 'string' && value.includes('\0'))) {
      return res.status(400).json({success:false,error:{code:'INVALID_INPUT',message:'입력 내용을 확인해 주세요.'}});
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
    if (cleanName.length > 100 || cleanEmail.length > 255 || (typeof phone === 'string' && phone.length > 50) || (typeof organizationName === 'string' && organizationName.length > 200)) {
      return res.status(400).json({ success: false, error: { code: 'FIELD_TOO_LONG', message: '입력 길이를 확인해 주세요.' } });
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
    let publicSettings: Awaited<ReturnType<typeof loadPublicContactSettings>>;
    try { publicSettings = await loadPublicContactSettings(dataSource, serviceKey); }
    catch {
      return res.status(503).json({ success: false, error: { code: 'CONTACT_SETTINGS_UNAVAILABLE', message: '문의 설정을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.' } });
    }
    const type = publicSettings.inquiryTypesConfigured ? inquiryType
      : (VALID_INQUIRY_TYPES as readonly string[]).includes(inquiryType) ? inquiryType : 'other';
    if (!publicSettings.inquiryTypes.some(option => option.value === type)) {
      return res.status(400).json({ success: false, error: { code: 'INQUIRY_TYPE_DISABLED', message: '현재 접수할 수 없는 문의 유형입니다. 문의 화면을 새로 열어 확인해 주세요.' } });
    }

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

      // Delivery failure never changes the successful receipt. The result remains retryable.
      try {
        await dispatchContactInquiry(dataSource, serviceKey, entity.id);
      }
      catch { logger.warn('[ContactInquiry] delivery result could not be recorded'); }

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
