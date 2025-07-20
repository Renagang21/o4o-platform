import { Product, ProductStatus, ProductType } from '@/types/ecommerce';

// MedusaProduct 모킹 팩토리 (향후 Medusa 타입으로 변경)
export const createMockProduct = (overrides?: Partial<Product>): Product => {
  const baseProduct: Product = {
    id: 'prod_' + Math.random().toString(36).substr(2, 9),
    name: 'Test Product',
    slug: 'test-product',
    description: 'This is a test product description',
    sku: 'TEST-SKU-001',
    
    // Pricing
    retailPrice: 10000,
    wholesalePrice: 8000,
    affiliatePrice: 9000,
    cost: 5000,
    
    // Inventory
    stockQuantity: 100,
    manageStock: true,
    lowStockThreshold: 10,
    stockStatus: 'instock',
    
    // Product attributes
    weight: 1.5,
    dimensions: {
      length: 10,
      width: 10,
      height: 5,
      weight: 1.5,
      unit: 'cm' as const,
      weightUnit: 'kg' as const,
    },
    
    // Status and settings
    status: 'active' as ProductStatus,
    type: 'simple' as ProductType,
    featured: false,
    virtual: false,
    downloadable: false,
    
    // Media
    images: [],
    featuredImage: 'https://via.placeholder.com/300',
    gallery: [],
    
    // Categorization
    categories: [],
    tags: [],
    attributes: [],
    specifications: {},
    
    // SEO
    metaTitle: 'Test Product - SEO Title',
    metaDescription: 'Test product SEO description',
    
    // Timestamps
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'test-user',
    
    // Stats
    totalSales: 0,
    averageRating: 0,
    reviewCount: 0,
    rating: 0,
    viewCount: 0,
    salesCount: 0,
    shortDescription: 'Short description for test product',
    supplierId: 'supplier_' + Math.random().toString(36).substr(2, 9),
    supplierName: 'Test Supplier',
    approvalStatus: 'approved' as const,
    isFeatured: false,
    isVirtual: false,
    isDownloadable: false,
  };

  return { ...baseProduct, ...overrides };
};

// 다양한 상태의 제품 생성 헬퍼
export const createMockProducts = {
  // 재고 없음 상품
  outOfStock: () => createMockProduct({
    stockQuantity: 0,
    stockStatus: 'outofstock',
  }),
  
  // 특가 상품
  featured: () => createMockProduct({
    featured: true,
    retailPrice: 20000,
    wholesalePrice: 15000,
  }),
  
  // 가상 상품
  virtual: () => createMockProduct({
    virtual: true,
    weight: 0,
    dimensions: undefined,
  }),
  
  // 임시 저장 상품
  draft: () => createMockProduct({
    status: 'draft' as ProductStatus,
  }),
  
  // 저재고 상품
  lowStock: () => createMockProduct({
    stockQuantity: 5,
    lowStockThreshold: 10,
  }),
};