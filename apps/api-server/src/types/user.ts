/**
 * User-related type definitions
 */

import type { StoreAddress } from './store-address.js';

/**
 * Business information for Korean e-commerce
 * Designed to comply with Korean business registration and e-commerce law
 */
export interface BusinessInfo {
  // 기본 사업자 정보 (사업자등록증 기준 Canonical — WO-O4O-BUSINESS-REGISTRATION-FIELD-NAMING-STANDARD-V1)
  businessName?: string;             // 상호명
  businessNumber?: string;           // 사업자등록번호 (XXX-XX-XXXXX)
  businessType?: string;             // 업태 (예: 도소매, 제조, 서비스)
  businessItem?: string;             // 종목 (canonical) — 예: 의약품, 화장품
  representativeName?: string;       // 대표자명 (canonical)

  // 사업장 주소 (canonical)
  businessAddress?: string;          // 사업장 주소
  businessAddressDetail?: string;    // 상세주소
  zipCode?: string;                  // 우편번호

  // 전자상거래 법적 요건
  telecomLicense?: string;           // 통신판매업 신고번호

  // 연락처 정보
  phone?: string;                    // 회사 대표 전화번호
  email?: string;                    // 대표 이메일 (세금계산서는 taxInvoiceEmail 사용)
  website?: string;                  // 웹사이트 URL

  // 세금계산서 / 담당자 (canonical)
  taxInvoiceEmail?: string;          // 세금계산서 발행용 이메일 (canonical)
  managerPhone?: string;             // 담당자 전화번호
  contactName?: string;              // 담당자명

  // Legacy (read-fallback 용 — 신규 write 금지)
  /** @deprecated use representativeName */
  ceoName?: string;
  /** @deprecated use businessAddress */
  address?: string;
  /** @deprecated use businessAddressDetail */
  address2?: string;
  /** @deprecated use businessItem */
  businessCategory?: string;

  // 구조화된 주소 (WO-O4O-STORE-PROFILE-UNIFICATION-V1)
  storeAddress?: StoreAddress;

  // 확장 가능한 메타데이터
  metadata?: Record<string, any>;
}