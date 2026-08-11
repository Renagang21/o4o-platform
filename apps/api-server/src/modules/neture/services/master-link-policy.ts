/**
 * 공급자 ↔ ProductMaster 연결 계약 (비파괴)
 *
 * WO-O4O-SUPPLIER-EXISTING-PRODUCTMASTER-NON-DESTRUCTIVE-LINK-V1
 *
 * ```text
 * 기존 ProductMaster 연결
 *   → SupplierProductOffer 생성/갱신
 *   → ProductMaster 기준정보는 유지 (UPDATE 0)
 *
 * 신규 제품 등록 (O4O 에 동일 제품 없음)
 *   → ProductMaster INSERT
 *   → SupplierProductOffer 연결
 * ```
 *
 * 두 경로를 하나의 update 흐름으로 섞지 않는다. 제품군(DRUG / HEALTH_FUNCTIONAL /
 * QUASI_DRUG / MEDICAL_DEVICE / COSMETIC / GENERAL) 별 예외를 두지 않는다 —
 * 화장품만 예외 처리하는 방식은 금지다.
 *
 * ProductMaster 기준정보를 실제로 고쳐야 하는 운영자/관리자 경로
 * (`/api/v1/admin/o4o-product-db/*`, admin.controller)는 이 정책의 대상이 아니다.
 * "기존 master 연결" 과 "master 편집" 은 다른 기능이다.
 */

/** 공급자 입력이 ProductMaster 로 흘러들 수 있는 기준정보 필드 */
export const SUPPLIER_WRITABLE_MASTER_FIELDS = [
  'name',
  'categoryId',
  'brandId',
  'specification',
  'originCountry',
  'tags',
] as const;

export type SupplierWritableMasterField = (typeof SUPPLIER_WRITABLE_MASTER_FIELDS)[number];

export interface MasterLinkDecision {
  /** 'new' = 이번 요청이 master 를 생성했다 / 'existing' = 기존 master 에 연결한다 */
  mode: 'new' | 'existing';
  /** 실제로 ProductMaster 에 적용할 필드 (existing 이면 항상 비어 있다) */
  masterFieldUpdates: Record<string, unknown>;
  /** 입력에는 있었지만 비파괴 계약에 따라 무시한 필드 */
  ignoredFields: SupplierWritableMasterField[];
}

/**
 * 공급자 입력에서 ProductMaster 에 적용할 필드를 고른다.
 *
 * @param masterCreated 이 요청이 master 를 INSERT 했는가 (`MasterResolveResult.created`)
 * @param input         공급자 입력 (manualData 등)
 *
 * 규칙:
 *   - `masterCreated === true`  → 신규 등록. 입력된 확장 필드를 적용한다(기존 동작 유지).
 *   - `masterCreated !== true`  → 기존 master 연결. **적용 0**, 입력은 전부 ignoredFields 로 보고한다.
 *
 * `created` 가 undefined 인 경우(구 호출부·판정 불가)도 보수적으로 'existing' 으로 본다 —
 * 판정할 수 없으면 덮어쓰지 않는다.
 */
export function resolveMasterWriteFields(
  masterCreated: boolean | undefined,
  input: Record<string, unknown> | undefined,
): MasterLinkDecision {
  const src = input ?? {};
  const present = SUPPLIER_WRITABLE_MASTER_FIELDS.filter((f) => src[f] !== undefined);

  if (masterCreated === true) {
    const masterFieldUpdates: Record<string, unknown> = {};
    for (const f of present) masterFieldUpdates[f] = src[f];
    return { mode: 'new', masterFieldUpdates, ignoredFields: [] };
  }

  return { mode: 'existing', masterFieldUpdates: {}, ignoredFields: present };
}
