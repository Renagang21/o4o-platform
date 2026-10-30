import type { AxiosInstance } from "axios";

export const SUPPLIER_REVIEW_LABELS: Record<string, string> = {
  business_profile: "사업자 기본정보",
  business_registration: "사업자등록증",
  bank_statement: "정산 계좌 서류",
  tax_invoice: "세금계산서 정보",
  mail_order_report: "통신판매업 신고",
  regulated_category: "규제 품목군 서류",
  contact: "담당자·연락처",
  other: "기타",
};
export interface SupplierReviewRequest {
  id: string;
  supplier_id: string;
  state: "requested" | "submitted" | "resolved";
  version: number;
  items: string[];
  request_note: string;
  response_note: string | null;
  resolution_note: string | null;
  created_at: string;
  submitted_at: string | null;
  resolved_at: string | null;
  requested_by?: string | null;
  submitted_by?: string | null;
  resolved_by?: string | null;
}
export interface SupplierReviewData {
  supplierId: string;
  current: SupplierReviewRequest | null;
  requests: SupplierReviewRequest[];
  hasMore: boolean;
  page: number;
  actions: {
    id: string;
    action_key: string;
    user_id: string | null;
    created_at: string;
  }[];
}
async function read<T>(
  promise: Promise<{
    data: { success: boolean; data: T; error?: { message?: string } };
  }>,
): Promise<T> {
  const result = await promise;
  if (!result.data?.success || !result.data.data)
    throw new Error(result.data?.error?.message || "처리에 실패했습니다.");
  return result.data.data;
}
export interface SupplierReviewQueueItem {
  id: string;
  supplier_id: string;
  supplier_name: string;
  state: string;
  items: string[];
  updated_at: string;
}
export const createSupplierReviewApi = (api: AxiosInstance) => ({
  queue: (state: string, page: number) =>
    read<{ items: SupplierReviewQueueItem[]; hasMore: boolean }>(
      api.get(
        `/neture/operator/suppliers/review-requests?${new URLSearchParams({ state, page: String(page) })}`,
      ),
    ),
  list: (supplierId: string, operator: boolean, page = 1) =>
    read<SupplierReviewData>(
      api.get(
        operator
          ? `/neture/operator/suppliers/${supplierId}/review-requests?page=${page}`
          : `/neture/supplier/review-requests?page=${page}`,
      ),
    ),
  create: (supplierId: string, items: string[], note: string) =>
    read<SupplierReviewRequest & { notificationCreated: boolean }>(
      api.post(`/neture/operator/suppliers/${supplierId}/review-requests`, {
        items,
        note,
      }),
    ),
  submit: (id: string, note: string, version: number) =>
    read<SupplierReviewRequest>(
      api.post(`/neture/supplier/review-requests/${id}/submit`, {
        note,
        version,
      }),
    ),
  resolve: (supplierId: string, id: string, note: string, version: number) =>
    read<SupplierReviewRequest>(
      api.post(
        `/neture/operator/suppliers/${supplierId}/review-requests/${id}/resolve`,
        { note, version },
      ),
    ),
});
