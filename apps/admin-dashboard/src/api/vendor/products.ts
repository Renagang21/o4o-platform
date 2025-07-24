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
  try {
    const queryParams = new URLSearchParams();
    
    if (params?.supplierId) queryParams.append('supplierId', params.supplierId);
    if (params?.approvalStatus) queryParams.append('approvalStatus', params.approvalStatus);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);

    const response = await authClient.api.get(`/v1/vendor/products?${queryParams.toString()}`);
    return response.data;
  } catch (error: any) {
    console.error('Get supplier products error:', error);
    throw error;
  }
}

/**
 * 제품 상세 조회
 */
export async function getVendorProduct(productId: string) {
  try {
    const response = await authClient.api.get(`/v1/vendor/products/${productId}`);
    return response.data;
  } catch (error: any) {
    console.error('Get vendor product error:', error);
    throw error;
  }
}

/**
 * 제품 등록 (공급자)
 */
export async function createVendorProduct(data: Partial<VendorProduct>) {
  try {
    const response = await authClient.api.post('/v1/vendor/products', data);
    return response.data;
  } catch (error: any) {
    console.error('Create vendor product error:', error);
    throw error;
  }
}

/**
 * 제품 수정 (공급자)
 */
export async function updateVendorProduct(productId: string, data: Partial<VendorProduct>) {
  try {
    const response = await authClient.api.put(`/v1/vendor/products/${productId}`, data);
    return response.data;
  } catch (error: any) {
    console.error('Update vendor product error:', error);
    throw error;
  }
}

/**
 * 제품 승인/거절 (관리자)
 */
export async function approveProducts(request: ProductApprovalRequest): Promise<ProductApprovalResponse> {
  try {
    const response = await authClient.api.post('/v1/vendor/products/approve', request);
    return response.data;
  } catch (error: any) {
    console.error('Approve products error:', error);
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
  try {
    const response = await authClient.api.post('/v1/vendor/products/stock', request);
    return response.data;
  } catch (error: any) {
    console.error('Update stock error:', error);
    throw error;
  }
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
  try {
    const queryParams = new URLSearchParams();
    
    queryParams.append('approvalStatus', 'approved');
    queryParams.append('status', 'active');
    
    if (params?.categoryId) queryParams.append('categoryId', params.categoryId);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);

    const response = await authClient.api.get(`/v1/vendor/products?${queryParams.toString()}`);
    return response.data;
  } catch (error: any) {
    console.error('Get approved products error:', error);
    throw error;
  }
}

/**
 * 제품 상태 변경
 */
export async function updateProductStatus(
  productId: string, 
  status: 'draft' | 'active' | 'inactive' | 'soldout'
) {
  try {
    const response = await authClient.api.patch(`/v1/vendor/products/${productId}/status`, { status });
    return response.data;
  } catch (error: any) {
    console.error('Update product status error:', error);
    throw error;
  }
}

/**
 * 제품 삭제 (소프트 삭제)
 */
export async function deleteVendorProduct(productId: string) {
  try {
    const response = await authClient.api.delete(`/v1/vendor/products/${productId}`);
    return response.data;
  } catch (error: any) {
    console.error('Delete vendor product error:', error);
    throw error;
  }
}