/**
 * MFDS (식약처) Service Stub
 *
 * 식약처 API 연동 stub — 실제 API 연동은 후속 WO에서 구현
 *
 * WO-O4O-PRODUCT-MASTER-CORE-RESET-V1
 */

export interface MfdsProductInfo {
  mfdsProductId: string;
  regulatoryName: string;
  manufacturerName: string;
  barcode: string;
}

export interface MfdsVerificationResult {
  verified: boolean;
  product: MfdsProductInfo | null;
  error?: string;
}

/**
 * 바코드로 식약처 제품 정보 조회 (stub)
 *
 * TODO: 실제 식약처 API 연동 시 구현
 * - 식약처 의약품안전나라 OpenAPI
 * - 건강기능식품 API
 */
export async function verifyProductByBarcode(
  barcode: string
): Promise<MfdsVerificationResult> {
  // Stub: 실제 API 연동 전까지는 미검증 상태 반환
  return {
    verified: false,
    product: null,
    error: 'MFDS API integration not yet implemented',
  };
}

/**
 * MFDS 제품 ID로 제품 정보 조회 (stub)
 */
export async function getProductByMfdsId(
  mfdsProductId: string
): Promise<MfdsProductInfo | null> {
  // Stub
  return null;
}
