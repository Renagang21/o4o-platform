/**
 * GTIN (Global Trade Item Number) Validation
 *
 * GTIN-8, GTIN-12, GTIN-13, GTIN-14 check digit 검증
 *
 * WO-O4O-PRODUCT-MASTER-CORE-RESET-V1
 */

/**
 * GTIN check digit 계산 (마지막 자리 제외한 숫자열 기준)
 */
function calculateCheckDigit(digits: string): number {
  const len = digits.length;
  let sum = 0;
  for (let i = 0; i < len; i++) {
    const digit = parseInt(digits[len - 1 - i], 10);
    // 짝수 위치(0-indexed from right): ×3, 홀수 위치: ×1
    sum += i % 2 === 0 ? digit * 3 : digit;
  }
  return (10 - (sum % 10)) % 10;
}

/**
 * GTIN 형식 검증 + check digit 검증
 *
 * @returns null if valid, error message string if invalid
 */
export function validateGtin(barcode: string): string | null {
  if (!barcode || typeof barcode !== 'string') {
    return 'Barcode is required';
  }

  // 숫자만 허용
  if (!/^\d+$/.test(barcode)) {
    return 'Barcode must contain only digits';
  }

  // 허용 길이: 8, 12, 13, 14
  const validLengths = [8, 12, 13, 14];
  if (!validLengths.includes(barcode.length)) {
    return `Barcode length must be 8, 12, 13, or 14 (got ${barcode.length})`;
  }

  // check digit 검증
  const payload = barcode.slice(0, -1);
  const expectedCheck = calculateCheckDigit(payload);
  const actualCheck = parseInt(barcode[barcode.length - 1], 10);

  if (expectedCheck !== actualCheck) {
    return `Invalid check digit: expected ${expectedCheck}, got ${actualCheck}`;
  }

  return null;
}

/**
 * GTIN이 유효한지 boolean으로 반환
 */
export function isValidGtin(barcode: string): boolean {
  return validateGtin(barcode) === null;
}

/**
 * 내부 바코드 생성 (바코드 미입력 시 자동 생성)
 *
 * WO-NETURE-PRODUCT-REGISTRATION-REFACTOR-AND-AI-TAGGING-V1
 *
 * GS1 prefix 200 (매장 내부용 예약 대역) 기반 유효 EAN-13 생성.
 * 형식: 200 + hash(seed) 6자리 + timestamp 3자리 + check digit = 13자리
 */
export function generateInternalBarcode(seed: string): string {
  // Simple hash: seed 문자 코드 합산 → 6자리
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  const hashStr = String(Math.abs(hash) % 1000000).padStart(6, '0');

  // Timestamp 3자리 (밀리초 하위 3자리)
  const ts = String(Date.now() % 1000).padStart(3, '0');

  // 200 + 6자리 + 3자리 = 12자리 payload
  const payload = `200${hashStr}${ts}`;
  const checkDigit = calculateCheckDigit(payload);

  return `${payload}${checkDigit}`;
}
