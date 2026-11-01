import { readStoreJson, storeJsonFetch } from './storeJsonFetch';
import { storeScopedFetch } from './storeScopedFetch';
const base = `${import.meta.env.VITE_API_BASE_URL || ''}/api/v1/store/products`;
export interface AiSection { key: string; title: string; kind: 'product-fact' | 'professional-reference' | 'counseling-support' | 'unclassified'; text: string; referenceUrls: string[] }
export interface StoreProductAiContext {
  state: 'missing' | 'legacy' | 'structured'; name: string; masterId: string; listingId: string; language: string;
  description: { id: string; revision: string; truncated: boolean; sections: AiSection[];
    source: { kind: string; currentness: string; checkedOn: string | null; references: Array<{ url: string; label?: string }> } | null } | null;
}
export interface ProductFileRow {
  row: number; barcode: string; name: string; state: string;
  candidates: Array<{ id: string; name: string; barcode: string | null; manufacturer: string | null; matchedBy: string; hasAiDescription: boolean; aiState?: 'missing' | 'legacy' | 'structured' | 'unclassified'; registered: boolean }>;
}
export interface ProductFilePreview { headerRow: number; columns: Array<{ index: number; label: string }>; rows: ProductFileRow[] }
export interface StoreAiReadiness {
  organizationId: string; purpose: 'B2B'; language: string; listingCount: number; masterCount: number; localCount: number;
  states: { structured: number; unclassified: number; legacy: number; missing: number };
}
export async function getStoreAiReadiness(language: string) {
  return (await storeJsonFetch<{ data: StoreAiReadiness }>(`${base}/ai-context/readiness?language=${encodeURIComponent(language)}`)).data;
}
export async function previewProductFile(file: File, mapping?: { barcodeColumn?: number; nameColumn?: number; language: string }, headerRow?: number) {
  const body = new FormData(); body.append('file', file);
  if (headerRow !== undefined) body.append('headerRow', String(headerRow));
  if (mapping) for (const [key, value] of Object.entries(mapping)) if (value !== undefined) body.append(key, String(value));
  const result = await readStoreJson<{ data: ProductFilePreview }>(await storeScopedFetch(`${base}/ai-context/import-preview`, { method: 'POST', body }));
  return result.data;
}
export async function getStoreProductAiContext(listingId: string, language: string) {
  const result = await storeJsonFetch<{ data: StoreProductAiContext }>(`${base}/ai-context/${encodeURIComponent(listingId)}?language=${encodeURIComponent(language)}`);
  return result.data;
}

export function aiResearchRequest(rows: Array<{ name: string; barcode: string }>, language: string) {
  return `O4O 상품 AI 상담지원 자료 준비 요청 (${language})\n` +
    '아래 상품은 식별 후보입니다. POS 코드는 사용하지 마세요. 정확한 바코드로 기존 O4O DB를 먼저 대조하고, 상품명을 확인하세요.\n' +
    '정부 공개정보를 우선하고 제조사의 공식 상품 설명으로 보완하세요. 확인 가능한 공개 근거가 없으면 작성하지 말고 미작성 사유만 정리하세요.\n' +
    '제품 사실·성분·용법·주의사항과 전문 참고·상담 판단을 구분하세요. 일반 성분 지식을 해당 제품의 확정 효과로 바꾸지 마세요.\n' +
    '출처 URL·확인일과 각 항목의 근거를 남기고 미확인 수치·포장 단위를 추정하지 마세요. 설명은 관리자 검토 대상이며 QR 설명서가 아닙니다.\n' +
    '결과는 o4o-public-product-descriptions-v1 형식으로 준비하세요. descriptions[].aiSections는 {key,title,kind,text,referenceUrls} 배열입니다. ' +
    'kind는 product-fact/professional-reference/counseling-support/unclassified이며 referenceUrls는 해당 설명의 source_evidence_ids에 연결된 실제 source_url만 사용하세요.\n' +
    '각 설명에는 description_key,name,verified_barcodes,sections,source_evidence_ids를, evidence에는 id,source_url,kind,currentness를 포함하세요. generated_on에는 실제 확인일을 적으세요.\n' +
    JSON.stringify(rows, null, 2);
}
