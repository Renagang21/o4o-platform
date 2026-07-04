/**
 * Unit tests — WO-O4O-MEDICAL-DEVICE-UDI-DI-IDENTIFIER-TYPE-IMPLEMENTATION-V1
 *
 * UDI_DI identifier type normalize 규칙 검증. 실 DB 불필요.
 * - GTIN형 UDI-DI(숫자 13/14): 원형 숫자 보존
 * - HIBCC형 UDI-DI('+' prefix): '+'/문자/하이픈·점 원형 보존, 대문자화 안 함
 * - 기존 GTIN/코드류 normalize 회귀 없음
 * WO-O4O-MEDICAL-DEVICE-UDI-DI-IDENTIFIER-TYPE-IMPLEMENTATION-V1
 */
import { normalizeIdentifier } from '../product-identifier.util.js';
import { PRODUCT_IDENTIFIER_TYPES } from '../../entities/ProductIdentifier.entity.js';

describe('PRODUCT_IDENTIFIER_TYPES', () => {
  it('UDI_DI 를 포함한다', () => {
    expect(PRODUCT_IDENTIFIER_TYPES).toContain('UDI_DI');
  });
});

describe('normalizeIdentifier — UDI_DI (원형 보존)', () => {
  it('GTIN-14 숫자 UDI-DI 는 원형 숫자 그대로', () => {
    expect(normalizeIdentifier('UDI_DI', '08800158900007')).toBe('08800158900007');
  });

  it('GTIN-13 숫자 UDI-DI 는 원형 13자리 그대로 (zero-pad 하지 않음)', () => {
    expect(normalizeIdentifier('UDI_DI', '8806485001234')).toBe('8806485001234');
  });

  it("HIBCC형 UDI-DI 는 '+' prefix·문자·하이픈·점을 원형 그대로 보존한다 (대문자화 안 함)", () => {
    // 대소문자 원형 보존 — 대문자화 금지 (dedup 키 오병합 방지)
    expect(normalizeIdentifier('UDI_DI', '+J022abc01')).toBe('+J022abc01');
    // '+' 는 제거되지 않는다
    expect(normalizeIdentifier('UDI_DI', '+E2xy')).toBe('+E2xy');
    // 하이픈·점도 보존 (WO 예시)
    expect(normalizeIdentifier('UDI_DI', ' +J0123-AB ')).toBe('+J0123-AB');
    expect(normalizeIdentifier('UDI_DI', '+A1.B2-C3')).toBe('+A1.B2-C3');
  });

  it('앞뒤 공백만 trim 되고 내부 문자는 원형 보존', () => {
    expect(normalizeIdentifier('UDI_DI', '  08800158900007  ')).toBe('08800158900007');
  });

  it('빈 값은 빈 문자열', () => {
    expect(normalizeIdentifier('UDI_DI', '')).toBe('');
    expect(normalizeIdentifier('UDI_DI', '   ')).toBe('');
  });
});

describe('normalizeIdentifier — 기존 타입 회귀 없음', () => {
  it("GTIN 은 여전히 숫자만 남긴다 ('+'/문자 제거)", () => {
    // '+' 와 'J' 는 제거되고 숫자 '0123' 만 남는다 (UDI_DI 와 대비: UDI_DI 는 '+J0123' 원형 보존)
    expect(normalizeIdentifier('GTIN', '+J0123')).toBe('0123');
    expect(normalizeIdentifier('UDI_DI', '+J0123')).toBe('+J0123');
    expect(normalizeIdentifier('GTIN', '08800158900007')).toBe('08800158900007');
  });

  it('코드류(MFDS_CODE 등)는 구분기호 제거 + 대문자', () => {
    expect(normalizeIdentifier('MFDS_CODE', 'ab-c.1_2')).toBe('ABC12');
  });
});
