/**
 * User-related type definitions
 */

import type { StoreAddress } from './store-address.js';

/**
 * Business information for Korean e-commerce
 * Designed to comply with Korean business registration and e-commerce law
 */
export interface BusinessInfo {
  // 기본 사업자 정보
  businessName?: string;          // 사업자명 (상호명)
  businessNumber?: string;        // 사업자등록번호 (XXX-XX-XXXXX)
  businessType?: string;          // 사업자 유형 (개인/법인/개인사업자)
  ceoName?: string;               // 대표자명 (canonical)
  /** @deprecated WO-O4O-KPA-BUSINESSINFO-CANONICAL-FORM-ALIGNMENT-V1: ceoName 으로 통일. read-fallback 만 유지, 신규 write 금지. */
  representativeName?: string;

  // 사업장 정보
  storeAddress?: StoreAddress;    // WO-O4O-STORE-PROFILE-UNIFICATION-V1: 구조화된 주소
  address?: string;               // 사업장 주소 — 레거시 (하위 호환)
  address2?: string;              // 상세주소 — 레거시 (하위 호환)
  businessCategory?: string;      // 업종

  // 전자상거래 법적 요건
  telecomLicense?: string;        // 통신판매업 신고번호 (제XXXX-XXXXX호)

  // 연락처 정보
  phone?: string;                 // 대표 전화번호
  email?: string;                 // 대표 이메일 (사업자 이메일) — 세금계산서 이메일은 taxInvoiceEmail 사용
  website?: string;               // 웹사이트 URL

  // 세금계산서 / 운영 (WO-O4O-KPA-BUSINESSINFO-CANONICAL-FORM-ALIGNMENT-V1)
  taxInvoiceEmail?: string;       // 세금계산서 발행용 이메일 (canonical) — email overwrite 금지
  managerPhone?: string;          // 담당자 전화번호 (canonical)

  // 확장 가능한 메타데이터
  metadata?: Record<string, any>;
}