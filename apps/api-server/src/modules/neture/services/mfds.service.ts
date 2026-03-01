/**
 * MFDS (식약처) Service Stub
 *
 * 식약처 API 연동 stub — 실제 API 연동은 후속 WO에서 구현
 *
 * WO-O4O-PRODUCT-MASTER-CORE-RESET-V1
 *
 * 인터페이스 FROZEN — 실제 연동 시 구현부만 교체
 */

export interface MfdsProductResult {
  /** 규제 유형 (e.g. 의약품, 건강기능식품, 의약외품, 의료기기 등) */
  regulatoryType: string;
  /** 식약처 공식 제품명 */
  regulatoryName: string;
  /** 제조사명 */
  manufacturerName: string;
  /** 식약처 허가 번호 (nullable) */
  permitNumber: string | null;
  /** 식약처 제품 ID (nullable) */
  productId: string | null;
}

export interface MfdsVerificationResult {
  verified: boolean;
  product: MfdsProductResult | null;
  error?: string;
}

/**
 * 바코드로 식약처 제품 정보 조회 (stub)
 *
 * 실제 연동 시 이 함수 구현부만 교체한다.
 * 인터페이스(MfdsProductResult)는 변경하지 않는다.
 */
export async function verifyProductByBarcode(
  barcode: string
): Promise<MfdsVerificationResult> {
  // Stub: 실제 API 연동 전까지는 미검증 상태 반환
  return {
    verified: false,
    product: null,
    error: 'MFDS_NOT_IMPLEMENTED',
  };
}

/**
 * MFDS 제품 ID로 제품 정보 조회 (stub)
 */
export async function getProductByMfdsId(
  mfdsProductId: string
): Promise<MfdsProductResult | null> {
  // Stub
  return null;
}
