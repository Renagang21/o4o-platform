/**
 * O4O Business Registration Canonical Types
 *
 * WO-O4O-BUSINESS-INFO-CANONICAL-TYPE-PACKAGE-V1
 *
 * 이 타입은 O4O 공통 사업자 정보의 canonical type 이다.
 *
 * 핵심 정책 (사용자 directive — 변경 시 별도 IR/WO 필수):
 *   - **계좌 정보는 포함하지 않는다.** (bankName / bankAccountNumber / bankAccountHolder /
 *     통장사본 / 계좌 인증 모두 제외). 주문/결제/정산은 PG사가 관리.
 *     계좌/정산 정보는 현 단계에서 O4O 에 저장하지 않고 오프라인 절차로 처리한다.
 *   - **세금계산서 정보는 계좌 정보와 분리된 optional 정보**로 다룬다 (taxInvoice* 필드 그룹).
 *   - **필수 여부는 각 서비스의 가입/승인 정책에서 결정한다** — 본 canonical type 은
 *     모든 필드를 optional 로 정의 (Partial 활용 가능 + 서비스별 validation 별도).
 *
 * 이름 충돌 회피:
 *   - 기존 packages/types/src/zone.ts:178 의 `BusinessInfo` (theme/zone 용, name/phone/
 *     socialMedia/businessHours) 와 의미 다름 → 본 type 은 `BusinessRegistrationInfo` 명.
 *
 * 활용 (예정 — P2 WO):
 *   - 4 service (KPA / GP / K-Cos / Neture) 가입 폼 정합 기준
 *   - operator 승인 화면 표시 필드 기준
 *   - 프로필/내 매장 설정 수정 화면 기준
 *
 * 본 파일은 type 정의만 — DB / API / form 어느 것도 수정하지 않음.
 *
 * 선행:
 *   - IR-O4O-BUSINESS-REGISTRATION-FIELDS-CROSSSERVICE-AUDIT-V1 (P0 조사 결과)
 *   - WO-O4O-GLYCOPHARM-STORE-APPLY-DEAD-CODE-REMOVAL-V1 (P0, commit 1b0a36fee)
 */

// ─── Enums / String Literal Types ────────────────────────────

/**
 * 사업자 유형 (사업자등록증의 "사업자 유형" 분류).
 *   - individual: 개인사업자
 *   - corporation: 법인사업자
 *   - simple_taxpayer: 간이과세자
 *   - general_taxpayer: 일반과세자
 *   - tax_exempt: 면세사업자
 *   - non_profit: 비영리/공공기관
 *   - other: 기타 (관리자 직접 입력 등)
 */
export type BusinessEntityType =
  | 'individual'
  | 'corporation'
  | 'simple_taxpayer'
  | 'general_taxpayer'
  | 'tax_exempt'
  | 'non_profit'
  | 'other';

/**
 * 사업자 정보 검증 상태.
 *   - unverified: 미검증 (입력 직후 기본값)
 *   - pending: 운영자 검토 대기
 *   - verified: 검증 완료 (사업자등록증 확인 등)
 *   - rejected: 검증 거부
 */
export type BusinessVerificationStatus =
  | 'unverified'
  | 'pending'
  | 'verified'
  | 'rejected';

/**
 * 사업자 정보의 source (어디서 수집됐는지).
 *   - registration: 회원가입 흐름에서 수집
 *   - profile: 사용자 프로필/내 매장 설정에서 수집·수정
 *   - operator: 운영자가 직접 입력/수정
 *   - migration: DB migration 으로 backfill
 *   - external: 외부 API / 사업자등록 검증 service 응답
 *   - unknown: 출처 불명 (legacy 데이터)
 */
export type BusinessInfoSource =
  | 'registration'
  | 'profile'
  | 'operator'
  | 'migration'
  | 'external'
  | 'unknown';

// ─── Canonical BusinessRegistrationInfo ──────────────────────

/**
 * O4O 공통 사업자 등록 정보 canonical interface.
 *
 * 4 service (KPA / GlycoPharm / K-Cosmetics / Neture) 의 사업자성 회원
 * (약국 경영자 / 매장 경영자 / 공급자 / 파트너) 공통 기본 정보.
 *
 * 모든 필드 optional — 서비스별 필수 여부는 각 service 의 form/validation 에서 결정.
 */
export interface BusinessRegistrationInfo {
  // Group A — 사업자등록증 표준 필드
  /** 사업자등록번호 (10 자리 숫자, 하이픈 제거 권장) */
  businessRegistrationNumber?: string;
  /** 상호 / 법인명 / 사업자명 */
  businessName?: string;
  /** 대표자명 */
  representativeName?: string;
  /** 사업장 주소 (한 줄 string 또는 별도 구조화 — 향후 확장 가능) */
  businessAddress?: string;
  /** 사업장 전화번호 */
  businessPhone?: string;

  /** 업태 (예: "도매 및 소매", "제조업") */
  businessType?: string;
  /** 종목 (예: "의약품 소매업", "화장품 제조업") */
  businessItem?: string;
  /** 사업자 유형 (개인 / 법인 / 면세 / 간이 / 일반 등) */
  businessEntityType?: BusinessEntityType;
  /** 개업일 (YYYY-MM-DD ISO 8601 date string) */
  businessStartDate?: string;

  // Group B — 세금계산서 정보 (계좌 정보와 분리된 optional)
  /** 세금계산서 수신 이메일 */
  taxInvoiceEmail?: string;
  /** 세금 담당자 이름 */
  taxManagerName?: string;
  /** 세금 담당자 전화번호 */
  taxManagerPhone?: string;
  /** 세금 담당자 이메일 (수신 이메일과 다른 경우) */
  taxManagerEmail?: string;

  // Group C — 일반 연락 담당자
  /** 일반 담당자 이름 (운영 연락처) */
  contactName?: string;
  /** 일반 담당자 전화번호 */
  contactPhone?: string;
  /** 일반 담당자 이메일 */
  contactEmail?: string;

  // Group D — 첨부 / 부가 신고
  /** 사업자등록증 파일 ID (파일 저장소 정책은 별도 IR) */
  businessLicenseFileId?: string;
  /** 통신판매업 신고번호 (전자상거래법 의무) */
  mailOrderBusinessNumber?: string;
  /** 통신판매업 신고증 파일 ID */
  mailOrderBusinessFileId?: string;

  // Group E — 메타
  /** 검증 상태 */
  verificationStatus?: BusinessVerificationStatus;
  /** 정보 수집 출처 */
  source?: BusinessInfoSource;
  /** 확장 / service-specific metadata (canonical 필드에 없는 정보) */
  metadata?: Record<string, unknown>;
}

// ─── Service-specific Extensions ─────────────────────────────

/**
 * KPA-Society / GlycoPharm 약국 사업자 확장.
 * pharmacy 도메인 특화 필드 (약사면허 / 요양기관번호 등).
 */
export interface PharmacyBusinessRegistrationInfo extends BusinessRegistrationInfo {
  /** 약국명 (businessName 과 별개로 noted 용 — service 정책 결정) */
  pharmacyName?: string;
  /** 약사면허번호 */
  pharmacistLicenseNumber?: string;
  /** 요양기관번호 (medical institution code, 약국·의원·병원) */
  healthcareInstitutionCode?: string;
}

/**
 * K-Cosmetics 매장 사업자 확장.
 * store/retail 도메인 특화 필드.
 */
export interface StoreBusinessRegistrationInfo extends BusinessRegistrationInfo {
  /** 매장명 (businessName 과 별개로 노출 용) */
  storeName?: string;
  /** 매장 유형 (예: "직영", "가맹", "온라인", "오프라인" 등) */
  storeType?: string;
  /** 취급 카테고리 (예: ["스킨케어", "메이크업", "헤어"]) */
  handledCategories?: string[];
}

/**
 * Neture 공급자 / 파트너 사업자 확장.
 * B2B supplier / partner 도메인 특화 필드.
 */
export interface SupplierBusinessRegistrationInfo extends BusinessRegistrationInfo {
  /** 공급자 유형 (예: "manufacturer", "distributor", "wholesaler") */
  supplierType?: string;
  /** 파트너 유형 (예: "agency", "consultant", "service") */
  partnerType?: string;
  /** 공급 / 취급 제품군 (예: ["pharmaceutical", "cosmetic", "wellness"]) */
  productCategories?: string[];
}

// ─── Input / Update Types ────────────────────────────────────

/**
 * 입력 / 부분 수정 type. 폼 저장 / PATCH 요청에서 활용.
 * 모든 필드 optional — 본 canonical interface 자체가 optional 이므로 alias 역할.
 */
export type BusinessRegistrationInfoInput = Partial<BusinessRegistrationInfo>;
export type BusinessRegistrationInfoUpdateInput = Partial<BusinessRegistrationInfo>;

export type PharmacyBusinessRegistrationInfoInput = Partial<PharmacyBusinessRegistrationInfo>;
export type StoreBusinessRegistrationInfoInput = Partial<StoreBusinessRegistrationInfo>;
export type SupplierBusinessRegistrationInfoInput = Partial<SupplierBusinessRegistrationInfo>;
