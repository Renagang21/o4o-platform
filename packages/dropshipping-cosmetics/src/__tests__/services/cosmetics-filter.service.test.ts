/**
 * CosmeticsFilterService Unit Tests
 *
 * Phase 10: STEP 5-A
 * Tests cosmetics product filtering logic
 */

import { CosmeticsFilterService, FilterConfiguration } from '../../backend/services/cosmetics-filter.service';
import { CosmeticsFilter } from '../../backend/entities/cosmetics-filter.entity';
import type { CosmeticsFilters, CosmeticsMetadata } from '../../types';

// Mock Repository
const createMockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  count: jest.fn(),
  save: jest.fn(),
  merge: jest.fn(),
});

const createMockDataSource = (mockRepo: any) => ({
  getRepository: jest.fn().mockReturnValue(mockRepo),
});

describe('CosmeticsFilterService', () => {
  let service: CosmeticsFilterService;
  let mockRepo: ReturnType<typeof createMockRepository>;

  // Test data factories
  const createFilter = (overrides: Partial<CosmeticsFilter> = {}): CosmeticsFilter => {
    const filter = new CosmeticsFilter();
    filter.id = overrides.id || 'filter-123';
    filter.name = overrides.name || 'Test Filter';
    filter.type = overrides.type || 'skinType';
    filter.filters = overrides.filters || { values: ['dry', 'oily'] };
    filter.enabled = overrides.enabled ?? true;
    filter.createdAt = overrides.createdAt || new Date();
    filter.updatedAt = overrides.updatedAt || new Date();
    return filter;
  };

  const createProduct = (metadata: Partial<CosmeticsMetadata> = {}, extra: any = {}) => ({
    id: extra.id || 'product-' + Math.random().toString(36).substr(2, 9),
    name: extra.name || 'Test Product',
    price: extra.price || 10000,
    createdAt: extra.createdAt || new Date(),
    metadata: {
      skinType: metadata.skinType || ['dry'],
      concerns: metadata.concerns || ['wrinkle'],
      certifications: metadata.certifications || [],
      productCategory: metadata.productCategory || 'skincare',
      texture: metadata.texture,
      ingredients: metadata.ingredients,
      routineInfo: metadata.routineInfo,
    } as CosmeticsMetadata,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo = createMockRepository();
    const mockDataSource = createMockDataSource(mockRepo);
    service = new CosmeticsFilterService(mockDataSource as any);
  });

  describe('getAllFilters', () => {
    it('should return all filters ordered by name', async () => {
      // Arrange
      const filters = [
        createFilter({ id: '1', name: 'Certifications' }),
        createFilter({ id: '2', name: 'Skin Type' }),
      ];
      mockRepo.find.mockResolvedValue(filters);

      // Act
      const result = await service.getAllFilters();

      // Assert
      expect(mockRepo.find).toHaveBeenCalledWith({ order: { name: 'ASC' } });
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no filters exist', async () => {
      // Arrange
      mockRepo.find.mockResolvedValue([]);

      // Act
      const result = await service.getAllFilters();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getFilterById', () => {
    it('should return filter when found', async () => {
      // Arrange
      const filter = createFilter({ id: 'filter-123' });
      mockRepo.findOne.mockResolvedValue(filter);

      // Act
      const result = await service.getFilterById('filter-123');

      // Assert
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 'filter-123' } });
      expect(result).toEqual(filter);
    });

    it('should return null when filter not found', async () => {
      // Arrange
      mockRepo.findOne.mockResolvedValue(null);

      // Act
      const result = await service.getFilterById('non-existent');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('updateFilter', () => {
    it('should update and return filter', async () => {
      // Arrange
      const existingFilter = createFilter({ id: 'filter-123', enabled: true });
      const updatedFilter = { ...existingFilter, enabled: false };

      mockRepo.findOne.mockResolvedValue(existingFilter);
      mockRepo.merge.mockReturnValue(updatedFilter);
      mockRepo.save.mockResolvedValue(updatedFilter);

      // Act
      const result = await service.updateFilter('filter-123', { enabled: false }, 'user-123');

      // Assert
      expect(mockRepo.merge).toHaveBeenCalled();
      expect(mockRepo.save).toHaveBeenCalled();
      expect(result?.enabled).toBe(false);
    });

    it('should return null when filter not found', async () => {
      // Arrange
      mockRepo.findOne.mockResolvedValue(null);

      // Act
      const result = await service.updateFilter('non-existent', { enabled: false });

      // Assert
      expect(result).toBeNull();
      expect(mockRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('filterProducts', () => {
    it('should filter by skin type', () => {
      // Arrange
      const products = [
        createProduct({ skinType: ['dry'] }),
        createProduct({ skinType: ['oily'] }),
        createProduct({ skinType: ['dry', 'combination'] }),
      ];
      const filters: CosmeticsFilters = { skinType: ['dry'] };

      // Act
      const result = service.filterProducts(products, filters);

      // Assert
      expect(result).toHaveLength(2);
      expect(result.every(p => p.metadata?.skinType?.includes('dry'))).toBe(true);
    });

    it('should filter by concerns', () => {
      // Arrange
      const products = [
        createProduct({ concerns: ['acne'] }),
        createProduct({ concerns: ['wrinkle'] }),
        createProduct({ concerns: ['acne', 'whitening'] }),
      ];
      const filters: CosmeticsFilters = { concerns: ['acne'] };

      // Act
      const result = service.filterProducts(products, filters);

      // Assert
      expect(result).toHaveLength(2);
    });

    it('should filter by certifications', () => {
      // Arrange
      const products = [
        createProduct({ certifications: ['vegan'] }),
        createProduct({ certifications: ['organic'] }),
        createProduct({ certifications: ['vegan', 'crueltyfree'] }),
      ];
      const filters: CosmeticsFilters = { certifications: ['vegan'] };

      // Act
      const result = service.filterProducts(products, filters);

      // Assert
      expect(result).toHaveLength(2);
    });

    it('should filter by category', () => {
      // Arrange
      const products = [
        createProduct({ productCategory: 'skincare' }),
        createProduct({ productCategory: 'makeup' }),
        createProduct({ productCategory: 'skincare' }),
      ];
      const filters: CosmeticsFilters = { category: 'skincare' };

      // Act
      const result = service.filterProducts(products, filters);

      // Assert
      expect(result).toHaveLength(2);
      expect(result.every(p => p.metadata?.productCategory === 'skincare')).toBe(true);
    });

    it('should filter by search term in product name', () => {
      // Arrange
      const products = [
        createProduct({}, { name: 'Vitamin C Serum' }),
        createProduct({}, { name: 'Moisturizing Cream' }),
        createProduct({}, { name: 'Vitamin E Toner' }),
      ];
      const filters: CosmeticsFilters = { search: 'vitamin' };

      // Act
      const result = service.filterProducts(products, filters);

      // Assert
      expect(result).toHaveLength(2);
    });

    it('should apply multiple filters (AND logic)', () => {
      // Arrange
      const products = [
        createProduct({ skinType: ['dry'], concerns: ['wrinkle'] }),
        createProduct({ skinType: ['dry'], concerns: ['acne'] }),
        createProduct({ skinType: ['oily'], concerns: ['wrinkle'] }),
      ];
      const filters: CosmeticsFilters = {
        skinType: ['dry'],
        concerns: ['wrinkle'],
      };

      // Act
      const result = service.filterProducts(products, filters);

      // Assert
      expect(result).toHaveLength(1);
    });

    it('should handle pagination', () => {
      // Arrange
      const products = Array.from({ length: 10 }, (_, i) =>
        createProduct({}, { id: `product-${i}` })
      );
      const filters: CosmeticsFilters = { page: 2, limit: 3 };

      // Act
      const result = service.filterProducts(products, filters);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('product-3');
    });

    it('should sort by name ascending', () => {
      // Arrange
      const products = [
        createProduct({}, { name: 'Cream' }),
        createProduct({}, { name: 'Serum' }),
        createProduct({}, { name: 'Balm' }),
      ];
      const filters: CosmeticsFilters = { sortBy: 'name', sortOrder: 'asc' };

      // Act
      const result = service.filterProducts(products, filters);

      // Assert
      expect(result[0].name).toBe('Balm');
      expect(result[1].name).toBe('Cream');
      expect(result[2].name).toBe('Serum');
    });

    it('should sort by price descending', () => {
      // Arrange
      const products = [
        createProduct({}, { price: 10000 }),
        createProduct({}, { price: 30000 }),
        createProduct({}, { price: 20000 }),
      ];
      const filters: CosmeticsFilters = { sortBy: 'price', sortOrder: 'desc' };

      // Act
      const result = service.filterProducts(products, filters);

      // Assert
      expect(result[0].price).toBe(30000);
      expect(result[1].price).toBe(20000);
      expect(result[2].price).toBe(10000);
    });

    it('should return all products when no filters applied', () => {
      // Arrange
      const products = [
        createProduct({}),
        createProduct({}),
        createProduct({}),
      ];
      const filters: CosmeticsFilters = {};

      // Act
      const result = service.filterProducts(products, filters);

      // Assert
      expect(result).toHaveLength(3);
    });

    it('should handle products without metadata', () => {
      // Arrange
      const products = [
        { id: 'no-meta', name: 'Product without metadata' },
        createProduct({ skinType: ['dry'] }),
      ];
      const filters: CosmeticsFilters = { skinType: ['dry'] };

      // Act
      const result = service.filterProducts(products as any, filters);

      // Assert
      expect(result).toHaveLength(1);
    });
  });

  describe('getFilterStatistics', () => {
    it('should count products by filter values', async () => {
      // Arrange
      const products = [
        createProduct({ skinType: ['dry'], concerns: ['wrinkle'], productCategory: 'skincare' }),
        createProduct({ skinType: ['dry', 'oily'], concerns: ['acne'], productCategory: 'skincare' }),
        createProduct({ skinType: ['oily'], concerns: ['wrinkle', 'acne'], productCategory: 'makeup' }),
      ];

      // Act
      const result = await service.getFilterStatistics(products);

      // Assert
      expect(result.skinType.dry).toBe(2);
      expect(result.skinType.oily).toBe(2);
      expect(result.concerns.wrinkle).toBe(2);
      expect(result.concerns.acne).toBe(2);
      expect(result.category.skincare).toBe(2);
      expect(result.category.makeup).toBe(1);
    });

    it('should return empty stats for empty product list', async () => {
      // Act
      const result = await service.getFilterStatistics([]);

      // Assert
      expect(result.skinType).toEqual({});
      expect(result.concerns).toEqual({});
      expect(result.category).toEqual({});
    });

    it('should handle products without metadata', async () => {
      // Arrange
      const products = [
        { id: 'no-meta' },
        createProduct({ skinType: ['dry'] }),
      ];

      // Act
      const result = await service.getFilterStatistics(products as any);

      // Assert
      expect(result.skinType.dry).toBe(1);
    });
  });

  describe('initializeDefaultFilters', () => {
    it('should initialize default filters when none exist', async () => {
      // Arrange
      mockRepo.count.mockResolvedValue(0);
      mockRepo.save.mockResolvedValue([]);

      // Act
      await service.initializeDefaultFilters();

      // Assert
      expect(mockRepo.count).toHaveBeenCalled();
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('should skip initialization when filters already exist', async () => {
      // Arrange
      mockRepo.count.mockResolvedValue(5);

      // Act
      await service.initializeDefaultFilters();

      // Assert
      expect(mockRepo.count).toHaveBeenCalled();
      expect(mockRepo.save).not.toHaveBeenCalled();
    });
  });
});
