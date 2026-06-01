/**
 * Product AI Content API Client — GlycoPharm
 *
 * WO-O4O-MY-STORE-PRODUCT-DESCRIPTION-CROSSSERVICE-ALIGNMENT-V1
 *
 * KPA-Society canonical productAiContent API 이식.
 * Core API — 서비스 prefix 없음: /api/v1/products/:productId/ai-contents
 */

import { api } from '@/lib/apiClient';

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

export async function generateProductAiContent(
  productId: string,
  type: ProductAiContentType,
): Promise<{ success: boolean; message?: string }> {
  const res = await api.post<{ success: boolean; message?: string }>(
    `/products/${productId}/ai-contents/generate/${type}`,
    {},
  );
  return res.data;
}
