/**
 * Product AI Content API Client — K-Cosmetics
 *
 * WO-O4O-MY-STORE-PRODUCT-DESCRIPTION-CROSSSERVICE-ALIGNMENT-V1
 *
 * KPA-Society canonical productAiContent API 이식.
 * Core API — 서비스 prefix 없음: /api/v1/products/:productId/ai-contents
 *
 * @deprecated WO-O4O-STORE-LOCAL-PRODUCT-POP-CANONICAL-FLOW-ALIGNMENT-V1 (2026-07-29)
 *   유일한 소비처였던 ProductPopBuilderPage 가 은퇴하면서 본 모듈은 현재 미참조 상태다.
 *   전역 product_ai_contents 는 ProductMaster 소유이며 매장 사용자 write 는 금지다.
 *   매장 자체 상품 POP 은 canonical 화면(/store/marketing/pop)의 매장 소유 자산 계약을 사용한다.
 *   신규 매장 화면에서 다시 연결하지 말 것.
 */

import { api } from '../lib/apiClient';

export type ProductAiContentType =
  | 'product_description'
  | 'pop_short'
  | 'pop_long'
  | 'qr_description'
  | 'signage_text';

export interface ProductAiContent {
  id: string;
  productId: string;
  contentType: ProductAiContentType;
  content: string;
  model: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function getProductAiContents(
  productId: string,
): Promise<{ success: boolean; data: ProductAiContent[] }> {
  const res = await api.get<{ success: boolean; data: ProductAiContent[] }>(
    `/products/${productId}/ai-contents`,
  );
  return res.data;
}

export async function saveProductAiContent(
  productId: string,
  type: ProductAiContentType,
  content: string,
  model?: string,
): Promise<{ success: boolean; data: ProductAiContent }> {
  const res = await api.put<{ success: boolean; data: ProductAiContent }>(
    `/products/${productId}/ai-contents/${type}`,
    { content, ...(model && { model }) },
  );
  return res.data;
}
