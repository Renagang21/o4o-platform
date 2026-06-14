/**
 * ProductApplicationManagementPage - 상품 판매 신청 관리 (KPA Operator)
 *
 * WO-O4O-PRODUCT-APPROVAL-WORKFLOW-V1
 * WO-O4O-TABLE-STANDARD-V2 — DataTable 표준 전환
 * WO-KPA-OPERATOR-PRODUCT-APPLICATION-DELETE-V1 — 이력 삭제 기능
 * WO-O4O-PRODUCT-APPROVAL-OPERATOR-SURFACE-ENABLE-GP-KCOS-V1 (Phase 4):
 *   공통 콘솔(@o4o/operator-core-ui ProductApplicationManagementConsole)로 전환.
 *   KPA apiClient 어댑터 주입. 제목/설명/accent/tableId 기존값 유지 → UX 무회귀.
 *
 * /hub/b2b에서 약국이 신청한 상품을 조회하고 승인/거절/삭제합니다.
 * 승인 시 organization_product_listings에 자동 생성됩니다.
 */

import {
  ProductApplicationManagementConsole,
  type ProductApplicationsApi,
  type ProductApplicationListResult,
  type ProductApplicationStats,
  type ProductApplicationAiSummary,
} from '@o4o/operator-core-ui';
import { apiClient } from '../../api/client';

const BASE = '/operator/product-applications';

const api: ProductApplicationsApi = {
  list: async ({ page, limit, status }) => {
    const params: Record<string, string> = { page: String(page), limit: String(limit) };
    if (status) params.status = status;
    const res = await apiClient.get<ProductApplicationListResult & { success: boolean }>(BASE, params);
    return { data: res.data, pagination: res.pagination };
  },
  stats: async () => {
    const res = await apiClient.get<{ success: boolean; data: ProductApplicationStats }>(`${BASE}/stats`);
    return res.data;
  },
  approve: (id) => apiClient.patch(`${BASE}/${id}/approve`, {}),
  reject: (id, reason) => apiClient.patch(`${BASE}/${id}/reject`, { reason: reason || undefined }),
  batchApprove: (ids) => apiClient.post(`${BASE}/batch-approve`, { ids }),
  batchReject: (ids, reason) => apiClient.post(`${BASE}/batch-reject`, { ids, reason }),
  remove: (id) => apiClient.delete(`${BASE}/${id}`),
  batchDelete: (ids) => apiClient.post(`${BASE}/batch-delete`, { ids }),
  aiSummarize: async (items, context) => {
    const res = await apiClient.post<{ success: boolean; data: ProductApplicationAiSummary }>(
      '/operator/ai/summarize-selection',
      { items, context },
    );
    return res.data;
  },
};

export default function ProductApplicationManagementPage() {
  return (
    <ProductApplicationManagementConsole
      api={api}
      config={{
        title: '상품 판매 신청 관리',
        description: '약국이 약국 HUB에서 신청한 B2B 상품을 승인하거나 거절합니다.',
        orgLabel: '약국',
        accent: 'blue',
        tableId: 'kpa-product-applications',
      }}
    />
  );
}
