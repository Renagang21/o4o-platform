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

/** 콘텐츠(HUB snapshot) — GET /{svc}/assets?type=content 항목 중 화면이 쓰는 필드 */
export interface StoreLibraryContentItem {
  id: string;
  title: string;
  sourceService?: string | null;
  contentJson?: Record<string, unknown> | null;
  createdAt?: string | null;
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
