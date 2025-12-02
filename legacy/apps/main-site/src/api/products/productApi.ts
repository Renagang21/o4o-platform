import axiosInstance from '../config/axios';
import { API_ENDPOINTS } from '../config/endpoints';
import {
  Product,
  ProductCreateRequest,
  ProductUpdateRequest,
  ProductListResponse,
  ProductListParams,
} from './types';

export const productApi = {
  // 상품 목록 조회
  getProducts: async (params: ProductListParams): Promise<ProductListResponse> => {
    const response = await axiosInstance.get<ProductListResponse>(
      API_ENDPOINTS.PRODUCTS.LIST,
      { params }
    );
    return response.data;
  },

  // 상품 상세 조회
  getProduct: async (id: string): Promise<Product> => {
    const response = await axiosInstance.get<Product>(
      API_ENDPOINTS.PRODUCTS.DETAIL(id)
    );
    return response.data;
  },

  // 상품 생성
  createProduct: async (data: ProductCreateRequest): Promise<Product> => {
    const response = await axiosInstance.post<Product>(
      API_ENDPOINTS.PRODUCTS.CREATE,
      data
    );
    return response.data;
  },

  // 상품 수정
  updateProduct: async (id: string, data: ProductUpdateRequest): Promise<Product> => {
    const response = await axiosInstance.patch<Product>(
      API_ENDPOINTS.PRODUCTS.UPDATE(id),
      data
    );
    return response.data;
  },

  // 상품 삭제
  deleteProduct: async (id: string): Promise<void> => {
    await axiosInstance.delete(API_ENDPOINTS.PRODUCTS.DELETE(id));
  },

  // 상품 이미지 업로드
  uploadProductImage: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await axiosInstance.post<{ url: string }>(
      '/api/products/upload-image',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  // 상품 상태 변경
  updateProductStatus: async (id: string, status: Product['status']): Promise<Product> => {
    const response = await axiosInstance.patch<Product>(
      API_ENDPOINTS.PRODUCTS.UPDATE(id),
      { status }
    );
    return response.data;
  },
}; 