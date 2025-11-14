/**
 * Seller Product API Service
 * Phase 3-3: Seller product management API client
 */

import { authClient } from '@o4o/auth-client';
import {
  GetSellerProductsQuery,
  GetSellerProductsResponse,
  GetSellerProductDetailResponse,
  SellerProductCreateRequest,
  CreateSellerProductResponse,
  SellerProductUpdateRequest,
  UpdateSellerProductResponse,
  DeleteSellerProductResponse,
  SellerProductDetail,
  SellerProductListItem,
  GetSupplierProductsForSelectionResponse,
  SupplierProductForSelection,
} from '../types/seller-product';

// Mock data for development
const MOCK_SELLER_PRODUCTS: SellerProductDetail[] = [
  {
    id: '1',
    seller_id: 'seller-1',
    supplier_product_id: 'sup-prod-1',
    title: '프리미엄 유기농 쌀 10kg',
    sku: 'SELLER-001',
    sale_price: 35000,
    margin_amount: 10000,
    margin_rate: 40,
    supply_price: 25000,
    supplier_product_title: '프리미엄 유기농 쌀',
    is_published: true,
    thumbnail_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200',
    created_at: '2025-11-10T10:00:00Z',
    updated_at: '2025-11-10T10:00:00Z',
  },
  {
    id: '2',
    seller_id: 'seller-1',
    supplier_product_id: 'sup-prod-2',
    title: '신선한 방울토마토 1kg',
    sku: 'SELLER-002',
    sale_price: 12000,
    margin_amount: 3000,
    margin_rate: 33.33,
    supply_price: 9000,
    supplier_product_title: '신선한 방울토마토',
    is_published: true,
    thumbnail_url: 'https://images.unsplash.com/photo-1592921870789-04563d55041c?w=200',
    created_at: '2025-11-11T11:00:00Z',
    updated_at: '2025-11-11T11:00:00Z',
  },
  {
    id: '3',
    seller_id: 'seller-1',
    supplier_product_id: 'sup-prod-3',
    title: '국내산 한우 등심 500g',
    sku: 'SELLER-003',
    sale_price: 55000,
    margin_amount: 10000,
    margin_rate: 22.22,
    supply_price: 45000,
    supplier_product_title: '국내산 한우 등심',
    is_published: false,
    thumbnail_url: 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=200',
    created_at: '2025-11-12T09:00:00Z',
    updated_at: '2025-11-12T09:00:00Z',
  },
];

const MOCK_SUPPLIER_PRODUCTS: SupplierProductForSelection[] = [
  {
    id: 'sup-prod-1',
    title: '프리미엄 유기농 쌀',
    sku: 'PROD-001',
    supply_price: 25000,
    thumbnail_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200',
    category: '곡물',
  },
  {
    id: 'sup-prod-2',
    title: '신선한 방울토마토',
    sku: 'PROD-002',
    supply_price: 9000,
    thumbnail_url: 'https://images.unsplash.com/photo-1592921870789-04563d55041c?w=200',
    category: '채소',
  },
  {
    id: 'sup-prod-3',
    title: '국내산 한우 등심',
    sku: 'PROD-003',
    supply_price: 45000,
    thumbnail_url: 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=200',
    category: '육류',
  },
  {
    id: 'sup-prod-4',
    title: '제주 감귤',
    sku: 'PROD-004',
    supply_price: 15000,
    thumbnail_url: 'https://images.unsplash.com/photo-1580918-5a40c4e94?w=200',
    category: '과일',
  },
  {
    id: 'sup-prod-5',
    title: '유기농 계란 30개입',
    sku: 'PROD-005',
    supply_price: 14000,
    thumbnail_url: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=200',
    category: '축산',
  },
];

// Enable/disable mock mode based on environment
// Use VITE_USE_MOCK_SELLER_PRODUCTS env var or default to true in development
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_SELLER_PRODUCTS !== 'false'
  && import.meta.env.MODE === 'development';

/**
 * Mock API delay
 */
const mockDelay = (ms: number = 500): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Filter and sort mock products
 */
const filterAndSortMockProducts = (
  products: SellerProductDetail[],
  query: GetSellerProductsQuery
): SellerProductDetail[] => {
  let result = [...products];

  // Search filter
  if (query.search) {
    const search = query.search.toLowerCase();
    result = result.filter(
      (product) =>
        product.title.toLowerCase().includes(search) ||
        product.sku.toLowerCase().includes(search)
    );
  }

  // Status filter
  if (query.status && query.status !== 'all') {
    result = result.filter((product) => {
      const status = product.is_published ? 'active' : 'inactive';
      return status === query.status;
    });
  }

  // Sort
  const sortBy = query.sort_by || 'created_at';
  const sortOrder = query.sort_order || 'desc';

  result.sort((a, b) => {
    let aVal: any;
    let bVal: any;

    switch (sortBy) {
      case 'title':
        aVal = a.title;
        bVal = b.title;
        break;
      case 'price':
        aVal = a.sale_price;
        bVal = b.sale_price;
        break;
      case 'created_at':
      default:
        aVal = new Date(a.created_at).getTime();
        bVal = new Date(b.created_at).getTime();
    }

    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  return result;
};

/**
 * Paginate products
 */
const paginateProducts = (
  products: SellerProductDetail[],
  page: number,
  limit: number
) => {
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginatedProducts = products.slice(start, end);
  const total = products.length;
  const totalPages = Math.ceil(total / limit);

  return {
    products: paginatedProducts,
    total,
    totalPages,
  };
};

/**
 * Convert detail to list item
 */
const toListItem = (product: SellerProductDetail): SellerProductListItem => {
  return {
    id: product.id,
    title: product.title,
    sku: product.sku,
    thumbnail_url: product.thumbnail_url || null,
    sale_price: product.sale_price,
    margin_amount: product.margin_amount,
    status: product.is_published ? 'active' : 'inactive',
    created_at: product.created_at,
  };
};

/**
 * Seller Product API client
 */
export const sellerProductAPI = {
  /**
   * Fetch seller products with filters, sorting, and pagination
   */
  async fetchProducts(
    query: GetSellerProductsQuery = {}
  ): Promise<GetSellerProductsResponse> {
    if (USE_MOCK_DATA) {
      await mockDelay();

      const page = query.page || 1;
      const limit = query.limit || 20;

      // Filter and sort
      const filtered = filterAndSortMockProducts(MOCK_SELLER_PRODUCTS, query);

      // Paginate
      const { products, total, totalPages } = paginateProducts(filtered, page, limit);

      return {
        success: true,
        data: {
          products: products.map(toListItem),
          pagination: {
            total,
            page,
            limit,
            total_pages: totalPages,
          },
        },
      };
    }

    // Real API call
    const response = await authClient.api.get('/api/v1/dropshipping/seller/products', {
      params: query,
    });
    return response.data;
  },

  /**
   * Fetch seller product detail by ID
   */
  async fetchProductDetail(id: string): Promise<GetSellerProductDetailResponse> {
    if (USE_MOCK_DATA) {
      await mockDelay();

      const product = MOCK_SELLER_PRODUCTS.find((p) => p.id === id);
      if (!product) {
        throw new Error('Product not found');
      }

      return {
        success: true,
        data: product,
      };
    }

    // Real API call
    const response = await authClient.api.get(
      `/api/v1/dropshipping/seller/products/${id}`
    );
    return response.data;
  },

  /**
   * Create new seller product
   */
  async createProduct(
    payload: SellerProductCreateRequest
  ): Promise<CreateSellerProductResponse> {
    if (USE_MOCK_DATA) {
      await mockDelay();

      // Find supplier product
      const supplierProduct = MOCK_SUPPLIER_PRODUCTS.find(
        (p) => p.id === payload.supplier_product_id
      );

      if (!supplierProduct) {
        throw new Error('Supplier product not found');
      }

      const newProduct: SellerProductDetail = {
        id: `seller-${Date.now()}`,
        seller_id: 'seller-1',
        supplier_product_id: payload.supplier_product_id,
        title: payload.title || supplierProduct.title,
        sku: `SELLER-${Date.now()}`,
        sale_price: payload.sale_price,
        margin_amount: payload.margin_amount || (payload.sale_price - supplierProduct.supply_price),
        margin_rate: payload.margin_rate,
        supply_price: supplierProduct.supply_price,
        supplier_product_title: supplierProduct.title,
        is_published: payload.is_published !== undefined ? payload.is_published : true,
        thumbnail_url: supplierProduct.thumbnail_url,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      MOCK_SELLER_PRODUCTS.unshift(newProduct);

      return {
        success: true,
        data: newProduct,
        message: '판매 상품이 등록되었습니다.',
      };
    }

    // Real API call
    const response = await authClient.api.post(
      '/api/v1/dropshipping/seller/products',
      payload
    );
    return response.data;
  },

  /**
   * Update seller product
   */
  async updateProduct(
    id: string,
    payload: SellerProductUpdateRequest
  ): Promise<UpdateSellerProductResponse> {
    if (USE_MOCK_DATA) {
      await mockDelay();

      const productIndex = MOCK_SELLER_PRODUCTS.findIndex((p) => p.id === id);
      if (productIndex === -1) {
        throw new Error('Product not found');
      }

      const product = MOCK_SELLER_PRODUCTS[productIndex];

      // Update fields
      if (payload.title !== undefined) product.title = payload.title;
      if (payload.sale_price !== undefined) {
        product.sale_price = payload.sale_price;
        // Recalculate margin if supply_price exists
        if (product.supply_price) {
          product.margin_amount = payload.sale_price - product.supply_price;
          product.margin_rate = (product.margin_amount / product.supply_price) * 100;
        }
      }
      if (payload.margin_amount !== undefined) product.margin_amount = payload.margin_amount;
      if (payload.margin_rate !== undefined) product.margin_rate = payload.margin_rate;
      if (payload.is_published !== undefined) product.is_published = payload.is_published;

      product.updated_at = new Date().toISOString();

      return {
        success: true,
        data: product,
        message: '판매 상품이 수정되었습니다.',
      };
    }

    // Real API call
    const response = await authClient.api.patch(
      `/api/v1/dropshipping/seller/products/${id}`,
      payload
    );
    return response.data;
  },

  /**
   * Delete seller product
   */
  async deleteProduct(id: string): Promise<DeleteSellerProductResponse> {
    if (USE_MOCK_DATA) {
      await mockDelay();

      const productIndex = MOCK_SELLER_PRODUCTS.findIndex((p) => p.id === id);
      if (productIndex === -1) {
        throw new Error('Product not found');
      }

      MOCK_SELLER_PRODUCTS.splice(productIndex, 1);

      return {
        success: true,
        message: '판매 상품이 삭제되었습니다.',
      };
    }

    // Real API call
    const response = await authClient.api.delete(
      `/api/v1/dropshipping/seller/products/${id}`
    );
    return response.data;
  },

  /**
   * Fetch supplier products for selection (import flow)
   */
  async fetchSupplierProductsForSelection(
    query: { page?: number; limit?: number; search?: string } = {}
  ): Promise<GetSupplierProductsForSelectionResponse> {
    if (USE_MOCK_DATA) {
      await mockDelay();

      const page = query.page || 1;
      const limit = query.limit || 20;

      let filtered = [...MOCK_SUPPLIER_PRODUCTS];

      // Search filter
      if (query.search) {
        const search = query.search.toLowerCase();
        filtered = filtered.filter(
          (product) =>
            product.title.toLowerCase().includes(search) ||
            product.sku.toLowerCase().includes(search)
        );
      }

      // Paginate
      const { products, total, totalPages } = paginateProducts(filtered as any, page, limit);

      return {
        success: true,
        data: {
          products: products as SupplierProductForSelection[],
          pagination: {
            total,
            page,
            limit,
            total_pages: totalPages,
          },
        },
      };
    }

    // Real API call
    const response = await authClient.api.get(
      '/api/v1/dropshipping/seller/supplier-products',
      {
        params: query,
      }
    );
    return response.data;
  },
};
