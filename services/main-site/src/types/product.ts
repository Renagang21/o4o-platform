// 상품 카테고리 타입
export interface CategoryGroup {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface Category {
  id: string;
  groupId: string;
  parentId?: string;
  name: string;
  slug: string;
  level: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  children?: Category[];
}

// 상품 타입
export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  images: string[];
  basePrice: number;
  stockQuantity: number;
  minOrderQuantity: number;
  maxOrderQuantity?: number;
  categories: string[]; // category IDs
  supplierId: string;
  status: 'draft' | 'pending' | 'approved' | 'active' | 'inactive' | 'discontinued';
  approvalStatus: 'pending' | 'approved' | 'rejected';
  pricing: {
    gold: number;      // 기본 리테일러 가격
    premium: number;   // 프리미엄 리테일러 가격  
    vip: number;       // VIP 리테일러 가격
  };
  specifications?: { [key: string]: string };
  brand?: string;
  model?: string;
  weight?: number;
  dimensions?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  viewCount: number;
  salesCount: number;
  rating: number;
  reviewCount: number;
}

// 상품 필터 타입
export interface ProductFilters {
  search: string;
  categoryId: string;
  supplierId: string;
  status: string;
  approvalStatus: string;
  minPrice: number;
  maxPrice: number;
  sortBy: 'name' | 'price' | 'created' | 'sales' | 'rating';
  sortOrder: 'asc' | 'desc';
}

// 상품 생성/수정 요청 타입
export interface ProductFormData {
  name: string;
  description: string;
  shortDescription: string;
  images: string[];
  basePrice: number;
  stockQuantity: number;
  minOrderQuantity: number;
  maxOrderQuantity?: number;
  categories: string[];
  supplierId?: string;
  pricing: {
    gold: number;
    premium: number;
    vip: number;
  };
  specifications?: { [key: string]: string };
  brand?: string;
  model?: string;
  weight?: number;
  dimensions?: string;
}

// API 응답 타입
export interface ProductsResponse {
  success: boolean;
  data: {
    products: Product[];
    pagination: {
      current: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  };
  message?: string;
}