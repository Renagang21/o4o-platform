/**
 * Operator Forum Requests Console — Types
 *
 * WO-O4O-OPERATOR-FORUM-REQUESTS-CONSOLE-COMMONIZATION-V1
 *
 * GlycoPharm / K-Cosmetics 2 service 의 operator 포럼 신청(카테고리 생성 요청) 리스트 공통 wrapper 타입.
 * IR: docs/investigations/IR-O4O-OPERATOR-FORUM-REQUEST-CONSOLE-WRAPPER-FEASIBILITY-V1.md
 * 선행: WO-O4O-OPERATOR-FORUM-DELETE-REQUESTS-CONSOLE-COMMONIZATION-V1 (동일 패턴).
 *
 * KPA / Neture 는 본 wrapper 범위 외 (도메인 차이 — 별도 IR).
 * backend / API contract 변경 없음 — 서비스별 응답 shape 차이는 client adapter 에서 흡수.
 *
 * 보완(revision) 정책: 의견 입력이 필요한 action 이므로 bulk 에서 제외하고 단건 drawer 에서만 처리한다.
 */

import type { ReactNode } from 'react';
import type { ListColumnDef } from '@o4o/operator-ux-core';

// ─── Entity ──────────────────────────────────────────────────

export type ForumRequestStatus = 'pending' | 'revision_requested' | 'approved' | 'rejected';

/**
 * WO-O4O-KPA-FORUM-REQUESTS-CONSOLE-CONVERGENCE-WITH-STATE-EXTENSION-V1:
 *   KPA 포럼 생성 상태머신(creating/completed/failed)을 optional 로 흡수.
 *   base 4-state 는 불변 — 확장 상태는 KPA wrapper 에서만 statusConfig/statusFilterOptions 로 주입.
 *   GP/K-Cosmetics/Neture 는 base 4-state 만 사용 → 동작 불변.
 */
export type ForumRequestExtendedStatus =
  | ForumRequestStatus
  | 'creating'
  | 'completed'
  | 'failed';

export type ForumRequestReviewAction = 'approve' | 'reject' | 'revision';

export interface ForumRequest {
  id: string;
  name: string;
  description: string;
  reason?: string;
  /** base 4-state + optional 확장 상태(creating/completed/failed). */
  status: ForumRequestExtendedStatus;
  serviceCode?: string;
  requesterId: string;
  requesterName: string;
  requesterEmail?: string;
  reviewerId?: string;
  reviewerName?: string;
  reviewComment?: string;
  reviewedAt?: string;
  createdCategoryId?: string;
  createdCategorySlug?: string;
  createdAt: string;
  updatedAt: string;
  // ── optional generic 필드 (확장 컬럼/검색/상세에서 사용, 미설정 서비스는 무시) ──
  /** 공개/비공개 등 포럼 유형. extraColumns/renderDetailExtra 에서 활용. */
  forumType?: string;
  /** 태그 목록. 공통 search 가 tags 도 매칭(있을 때만), extraColumns/renderDetailExtra 에서 활용. */
  tags?: string[];
  /** 생성 실패 메시지(확장 상태 failed 상세 표시용). */
  errorMessage?: string;
}

// ─── Client (Service-side API adapter) ───────────────────────

/**
 * Normalized review result. 각 service 의 응답 shape 차이를 adapter 에서 정규화:
 *   - GP   apiClient: `{ error?: { message } }`  → { ok: !error, error: error?.message }
 *   - K-Cos axios   : `{ success, error? }`      → { ok: success, error }
 */
export interface ForumRequestReviewResult {
  ok: boolean;
  error?: string;
}

/**
 * Service-side API client adapter. GP / K-Cos 가 각자 구현해 주입한다.
 * 콘솔은 list / review 만 호출하고, endpoint·응답 shape 는 adapter 책임.
 * list 는 실패 시 throw 하여 콘솔의 error 상태로 전이시킨다.
 */
export interface ForumRequestsConsoleClient {
  list(params: { status?: ForumRequestExtendedStatus }): Promise<ForumRequest[]>;
  review(
    id: string,
    data: { action: ForumRequestReviewAction; reviewComment?: string },
  ): Promise<ForumRequestReviewResult>;

  /**
   * WO-O4O-OPERATOR-FORUM-CONSOLE-BATCH-CLIENT-OPTION-V1 (optional):
   * 서비스가 실제 batch endpoint 를 보유하면 제공한다(예: Neture).
   * 제공 시 bulk 승인/거절은 per-id fan-out 대신 이 메서드를 1회 호출한다.
   * 미제공 시(GP/K-Cos) 기존 fan-out(review × Promise.allSettled) 유지.
   * action 은 bulk 대상인 'approve' | 'reject' 만 (보완(revision)은 bulk 제외 — 단건 전용).
   * 반환은 raw batch 응답 — useBatchAction 이 res.data.results / res.data.data.results 를 파싱한다.
   */
  batchReview?(ids: string[], action: 'approve' | 'reject', reviewComment?: string): Promise<unknown>;

  /**
   * WO-O4O-KPA-FORUM-REQUESTS-CONSOLE-CONVERGENCE-WITH-STATE-EXTENSION-V1 (optional):
   * 포럼 생성 실패(failed) 등에서 재생성 복구가 필요한 서비스(예: KPA)가 제공한다.
   * 제공 + canRecreate(item)=true 일 때 단건 drawer 에 재생성 액션이 노출된다.
   * 미제공 시(GP/K-Cos/Neture) 재생성 UI 는 나타나지 않는다. bulk 대상 아님(단건 전용).
   */
  recreate?(id: string): Promise<ForumRequestReviewResult>;
}

// ─── Wrapper Props ───────────────────────────────────────────

export interface OperatorForumRequestsConsolePageProps {
  /** Canonical service key (glycopharm / k-cosmetics). */
  serviceKey: string;
  /** Service-side API client adapter. */
  client: ForumRequestsConsoleClient;

  /** Header title. Default: '포럼 신청 관리'. */
  title?: string;
  /** Header description. Default: 공통 문구. */
  description?: string;
  /** Header icon. 서비스 brand 색 유지를 위해 wrapper 가 전달. Default: FileCheck (slate). */
  headerIcon?: ReactNode;

  /** Search placeholder. Default: '포럼명 또는 신청자 검색...'. */
  searchPlaceholder?: string;

  /** DataTable tableId (column persistence). Default: `{serviceKey}-forum-requests`. */
  tableId?: string;

  // ── WO-O4O-KPA-FORUM-REQUESTS-CONSOLE-CONVERGENCE-WITH-STATE-EXTENSION-V1: optional 확장 ──

  /**
   * 상태 badge config 병합 override (확장 상태 포함 가능).
   * 미제공 시 내장 default(base 4-state + creating/completed/failed)를 사용.
   * 제공 시 default 위에 병합 — 일부 상태 색/라벨만 덮어쓸 수 있다.
   */
  statusConfig?: Partial<Record<ForumRequestExtendedStatus, { label: string; color: string; bgColor: string }>>;

  /**
   * 상태 필터 드롭다운 옵션. 미제공 시 기본 4-state 옵션(전체/대기/보완/승인/거절).
   * KPA 등은 확장 상태(완료/생성실패 등)를 포함한 옵션을 주입할 수 있다.
   */
  statusFilterOptions?: { value: ForumRequestExtendedStatus | 'all'; label: string }[];

  /**
   * 추가 컬럼 (generic). 포럼명 컬럼 뒤에 삽입된다.
   * 공통 콘솔은 컬럼 의미를 모른다 — 서비스가 ListColumnDef 로 직접 렌더한다.
   */
  extraColumns?: ListColumnDef<ForumRequest>[];

  /**
   * 재생성 액션 노출 조건. client.recreate 제공 + 본 함수 true 일 때만 drawer 에 표시.
   * 미제공 시 항상 false(재생성 미노출).
   */
  canRecreate?: (item: ForumRequest) => boolean;

  /** 재생성 액션 라벨. Default: '재생성'. */
  recreateActionLabel?: string;

  /**
   * 단건 drawer 본문 하단에 추가 상세를 렌더하는 generic hook.
   * 예: KPA 의 포럼 유형/태그/생성 오류/생성된 슬러그 표시. 미제공 시 기본 상세만.
   */
  renderDetailExtra?: (item: ForumRequest) => ReactNode;
}
