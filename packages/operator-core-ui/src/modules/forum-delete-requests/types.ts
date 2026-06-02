/**
 * Operator Forum Delete Requests Console — Types
 *
 * WO-O4O-OPERATOR-FORUM-DELETE-REQUESTS-CONSOLE-COMMONIZATION-V1
 *
 * GlycoPharm / K-Cosmetics 2 service 의 operator 포럼 삭제 요청 리스트 공통 wrapper 타입.
 * IR: docs/investigations/IR-O4O-OPERATOR-FORUM-REQUEST-CONSOLE-WRAPPER-FEASIBILITY-V1.md
 *
 * KPA / Neture 는 본 wrapper 범위 외 (도메인 차이 — 별도 IR).
 * backend / API contract 변경 없음 — 서비스별 응답 shape 차이는 client adapter 에서 흡수.
 */

import type { ReactNode } from 'react';

// ─── Entity ──────────────────────────────────────────────────

export type ForumDeleteRequestStatus = 'pending' | 'approved' | 'rejected';

export interface ForumDeleteRequest {
  id: string;
  name: string;
  description?: string | null;
  slug: string;
  isActive: boolean;
  postCount: number;
  createdBy: string;
  creatorName?: string | null;
  deleteRequestStatus: ForumDeleteRequestStatus;
  deleteRequestedAt: string;
  deleteRequestReason?: string | null;
  deleteReviewedAt?: string | null;
  deleteReviewComment?: string | null;
}

// ─── Client (Service-side API adapter) ───────────────────────

/**
 * Normalized review result. 각 service 의 응답 shape 차이를 adapter 에서 정규화:
 *   - GP   apiClient: `{ error?: { message } }`  → { ok: !error, error: error?.message }
 *   - K-Cos axios   : `{ success, error? }`      → { ok: success, error }
 */
export interface ForumDeleteReviewResult {
  ok: boolean;
  error?: string;
}

/**
 * Service-side API client adapter. GP / K-Cos 가 각자 구현해 주입한다.
 * 콘솔은 list / approve / reject 만 호출하고, endpoint·응답 shape 는 adapter 책임.
 */
export interface ForumDeleteRequestsConsoleClient {
  list(params: { status?: ForumDeleteRequestStatus }): Promise<ForumDeleteRequest[]>;
  approve(id: string, data?: { reviewComment?: string }): Promise<ForumDeleteReviewResult>;
  reject(id: string, data?: { reviewComment?: string }): Promise<ForumDeleteReviewResult>;

  /**
   * WO-O4O-OPERATOR-FORUM-CONSOLE-BATCH-CLIENT-OPTION-V1 (optional):
   * 서비스가 실제 batch endpoint 를 보유하면 제공한다(예: Neture).
   * 제공 시 bulk 승인은 per-id fan-out 대신 이 메서드를 1회 호출한다.
   * 미제공 시(GP/K-Cos) 기존 fan-out(approve × Promise.allSettled) 유지.
   * 반환은 raw batch 응답 — useBatchAction 이 res.data.results / res.data.data.results 를 파싱한다.
   */
  batchApprove?(ids: string[], data?: { reviewComment?: string }): Promise<unknown>;
  /** Optional batch reject endpoint. 미제공 시 fan-out 유지. 위 batchApprove 와 동일 규약. */
  batchReject?(ids: string[], data?: { reviewComment?: string }): Promise<unknown>;
}

// ─── Guide (optional dynamic content) ────────────────────────

export interface ForumDeleteRequestsGuide {
  title?: string;
  description?: string;
  steps?: string[];
}

// ─── Wrapper Props ───────────────────────────────────────────

export interface OperatorForumDeleteRequestsConsolePageProps {
  /** Canonical service key (glycopharm / k-cosmetics). */
  serviceKey: string;
  /** Service-side API client adapter. */
  client: ForumDeleteRequestsConsoleClient;

  /** Header title. Default: '포럼 삭제 요청 관리'. */
  title?: string;
  /** Header description. Default: 공통 문구. */
  description?: string;
  /** Header icon. 서비스 brand 색 유지를 위해 wrapper 가 전달. Default: Trash2 (slate). */
  headerIcon?: ReactNode;

  /** DataTable tableId (column persistence). Default: `{serviceKey}-forum-delete-requests`. */
  tableId?: string;

  /**
   * Optional dynamic guide loader. wrapper 가 자신의 fetchGuidePageContent 를 전달한다.
   * 반환된 sections['guideblock-page-help'] (JSON) 를 콘솔이 파싱한다. 실패 시 fallback 사용.
   */
  loadGuideSections?: (serviceKey: string, pageKey: string) => Promise<Record<string, string>>;
  /** Guide page key passed to loadGuideSections. Default: 'forum.request.management'. */
  guidePageKey?: string;
}
