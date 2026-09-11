/**
 * 내 자료함(Resources / Contents) 공통 타입
 * WO-O4O-MY-STORE-LIBRARY-RESOURCES-CONTENTS-KCOS-GP-COMMONIZATION-V1
 *
 * 두 서비스에 각각 복사돼 있던 화면 소비 타입을 단일 정의로 모은다.
 * 서비스 API client(`storeLibrary.ts` / `assetSnapshot.ts`)는 소비처가 더 있어 통합하지 않는다 —
 * 화면은 adapter 를 통해서만 데이터를 받는다(endpoint·request·response 의미 무변경).
 */

/** 자료(원소스) — GET /{svc}/pharmacy/library 항목 중 화면이 쓰는 필드 */
export interface StoreLibraryResourceItem {
  id: string;
  title: string;
  description?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  category?: string | null;
  isActive?: boolean;
  updatedAt?: string | null;
}

/**
 * 콘텐츠 행 — 화면이 쓰는 필드만. endpoint 는 서비스 adapter 소유.
 *
 * WO-O4O-KCOS-LIBRARY-CONTENT-BD-CANONICAL-REALIGNMENT-V1:
 *   행의 **출처 원장(origin)** 을 adapter 가 명시할 수 있게 한다(additive · optional).
 *   POP V2 handoff 는 이 origin 을 그대로 실어 보내므로 V2 source resolver 가 읽는
 *   원장과 1:1 이어야 한다 — 'snapshot' = o4o_asset_snapshots(KPA 확장 계층) /
 *   'direct' = 매장 소유 콘텐츠(kpa_store_contents · Store Production Material) /
 *   'library' = store_execution_assets. 생략 시 기존 동작('snapshot') 유지.
 */
export type StoreLibraryContentOrigin = 'snapshot' | 'direct' | 'library';

export interface StoreLibraryContentItem {
  id: string;
  title: string;
  /** 출처 배지 문구(서비스명·원장명 등) */
  sourceService?: string | null;
  /** snapshot 계열 adapter 의 원본 JSON — description 은 contentJson.description 에서 읽는다 */
  contentJson?: Record<string, unknown> | null;
  /** 설명 — 값이 있으면 contentJson.description 보다 우선 */
  description?: string | null;
  createdAt?: string | null;
  /** 있으면 목록 날짜에 createdAt 대신 표시 */
  updatedAt?: string | null;
  /** POP V2 handoff origin — 생략 시 'snapshot' */
  origin?: StoreLibraryContentOrigin;
}

/** 화면 문구 — 서비스별 자료함 명칭(내 자료함 / 약국 자료함 등)을 하나로 강제하지 않는다 */
export interface StoreLibraryLabels {
  /** breadcrumb 최상위 */
  breadcrumbRoot: string;
  /** breadcrumb 현재 위치 + 제목 */
  pageTitle: string;
  subtitle: string;
  emptyTitle: string;
  emptyHint: string;
}
