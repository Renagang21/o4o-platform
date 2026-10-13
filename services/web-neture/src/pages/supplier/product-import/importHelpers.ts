import type {
  ParsedProductData,
  DetailImageCandidate,
  FirstmallAdminProduct,
} from '../../../lib/product-import/types';
import { getSupplierProductType } from '../../../lib/supplierProductTypes';
import type { CategoryTreeItem } from '../../../lib/api';

export const NON_DRUG = getSupplierProductType('non_drug')!;
export type TopChoice = 'drug' | 'non_drug';

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

export const O4O_SERVICES = [
  { key: 'kpa-society', name: 'KPA Society' },
  { key: 'k-cosmetics', name: 'K-Cosmetics' },
];

export const REGULATORY_TYPE_OPTIONS = [
  { value: 'GENERAL', label: '일반' },
  { value: 'DRUG', label: '의약품' },
  { value: 'HEALTH_FUNCTIONAL', label: '건강기능식품' },
  { value: 'QUASI_DRUG', label: '의약외품' },
  { value: 'COSMETIC', label: '화장품' },
];

/**
 * WO-O4O-NETURE-SUPPLIER-PRODUCT-IMPORT-ASSISTANT-DETAIL-IMAGE-IMPORT-V1
 * HTML 속성값(src/alt) 안전 삽입용 이스케이프.
 */
export function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function flattenCats(
  cats: CategoryTreeItem[],
  depth = 0,
): { id: string; name: string; depth: number; isRegulated: boolean }[] {
  const result: { id: string; name: string; depth: number; isRegulated: boolean }[] = [];
  for (const cat of cats) {
    result.push({ id: cat.id, name: cat.name, depth, isRegulated: cat.isRegulated });
    if (cat.children?.length) result.push(...flattenCats(cat.children, depth + 1));
  }
  return result;
}

export function mapImportProduct(admin: FirstmallAdminProduct): ParsedProductData {
  // 상세 이미지 후보 (원본 https 쇼핑몰 URL — 미리보기는 원본, 삽입 시 O4O 복사)
  const detailCandidates: DetailImageCandidate[] = admin.detailImageUrls.map((url, i) => ({
    url,
    originalUrl: url,
    alt: null,
    width: null,
    height: null,
    order: i + 1,
  }));

  const result: ParsedProductData = {
    name: admin.name,
    brand: null,
    manufacturer: admin.manufacturer,
    specification: admin.subInfo.find((s) => /용량|내용량|규격/.test(s.label))?.value ?? null,
    originCountry: admin.originCountry,
    price: null,
    thumbnailUrl: admin.productImageUrls[0] ?? null,
    imageUrls: admin.productImageUrls,
    shortDescription: admin.summary ? `<p>${escapeHtmlAttr(admin.summary)}</p>` : null,
    detailDescription: admin.detailHtml ?? '',
    detailImageCandidates: detailCandidates,
  };
  return result;
}
