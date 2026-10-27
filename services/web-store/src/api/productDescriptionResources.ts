import { apiClient, coreApiClient } from './client';
export interface CounselingTarget {
  id: string; name: string; barcode: string | null; manufacturer: string | null; matchedBy: string;
  canonical: { id: string; content: string; summary: string | null; source?: { kind: string; currentness: string; checkedOn: string | null; references: Array<{ url: string; label?: string }> } | null } | null;
}
export async function lookupProductDescription(input: { barcode?: string; name?: string; descriptionType: string; language: string }) {
  const result = await coreApiClient.get<{ success: boolean; data: { state: 'matched' | 'candidates' | 'not_found'; items: CounselingTarget[] } }>('/neture/products/library/description-lookup', input);
  return result.data;
}
export async function contributeProductDescription(id: string, expectedRevision: string) {
  const result = await apiClient.post<{ success: boolean; data: { id: string; replayed: boolean } }>(`/store-contents/direct/${id}/product-contribution`, { expectedRevision });
  return result.data;
}
