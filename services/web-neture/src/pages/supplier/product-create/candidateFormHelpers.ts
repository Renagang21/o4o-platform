import type { CategoryTreeItem } from '../../../lib/api';

// WO-O4O-NETURE-SUPPLIER-PRODUCT-CREATE-INFO-FIRST-V1: 정보-우선 — 공급 방식은 승격 후 Offer 연결 시 설정
export const STEPS = ['제품 정보', '이미지 / 설명'];

export interface SupplierCandidateForm {
  barcode: string;
  packagingName: string;
  marketingName: string;
  categoryId: string;
  /** O4O Brand 를 목록에서 직접 선택했을 때만 채워진다(AI·문자열 매칭으로 채우지 않는다) */
  brandId: string;
  brandName: string;
  manufacturerName: string;
  distributionType: string;
  serviceKeys: string[];
  priceGeneral: string;
  consumerReferencePrice: string;
  stockQty: string;
  regulatoryType: string;
  regulatoryName: string;
  mfdsPermitNumber: string;
  specification: string;
  originCountry: string;
  // WO-KPA-RECOMMENDED-TAB-REPLACE-CURATION-WITH-SUPPLIER-HIGHLIGHT-V1
  isFeatured: boolean;
}

export function flattenCategories(
  categories: CategoryTreeItem[],
  depth = 0,
): { id: string; name: string; depth: number; isRegulated: boolean }[] {
  const result: { id: string; name: string; depth: number; isRegulated: boolean }[] = [];
  for (const cat of categories) {
    result.push({ id: cat.id, name: cat.name, depth, isRegulated: cat.isRegulated });
    if (cat.children && cat.children.length > 0) {
      result.push(...flattenCategories(cat.children, depth + 1));
    }
  }
  return result;
}

/**
 * WO-O4O-NETURE-SUPPLIER-PRODUCT-AUTHORING-EXPANSION-CLOSEOUT-BATCH-V1:
 * 실패 시 백엔드 error code 를 조치 가능한 한국어 안내로 바꾼다. 매핑에 없는 코드는 원문을 유지한다.
 * WO-O4O-SUPPLIER-PRODUCT-REGISTRATION-AI-FIRST-CUTOVER-AND-LEGACY-MASTER-RESOLUTION-RETIREMENT-V1:
 *   Candidate 제출(POST /supplier/product-candidates) 오류 코드 기준으로 갱신.
 */
const CREATE_ERROR_MESSAGE: Record<string, string> = {
  SUPPLIER_NOT_ACTIVE: '공급자 계정이 아직 활성화되지 않았습니다. 승인 완료 후 요청할 수 있습니다.',
  SUPPLIER_NOT_FOUND: '공급자 정보를 찾을 수 없습니다. 공급자 등록 상태를 확인해 주세요.',
  CANDIDATE_NAME_REQUIRED: '상품명을 입력해 주세요.',
  INVALID_REGULATORY_TYPE: '선택한 규제 유형이 올바르지 않습니다.',
  DRUG_CATEGORY_REQUIRED:
    '의약품은 일반의약품/전문의약품 구분이 필요합니다. 제품 유형을 다시 선택해 주세요.',
  INVALID_CATEGORY_ID: '카테고리를 다시 선택해 주세요.',
  INVALID_BRAND_ID: '브랜드 정보가 올바르지 않습니다. 브랜드명을 다시 입력해 주세요.',
  INVALID_PRICE: '공급가/소비자 참고가는 0 이상의 숫자여야 합니다.',
  INVALID_URL: '이미지 주소가 올바르지 않습니다. 이미지를 다시 선택해 주세요.',
  TOO_MANY_IMAGES: '상세 이미지는 최대 20장까지 등록할 수 있습니다.',
  FIELD_TOO_LONG: '입력값이 허용 길이를 초과했습니다. 상품명·설명 길이를 줄여 주세요.',
  FORBIDDEN_FIELD:
    '허용되지 않은 항목이 포함되어 있습니다. 화면을 새로고침한 뒤 다시 시도해 주세요.',
  INTERNAL_ERROR: '서버 오류로 요청하지 못했습니다. 잠시 후 다시 시도해 주세요.',
};

export function createErrorMessage(
  code: string | null | undefined,
  message?: string | null,
): string {
  if (!code) return '제품 정보 검토 요청에 실패했습니다.';
  return (
    CREATE_ERROR_MESSAGE[code] ??
    (message ? `${message} (${code})` : `제품 정보 검토 요청에 실패했습니다. (${code})`)
  );
}
