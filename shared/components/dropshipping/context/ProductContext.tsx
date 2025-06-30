import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Product, ProductFilters, ProductListState, ProductAction, sampleProducts } from '../types/product';

// Initial state
const initialFilters: ProductFilters = {
  search: '',
  category: [],
  status: [],
  priceRange: { min: 0, max: 1000000 },
  stockRange: { min: 0, max: 1000 }
};

const initialState: ProductListState = {
  products: [],
  loading: false,
  error: null,
  filters: initialFilters,
  pagination: {
    page: 1,
    pageSize: 10,
    total: 0
  },
  sortBy: 'createdAt',
  sortOrder: 'desc'
};

// Reducer
const productReducer = (state: ProductListState, action: ProductAction): ProductListState => {
  switch (action.type) {
    case 'SET_PRODUCTS':
      return {
        ...state,
        products: action.payload,
        pagination: {
          ...state.pagination,
          total: action.payload.length
        }
      };

    case 'ADD_PRODUCT':
      const newProducts = [action.payload, ...state.products];
      return {
        ...state,
        products: newProducts,
        pagination: {
          ...state.pagination,
          total: newProducts.length
        }
      };

    case 'UPDATE_PRODUCT':
      const updatedProducts = state.products.map(product =>
        product.id === action.payload.id ? action.payload : product
      );
      return {
        ...state,
        products: updatedProducts
      };

    case 'DELETE_PRODUCT':
      const filteredProducts = state.products.filter(product => product.id !== action.payload);
      return {
        ...state,
        products: filteredProducts,
        pagination: {
          ...state.pagination,
          total: filteredProducts.length
        }
      };

    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };

    case 'SET_FILTERS':
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
        pagination: { ...state.pagination, page: 1 } // Reset to first page when filtering
      };

    case 'SET_PAGINATION':
      return {
        ...state,
        pagination: { ...state.pagination, ...action.payload }
      };

    case 'SET_SORT':
      return {
        ...state,
        sortBy: action.payload.sortBy,
        sortOrder: action.payload.sortOrder
      };

    default:
      return state;
  }
};

// Context
interface ProductContextType {
  state: ProductListState;
  dispatch: React.Dispatch<ProductAction>;
  // Helper functions
  loadProducts: () => Promise<void>;
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: number) => Promise<void>;
  applyFilters: (filters: Partial<ProductFilters>) => void;
  setSorting: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  getFilteredProducts: () => Product[];
  getTotalCount: () => number;
  clearFilters: () => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

// Provider component
interface ProductProviderProps {
  children: ReactNode;
}

export const ProductProvider: React.FC<ProductProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(productReducer, initialState);

  // Helper function to apply filters and sorting
  const getFilteredProducts = (): Product[] => {
    let filtered = [...state.products];

    // Apply search filter
    if (state.filters.search) {
      const searchTerm = state.filters.search.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm) ||
        product.description.toLowerCase().includes(searchTerm) ||
        product.category.toLowerCase().includes(searchTerm) ||
        product.brand?.toLowerCase().includes(searchTerm)
      );
    }

    // Apply category filter
    if (state.filters.category.length > 0) {
      filtered = filtered.filter(product =>
        state.filters.category.includes(product.category)
      );
    }

    // Apply status filter
    if (state.filters.status.length > 0) {
      filtered = filtered.filter(product => {
        const status = product.status === 'active' ? '판매중' : 
                     product.status === 'out_of_stock' ? '품절' : '판매중단';
        return state.filters.status.includes(status);
      });
    }

    // Apply price range filter
    filtered = filtered.filter(product =>
      product.supplierPrice >= state.filters.priceRange.min &&
      product.supplierPrice <= state.filters.priceRange.max
    );

    // Apply stock range filter
    filtered = filtered.filter(product =>
      product.currentStock >= state.filters.stockRange.min &&
      product.currentStock <= state.filters.stockRange.max
    );

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[state.sortBy as keyof Product];
      let bValue: any = b[state.sortBy as keyof Product];

      // Handle different data types
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) {
        return state.sortOrder === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return state.sortOrder === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return filtered;
  };

  // Load products (simulate API call)
  const loadProducts = async (): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      dispatch({ type: 'SET_PRODUCTS', payload: sampleProducts });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load products' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Add product
  const addProduct = async (productData: Omit<Product, 'id' | 'createdAt'>): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));

      const newProduct: Product = {
        ...productData,
        id: Math.max(...state.products.map(p => p.id), 0) + 1,
        createdAt: new Date().toISOString(),
        marginRate: productData.supplierPrice > 0 
          ? ((productData.recommendedPrice - productData.supplierPrice) / productData.recommendedPrice) * 100
          : 0
      };

      dispatch({ type: 'ADD_PRODUCT', payload: newProduct });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to add product' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Update product
  const updateProduct = async (product: Product): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      await new Promise(resolve => setTimeout(resolve, 600));

      const updatedProduct = {
        ...product,
        updatedAt: new Date().toISOString(),
        marginRate: product.supplierPrice > 0 
          ? ((product.recommendedPrice - product.supplierPrice) / product.recommendedPrice) * 100
          : 0
      };

      dispatch({ type: 'UPDATE_PRODUCT', payload: updatedProduct });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update product' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Delete product
  const deleteProduct = async (id: number): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      await new Promise(resolve => setTimeout(resolve, 400));
      dispatch({ type: 'DELETE_PRODUCT', payload: id });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to delete product' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Apply filters
  const applyFilters = (filters: Partial<ProductFilters>) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  };

  // Set sorting
  const setSorting = (sortBy: string, sortOrder: 'asc' | 'desc') => {
    dispatch({ type: 'SET_SORT', payload: { sortBy, sortOrder } });
  };

  // Get total count of filtered products
  const getTotalCount = (): number => {
    return getFilteredProducts().length;
  };

  // Clear all filters
  const clearFilters = () => {
    dispatch({ type: 'SET_FILTERS', payload: initialFilters });
  };

  // Initial load
  useEffect(() => {
    loadProducts();
  }, []);

  const contextValue: ProductContextType = {
    state,
    dispatch,
    loadProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    applyFilters,
    setSorting,
    getFilteredProducts,
    getTotalCount,
    clearFilters
  };

  return (
    <ProductContext.Provider value={contextValue}>
      {children}
    </ProductContext.Provider>
  );
};

// Hook to use product context
export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};

// Additional helper hooks
export const useProductFilters = () => {
  const { state, applyFilters, clearFilters } = useProducts();
  
  return {
    filters: state.filters,
    applyFilters,
    clearFilters,
    hasActiveFilters: 
      state.filters.search !== '' ||
      state.filters.category.length > 0 ||
      state.filters.status.length > 0 ||
      state.filters.priceRange.min > 0 ||
      state.filters.priceRange.max < 1000000 ||
      state.filters.stockRange.min > 0 ||
      state.filters.stockRange.max < 1000
  };
};

export const useProductPagination = () => {
  const { state, dispatch, getFilteredProducts } = useProducts();
  
  const filteredProducts = getFilteredProducts();
  const startIndex = (state.pagination.page - 1) * state.pagination.pageSize;
  const endIndex = startIndex + state.pagination.pageSize;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredProducts.length / state.pagination.pageSize);

  const setPage = (page: number) => {
    dispatch({ type: 'SET_PAGINATION', payload: { page } });
  };

  const setPageSize = (pageSize: number) => {
    dispatch({ type: 'SET_PAGINATION', payload: { pageSize, page: 1 } });
  };

  return {
    products: paginatedProducts,
    pagination: state.pagination,
    totalPages,
    totalItems: filteredProducts.length,
    setPage,
    setPageSize
  };
};