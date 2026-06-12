/**
 * Contact Inquiry Admin Module — types
 *
 * WO-O4O-CONTACT-INQUIRY-ADMIN-MANAGEMENT-V1
 *
 * GP/KCos 공통 "문의 관리" Admin UI 의 데이터/어댑터 타입.
 * 서버 endpoint 가 serviceKey-scoped + admin 인증이라, HTTP 호출은 service 측 authClient 로 구현해 주입한다.
 * backend: WO-O4O-CONTACT-INQUIRY-ADMIN-MANAGEMENT-V1 (/api/v1/admin/services/:serviceKey/contact-inquiries).
 */

export interface ContactInquiryListItem {
  id: string;
  serviceKey: string;
  inquiryType: string;
  name: string;
  email: string;
  organizationName: string | null;
  subject: string;
  status: string;
  notificationStatus: string | null;
  createdAt: string;
  handledAt: string | null;
}

export interface ContactInquiryDetail extends ContactInquiryListItem {
  phone: string | null;
  message: string;
  privacyConsent: boolean;
  sourcePath: string | null;
  updatedAt: string;
  handledBy: string | null;
  internalNote: string | null;
}

export interface ContactInquiryListResult {
  items: ContactInquiryListItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface ContactInquiryListParams {
  status?: string;
  page?: number;
  limit?: number;
}

/** service 측이 구현해 주입하는 어댑터. 실패 시 throw(메시지). */
export interface ContactInquiryApi {
  list(serviceKey: string, params: ContactInquiryListParams): Promise<ContactInquiryListResult>;
  getDetail(serviceKey: string, id: string): Promise<ContactInquiryDetail>;
  setStatus(serviceKey: string, id: string, status: string): Promise<ContactInquiryDetail>;
  setNote(serviceKey: string, id: string, internalNote: string): Promise<ContactInquiryDetail>;
}

export const CONTACT_STATUSES: { value: string; label: string }[] = [
  { value: 'received', label: '접수' },
  { value: 'in_review', label: '확인 중' },
  { value: 'answered', label: '답변 완료' },
  { value: 'closed', label: '종료' },
  { value: 'spam', label: '스팸' },
];

export interface ContactInquiryAdminPageProps {
  serviceKey: string;
  api: ContactInquiryApi;
  /** 문의 유형 코드 → 라벨(서비스별 톤). 미지정 키는 코드 그대로. */
  inquiryTypeLabels?: Record<string, string>;
  title?: string;
}
