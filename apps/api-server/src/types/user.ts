/**
 * User-related type definitions
 */

/**
 * Business information for Korean e-commerce
 * Designed to comply with Korean business registration and e-commerce law
 */
export interface BusinessInfo {
  // 기본 사업자 정보
  businessName?: string;          // 사업자명 (상호명)
  businessNumber?: string;        // 사업자등록번호 (XXX-XX-XXXXX)
  businessType?: string;          // 사업자 유형 (개인/법인/개인사업자)
  ceoName?: string;               // 대표자명

  // 사업장 정보
  address?: string;               // 사업장 주소 (전체 주소 문자열)

  // 전자상거래 법적 요건
  telecomLicense?: string;        // 통신판매업 신고번호 (제XXXX-XXXXX호)

  // 연락처 정보
  phone?: string;                 // 대표 전화번호
  email?: string;                 // 사업자 이메일
  website?: string;               // 웹사이트 URL

  // 확장 가능한 메타데이터
  metadata?: Record<string, any>;
}