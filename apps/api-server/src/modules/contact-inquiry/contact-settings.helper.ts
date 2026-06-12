/**
 * Contact Settings Helper
 *
 * WO-O4O-SERVICE-CONTACT-SETTINGS-ADMIN-V1
 *
 * service_contact_settings row 를 "기본값 병합된 effective 설정"으로 로드한다.
 * row 가 없으면 in-app=on / email=off / 수신자 없음 / 공통 기본 유형을 반환한다.
 * admin 컨트롤러(설정 화면)와 public submit 컨트롤러(알림 정책)가 공유한다.
 */

import type { DataSource } from 'typeorm';
import { ServiceContactSettings, type ContactInquiryTypeConfig } from './entities/ServiceContactSettings.entity.js';

/** 공통 기본 문의 유형 (public-contact-inquiry.controller 의 VALID_INQUIRY_TYPES 와 정렬). */
export const DEFAULT_INQUIRY_TYPES: ContactInquiryTypeConfig[] = [
  { value: 'service_usage', label: '서비스 이용 문의', enabled: true },
  { value: 'account_permission', label: '가입/권한 문의', enabled: true },
  { value: 'partnership', label: '공급·제휴 문의', enabled: true },
  { value: 'technical_issue', label: '오류 신고', enabled: true },
  { value: 'other', label: '기타 문의', enabled: true },
];

export interface EffectiveContactSettings {
  serviceKey: string;
  inAppNotificationEnabled: boolean;
  emailNotificationEnabled: boolean;
  recipientEmails: string[];
  inquiryTypes: ContactInquiryTypeConfig[];
  privacyNotice: string | null;
  completionNotice: string | null;
  isActive: boolean;
  /** row 가 실제 존재하는지(미설정 구분용). */
  configured: boolean;
}

/** row → effective(기본값 병합). row 없으면 기본 정책. */
export function toEffective(serviceKey: string, row: ServiceContactSettings | null): EffectiveContactSettings {
  return {
    serviceKey,
    inAppNotificationEnabled: row ? row.in_app_notification_enabled : true,
    emailNotificationEnabled: row ? row.email_notification_enabled : false,
    recipientEmails: row && Array.isArray(row.recipient_emails) ? row.recipient_emails : [],
    inquiryTypes: row && Array.isArray(row.inquiry_types) && row.inquiry_types.length > 0
      ? row.inquiry_types
      : DEFAULT_INQUIRY_TYPES,
    privacyNotice: row ? row.privacy_notice : null,
    completionNotice: row ? row.completion_notice : null,
    isActive: row ? row.is_active : true,
    configured: !!row,
  };
}

/** serviceKey 의 effective 설정 로드(없으면 기본값). 조회 실패해도 기본값 반환(접수 흐름 보호). */
export async function loadContactSettings(
  dataSource: DataSource,
  serviceKey: string,
): Promise<EffectiveContactSettings> {
  try {
    const row = await dataSource.getRepository(ServiceContactSettings).findOne({ where: { service_key: serviceKey } });
    return toEffective(serviceKey, row);
  } catch {
    return toEffective(serviceKey, null);
  }
}
