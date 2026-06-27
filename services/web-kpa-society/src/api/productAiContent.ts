/**
 * Product AI Content API Client
 *
 * WO-O4O-AI-AUTO-POP-BUILDER-V1
 *
 * AI 생성 product 콘텐츠 (pop_short / pop_long / product_description / qr_description / signage_text)
 * 조회 / 수동 저장(upsert).
 *
 * 백엔드: /api/v1/products/:productId/ai-contents (no /kpa prefix)
 */

import { coreApiClient } from './client';

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
  return coreApiClient.get(`/products/${productId}/ai-contents`);
}

export async function saveProductAiContent(
  productId: string,
  type: ProductAiContentType,
  content: string,
  model?: string,
): Promise<{ success: boolean; data: ProductAiContent }> {
  return coreApiClient.put(`/products/${productId}/ai-contents/${type}`, {
    content,
    ...(model && { model }),
  });
}
