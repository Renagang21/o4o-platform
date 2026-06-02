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

// ─── Entity ──────────────────────────────────────────────────

export type ForumRequestStatus = 'pending' | 'revision_requested' | 'approved' | 'rejected';

export type ForumRequestReviewAction = 'approve' | 'reject' | 'revision';

export interface ForumRequest {
  id: string;
  name: string;
  description: string;
  reason?: string;
  status: ForumRequestStatus;
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
  list(params: { status?: ForumRequestStatus }): Promise<ForumRequest[]>;
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
}
