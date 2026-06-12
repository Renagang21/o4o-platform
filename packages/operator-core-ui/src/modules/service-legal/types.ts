/**
 * Service Legal Settings Module — types
 *
 * WO-O4O-ADMIN-SERVICE-LEGAL-POLICY-SETTINGS-UI-V1
 *
 * 4 service 공통 "법정정보·약관 설정" Admin UI 의 데이터/어댑터 타입.
 * 서버 endpoint 가 service-scoped + 인증이 필요하므로, 실제 HTTP 호출은 service 측
 * (각 web-* 의 authClient)에서 구현해 `ServiceLegalApi` 어댑터로 주입한다.
 *
 * 백엔드 계약: WO-O4O-SERVICE-LEGAL-POLICY-SETTINGS-BACKEND-V1
 *   GET/PUT  /api/v1/admin/services/:serviceKey/legal-profile
 *   GET/POST/PUT /api/v1/admin/services/:serviceKey/policies[/:id]
 *   PATCH    /api/v1/admin/services/:serviceKey/policies/:id/publish
 */

/** 법정정보 (admin DTO — null 허용, placeholder 없음). */
export interface ServiceLegalProfileDto {
  id?: string;
  serviceKey?: string;
  companyName: string | null;
  representativeName: string | null;
  businessRegistrationNumber: string | null;
  ecommerceRegistrationNumber: string | null;
  ecommerceRegistrationAgency: string | null;
  businessAddress: string | null;
  customerServicePhone: string | null;
  customerServiceEmail: string | null;
  privacyOfficerName: string | null;
  privacyOfficerEmail: string | null;
  privacyOfficerPhone: string | null;
  hostingProvider: string | null;
  businessInfoVerificationUrl: string | null;
  mailOrderBrokerNotice: string | null;
  purchaseSafetyServiceInfo: string | null;
  additionalLegalNotice: string | null;
  isActive?: boolean;
  updatedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** 법정정보 저장 payload (편집 가능한 필드만). */
export interface ServiceLegalProfileInput {
  companyName?: string | null;
  representativeName?: string | null;
  businessRegistrationNumber?: string | null;
  ecommerceRegistrationNumber?: string | null;
  ecommerceRegistrationAgency?: string | null;
  businessAddress?: string | null;
  customerServicePhone?: string | null;
  customerServiceEmail?: string | null;
  privacyOfficerName?: string | null;
  privacyOfficerEmail?: string | null;
  privacyOfficerPhone?: string | null;
  hostingProvider?: string | null;
  businessInfoVerificationUrl?: string | null;
  mailOrderBrokerNotice?: string | null;
  purchaseSafetyServiceInfo?: string | null;
  additionalLegalNotice?: string | null;
  isActive?: boolean;
}

/** 정책 문서 (admin DTO). */
export interface ServicePolicyDocumentDto {
  id: string;
  serviceKey: string;
  documentType: string;
  title: string;
  slug: string | null;
  content: string;
  version: number;
  status: string; // draft | published
  effectiveDate: string | null;
  publishedAt: string | null;
  publishedBy: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  changeReason: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 정책 문서 생성/수정 payload. */
export interface ServicePolicyDocumentInput {
  documentType?: string;
  title?: string;
  slug?: string | null;
  content?: string;
  version?: number;
  effectiveDate?: string | null;
  changeReason?: string | null;
}

export type PublishAction = 'publish' | 'unpublish';

/**
 * service 측이 구현해 주입하는 어댑터.
 * 각 메서드는 실패 시 throw 한다(메시지는 service 측에서 status→문구 매핑 권장).
 * getLegalProfile 은 미설정 시 null 을 반환한다.
 */
export interface ServiceLegalApi {
  getLegalProfile(serviceKey: string): Promise<ServiceLegalProfileDto | null>;
  updateLegalProfile(serviceKey: string, payload: ServiceLegalProfileInput): Promise<ServiceLegalProfileDto>;
  listPolicies(serviceKey: string): Promise<ServicePolicyDocumentDto[]>;
  createPolicy(serviceKey: string, payload: ServicePolicyDocumentInput): Promise<ServicePolicyDocumentDto>;
  updatePolicy(serviceKey: string, id: string, payload: ServicePolicyDocumentInput): Promise<ServicePolicyDocumentDto>;
  publishPolicy(serviceKey: string, id: string, action: PublishAction): Promise<ServicePolicyDocumentDto>;
}

/** UI 에 노출하는 정책 문서 유형 화이트리스트 (백엔드와 동일). */
export const POLICY_DOCUMENT_TYPES: { value: string; label: string }[] = [
  { value: 'terms', label: '이용약관' },
  { value: 'privacy', label: '개인정보처리방침' },
  { value: 'refund', label: '환불정책' },
  { value: 'commerce', label: '전자상거래 안내' },
  { value: 'seller', label: '판매자 안내' },
  { value: 'partner', label: '파트너 안내' },
  { value: 'community', label: '커뮤니티 운영정책' },
  { value: 'marketing', label: '마케팅 정책' },
  { value: 'location', label: '위치기반 서비스' },
  { value: 'custom', label: '기타' },
];

export interface ServiceLegalSettingsPageProps {
  /** 대상 service canonical key (예: 'neture'). */
  serviceKey: string;
  /** service 측 HTTP 어댑터. */
  api: ServiceLegalApi;
  /** 화면 상단 제목(선택). 기본 '서비스 설정 — 법정정보·약관'. */
  title?: string;
}
