import type { SupplierProduct } from '../../../lib/api';
import type { ProductFormData } from '../../../components/product';

/**
 * WO-O4O-NETURE-SUPPLIER-PRODUCT-CREATION-AND-DESCRIPTION-WRITE-SMOKE-BATCH-V1:
 * offer 저장 실패 시 백엔드 error code 를 그대로 노출하던 것을 공급자가 읽고 조치할 수 있는
 * 한국어 안내로 바꾼다. 매핑에 없는 코드는 코드 원문을 유지한다(진단 가능성 보존).
 */
const OFFER_SAVE_ERROR_MESSAGE: Record<string, string> = {
  PRIVATE_REQUIRES_SELLER_IDS:
    '판매자가 지정되지 않은 내부 상품은 활성화하거나 유통 범위를 바꿀 수 없습니다. [공급 방식 변경]에서 공급 방식을 먼저 설정해 주세요. (가격·설명 등 정보 수정은 그대로 저장됩니다)',
  SERVICE_REQUIRES_KEYS: '서비스 공급으로 설정하려면 대상 서비스를 1개 이상 선택해야 합니다.',
  PUBLIC_REQUIRES_DESCRIPTION: '공개 공급으로 전환하려면 상품 설명을 먼저 입력해야 합니다.',
  PRODUCT_NOT_FOUND: '상품을 찾을 수 없습니다. 목록을 새로고침한 뒤 다시 시도해 주세요.',
};

/**
 * WO-O4O-NETURE-SUPPLIER-PRODUCT-AUTHORING-EXPANSION-CLOSEOUT-BATCH-V1:
 * 이미지 API 실패 코드 → 공급자 안내. 매핑에 없는 코드는 원문 유지.
 */
const IMAGE_ERROR_MESSAGE: Record<string, string> = {
  MASTER_NOT_OWNED: '이 상품에 대한 권한이 없습니다.',
  NETWORK_ERROR: '통신 오류로 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  MISSING_MASTER_ID: '상품 정보가 없어 처리할 수 없습니다. 화면을 새로고침해 주세요.',
  MISSING_IMAGE_URL: '이미지 주소가 올바르지 않습니다.',
};

export function imageErrorMessage(code: string | null | undefined): string {
  if (!code) return '알 수 없는 오류';
  return IMAGE_ERROR_MESSAGE[code] ?? code;
}

export function offerSaveErrorMessage(code: string | null | undefined): string {
  if (!code) return '알 수 없는 오류';
  return OFFER_SAVE_ERROR_MESSAGE[code] ?? code;
}

export function formatPrice(v: number | null | undefined): string {
  if (v == null) return '-';
  return `${Number(v).toLocaleString()}원`;
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function completenessColors(score: number): { text: string; background: string } {
  if (score >= 80) return { text: 'text-green-600', background: 'bg-green-500' };
  if (score >= 40) return { text: 'text-amber-600', background: 'bg-amber-500' };
  return { text: 'text-red-500', background: 'bg-red-500' };
}

export function toFormData(p: SupplierProduct): Partial<ProductFormData> {
  return {
    marketingName: p.name || p.masterName || '',
    priceGeneral: p.priceGeneral ?? null,
    priceGold: p.priceGold ?? null,
    consumerReferencePrice: p.consumerReferencePrice ?? null,
    stockQuantity: p.stockQuantity ?? 0,
    isActive: p.isActive,
    // WO-NETURE-DISTRIBUTION-MODEL-SPLIT-PUBLIC-AND-SERVICE-SUPPLY-V1: 두 축 분리
    isPublic: (p as any).isPublic ?? p.distributionType === 'PUBLIC',
    // WO-KPA-RECOMMENDED-TAB-REPLACE-CURATION-WITH-SUPPLIER-HIGHLIGHT-V1
    isFeatured: p.isFeatured ?? false,
    serviceKeys: p.serviceKeys || [],
    distributionType: p.distributionType || 'PRIVATE',
  };
}
