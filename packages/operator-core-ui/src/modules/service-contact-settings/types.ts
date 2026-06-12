/**
 * Service Contact Settings Module — types
 *
 * WO-O4O-SERVICE-CONTACT-SETTINGS-ADMIN-V1
 *
 * GP/KCos 공통 "문의 설정" Admin UI 의 데이터/어댑터 타입.
 * 서버 endpoint 가 service-scoped + 인증 필요 → 실제 HTTP 호출은 service 측(authClient)에서
 * 구현해 `ContactSettingsApi` 어댑터로 주입한다.
 *
 * 백엔드 계약: WO-O4O-SERVICE-CONTACT-SETTINGS-ADMIN-V1
 *   GET/PUT  /api/v1/admin/services/:serviceKey/contact-settings
 */

export interface ContactInquiryTypeConfig {
  value: string;
  label: string;
  enabled: boolean;
}

/** 문의 설정 DTO (admin — 수신 이메일 포함). */
export interface ContactSettingsDto {
  serviceKey: string;
  inAppNotificationEnabled: boolean;
  emailNotificationEnabled: boolean;
  recipientEmails: string[];
  inquiryTypes: ContactInquiryTypeConfig[];
  privacyNotice: string | null;
  completionNotice: string | null;
  isActive: boolean;
  /** 설정 row 실제 존재 여부(기본값 표시 구분용). */
  configured: boolean;
}

/** 저장 payload (부분 업데이트 허용). */
export interface ContactSettingsInput {
  inAppNotificationEnabled?: boolean;
  emailNotificationEnabled?: boolean;
  recipientEmails?: string[];
  inquiryTypes?: ContactInquiryTypeConfig[] | null;
  privacyNotice?: string | null;
  completionNotice?: string | null;
  isActive?: boolean;
}

/**
 * service 측이 구현해 주입하는 어댑터. 각 메서드는 실패 시 throw(메시지는 service 측 매핑).
 */
export interface ContactSettingsApi {
  getSettings(serviceKey: string): Promise<ContactSettingsDto>;
  updateSettings(serviceKey: string, payload: ContactSettingsInput): Promise<ContactSettingsDto>;
}

export interface ServiceContactSettingsPageProps {
  /** 대상 service canonical key (예: 'glycopharm'). */
  serviceKey: string;
  /** service 측 HTTP 어댑터. */
  api: ContactSettingsApi;
  /** 화면 상단 제목(선택). 기본 '문의 설정'. */
  title?: string;
}
