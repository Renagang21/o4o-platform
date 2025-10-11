/**
 * Vendor Products API
 */

import { apiRequest } from '../apiRequest';

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
  vendorId: string;
  images?: string[];
  category?: string;
  stock?: number;
}

export interface ProductFormData {
  title: string;
  description: string;
  price: number;
  category?: string;
  stock?: number;
  images?: string[];
}

export class ProductApi {
  // Legacy exports for compatibility
  static approveProducts = ProductApi.approveProduct;
  static getPendingProducts = () => ProductApi.getProducts({ status: 'pending' });
  static createVendorProduct = ProductApi.createProduct;
  static updateVendorProduct = ProductApi.updateProduct;

  static async getProducts(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }) {
    return apiRequest<{ products: Product[]; total: number }>('/vendor/products', {
      method: 'GET',
      params
    });
  }

  static async getProduct(id: string) {
    return apiRequest<Product>(`/vendor/products/${id}`, {
      method: 'GET'
    });
  }

  static async createProduct(data: ProductFormData) {
    return apiRequest<Product>('/vendor/products', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  static async updateProduct(id: string, data: Partial<ProductFormData>) {
    return apiRequest<Product>(`/vendor/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  static async deleteProduct(id: string) {
    return apiRequest<void>(`/vendor/products/${id}`, {
      method: 'DELETE'
    });
  }

  static async approveProduct(id: string) {
    return apiRequest<Product>(`/vendor/products/${id}/approve`, {
      method: 'POST'
    });
  }

  static async rejectProduct(id: string, reason: string) {
    return apiRequest<Product>(`/vendor/products/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  }
}

// Named exports for compatibility
export const approveProducts = ProductApi.approveProduct;
export const getPendingProducts = () => ProductApi.getProducts({ status: 'pending' });
export const createVendorProduct = ProductApi.createProduct;
export const updateVendorProduct = ProductApi.updateProduct;