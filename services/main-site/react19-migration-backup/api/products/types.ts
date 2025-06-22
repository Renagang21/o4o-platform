export type ProductStatus = 'draft' | 'published' | 'archived';
export type ProductType = 'physical' | 'digital' | 'service';

export interface Product {
  id: string;
  title: string;
  description: string;
  type: ProductType;
  status: ProductStatus;
  price: number;
  stock: number;
  images: string[];
  category: string;
  tags: string[];
  sellerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCreateRequest {
  title: string;
  description: string;
  type: ProductType;
  price: number;
  stock: number;
  images: string[];
  category: string;
  tags: string[];
}

export interface ProductUpdateRequest extends Partial<ProductCreateRequest> {
  status?: ProductStatus;
}

export interface ProductListResponse {
  items: Product[];
  total: number;
  page: number;
  limit: number;
}

export interface ProductListParams {
  page?: number;
  limit?: number;
  status?: ProductStatus;
  type?: ProductType;
  category?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ProductError {
  message: string;
  code: string;
} 