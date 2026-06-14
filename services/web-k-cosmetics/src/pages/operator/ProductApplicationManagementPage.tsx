/**
 * K-Cosmetics Operator — 공급 상품 신청 승인 wrapper
 *
 * WO-O4O-PRODUCT-APPROVAL-OPERATOR-SURFACE-ENABLE-GP-KCOS-V1 (Phase 4)
 *
 * 공통 콘솔 `@o4o/operator-core-ui` ProductApplicationManagementConsole 에 K-Cosmetics
 * authClient api 어댑터(serviceKey='k-cosmetics' 백엔드 격리)를 주입.
 * backend: /api/v1/cosmetics/operator/product-applications (scope cosmetics:operator).
 * approve = ProductApprovalV2Service.approveServiceProduct(activateListing:true) — per-store 단건 OPL active.
 */

import {
  ProductApplicationManagementConsole,
  type ProductApplicationsApi,
} from '@o4o/operator-core-ui';
import { api } from '../../lib/apiClient';

const BASE = '/cosmetics/operator/product-applications';

function toError(err: any): Error {
  const status = err?.response?.status;
  const msg = err?.response?.data?.error?.message ?? err?.response?.data?.error;
  if (status === 401) return new Error('로그인이 필요합니다.');
  if (status === 403) return new Error('공급 상품 신청을 조회·처리할 권한이 없습니다.');
  return new Error(typeof msg === 'string' ? msg : '요청 처리 중 오류가 발생했습니다.');
}

const productApplicationsApi: ProductApplicationsApi = {
  async list({ page, limit, status }) {
    try {
      const params: Record<string, string> = { page: String(page), limit: String(limit) };
      if (status) params.status = status;
      const res = await api.get(BASE, { params });
      return {
        data: res.data?.data ?? [],
        pagination: res.data?.pagination ?? { total: 0, page, limit, totalPages: 1 },
      };
    } catch (err) { throw toError(err); }
  },
  async stats() {
    try {
      const res = await api.get(`${BASE}/stats`);
      return res.data?.data ?? { pending: 0, approved: 0, rejected: 0 };
    } catch (err) { throw toError(err); }
  },
  async approve(id) {
    try { return (await api.patch(`${BASE}/${id}/approve`, {})).data; } catch (err) { throw toError(err); }
  },
  async reject(id, reason) {
    try { return (await api.patch(`${BASE}/${id}/reject`, { reason: reason || undefined })).data; } catch (err) { throw toError(err); }
  },
  async batchApprove(ids) {
    try { return (await api.post(`${BASE}/batch-approve`, { ids })).data; } catch (err) { throw toError(err); }
  },
  async batchReject(ids, reason) {
    try { return (await api.post(`${BASE}/batch-reject`, { ids, reason })).data; } catch (err) { throw toError(err); }
  },
  async remove(id) {
    try { return (await api.delete(`${BASE}/${id}`)).data; } catch (err) { throw toError(err); }
  },
  async batchDelete(ids) {
    try { return (await api.post(`${BASE}/batch-delete`, { ids })).data; } catch (err) { throw toError(err); }
  },
};

export default function ProductApplicationManagementPage() {
  return (
    <ProductApplicationManagementConsole
      api={productApplicationsApi}
      config={{
        title: '공급 상품 신청 승인',
        description: '매장이 공급 상품 카탈로그에서 신청한 상품을 승인하거나 거절합니다.',
        orgLabel: '매장',
        accent: 'pink',
        tableId: 'kcosmetics-product-applications',
      }}
    />
  );
}
