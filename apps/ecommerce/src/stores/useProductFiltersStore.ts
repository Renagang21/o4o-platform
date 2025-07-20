import { create } from 'zustand';
import { ProductFilters } from '@o4o/types';

interface ProductFiltersStore extends ProductFilters {
  // Setters
  setSearch: (search: string) => void;
  setCategory: (category: string) => void;
  setBrand: (brand: string) => void;
  setPriceRange: (min?: number, max?: number) => void;
  setInStock: (inStock: boolean) => void;
  setFeatured: (featured: boolean) => void;
  setSort: (sort: string) => void;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  
  // Utilities
  reset: () => void;
  getQueryParams: () => Record<string, string | number | boolean>;
}

const initialState: ProductFilters = {
  search: '',
  category: '',
  brand: '',
  minPrice: undefined,
  maxPrice: undefined,
  inStock: false,
  featured: false,
  sort: 'newest',
  page: 1,
  limit: 20
};

export const useProductFiltersStore = create<ProductFiltersStore>((set, get) => ({
  ...initialState,

  setSearch: (search) => set({ search, page: 1 }), // Reset page on search
  setCategory: (category) => set({ category, page: 1 }),
  setBrand: (brand) => set({ brand, page: 1 }),
  setPriceRange: (minPrice, maxPrice) => set({ minPrice, maxPrice, page: 1 }),
  setInStock: (inStock) => set({ inStock, page: 1 }),
  setFeatured: (featured) => set({ featured, page: 1 }),
  setSort: (sort) => set({ sort }),
  setPage: (page) => set({ page }),
  setLimit: (limit) => set({ limit, page: 1 }),

  reset: () => set(initialState),

  getQueryParams: () => {
    const state = get();
    const params: Record<string, string | number | boolean> = {};
    
    if (state.search) params.search = state.search;
    if (state.category) params.category = state.category;
    if (state.brand) params.brand = state.brand;
    if (state.minPrice !== undefined) params.minPrice = state.minPrice;
    if (state.maxPrice !== undefined) params.maxPrice = state.maxPrice;
    if (state.inStock) params.inStock = state.inStock;
    if (state.featured) params.featured = state.featured;
    if (state.sort && state.sort !== 'newest') params.sort = state.sort;
    if (state.page && state.page > 1) params.page = state.page;
    if (state.limit && state.limit !== 20) params.limit = state.limit;
    
    return params;
  }
}));