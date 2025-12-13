/**
 * PharmacyOps × Partner-Core Integration Tests
 *
 * PHARMACEUTICAL 제품은 파트너 프로그램에서 제외되고,
 * COSMETICS, HEALTH, GENERAL 제품만 파트너 이벤트를 발생시키는지 검증합니다.
 *
 * @package @o4o/partner-core
 */

import {
  // Product Type Utils
  isPartnerEligibleProductType,
  isPartnerExcludedProductType,
  isPharmaceuticalProductType,
  validateProductTypeForPartner,
  filterPartnerEligibleProducts,
  filterPartnerExcludedProducts,
  getProductTypeStats,
  PARTNER_ALLOWED_PRODUCT_TYPES,
  PARTNER_EXCLUDED_PRODUCT_TYPES,
} from '../utils/product-type-filter.js';

import { ConversionSource } from '../entities/PartnerConversion.entity.js';

describe('Pharmacy × Partner-Core Integration', () => {
  // =====================================================
  // Product Type Filter Tests
  // =====================================================

  describe('Product Type Filter', () => {
    // Test 1: PHARMACEUTICAL 제품 제외 확인
    test('should exclude pharmaceutical products from partner program', () => {
      expect(isPartnerExcludedProductType('pharmaceutical')).toBe(true);
      expect(isPartnerExcludedProductType('PHARMACEUTICAL')).toBe(true);
      expect(isPartnerExcludedProductType('Pharmaceutical')).toBe(true);
    });

    // Test 2: COSMETICS 제품 허용 확인
    test('should allow cosmetics products in partner program', () => {
      expect(isPartnerEligibleProductType('cosmetics')).toBe(true);
      expect(isPartnerEligibleProductType('COSMETICS')).toBe(true);
    });

    // Test 3: HEALTH 제품 허용 확인
    test('should allow health products in partner program', () => {
      expect(isPartnerEligibleProductType('health')).toBe(true);
      expect(isPartnerEligibleProductType('HEALTH')).toBe(true);
    });

    // Test 4: GENERAL 제품 허용 확인
    test('should allow general products in partner program', () => {
      expect(isPartnerEligibleProductType('general')).toBe(true);
      expect(isPartnerEligibleProductType('GENERAL')).toBe(true);
    });

    // Test 5: 알 수 없는 제품 타입 처리
    test('should reject unknown product types', () => {
      expect(isPartnerEligibleProductType('unknown')).toBe(false);
      expect(isPartnerEligibleProductType('electronics')).toBe(false);
      expect(isPartnerEligibleProductType('')).toBe(false);
      expect(isPartnerEligibleProductType(null)).toBe(false);
      expect(isPartnerEligibleProductType(undefined)).toBe(false);
    });

    // Test 6: isPharmaceuticalProductType 함수 검증
    test('should correctly identify pharmaceutical product type', () => {
      expect(isPharmaceuticalProductType('pharmaceutical')).toBe(true);
      expect(isPharmaceuticalProductType('PHARMACEUTICAL')).toBe(true);
      expect(isPharmaceuticalProductType('cosmetics')).toBe(false);
      expect(isPharmaceuticalProductType('health')).toBe(false);
    });
  });

  // =====================================================
  // Product Type Validation Tests
  // =====================================================

  describe('Product Type Validation', () => {
    // Test 7: 허용 제품 타입 검증 결과
    test('should return valid result for allowed product types', () => {
      const result = validateProductTypeForPartner('cosmetics');
      expect(result.isValid).toBe(true);
      expect(result.isAllowed).toBe(true);
      expect(result.isExcluded).toBe(false);
      expect(result.reason).toBeUndefined();
    });

    // Test 8: 제외 제품 타입 검증 결과
    test('should return excluded result for pharmaceutical products', () => {
      const result = validateProductTypeForPartner('pharmaceutical');
      expect(result.isValid).toBe(false);
      expect(result.isAllowed).toBe(false);
      expect(result.isExcluded).toBe(true);
      expect(result.reason).toContain('excluded');
    });

    // Test 9: 빈 제품 타입 검증 결과
    test('should return invalid result for empty product type', () => {
      const result = validateProductTypeForPartner('');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('required');
    });
  });

  // =====================================================
  // Product Filter Tests
  // =====================================================

  describe('Product List Filtering', () => {
    const testProducts = [
      { id: '1', name: 'Vitamin C', productType: 'health' },
      { id: '2', name: 'Aspirin', productType: 'pharmaceutical' },
      { id: '3', name: 'Lipstick', productType: 'cosmetics' },
      { id: '4', name: 'Ibuprofen', productType: 'pharmaceutical' },
      { id: '5', name: 'Face Cream', productType: 'cosmetics' },
      { id: '6', name: 'Band-Aid', productType: 'general' },
    ];

    // Test 10: 파트너 프로그램 허용 제품 필터링
    test('should filter only partner-eligible products', () => {
      const filtered = filterPartnerEligibleProducts(
        testProducts,
        (p) => p.productType
      );
      expect(filtered.length).toBe(4); // health, cosmetics, cosmetics, general
      expect(filtered.find((p) => p.productType === 'pharmaceutical')).toBeUndefined();
    });

    // Test 11: 파트너 프로그램 제외 제품 필터링
    test('should filter only excluded products', () => {
      const filtered = filterPartnerExcludedProducts(
        testProducts,
        (p) => p.productType
      );
      expect(filtered.length).toBe(2); // 2 pharmaceuticals
      expect(filtered.every((p) => p.productType === 'pharmaceutical')).toBe(true);
    });

    // Test 12: 제품 타입 통계 계산
    test('should calculate correct product type statistics', () => {
      const stats = getProductTypeStats(testProducts, (p) => p.productType);
      expect(stats.total).toBe(6);
      expect(stats.allowed).toBe(4);
      expect(stats.excluded).toBe(2);
      expect(stats.byType['health']).toBe(1);
      expect(stats.byType['pharmaceutical']).toBe(2);
      expect(stats.byType['cosmetics']).toBe(2);
      expect(stats.byType['general']).toBe(1);
    });
  });

  // =====================================================
  // Conversion Source Tests
  // =====================================================

  describe('Conversion Source', () => {
    // Test 13: ConversionSource enum 값 확인
    test('should have correct conversion source values', () => {
      expect(ConversionSource.PARTNER).toBe('partner');
      expect(ConversionSource.PHARMACY).toBe('pharmacy');
      expect(ConversionSource.SYSTEM).toBe('system');
    });

    // Test 14: 약국 소스 전환 식별
    test('should identify pharmacy source conversions', () => {
      const conversionSource: string = ConversionSource.PHARMACY;
      expect(conversionSource).toBe('pharmacy');
      expect(conversionSource).not.toBe(ConversionSource.PARTNER);
    });
  });

  // =====================================================
  // Allowed/Excluded Type Lists Tests
  // =====================================================

  describe('Type Lists', () => {
    // Test 15: 허용 타입 목록 확인
    test('should have correct allowed product types', () => {
      expect(PARTNER_ALLOWED_PRODUCT_TYPES).toContain('cosmetics');
      expect(PARTNER_ALLOWED_PRODUCT_TYPES).toContain('health');
      expect(PARTNER_ALLOWED_PRODUCT_TYPES).toContain('general');
      expect(PARTNER_ALLOWED_PRODUCT_TYPES).not.toContain('pharmaceutical');
    });

    // Test 16: 제외 타입 목록 확인
    test('should have correct excluded product types', () => {
      expect(PARTNER_EXCLUDED_PRODUCT_TYPES).toContain('pharmaceutical');
      expect(PARTNER_EXCLUDED_PRODUCT_TYPES).not.toContain('cosmetics');
      expect(PARTNER_EXCLUDED_PRODUCT_TYPES).not.toContain('health');
    });
  });
});

describe('Pharmacy Event Bridge Scenarios', () => {
  // Test 17: PHARMACEUTICAL 이벤트가 파트너로 전달되지 않음
  test('should NOT send pharmaceutical product events to partner', () => {
    const productType = 'pharmaceutical';
    const shouldSendToPartner = isPartnerEligibleProductType(productType);
    expect(shouldSendToPartner).toBe(false);
  });

  // Test 18: COSMETICS 이벤트가 파트너로 전달됨
  test('should send cosmetics product events to partner', () => {
    const productType = 'cosmetics';
    const shouldSendToPartner = isPartnerEligibleProductType(productType);
    expect(shouldSendToPartner).toBe(true);
  });

  // Test 19: 약국 주문 이벤트 시나리오
  test('should handle pharmacy order created event correctly', () => {
    // Scenario: 약국에서 건강식품 주문 생성
    const orderEvent = {
      type: 'order.created',
      pharmacyId: 'pharmacy-001',
      productId: 'prod-001',
      productType: 'health',
      orderId: 'order-001',
      orderAmount: 50000,
    };

    // 파트너 이벤트로 전달 가능 여부 확인
    const canForwardToPartner = isPartnerEligibleProductType(orderEvent.productType);
    expect(canForwardToPartner).toBe(true);

    // 전환 소스 확인
    const conversionSource = ConversionSource.PHARMACY;
    expect(conversionSource).toBe('pharmacy');
  });

  // Test 20: 약국 의약품 주문 이벤트 시나리오
  test('should block pharmaceutical order events from partner', () => {
    // Scenario: 약국에서 의약품 주문 생성
    const orderEvent = {
      type: 'order.created',
      pharmacyId: 'pharmacy-001',
      productId: 'prod-002',
      productType: 'pharmaceutical',
      orderId: 'order-002',
      orderAmount: 100000,
    };

    // 파트너 이벤트로 전달 불가 확인
    const canForwardToPartner = isPartnerEligibleProductType(orderEvent.productType);
    expect(canForwardToPartner).toBe(false);
  });
});

describe('Settlement Exclusion Scenarios', () => {
  // Test 21: 약국 소스 전환의 정산 제외 확인
  test('should identify pharmacy conversions for settlement exclusion', () => {
    const conversionSource: string = ConversionSource.PHARMACY;
    const shouldExcludeFromSettlement = conversionSource === 'pharmacy';
    expect(shouldExcludeFromSettlement).toBe(true);
  });

  // Test 22: 파트너 소스 전환의 정산 포함 확인
  test('should include partner conversions in settlement', () => {
    const conversionSource: string = ConversionSource.PARTNER;
    const shouldExcludeFromSettlement = conversionSource === 'pharmacy';
    expect(shouldExcludeFromSettlement).toBe(false);
  });
});
