import { handledProductContentApi, storeDescriptionApi, type LinkedContentItem } from '../../../api/assetSnapshot';
import { getLocalProduct } from '../../../api/localProducts';
import type { ContentProductReference } from '../authoring/contentAuthoringAdapters';

export interface ProductGuidanceMaterial {
  id: string;
  label: string;
  language?: string;
  summary?: string | null;
  html?: string | null;
}

/** Read existing store-scoped sources only; do not turn product names into facts. */
export async function loadProductGuidanceMaterials(product: ContentProductReference): Promise<ProductGuidanceMaterial[]> {
  if (product.sourceType === 'listing') {
    const result = await storeDescriptionApi.list(product.sourceId);
    if (result.success !== true || !Array.isArray(result.data?.items)) throw new Error('Unconfirmed descriptions');
    return result.data.items.map(item => ({
      id: item.descriptionId, label: 'O4O 매장용 상세설명서', language: (item.language || 'ko').toLowerCase(),
      summary: item.summary, html: item.contentHtml,
    }));
  }
  const item = await getLocalProduct(encodeURIComponent(product.sourceId));
  if (!item || item.id !== product.sourceId) throw new Error('Unconfirmed product');
  const fields: ProductGuidanceMaterial[] = [
    { id: 'summary', label: '상품 요약', summary: item.summary },
    { id: 'description', label: '기본 설명', html: item.description },
    { id: 'detail', label: '상세 설명', html: item.detail_html ?? item.detailHtml },
  ];
  return fields.filter(field => field.summary?.trim() || field.html?.trim());
}

export async function loadProductGuidanceLinks(product: ContentProductReference): Promise<LinkedContentItem[]> {
  const result = await handledProductContentApi.byProduct(product.sourceType, product.sourceId);
  if (result.success !== true || !Array.isArray(result.data?.items)) throw new Error('Unconfirmed linked contents');
  return result.data.items;
}

export function productGuidanceEditPath(item: LinkedContentItem, base: string): string | null {
  if (item.sourceType === 'direct' && item.contentId) return `${base}/content/direct/${encodeURIComponent(item.contentId)}?edit=1`;
  if (item.sourceType === 'snapshot_edit' && item.snapshotId) return `${base}/content/${encodeURIComponent(item.snapshotId)}/edit`;
  return null;
}
