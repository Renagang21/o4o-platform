/**
 * AI Routine Builder Tests
 *
 * E2E Integration Tests for Partner AI Builder
 *
 * @package @o4o/partner-ai-builder
 */

import {
  AiRoutineBuilderService,
  type ProductMetadata,
  type AllowedIndustry,
} from '../backend/services/AiRoutineBuilderService.js';
import { AiRecommendationService } from '../backend/services/AiRecommendationService.js';
import { AiContentService } from '../backend/services/AiContentService.js';
import { beforeAiRoutineCreate, beforeAiRoutineSave } from '../hooks/index.js';

// ========================================
// Test Helpers
// ========================================

function createMockProduct(
  overrides: Partial<ProductMetadata> = {}
): ProductMetadata {
  return {
    productId: 'test-prod-001',
    productName: 'Test Product',
    productType: 'COSMETICS',
    ingredients: ['water', 'glycerin'],
    functions: ['moisturizing'],
    usage: 'Apply twice daily',
    category: 'Serum',
    ...overrides,
  };
}

// ========================================
// AiRoutineBuilderService Tests
// ========================================

describe('AiRoutineBuilderService', () => {
  let service: AiRoutineBuilderService;

  beforeEach(() => {
    service = new AiRoutineBuilderService();
  });

  describe('Industry Validation', () => {
    test('should allow COSMETICS industry', () => {
      const result = service.validateIndustry('COSMETICS');
      expect(result.valid).toBe(true);
    });

    test('should allow HEALTH industry', () => {
      const result = service.validateIndustry('HEALTH');
      expect(result.valid).toBe(true);
    });

    test('should allow GENERAL industry', () => {
      const result = service.validateIndustry('GENERAL');
      expect(result.valid).toBe(true);
    });

    test('should BLOCK PHARMACEUTICAL industry', () => {
      const result = service.validateIndustry('PHARMACEUTICAL');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('PHARMACEUTICAL');
    });

    test('should reject unknown industry', () => {
      const result = service.validateIndustry('UNKNOWN');
      expect(result.valid).toBe(false);
    });
  });

  describe('Product Filtering', () => {
    test('should filter out PHARMACEUTICAL products', () => {
      const products: ProductMetadata[] = [
        createMockProduct({ productId: '1', productType: 'COSMETICS' }),
        createMockProduct({ productId: '2', productType: 'PHARMACEUTICAL' as any }),
        createMockProduct({ productId: '3', productType: 'HEALTH' }),
      ];

      const filtered = service.filterBlockedProducts(products);

      expect(filtered.length).toBe(2);
      expect(filtered.find((p) => p.productType === 'PHARMACEUTICAL')).toBeUndefined();
    });

    test('should keep all COSMETICS products', () => {
      const products: ProductMetadata[] = [
        createMockProduct({ productId: '1', productType: 'COSMETICS' }),
        createMockProduct({ productId: '2', productType: 'COSMETICS' }),
      ];

      const filtered = service.filterBlockedProducts(products);

      expect(filtered.length).toBe(2);
    });

    test('should return empty array when all products are PHARMACEUTICAL', () => {
      const products: ProductMetadata[] = [
        createMockProduct({ productId: '1', productType: 'PHARMACEUTICAL' as any }),
        createMockProduct({ productId: '2', productType: 'PHARMACEUTICAL' as any }),
      ];

      const filtered = service.filterBlockedProducts(products);

      expect(filtered.length).toBe(0);
    });
  });

  describe('Routine Generation', () => {
    test('should generate routine for COSMETICS', async () => {
      const result = await service.generateRoutine({
        industry: 'COSMETICS',
        baseProducts: [createMockProduct()],
        routineGoal: '보습 강화',
      });

      expect(result.success).toBe(true);
      expect(result.routine).toBeDefined();
      expect(result.routine?.industry).toBe('COSMETICS');
    });

    test('should generate routine for HEALTH', async () => {
      const result = await service.generateRoutine({
        industry: 'HEALTH',
        baseProducts: [createMockProduct({ productType: 'HEALTH' })],
        routineGoal: '건강한 아침',
      });

      expect(result.success).toBe(true);
      expect(result.routine).toBeDefined();
    });

    test('should fail for PHARMACEUTICAL industry', async () => {
      const result = await service.generateRoutine({
        industry: 'PHARMACEUTICAL' as AllowedIndustry,
        baseProducts: [],
        routineGoal: '약물 복용',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('PHARMACEUTICAL');
    });

    test('should fail when all products are blocked', async () => {
      const result = await service.generateRoutine({
        industry: 'COSMETICS',
        baseProducts: [
          createMockProduct({ productType: 'PHARMACEUTICAL' as any }),
        ],
        routineGoal: '스킨케어',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('유효한 제품이 없습니다');
    });

    test('should include disclaimer in generated routine', async () => {
      const result = await service.generateRoutine({
        industry: 'COSMETICS',
        baseProducts: [createMockProduct()],
        routineGoal: '보습',
      });

      expect(result.routine?.disclaimer).toBeDefined();
      expect(result.routine?.disclaimer.length).toBeGreaterThan(0);
    });

    test('should generate routine with steps', async () => {
      const result = await service.generateRoutine({
        industry: 'COSMETICS',
        baseProducts: [createMockProduct()],
        routineGoal: '스킨케어',
      });

      expect(result.routine?.steps.length).toBeGreaterThanOrEqual(3);
      expect(result.routine?.steps.length).toBeLessThanOrEqual(7);
    });
  });
});

// ========================================
// AiRecommendationService Tests
// ========================================

describe('AiRecommendationService', () => {
  let service: AiRecommendationService;

  beforeEach(() => {
    service = new AiRecommendationService();
  });

  describe('Product Recommendations', () => {
    test('should recommend COSMETICS products', async () => {
      const result = await service.recommend({
        industry: 'COSMETICS',
        routineGoal: '보습',
      });

      expect(result.success).toBe(true);
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations!.length).toBeGreaterThan(0);
    });

    test('should recommend HEALTH products', async () => {
      const result = await service.recommend({
        industry: 'HEALTH',
        routineGoal: '건강',
      });

      expect(result.success).toBe(true);
      expect(result.recommendations).toBeDefined();
    });

    test('should BLOCK PHARMACEUTICAL recommendations', async () => {
      const result = await service.recommend({
        industry: 'PHARMACEUTICAL' as AllowedIndustry,
        routineGoal: '의약품',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('PHARMACEUTICAL');
    });

    test('should respect maxResults parameter', async () => {
      const result = await service.recommend({
        industry: 'COSMETICS',
        routineGoal: '스킨케어',
        maxResults: 3,
      });

      expect(result.recommendations!.length).toBeLessThanOrEqual(3);
    });

    test('should return products with scores', async () => {
      const result = await service.recommend({
        industry: 'COSMETICS',
        routineGoal: '보습',
      });

      result.recommendations?.forEach((rec) => {
        expect(rec.productId).toBeDefined();
        expect(typeof rec.score).toBe('number');
        expect(rec.score).toBeGreaterThanOrEqual(0);
        expect(rec.score).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Trending Products', () => {
    test('should get trending COSMETICS products', async () => {
      const trending = await service.getTrendingProducts('COSMETICS', 5);

      expect(trending.length).toBeLessThanOrEqual(5);
    });

    test('should return empty for PHARMACEUTICAL', async () => {
      const trending = await service.getTrendingProducts('PHARMACEUTICAL' as AllowedIndustry, 5);

      expect(trending.length).toBe(0);
    });
  });
});

// ========================================
// AiContentService Tests
// ========================================

describe('AiContentService', () => {
  let service: AiContentService;

  beforeEach(() => {
    service = new AiContentService();
  });

  describe('Title Generation', () => {
    test('should generate title for COSMETICS', async () => {
      const result = await service.generateTitle('COSMETICS', '보습 강화');

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(typeof result.content).toBe('string');
    });

    test('should BLOCK PHARMACEUTICAL title generation', async () => {
      const result = await service.generateTitle('PHARMACEUTICAL' as AllowedIndustry, '의약품');

      expect(result.success).toBe(false);
    });
  });

  describe('Tag Generation', () => {
    test('should generate tags for COSMETICS', async () => {
      const result = await service.generateTags('COSMETICS', '보습 스킨케어');

      expect(result.success).toBe(true);
      expect(Array.isArray(result.content)).toBe(true);
    });

    test('should include industry-specific tags', async () => {
      const result = await service.generateTags('HEALTH', '건강 관리');

      expect(result.success).toBe(true);
      expect(result.content).toContain('건강');
    });
  });
});

// ========================================
// Hook Tests
// ========================================

describe('AI Builder Hooks', () => {
  describe('beforeAiRoutineCreate', () => {
    test('should allow COSMETICS routine creation', async () => {
      const result = await beforeAiRoutineCreate('partner-001', 'COSMETICS', ['p1', 'p2']);

      expect(result.canCreate).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test('should BLOCK PHARMACEUTICAL routine creation', async () => {
      const result = await beforeAiRoutineCreate('partner-001', 'PHARMACEUTICAL', ['p1']);

      expect(result.canCreate).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('PHARMACEUTICAL');
    });

    test('should warn when no products selected', async () => {
      const result = await beforeAiRoutineCreate('partner-001', 'COSMETICS', []);

      expect(result.canCreate).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('beforeAiRoutineSave', () => {
    test('should allow saving COSMETICS routine', async () => {
      const routine = {
        title: 'Test Routine',
        description: 'Test',
        industry: 'COSMETICS' as AllowedIndustry,
        steps: [{ stepNumber: 1, title: 'Step 1', description: 'Test' }],
        recommendedProducts: [],
        disclaimer: 'Test disclaimer',
        tags: [],
        generatedAt: new Date(),
      };

      const result = await beforeAiRoutineSave('partner-001', routine);

      expect(result.canSave).toBe(true);
    });

    test('should reject routine with no steps', async () => {
      const routine = {
        title: 'Test Routine',
        description: 'Test',
        industry: 'COSMETICS' as AllowedIndustry,
        steps: [],
        recommendedProducts: [],
        disclaimer: 'Test disclaimer',
        tags: [],
        generatedAt: new Date(),
      };

      const result = await beforeAiRoutineSave('partner-001', routine);

      expect(result.canSave).toBe(false);
    });
  });
});

// ========================================
// 3-Layer PHARMACEUTICAL Block Tests
// ========================================

describe('PHARMACEUTICAL 3-Layer Blocking', () => {
  test('Layer 1: Service level blocks PHARMACEUTICAL', () => {
    const service = new AiRoutineBuilderService();
    const result = service.validateIndustry('PHARMACEUTICAL');
    expect(result.valid).toBe(false);
  });

  test('Layer 2: Hook level blocks PHARMACEUTICAL', async () => {
    const result = await beforeAiRoutineCreate('partner', 'PHARMACEUTICAL', []);
    expect(result.canCreate).toBe(false);
  });

  test('Layer 3: Product filtering removes PHARMACEUTICAL', () => {
    const service = new AiRoutineBuilderService();
    const products = [
      createMockProduct({ productType: 'PHARMACEUTICAL' as any }),
    ];
    const filtered = service.filterBlockedProducts(products);
    expect(filtered.length).toBe(0);
  });

  test('All layers combined should prevent PHARMACEUTICAL content', async () => {
    const service = new AiRoutineBuilderService();

    // Layer 1: Industry validation
    const industryValid = service.validateIndustry('PHARMACEUTICAL');
    expect(industryValid.valid).toBe(false);

    // Layer 2: Hook validation
    const hookValid = await beforeAiRoutineCreate('partner', 'PHARMACEUTICAL', []);
    expect(hookValid.canCreate).toBe(false);

    // Layer 3: Product filtering
    const filtered = service.filterBlockedProducts([
      createMockProduct({ productType: 'PHARMACEUTICAL' as any }),
    ]);
    expect(filtered.length).toBe(0);
  });
});
