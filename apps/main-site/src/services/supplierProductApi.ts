/**
 * Supplier Product API Service
 * Phase 3-1: Product management API client
 * Phase 6-1: Mock/Real API integration
 */

import { authClient } from '@o4o/auth-client';
import { API_ENDPOINTS } from '../config/apiEndpoints';
import { MOCK_FLAGS } from '../config/mockFlags';
import {
  SupplierProductListResponse,
  SupplierProductDetailResponse,
  SupplierProductCreateResponse,
  SupplierProductUpdateResponse,
  SupplierProductDeleteResponse,
  SupplierProductFilters,
  SupplierProductSort,
  PaginationParams,
  SupplierProductFormValues,
  SupplierProductStatus,
  SupplierProductListItem,
  SupplierProductDetail,
} from '../types/supplier-product';

// Mock data for development
const MOCK_PRODUCTS: SupplierProductDetail[] = [
  {
    id: '1',
    sku: 'PROD-001',
    name: '프리미엄 유기농 쌀',
    description: '국내산 100% 유기농 쌀로 건강한 식탁을 책임집니다.',
    category: '식품',
    price: 25000,
    costPrice: 18000,
    stock: 150,
    minStock: 20,
    unit: 'kg',
    status: SupplierProductStatus.ACTIVE,
    images: [
      'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400',
    ],
    tags: ['유기농', '국내산', '쌀'],
    specifications: {
      '원산지': '경기도',
      '중량': '10kg',
      '유통기한': '6개월',
    },
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-03-20T14:30:00Z',
    // Phase 3-6: 모집 중 (제한 없음)
    is_open_for_applications: true,
    max_approved_sellers: null,
    approved_seller_count: 3,
  },
  {
    id: '2',
    sku: 'PROD-002',
    name: '신선한 방울토마토',
    description: '매일 아침 수확한 신선한 방울토마토입니다.',
    category: '채소',
    price: 8000,
    costPrice: 5500,
    stock: 50,
    minStock: 10,
    unit: 'kg',
    status: SupplierProductStatus.ACTIVE,
    images: [
      'https://images.unsplash.com/photo-1592921870789-04563d55041c?w=400',
    ],
    tags: ['신선', '방울토마토', '채소'],
    specifications: {
      '원산지': '충청남도',
      '중량': '1kg',
      '보관방법': '냉장보관',
    },
    createdAt: '2024-02-01T09:00:00Z',
    updatedAt: '2024-03-21T08:15:00Z',
    // Phase 3-6: 모집 종료 (명시적으로 중단)
    is_open_for_applications: false,
    max_approved_sellers: null,
    approved_seller_count: 5,
  },
  {
    id: '3',
    sku: 'PROD-003',
    name: '국내산 한우 등심',
    description: '1++ 등급 국내산 한우 등심으로 최고의 맛을 보장합니다.',
    category: '축산',
    price: 45000,
    costPrice: 35000,
    stock: 0,
    minStock: 5,
    unit: 'kg',
    status: SupplierProductStatus.OUT_OF_STOCK,
    images: [
      'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=400',
    ],
    tags: ['한우', '등심', '1++등급'],
    specifications: {
      '원산지': '전라북도',
      '등급': '1++',
      '부위': '등심',
    },
    createdAt: '2024-01-20T11:00:00Z',
    updatedAt: '2024-03-22T16:45:00Z',
    // Phase 3-6: 모집 중이지만 정원 초과 (3명 한정, 현재 3명)
    is_open_for_applications: true,
    max_approved_sellers: 3,
    approved_seller_count: 3,
  },
  {
    id: '4',
    sku: 'PROD-004',
    name: '제주 감귤',
    description: '제주도에서 직송한 달콤한 감귤입니다.',
    category: '과일',
    price: 15000,
    costPrice: 10000,
    stock: 200,
    minStock: 30,
    unit: 'kg',
    status: SupplierProductStatus.ACTIVE,
    images: [
      'https://images.unsplash.com/photo-1580918-5a40c4e94?w=400',
    ],
    tags: ['제주', '감귤', '과일'],
    specifications: {
      '원산지': '제주도',
      '중량': '5kg',
      '당도': '12Brix 이상',
    },
    createdAt: '2024-02-10T13:00:00Z',
    updatedAt: '2024-03-19T10:20:00Z',
    // Phase 3-6: 모집 중 (10명 한정, 현재 2명 - 여유 있음)
    is_open_for_applications: true,
    max_approved_sellers: 10,
    approved_seller_count: 2,
  },
  {
    id: '5',
    sku: 'PROD-005',
    name: '유기농 계란',
    description: '동물복지 인증 농장에서 생산한 유기농 계란입니다.',
    category: '축산',
    price: 12000,
    costPrice: 8500,
    stock: 80,
    minStock: 15,
    unit: '판',
    status: SupplierProductStatus.ACTIVE,
    images: [
      'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400',
    ],
    tags: ['유기농', '계란', '동물복지'],
    specifications: {
      '원산지': '강원도',
      '수량': '30개입',
      '인증': '동물복지 인증',
    },
    createdAt: '2024-01-25T08:30:00Z',
    updatedAt: '2024-03-18T15:10:00Z',
    // Phase 3-6: 모집 중단 (명시적 중단, 아직 승인된 판매자 없음)
    is_open_for_applications: false,
    max_approved_sellers: null,
    approved_seller_count: 0,
  },
];

// Enable/disable mock mode
// Phase 6-1: Use centralized mock flag
const USE_MOCK_DATA = MOCK_FLAGS.SUPPLIER_PRODUCTS;

/**
 * Mock API delay to simulate network latency
 */
const mockDelay = (ms: number = 500): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Filter and sort mock data
 */
const filterAndSortMockData = (
  products: SupplierProductDetail[],
  filters?: SupplierProductFilters,
  sort?: SupplierProductSort
): SupplierProductDetail[] => {
  let result = [...products];

  // Apply filters
  if (filters) {
    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.sku.toLowerCase().includes(search) ||
          p.description.toLowerCase().includes(search)
      );
    }
    if (filters.category) {
      result = result.filter((p) => p.category === filters.category);
    }
    if (filters.status) {
      result = result.filter((p) => p.status === filters.status);
    }
    if (filters.minPrice !== undefined) {
      result = result.filter((p) => p.price >= filters.minPrice!);
    }
    if (filters.maxPrice !== undefined) {
      result = result.filter((p) => p.price <= filters.maxPrice!);
    }
    if (filters.inStock !== undefined) {
      result = result.filter((p) =>
        filters.inStock ? p.stock > 0 : p.stock === 0
      );
    }
  }

  // Apply sorting
  if (sort) {
    result.sort((a, b) => {
      let aVal: any = a[sort.field];
      let bVal: any = b[sort.field];

      // Handle date fields
      if (sort.field === 'createdAt' || sort.field === 'updatedAt') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (sort.order === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }

  return result;
};

/**
 * Paginate mock data
 */
const paginateMockData = <T>(
  data: T[],
  pagination: PaginationParams
): { data: T[]; total: number; totalPages: number } => {
  const { page, limit } = pagination;
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginatedData = data.slice(start, end);
  const total = data.length;
  const totalPages = Math.ceil(total / limit);

  return {
    data: paginatedData,
    total,
    totalPages,
  };
};

/**
 * Convert detail to list item
 */
const toListItem = (product: SupplierProductDetail): SupplierProductListItem => {
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    category: product.category,
    price: product.price,
    stock: product.stock,
    status: product.status,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    is_open_for_applications: product.is_open_for_applications,
    max_approved_sellers: product.max_approved_sellers,
    approved_seller_count: product.approved_seller_count,
  };
};

/**
 * Supplier Product API client
 */
export const supplierProductAPI = {
  /**
   * Get product list with filters, sorting, and pagination
   */
  async getProducts(
    filters?: SupplierProductFilters,
    sort?: SupplierProductSort,
    pagination: PaginationParams = { page: 1, limit: 10 }
  ): Promise<SupplierProductListResponse> {
    if (USE_MOCK_DATA) {
      await mockDelay();

      // Filter and sort
      const filtered = filterAndSortMockData(MOCK_PRODUCTS, filters, sort);

      // Paginate
      const { data, total, totalPages } = paginateMockData(filtered, pagination);

      return {
        data: data.map(toListItem),
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages,
        },
      };
    }

    // Real API call
    const response = await authClient.api.get(API_ENDPOINTS.SUPPLIER_PRODUCTS.LIST, {
      params: {
        ...filters,
        sortBy: sort?.field,
        sortOrder: sort?.order,
        page: pagination.page,
        limit: pagination.limit,
      },
    });
    return response.data;
  },

  /**
   * Get product detail by ID
   */
  async getProduct(id: string): Promise<SupplierProductDetailResponse> {
    if (USE_MOCK_DATA) {
      await mockDelay();

      const product = MOCK_PRODUCTS.find((p) => p.id === id);
      if (!product) {
        throw new Error('Product not found');
      }

      return {
        data: product,
      };
    }

    // Real API call
    const response = await authClient.api.get(API_ENDPOINTS.SUPPLIER_PRODUCTS.DETAIL(id));
    return response.data;
  },

  /**
   * Create new product
   */
  async createProduct(
    data: SupplierProductFormValues
  ): Promise<SupplierProductCreateResponse> {
    if (USE_MOCK_DATA) {
      await mockDelay();

      const newProduct: SupplierProductDetail = {
        id: `${MOCK_PRODUCTS.length + 1}`,
        ...data,
        images: data.images || [],
        tags: data.tags || [],
        specifications: data.specifications || {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      MOCK_PRODUCTS.push(newProduct);

      return {
        data: newProduct,
        message: '제품이 성공적으로 등록되었습니다.',
      };
    }

    // Real API call
    const response = await authClient.api.post(API_ENDPOINTS.SUPPLIER_PRODUCTS.CREATE, data);
    return response.data;
  },

  /**
   * Update existing product
   */
  async updateProduct(
    id: string,
    data: Partial<SupplierProductFormValues>
  ): Promise<SupplierProductUpdateResponse> {
    if (USE_MOCK_DATA) {
      await mockDelay();

      const index = MOCK_PRODUCTS.findIndex((p) => p.id === id);
      if (index === -1) {
        throw new Error('Product not found');
      }

      const updatedProduct: SupplierProductDetail = {
        ...MOCK_PRODUCTS[index],
        ...data,
        updatedAt: new Date().toISOString(),
      };

      MOCK_PRODUCTS[index] = updatedProduct;

      return {
        data: updatedProduct,
        message: '제품이 성공적으로 수정되었습니다.',
      };
    }

    // Real API call
    const response = await authClient.api.put(
      API_ENDPOINTS.SUPPLIER_PRODUCTS.UPDATE(id),
      data
    );
    return response.data;
  },

  /**
   * Delete product
   */
  async deleteProduct(id: string): Promise<SupplierProductDeleteResponse> {
    if (USE_MOCK_DATA) {
      await mockDelay();

      const index = MOCK_PRODUCTS.findIndex((p) => p.id === id);
      if (index === -1) {
        throw new Error('Product not found');
      }

      MOCK_PRODUCTS.splice(index, 1);

      return {
        message: '제품이 성공적으로 삭제되었습니다.',
      };
    }

    // Real API call
    const response = await authClient.api.delete(API_ENDPOINTS.SUPPLIER_PRODUCTS.DELETE(id));
    return response.data;
  },

  /**
   * Toggle application status (open/close seller recruitment)
   * Phase 3-6: 판매자 모집 중단/재개
   */
  async toggleApplicationStatus(
    id: string,
    isOpen: boolean
  ): Promise<SupplierProductUpdateResponse> {
    if (USE_MOCK_DATA) {
      await mockDelay();

      const index = MOCK_PRODUCTS.findIndex((p) => p.id === id);
      if (index === -1) {
        throw new Error('Product not found');
      }

      MOCK_PRODUCTS[index] = {
        ...MOCK_PRODUCTS[index],
        is_open_for_applications: isOpen,
        updatedAt: new Date().toISOString(),
      };

      return {
        data: MOCK_PRODUCTS[index],
        message: isOpen
          ? '판매자 신청이 재개되었습니다.'
          : '판매자 신청이 중단되었습니다.',
      };
    }

    // Real API call
    const response = await authClient.api.patch(
      `/api/v1/supplier/products/${id}/application-status`,
      { is_open_for_applications: isOpen }
    );
    return response.data;
  },

  /**
   * Set max approved sellers
   * Phase 3-6: 최대 승인 판매자 수 설정
   */
  async setMaxApprovedSellers(
    id: string,
    maxSellers: number | null
  ): Promise<SupplierProductUpdateResponse> {
    if (USE_MOCK_DATA) {
      await mockDelay();

      const index = MOCK_PRODUCTS.findIndex((p) => p.id === id);
      if (index === -1) {
        throw new Error('Product not found');
      }

      MOCK_PRODUCTS[index] = {
        ...MOCK_PRODUCTS[index],
        max_approved_sellers: maxSellers,
        updatedAt: new Date().toISOString(),
      };

      return {
        data: MOCK_PRODUCTS[index],
        message: '최대 승인 판매자 수가 설정되었습니다.',
      };
    }

    // Real API call
    const response = await authClient.api.patch(
      `/api/v1/supplier/products/${id}/max-sellers`,
      { max_approved_sellers: maxSellers }
    );
    return response.data;
  },
};
