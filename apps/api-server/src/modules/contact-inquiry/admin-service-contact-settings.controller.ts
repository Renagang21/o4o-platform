/**
 * Admin Service Contact Settings Controller
 *
 * WO-O4O-SERVICE-CONTACT-SETTINGS-ADMIN-V1
 *
 * GP/KCos 운영자(admin)가 Contact Us 문의 수신·알림 설정을 조회·수정한다. Mount: /api/v1/admin/services
 *   GET /:serviceKey/contact-settings — effective 설정 조회(없으면 기본값)
 *   PUT /:serviceKey/contact-settings — upsert(이메일 형식 검증)
 *
 * 권한: requireServiceLegalScope('admin') 재사용(serviceKey 별 `{prefix}:admin`).
 *   + serviceKey 화이트리스트 = glycopharm / k-cosmetics (Neture/KPA 제외). operator 기본 접근 없음.
 *
 * 보안: 수신 이메일은 admin 응답에만 포함(공개 API 미노출). 로그에 이메일 목록/문의 전문 미기록.
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { ServiceContactSettings, type ContactInquiryTypeConfig } from './entities/ServiceContactSettings.entity.js';
import { toEffective, DEFAULT_INQUIRY_TYPES } from './contact-settings.helper.js';
import { requireServiceLegalScope } from '../service-legal/service-legal-scope.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import logger from '../../utils/logger.js';

const CONTACT_SETTINGS_SERVICE_KEYS = ['glycopharm', 'k-cosmetics'] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_RECIPIENTS = 20;

function guardServiceKey(req: Request, res: Response): string | null {
  const serviceKey = req.params.serviceKey;
  if (!(CONTACT_SETTINGS_SERVICE_KEYS as readonly string[]).includes(serviceKey)) {
    res.status(404).json({ success: false, error: { code: 'UNKNOWN_SERVICE', message: '지원하지 않는 서비스입니다.' } });
    return null;
  }
  return serviceKey;
}

/** effective → API DTO (admin 응답: 수신 이메일 포함). */
function toDto(eff: ReturnType<typeof toEffective>) {
  return {
    serviceKey: eff.serviceKey,
    inAppNotificationEnabled: eff.inAppNotificationEnabled,
    emailNotificationEnabled: eff.emailNotificationEnabled,
    recipientEmails: eff.recipientEmails,
    inquiryTypes: eff.inquiryTypes,
    privacyNotice: eff.privacyNotice,
    completionNotice: eff.completionNotice,
    isActive: eff.isActive,
    configured: eff.configured,
  };
}

/** 입력 정규화 + 검증. 반환 string 이면 에러 메시지. */
function sanitizeInput(
  body: any,
): { value: Partial<ServiceContactSettings> } | { error: string } {
  const out: Partial<ServiceContactSettings> = {};

  if (typeof body?.inAppNotificationEnabled === 'boolean') out.in_app_notification_enabled = body.inAppNotificationEnabled;
  if (typeof body?.emailNotificationEnabled === 'boolean') out.email_notification_enabled = body.emailNotificationEnabled;
  if (typeof body?.isActive === 'boolean') out.is_active = body.isActive;

  // recipientEmails: 배열 + 형식 검증 + 중복 제거
  if (body?.recipientEmails !== undefined) {
    if (!Array.isArray(body.recipientEmails)) return { error: '수신 이메일 형식이 올바르지 않습니다.' };
    const cleaned: string[] = [];
    for (const raw of body.recipientEmails) {
      if (typeof raw !== 'string') continue;
      const e = raw.trim().toLowerCase();
      if (!e) continue;
      if (!EMAIL_RE.test(e)) return { error: `올바르지 않은 이메일 주소가 있습니다: ${e}` };
      if (!cleaned.includes(e)) cleaned.push(e);
    }
    if (cleaned.length > MAX_RECIPIENTS) return { error: `수신 이메일은 최대 ${MAX_RECIPIENTS}개까지 설정할 수 있습니다.` };
    out.recipient_emails = cleaned;
  }

  // inquiryTypes: 옵션. [{value,label,enabled}]
  if (body?.inquiryTypes !== undefined) {
    if (body.inquiryTypes === null) {
      out.inquiry_types = null;
    } else if (Array.isArray(body.inquiryTypes)) {
      const types: ContactInquiryTypeConfig[] = [];
      for (const t of body.inquiryTypes) {
        if (!t || typeof t.value !== 'string') continue;
        types.push({
          value: t.value.trim().slice(0, 50),
          label: typeof t.label === 'string' ? t.label.trim().slice(0, 100) : t.value,
          enabled: t.enabled !== false,
        });
      }
      out.inquiry_types = types.length > 0 ? types : null;
    } else {
      return { error: '문의 유형 형식이 올바르지 않습니다.' };
    }
  }

  // 안내 문구: plain text (길이 제한)
  if (body?.privacyNotice !== undefined) {
    out.privacy_notice = typeof body.privacyNotice === 'string' && body.privacyNotice.trim()
      ? body.privacyNotice.trim().slice(0, 2000) : null;
  }
  if (body?.completionNotice !== undefined) {
    out.completion_notice = typeof body.completionNotice === 'string' && body.completionNotice.trim()
      ? body.completionNotice.trim().slice(0, 2000) : null;
  }

  // email 알림 켰는데 수신자가 없으면 경고성 거부(접수는 안전하지만 설정 자체는 모순)
  if (out.email_notification_enabled === true) {
    const recipients = out.recipient_emails;
    if (Array.isArray(recipients) && recipients.length === 0) {
      return { error: '이메일 알림을 사용하려면 수신 이메일을 1개 이상 입력하세요.' };
    }
  }

  return { value: out };
}

export function createAdminServiceContactSettingsController(dataSource: DataSource): Router {
  const router = Router();
  const repo = dataSource.getRepository(ServiceContactSettings);
  const adminGuard = requireServiceLegalScope('admin');

  // ── 조회 ──
  router.get('/:serviceKey/contact-settings', authenticate, adminGuard, async (req: Request, res: Response) => {
    const serviceKey = guardServiceKey(req, res);
    if (!serviceKey) return;
    try {
      const row = await repo.findOne({ where: { service_key: serviceKey } });
      res.json({ success: true, data: toDto(toEffective(serviceKey, row)) });
    } catch (error) {
      logger.error('[ContactSettings Admin] get error:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '설정 조회 실패' } });
    }
  });

  // ── upsert ──
  router.put('/:serviceKey/contact-settings', authenticate, adminGuard, async (req: Request, res: Response) => {
    const serviceKey = guardServiceKey(req, res);
    if (!serviceKey) return;

    const result = sanitizeInput(req.body ?? {});
    if ('error' in result) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: result.error } });
    }

    try {
      let row = await repo.findOne({ where: { service_key: serviceKey } });
      if (!row) {
        // 신규 — 기본값에 입력 병합
        row = repo.create({
          service_key: serviceKey,
          in_app_notification_enabled: true,
          email_notification_enabled: false,
          recipient_emails: [],
          inquiry_types: null,
          is_active: true,
        });
      }
      Object.assign(row, result.value);
      row.updated_by = (req as any).user?.id ?? row.updated_by ?? null;
      const saved = await repo.save(row);
      logger.info(`[ContactSettings Admin] saved: ${serviceKey} (email=${saved.email_notification_enabled}, recipients=${saved.recipient_emails.length})`);
      res.json({ success: true, data: toDto(toEffective(serviceKey, saved)) });
    } catch (error) {
      logger.error('[ContactSettings Admin] put error:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '설정 저장 실패' } });
    }
  });

  return router;
}

export { DEFAULT_INQUIRY_TYPES };
