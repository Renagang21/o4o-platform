/**
 * Supplier STORE Description API client — 공급자 매장용(STORE) 상품 설명서 저작/저장
 *
 * WO-O4O-NETURE-SUPPLIER-STORE-DESCRIPTION-DRAFT-SAVE-AND-REVIEW-QUEUE-V1
 * backend: /api/v1/neture/supplier/store-descriptions
 *   - description_type=STORE, source_type=supplier, created_by_supplier_id=작성 공급자
 *   - 공급자는 canonical 직접 생성 금지. 운영자 검수 큐 경유.
 */
import { api } from '../apiClient';

const BASE = '/neture/supplier/store-descriptions';

export type SupplierStoreDescriptionStatus = 'draft' | 'needs_review' | 'canonical' | 'hidden' | 'candidate' | 'deprecated';

export interface SupplierStoreDescriptionDraft {
  id: string;
  masterId: string;
  descriptionType: string;
  language: string | null;
  status: SupplierStoreDescriptionStatus;
  summary: string | null;
  content: string;
  submittedAt: string | null;
  updatedAt: string;
}

export interface SaveSupplierStoreDescriptionInput {
  offerId: string;
  content: string;
  summary?: string | null;
  language?: string;
  /** true = 검수요청(needs_review, submitted_at=now), false = 임시저장(draft) */
  submit: boolean;
}

export const supplierStoreDescriptionApi = {
  /** 공급자 본인의 STORE 설명서 작업행 목록 (masterId 지정 시 해당 상품만) */
  async listMine(masterId?: string): Promise<SupplierStoreDescriptionDraft[]> {
    const qs = masterId ? `?masterId=${encodeURIComponent(masterId)}` : '';
    const res = await api.get(`${BASE}${qs}`);
    return res.data?.data?.items ?? [];
  },

  /** 임시저장 / 검수요청 저장 */
  async save(input: SaveSupplierStoreDescriptionInput): Promise<{
    id: string;
    masterId: string;
    descriptionType: string;
    status: SupplierStoreDescriptionStatus;
    language: string | null;
    submittedAt: string | null;
  }> {
    const res = await api.post(BASE, input);
    return res.data?.data;
  },
};
