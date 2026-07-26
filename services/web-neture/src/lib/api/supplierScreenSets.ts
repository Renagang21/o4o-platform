/**
 * Supplier Tablet Screen Set API client — 공급자 매장 배포용 Screen Set 원본 제작·게시
 *
 * WO-O4O-SUPPLIER-SCREEN-SET-UI-STORE-HUB-INTEGRATION-V2C
 *
 * Base: /api/v1/kpa/supplier/screen-sets  (V2b 확정 계약 — supplier-screen-set.controller.ts)
 *   서버가 소유권을 neture_suppliers(user_id, ACTIVE) 로 격리하고, origin='supplier' AND
 *   service_key='kpa'(KPA 매장 타블렛 서브시스템) 원본만 반환한다. QR·코너 적용·공개 URL 없음.
 *
 * 경로가 web-neture 컨벤션(/neture/supplier/*)이 아니라 /kpa/supplier/* 인 이유:
 *   공급자 Screen Set 은 KPA 매장 타블렛 대상이므로 service_key='kpa' 여야 매장 HUB
 *   (/store/screen-set-hub/supplier-templates, SUPPLIER_HUB_SERVICE_KEY='kpa')에 노출된다.
 *   백엔드 라우트 변경은 V2c 중지 조건 → 확정 계약을 그대로 호출한다.
 *
 * web-neture 의 authClient axios(api) 는 모든 경로에 토큰 자동 부착 + 401 자동 refresh 하므로
 * KPA 프론트의 /store/* 수동 Bearer 헬퍼가 필요 없다.
 *
 * 타입/계약(ScreenSet, ScreenBlock, ScreenSetBuilderApi 등)은 공유 편집기 패키지에서 소비 —
 * 프론트가 추정 타입으로 계약을 재정의하지 않는다.
 */
import { api } from '../apiClient';
import type {
  ScreenSet,
  ScreenSetDetail,
  ScreenBlock,
  ScreenSetBuilderApi,
  O4oDescriptionSearchResult,
  TabletScreenResponse,
} from '@o4o/tablet-screen-set-editor';

const BASE = '/kpa/supplier/screen-sets';

/** 게시 대상 매장 유형(V2b hub_target_store_type). */
export type SupplierHubTargetStoreType = 'pharmacy' | 'non_pharmacy' | 'all';

/** axios 응답을 { code, status, message } 정규화 에러로 변환(페이지에서 err.code 로 분기). */
function normalizeError(e: any): never {
  const data = e?.response?.data;
  const err: any = new Error(data?.error || data?.message || e?.message || '네트워크 오류가 발생했습니다.');
  err.status = e?.response?.status;
  err.code = data?.code;
  throw err;
}

async function call<T>(fn: () => Promise<{ data: any }>): Promise<T> {
  try {
    const res = await fn();
    return res.data?.data as T;
  } catch (e: any) {
    normalizeError(e);
  }
}

/** 게시 대상/블록 요약을 포함한 목록 행(setCols + blockCount). */
export type SupplierScreenSet = ScreenSet & {
  hubTargetStoreType: SupplierHubTargetStoreType | null;
  blockCount?: number;
};

/**
 * WO-O4O-NETURE-SUPPLIER-TABLET-LIST-PERSISTENT-ERROR-STATE-V1
 *
 * 조회 실패는 고정 코드로 전파한다. 서버 원문은 console 로만 남긴다.
 * `call()` 은 4xx/5xx/네트워크 오류를 이미 throw 하지만, 200 이면서 `data` 가
 * 배열이 아닌 경우 `undefined` 를 그대로 반환해 목록이 "정상 0건" 처럼 흐른다.
 * 목록 함수에서만 배열 검증을 추가한다 (공통 `call()` 은 변경하지 않는다).
 */
export const SUPPLIER_SCREEN_SETS_LOAD_FAILED = 'SUPPLIER_SCREEN_SETS_LOAD_FAILED';

export async function fetchSupplierScreenSets(): Promise<SupplierScreenSet[]> {
  let rows: SupplierScreenSet[];
  try {
    rows = await call<SupplierScreenSet[]>(() => api.get(BASE));
  } catch (error) {
    console.warn('[Supplier ScreenSets API] Failed to fetch screen sets:', (error as Error)?.message);
    throw new Error(SUPPLIER_SCREEN_SETS_LOAD_FAILED);
  }
  if (!Array.isArray(rows)) {
    console.warn('[Supplier ScreenSets API] Unexpected screen sets payload shape');
    throw new Error(SUPPLIER_SCREEN_SETS_LOAD_FAILED);
  }
  return rows;
}

export function fetchSupplierScreenSet(id: string): Promise<ScreenSetDetail> {
  return call<ScreenSetDetail>(() => api.get(`${BASE}/${id}`));
}

export function createSupplierScreenSet(input: { name: string; templateKey?: string | null }): Promise<ScreenSet> {
  return call<ScreenSet>(() =>
    api.post(BASE, { name: input.name, templateKey: input.templateKey ?? undefined }),
  );
}

export function updateSupplierScreenSet(
  id: string,
  input: { name?: string; templateKey?: string | null },
): Promise<ScreenSet> {
  return call<ScreenSet>(() => api.patch(`${BASE}/${id}`, input));
}

export function saveSupplierScreenSetBlocks(id: string, blocks: ScreenBlock[]): Promise<ScreenBlock[]> {
  return call<ScreenBlock[]>(() =>
    api.put(`${BASE}/${id}/blocks`, {
      blocks: blocks.map((b, i) => ({ blockType: b.blockType, sortOrder: i, isEnabled: b.isEnabled, config: b.config })),
    }),
  );
}

export function duplicateSupplierScreenSet(id: string): Promise<ScreenSet> {
  return call<ScreenSet>(() => api.post(`${BASE}/${id}/duplicate`, {}));
}

/** draft → active(HUB 게시). 게시 대상 필수. 의약품 포함 시 pharmacy 만 허용(409 MEDICATION_PHARMACY_ONLY). */
export function publishSupplierScreenSet(id: string, hubTargetStoreType: SupplierHubTargetStoreType): Promise<ScreenSet> {
  return call<ScreenSet>(() => api.post(`${BASE}/${id}/publish`, { hubTargetStoreType }));
}

export function unpublishSupplierScreenSet(id: string): Promise<ScreenSet> {
  return call<ScreenSet>(() => api.post(`${BASE}/${id}/unpublish`, {}));
}

export function archiveSupplierScreenSet(id: string): Promise<ScreenSet> {
  return call<ScreenSet>(() => api.post(`${BASE}/${id}/archive`, {}));
}

export function unarchiveSupplierScreenSet(id: string): Promise<ScreenSet> {
  return call<ScreenSet>(() => api.post(`${BASE}/${id}/unarchive`, {}));
}

export function removeSupplierScreenSet(id: string): Promise<void> {
  return call<void>(() => api.delete(`${BASE}/${id}`));
}

export function previewSupplierScreenSet(input: { templateKey?: string | null; blocks: ScreenBlock[] }): Promise<TabletScreenResponse> {
  return call<TabletScreenResponse>(() =>
    api.post(`${BASE}/preview`, {
      templateKey: input.templateKey ?? undefined,
      blocks: input.blocks.map((b, i) => ({ blockType: b.blockType, sortOrder: i, isEnabled: b.isEnabled, config: b.config })),
    }),
  );
}

export function searchSupplierO4oDescriptions(q: string): Promise<O4oDescriptionSearchResult[]> {
  return call<O4oDescriptionSearchResult[]>(() =>
    api.get(`${BASE}/content-sources/o4o-descriptions`, { params: { q } }),
  );
}

/**
 * 제작 셸(TabletContentStepBuilder)에 주입할 공급자 API.
 *   - create/update: 공급자 엔드포인트(status/tabletId 무시 — 서버가 draft·origin='supplier' 강제).
 *   - searchStoreContents: 공급자는 매장 제작 콘텐츠 조회 불가 → 항상 빈 배열.
 *     (공급자 컨트롤러는 O4O 표준 설명서 검색만 노출 → contentSources=['spd'] 로 picker 단일화.)
 */
export const supplierScreenSetBuilderApi: ScreenSetBuilderApi = {
  create: (input) => createSupplierScreenSet({ name: input.name, templateKey: input.templateKey }),
  update: (id, input) => updateSupplierScreenSet(id, { name: input.name, templateKey: input.templateKey }),
  saveBlocks: saveSupplierScreenSetBlocks,
  preview: previewSupplierScreenSet,
  searchO4oDescriptions: searchSupplierO4oDescriptions,
  searchStoreContents: async () => [],
};
