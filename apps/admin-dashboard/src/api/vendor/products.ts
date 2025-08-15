import { authClient } from '@o4o/auth-client';
import type { 
  VendorProduct, 
  ProductApprovalRequest, 
  ProductApprovalResponse,
  StockUpdateRequest 
} from '@o4o/types';

/**
 * 공급자별 제품 목록 조회
 */
export async function getSupplierProducts(params?: {
  supplierId?: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  status?: string;
  page?: number;
  limit?: number;
  search?: string;
}) {
  const queryParams = new URLSearchParams();
  
  if (params?.supplierId) queryParams.append('supplierId', params.supplierId);
  if (params?.approvalStatus) queryParams.append('approvalStatus', params.approvalStatus);
  if (params?.status) queryParams.append('status', params.status);
  if (params?.page) queryParams.append('page', params.page.toString() as any);
  if (params?.limit) queryParams.append('limit', params.limit.toString() as any);
  if (params?.search) queryParams.append('search', params.search);

  const response = await authClient.api.get(`/vendor/products?${queryParams.toString() as any}`);
  return response.data;
}

/**
 * 제품 상세 조회
 */
export async function getVendorProduct(productId: string) {
  const response = await authClient.api.get(`/vendor/products/${productId}`);
  return response.data;
}

/**
 * 제품 등록 (공급자)
 */
export async function createVendorProduct(data: Partial<VendorProduct>) {
  const response = await authClient.api.post('/vendor/products', data);
  return response.data;
}

/**
 * 제품 수정 (공급자)
 */
export async function updateVendorProduct(productId: string, data: Partial<VendorProduct>) {
  const response = await authClient.api.put(`/vendor/products/${productId}`, data);
  return response.data;
}

/**
 * 제품 승인/거절 (관리자)
 */
export async function approveProducts(request: ProductApprovalRequest): Promise<ProductApprovalResponse> {
  try {
    const response = await authClient.api.post('/vendor/products/approve', request);
    return response.data;
  } catch (error: any) {
    // Error logging - use proper error handler
    // console.error('Product approval error:', error);
    return {
      success: false,
      approved: [],
      rejected: [],
      failed: request.productIds,
      message: error.response?.data?.message || '제품 승인 처리 중 오류가 발생했습니다.'
    };
  }
}

/**
 * 재고 업데이트
 */
export async function updateStock(request: StockUpdateRequest) {
  const response = await authClient.api.post('/vendor/products/stock', request);
  return response.data;
}

/**
 * 승인 대기 중인 제품 목록 (관리자)
 */
export async function getPendingProducts(params?: {
  page?: number;
  limit?: number;
}) {
  return getSupplierProducts({
    ...params,
    approvalStatus: 'pending'
  });
}

/**
 * 판매 가능한 제품 목록 (판매자)
 */
export async function getApprovedProducts(params?: {
  categoryId?: string;
  page?: number;
  limit?: number;
  search?: string;
}) {
  const queryParams = new URLSearchParams();
  
  queryParams.append('approvalStatus', 'approved');
  queryParams.append('status', 'active');
  
  if (params?.categoryId) queryParams.append('categoryId', params.categoryId);
  if (params?.page) queryParams.append('page', params.page.toString() as any);
  if (params?.limit) queryParams.append('limit', params.limit.toString() as any);
  if (params?.search) queryParams.append('search', params.search);

  const response = await authClient.api.get(`/vendor/products?${queryParams.toString() as any}`);
  return response.data;
}

/**
 * 제품 상태 변경
 */
export async function updateProductStatus(
  productId: string, 
  status: 'draft' | 'active' | 'inactive' | 'soldout'
) {
  const response = await authClient.api.patch(`/vendor/products/${productId}/status`, { status });
  return response.data;
}

/**
 * 제품 삭제 (소프트 삭제)
 */
export async function deleteVendorProduct(productId: string) {
  const response = await authClient.api.delete(`/vendor/products/${productId}`);
  return response.data;
}