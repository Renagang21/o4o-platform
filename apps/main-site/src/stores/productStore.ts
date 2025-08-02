import { create } from 'zustand';
import { Product, ProductFilters, ProductFormData, Category, CategoryGroup } from '../types/product';
import { mockProducts, getProductsBySupplier, searchProducts } from '../mocks/products';
import { mockCategories, mockCategoryGroups, flatCategories } from '../mocks/categories';

interface ProductState {
  products: Product[];
  currentProduct: Product | null;
  categories: Category[];
  categoryGroups: CategoryGroup[];
  flatCategories: Category[];
  filters: ProductFilters;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  isLoading: boolean;
  error: string | null;
}

interface ProductActions {
  // 상품 조회
  fetchProducts: (filters?: Partial<ProductFilters>) => Promise<void>;
  fetchProductsBySupplier: (supplierId: string) => Promise<void>;
  fetchProduct: (id: string) => Promise<void>;
  
  // 상품 관리
  createProduct: (data: ProductFormData) => Promise<void>;
  updateProduct: (id: string, data: Partial<ProductFormData>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  
  // 상품 상태 관리
  updateProductStatus: (id: string, status: Product['status']) => Promise<void>;
  updateApprovalStatus: (id: string, approvalStatus: Product['approvalStatus']) => Promise<void>;
  
  // 필터 및 검색
  setFilters: (filters: Partial<ProductFilters>) => void;
  clearFilters: () => void;
  searchProducts: (query: string) => Promise<void>;
  
  // 기타
  setCurrentProduct: (product: Product | null) => void;
  clearError: () => void;
  
  // 카테고리 관리
  getCategory: (id: string) => Category | undefined;
  getCategoriesByGroup: (groupId: string) => Category[];
}

export const useProductStore = create<ProductState & ProductActions>((set, get) => ({
  // State
  products: [],
  currentProduct: null,
  categories: mockCategories,
  categoryGroups: mockCategoryGroups,
  flatCategories: flatCategories,
  filters: {
    search: '',
    categoryId: '',
    supplierId: '',
    status: '',
    approvalStatus: '',
    minPrice: 0,
    maxPrice: 0,
    sortBy: 'created',
    sortOrder: 'desc',
  },
  pagination: {
    current: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  },
  isLoading: false,
  error: null,

  // Actions
  fetchProducts: async (newFilters) => {
    set({ isLoading: true, error: null });
    
    try {
      const { filters, pagination } = get();
      const mergedFilters = { ...filters, ...newFilters };
      
      // Mock API 호출 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 800));
      
      let filteredProducts = [...mockProducts];
      
      // 필터링 로직
      if (mergedFilters.search) {
        filteredProducts = searchProducts(mergedFilters.search);
      }
      
      if (mergedFilters.categoryId) {
        filteredProducts = filteredProducts.filter(p =>
          p.categories.includes(mergedFilters.categoryId)
        );
      }
      
      if (mergedFilters.supplierId) {
        filteredProducts = filteredProducts.filter(p =>
          p.supplierId === mergedFilters.supplierId
        );
      }
      
      if (mergedFilters.status) {
        filteredProducts = filteredProducts.filter(p =>
          p.status === mergedFilters.status
        );
      }
      
      if (mergedFilters.approvalStatus) {
        filteredProducts = filteredProducts.filter(p =>
          p.approvalStatus === mergedFilters.approvalStatus
        );
      }
      
      if (mergedFilters.minPrice > 0) {
        filteredProducts = filteredProducts.filter(p =>
          p.basePrice >= mergedFilters.minPrice
        );
      }
      
      if (mergedFilters.maxPrice > 0) {
        filteredProducts = filteredProducts.filter(p =>
          p.basePrice <= mergedFilters.maxPrice
        );
      }
      
      // 정렬
      filteredProducts.sort((a, b) => {
        const { sortBy, sortOrder } = mergedFilters;
        let aValue: string | number | Date;
        let bValue: string | number | Date;
        
        switch (sortBy) {
          case 'name':
            aValue = a.name;
            bValue = b.name;
            break;
          case 'price':
            aValue = a.basePrice;
            bValue = b.basePrice;
            break;
          case 'sales':
            aValue = a.salesCount;
            bValue = b.salesCount;
            break;
          case 'rating':
            aValue = a.rating;
            bValue = b.rating;
            break;
          case 'created':
          default:
            aValue = new Date(a.createdAt);
            bValue = new Date(b.createdAt);
            break;
        }
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortOrder === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        } else if (aValue instanceof Date && bValue instanceof Date) {
          return sortOrder === 'asc' 
            ? aValue.getTime() - bValue.getTime()
            : bValue.getTime() - aValue.getTime();
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortOrder === 'asc' 
            ? aValue - bValue
            : bValue - aValue;
        }
        return 0;
      });
      
      // 페이지네이션
      const total = filteredProducts.length;
      const totalPages = Math.ceil(total / pagination.pageSize);
      const startIndex = (pagination.current - 1) * pagination.pageSize;
      const endIndex = startIndex + pagination.pageSize;
      const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
      
      set({
        products: paginatedProducts,
        filters: mergedFilters,
        pagination: {
          ...pagination,
          total,
          totalPages,
        },
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '상품을 불러오는 중 오류가 발생했습니다.',
        isLoading: false,
      });
    }
  },

  fetchProductsBySupplier: async (supplierId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const supplierProducts = getProductsBySupplier(supplierId);
      
      set({
        products: supplierProducts,
        filters: { ...get().filters, supplierId },
        pagination: {
          ...get().pagination,
          total: supplierProducts.length,
          totalPages: Math.ceil(supplierProducts.length / get().pagination.pageSize),
        },
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '공급자 상품을 불러오는 중 오류가 발생했습니다.',
        isLoading: false,
      });
    }
  },

  fetchProduct: async (id: string) => {
    set({ isLoading: true, error: null });
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const product = mockProducts.find(p => p.id === id);
      if (!product) {
        throw new Error('상품을 찾을 수 없습니다.');
      }
      
      set({
        currentProduct: product,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '상품을 불러오는 중 오류가 발생했습니다.',
        isLoading: false,
      });
    }
  },

  createProduct: async (data: ProductFormData) => {
    set({ isLoading: true, error: null });
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newProduct: Product = {
        id: Date.now().toString(),
        ...data,
        slug: data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        supplierId: data.supplierId || '',
        status: 'draft',
        approvalStatus: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        viewCount: 0,
        salesCount: 0,
        rating: 0,
        reviewCount: 0,
      };
      
      // Mock 데이터에 추가 (실제로는 API 호출)
      mockProducts.unshift(newProduct);
      
      set({
        currentProduct: newProduct,
        isLoading: false,
      });
      
      // 목록 새로고침
      get().fetchProducts();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '상품 등록 중 오류가 발생했습니다.',
        isLoading: false,
      });
    }
  },

  updateProduct: async (id: string, data: Partial<ProductFormData>) => {
    set({ isLoading: true, error: null });
    
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const productIndex = mockProducts.findIndex(p => p.id === id);
      if (productIndex === -1) {
        throw new Error('상품을 찾을 수 없습니다.');
      }
      
      const updatedProduct = {
        ...mockProducts[productIndex],
        ...data,
        updatedAt: new Date().toISOString(),
      };
      
      mockProducts[productIndex] = updatedProduct;
      
      set({
        currentProduct: updatedProduct,
        isLoading: false,
      });
      
      // 목록 새로고침
      get().fetchProducts();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '상품 수정 중 오류가 발생했습니다.',
        isLoading: false,
      });
    }
  },

  deleteProduct: async (id: string) => {
    set({ isLoading: true, error: null });
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const productIndex = mockProducts.findIndex(p => p.id === id);
      if (productIndex === -1) {
        throw new Error('상품을 찾을 수 없습니다.');
      }
      
      mockProducts.splice(productIndex, 1);
      
      set({
        currentProduct: null,
        isLoading: false,
      });
      
      // 목록 새로고침
      get().fetchProducts();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '상품 삭제 중 오류가 발생했습니다.',
        isLoading: false,
      });
    }
  },

  updateProductStatus: async (id: string, status: Product['status']) => {
    set({ isLoading: true, error: null });
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const productIndex = mockProducts.findIndex(p => p.id === id);
      if (productIndex === -1) {
        throw new Error('상품을 찾을 수 없습니다.');
      }
      
      mockProducts[productIndex] = {
        ...mockProducts[productIndex],
        status,
        updatedAt: new Date().toISOString(),
      };
      
      set({ isLoading: false });
      
      // 목록 새로고침
      get().fetchProducts();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '상품 상태 변경 중 오류가 발생했습니다.',
        isLoading: false,
      });
    }
  },

  updateApprovalStatus: async (id: string, approvalStatus: Product['approvalStatus']) => {
    set({ isLoading: true, error: null });
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const productIndex = mockProducts.findIndex(p => p.id === id);
      if (productIndex === -1) {
        throw new Error('상품을 찾을 수 없습니다.');
      }
      
      const updatedProduct = {
        ...mockProducts[productIndex],
        approvalStatus,
        updatedAt: new Date().toISOString(),
      };
      
      if (approvalStatus === 'approved') {
        updatedProduct.approvedAt = new Date().toISOString();
        updatedProduct.status = 'active';
      }
      
      mockProducts[productIndex] = updatedProduct;
      
      set({ isLoading: false });
      
      // 목록 새로고침
      get().fetchProducts();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '승인 상태 변경 중 오류가 발생했습니다.',
        isLoading: false,
      });
    }
  },

  setFilters: (newFilters: Partial<ProductFilters>) => {
    set(state => ({
      filters: { ...state.filters, ...newFilters },
    }));
  },

  clearFilters: () => {
    set({
      filters: {
        search: '',
        categoryId: '',
        supplierId: '',
        status: '',
        approvalStatus: '',
        minPrice: 0,
        maxPrice: 0,
        sortBy: 'created',
        sortOrder: 'desc',
      },
    });
  },

  searchProducts: async (query: string) => {
    set({ isLoading: true, error: null });
    
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const searchResults = searchProducts(query);
      
      set({
        products: searchResults,
        filters: { ...get().filters, search: query },
        pagination: {
          ...get().pagination,
          total: searchResults.length,
          totalPages: Math.ceil(searchResults.length / get().pagination.pageSize),
        },
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '검색 중 오류가 발생했습니다.',
        isLoading: false,
      });
    }
  },

  setCurrentProduct: (product: Product | null) => {
    set({ currentProduct: product });
  },

  clearError: () => {
    set({ error: null });
  },

  getCategory: (id: string) => {
    const { flatCategories } = get();
    return flatCategories.find(category => category.id === id);
  },

  getCategoriesByGroup: (groupId: string) => {
    const { categories } = get();
    return categories.filter(category => category.groupId === groupId);
  },
}));