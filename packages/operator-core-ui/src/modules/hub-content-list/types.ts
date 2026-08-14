/**
 * Operator HUB Content List Module — Types
 *
 * WO-O4O-OPERATOR-CROSSSERVICE-CORE-ONLY-AND-VIEW-DUPLICATION-CLEANUP-V1
 *
 * 매장 HUB 게시 콘텐츠(블로그 / POP) 운영자 목록 화면이
 * KPA · K-Cosmetics × 블로그 · POP = 4개 파일에 복제돼 있었다.
 * 상태 필터 · 행 액션(수정/발행/보관/삭제) · 일괄 작업 · 페이지네이션이 모두 동일하다.
 *
 * 정본: docs/baseline/O4O-OPERATOR-HUB-CONTENT-PUBLISHING-STANDARD-V1.md
 * 표준: OPERATOR-DATATABLE-POLICY-V1 (DataTable + ActionBar + useBatchAction + BulkResultModal)
 */

import type { ListColumnDef } from '@o4o/operator-ux-core';
import type { HubContentPost } from '../hub-content-write/types';

export type { HubContentPost };

export type HubContentStatusFilter = '' | 'draft' | 'published' | 'archived';

/**
 * 목록 셸이 요구하는 최소 형태.
 *
 * 블로그/POP(`HubContentPost`) 외에 QR 템플릿(`OperatorQrTemplate`)도 같은 셸을 쓴다.
 * QR 은 slug 가 없고(운영자 단계 미발급) 대상(targetType/target) 컬럼을 갖는 대신
 * 상태 필터 · 행 액션 · 일괄 작업 · 페이지네이션은 완전히 동일하다
 * → 신원 컬럼(`leadColumns`)만 주입 지점으로 열어 두고 나머지는 공통으로 둔다.
 */
export interface HubContentItemBase {
  id: string;
  title: string;
  status: 'draft' | 'published' | 'archived';
  updatedAt: string;
  publishedAt?: string;
}

export interface HubContentListParams {
  page: number;
  limit: number;
  /**
   * 상태 필터. 서비스 API 시그니처가 이 union 으로 좁혀져 있으므로 `string` 으로 넓히지 않는다
   * ('전체' 는 값을 생략해 표현한다).
   */
  status?: HubContentPost['status'];
}

export interface HubContentListResponse<T extends HubContentItemBase = HubContentPost> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

/**
 * 서비스 × 콘텐츠 종류별 API adapter
 * (기존 `operatorBlog` / `operatorPop` / `operatorQr` 모듈이 그대로 충족).
 */
export interface HubContentListClient<T extends HubContentItemBase = HubContentPost> {
  list(params: HubContentListParams): Promise<HubContentListResponse<T>>;
  publish(id: string): Promise<unknown>;
  archive(id: string): Promise<unknown>;
  remove(id: string): Promise<unknown>;
}

export interface HubContentListCopy {
  /** 예: '블로그' / 'POP' */
  kindLabel: string;
  /** 페이지 제목 — 예: '매장 HUB 블로그' */
  pageTitle: string;
  /** 페이지 설명 (서비스명 포함) */
  pageDescription: string;
  /** 새로 만들기 버튼 라벨 — 예: '블로그 글쓰기' */
  createButtonLabel: string;
  /** 목록이 비었을 때 문구 — 예: '아직 작성한 블로그가 없습니다' */
  emptyMessage: string;
  /** 상태 필터가 걸린 채 비었을 때 — 예: '해당 상태의 블로그가 없습니다' */
  emptyFilteredMessage: string;
}

export interface OperatorHubContentListPageProps<T extends HubContentItemBase = HubContentPost> {
  client: HubContentListClient<T>;
  copy: HubContentListCopy;
  /**
   * 신원 컬럼(상태 컬럼 앞). 미주입 시 블로그/POP 기본값(제목 + 슬러그).
   * QR 템플릿은 제목 + 대상 종류 + 대상 요약을 주입한다.
   */
  leadColumns?: ListColumnDef<T>[];
  /** ActionPolicy 등록 키 — 예: 'kpa:operator-blog' */
  actionPolicyKey: string;
  /** DataTable 컬럼 설정 저장 키 — 예: 'operator-blog-list' */
  tableId: string;
  /** 새 글 작성 화면으로 이동 */
  onCreate: () => void;
  /** 수정 화면으로 이동 */
  onEdit: (id: string) => void;
  /**
   * accent — 서비스 소스에 리터럴로 존재해야 Tailwind content 스캔에 포함된다.
   */
  accent: {
    /** 작성 버튼 배경 — 예: 'bg-blue-600 hover:bg-blue-700' */
    createButton: string;
    /** 선택된 상태 필터 pill — 예: 'bg-blue-600 text-white' */
    activePill: string;
    /** 오류 '다시 시도' 버튼 — 예: 'text-blue-600 border-blue-400 hover:bg-blue-50' */
    retryButton: string;
    /** '발행' 상태 배지 — 예: 'bg-emerald-50 text-emerald-700' */
    publishedBadge: string;
  };
}
