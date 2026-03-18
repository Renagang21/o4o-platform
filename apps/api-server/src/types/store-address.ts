/**
 * StoreAddress — 구조화된 주소 인터페이스
 *
 * WO-O4O-STORE-PROFILE-UNIFICATION-V1:
 *   한국 주소 표준 기반 4필드 구조.
 *   organizations, glycopharm_pharmacies, cosmetics_stores 테이블의
 *   address_detail (jsonb) 컬럼에 저장.
 */
export interface StoreAddress {
  /** 우편번호 (5자리) */
  zipCode?: string;
  /** 기본주소 (도로명 또는 지번) */
  baseAddress: string;
  /** 상세주소 (동/호수 등) */
  detailAddress?: string;
  /** 지역 분류 (시/도) */
  region?: string;
}
