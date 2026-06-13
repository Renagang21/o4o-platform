/**
 * Contact Notification Helper — 운영자 이메일 알림 + 문의자 자동 회신 (이메일 2채널)
 *
 * WO-O4O-CONTACT-NETURE-KPA-SETTINGS-ADAPTER-V1
 *
 * GP/KCos public-contact-inquiry.controller 의 이메일/자동 회신 로직을 service-neutral 하게 추출.
 * Neture(/neture/contact) · KPA(/kpa/contact-requests) 의 기존 submit 흐름이 자체 저장·in-app 알림은
 * 그대로 둔 채, 본 helper 를 호출해 ServiceContactSettings 기반 이메일/자동 회신만 추가한다.
 *
 * 원칙:
 *   - in-app 알림은 각 서비스가 기존대로 별도 처리 — 본 helper 는 email/autoreply 두 채널만 담당.
 *   - 어떤 실패도 throw 하지 않는다. 상태 문자열만 반환(접수 흐름 보호).
 *   - 수신자(recipientEmails)와 문의자(input.email)를 혼동하지 않는다.
 *   - 사용자 입력은 HTML escape 후 본문에 포함.
 *
 * 참고: GP/KCos public controller 는 본 helper 를 사용하지 않고 인라인 구현을 유지한다
 *   (WO 범위 경계 — GP/KCos 미수정). 동일 정책의 의도적 중복.
 */

import { emailService } from '../../services/email.service.js';
import type { EffectiveContactSettings } from './contact-settings.helper.js';
import logger from '../../utils/logger.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** HTML escape — 이메일 본문에 사용자 입력을 넣을 때 XSS/주입 방지. */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export interface ContactEmailInput {
  /** 이메일 제목 prefix 용 서비스 표시명 (예: 'Neture', 'KPA Society'). */
  serviceName: string;
  /** 문의 유형 라벨 (예: '공급자', '협력 문의'). */
  typeLabel: string;
  subject: string;
  name: string;
  /** 문의자 이메일 — 자동 회신 수신처. 운영자 수신자와 별개. */
  email: string;
  organizationName?: string | null;
  phone?: string | null;
  message: string;
  createdAt?: Date | null;
  /** 운영자 이메일 본문에 안내할 관리 화면 경로 (예: '/admin/contact-messages'). */
  adminManageUrl?: string;
}

export interface ContactEmailResult {
  /** off | none | sent | noprovider | fail */
  emailStatus: string;
  /** off | noemail | sent | noprovider | fail */
  autoReplyStatus: string;
}

/**
 * settings 기반 운영자 이메일 알림 + 문의자 자동 회신 발송(best-effort).
 * 반환: 각 채널 상태 문자열. 호출부에서 `inapp:<x>;email:<y>;autoreply:<z>` 로 조립.
 */
export async function sendContactEmails(
  settings: EffectiveContactSettings,
  input: ContactEmailInput,
): Promise<ContactEmailResult> {
  const esc = escapeHtml;
  const createdIso = input.createdAt?.toISOString?.() || '';
  const manageUrl = input.adminManageUrl || '/admin/contact-inquiries';

  // ── 운영자 이메일 알림: 켜졌고 수신자가 있을 때만 ──
  let emailStatus = 'off';
  if (settings.emailNotificationEnabled) {
    if (settings.recipientEmails.length === 0) {
      emailStatus = 'none';
    } else {
      try {
        const html = [
          `<p>새 문의가 접수되었습니다.</p>`,
          `<ul>`,
          `<li>유형: ${esc(input.typeLabel)}</li>`,
          `<li>제목: ${esc(input.subject)}</li>`,
          `<li>이름: ${esc(input.name)}</li>`,
          `<li>이메일: ${esc(input.email)}</li>`,
          input.organizationName ? `<li>소속: ${esc(input.organizationName)}</li>` : '',
          input.phone ? `<li>연락처: ${esc(input.phone)}</li>` : '',
          `<li>접수 시각: ${esc(createdIso)}</li>`,
          `</ul>`,
          `<p><strong>문의 내용</strong></p>`,
          `<pre style="white-space:pre-wrap;font-family:inherit">${esc(input.message)}</pre>`,
          `<p>운영자 관리 화면(${esc(manageUrl)})에서 확인·처리할 수 있습니다.</p>`,
        ].join('\n');
        const result = await emailService.sendEmail({
          to: settings.recipientEmails,
          subject: `[${input.serviceName}] 새 문의가 접수되었습니다 — ${input.subject.slice(0, 80)}`,
          html,
        });
        if (result.success) {
          emailStatus = 'sent';
        } else {
          emailStatus = /disabled/i.test(result.error || '') ? 'noprovider' : 'fail';
          logger.warn(`[ContactNotify] operator email not sent (${emailStatus}): ${result.error || ''}`);
        }
      } catch (emailError) {
        emailStatus = 'fail';
        logger.warn('[ContactNotify] operator email error (best-effort):', emailError);
      }
    }
  }

  // ── 문의자 자동 회신: "답변"이 아니라 "접수 확인". 문의자(input.email)에게만 발송 ──
  let autoReplyStatus = 'off';
  if (settings.autoReplyEnabled) {
    if (!settings.autoReplySubject || !settings.autoReplyMessage) {
      autoReplyStatus = 'off'; // 제목/본문 미설정 — 발송 안 함
    } else if (!EMAIL_RE.test(input.email)) {
      autoReplyStatus = 'noemail';
    } else {
      try {
        const parts = [
          `<div style="white-space:pre-wrap;font-family:inherit">${esc(settings.autoReplyMessage)}</div>`,
          `<hr/>`,
          `<p style="color:#64748b;font-size:13px">`,
          `서비스: ${esc(input.serviceName)}<br/>`,
          `문의 유형: ${esc(input.typeLabel)}<br/>`,
          `제목: ${esc(input.subject)}<br/>`,
          `접수 시각: ${esc(createdIso)}`,
          `</p>`,
        ];
        if (settings.autoReplyIncludeOriginal) {
          parts.push(`<p style="color:#64748b;font-size:13px"><strong>문의 내용</strong></p>`);
          parts.push(`<pre style="white-space:pre-wrap;font-family:inherit;color:#475569">${esc(input.message)}</pre>`);
        }
        const result = await emailService.sendEmail({
          to: input.email,
          subject: (settings.autoReplySubject || `[${input.serviceName}] 문의가 접수되었습니다`).slice(0, 200),
          html: parts.join('\n'),
        });
        if (result.success) {
          autoReplyStatus = 'sent';
        } else {
          autoReplyStatus = /disabled/i.test(result.error || '') ? 'noprovider' : 'fail';
          logger.warn(`[ContactNotify] auto-reply not sent (${autoReplyStatus}): ${result.error || ''}`);
        }
      } catch (autoReplyError) {
        autoReplyStatus = 'fail';
        logger.warn('[ContactNotify] auto-reply error (best-effort):', autoReplyError);
      }
    }
  }

  return { emailStatus, autoReplyStatus };
}
