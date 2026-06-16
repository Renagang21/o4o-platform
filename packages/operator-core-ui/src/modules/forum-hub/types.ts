/**
 * Operator Forum Hub Module — Types
 *
 * WO-O4O-CROSSSERVICE-OPERATOR-FORUM-HUB-READONLY-INTRODUCE-V1
 *
 * KPA-Society 의 Forum 운영 hub 를 공통 모듈로 추출.
 * - KPA: 게시글 edit/delete/bulk 액션 포함 (platform-admin override 경로로 동작).
 * - GlycoPharm / K-Cosmetics: read-only (삭제/일괄삭제 미노출) — 서비스 operator 는 community
 *   post 삭제 권한이 없으므로(IR-...-FORUM-HUB-API-FEASIBILITY-VERIFY-V1) enablePostActions=false.
 */

export interface ForumHubSummary {
  totalForums: number;
  activeForums: number;
  totalPosts: number;
  pendingRequests: number;
  deleteRequestsPending: number;
}

export interface ForumHubPost {
  id: string;
  title: string;
  authorName?: string;
  categoryName?: string;
  viewCount: number;
  likeCount: number;
  createdAt: string;
  status: string;
}

/**
 * 서비스별 hub API adapter.
 * - getSummary: 공통 forum analytics summary (`forumAnalyticsApi.getSummary`).
 * - getPosts: community 포럼 posts read (`/forum/posts`). 응답 `.data` 는 공통 콘솔이 런타임 narrowing.
 * - deletePost: optional — enablePostActions=true 일 때만 사용 (KPA).
 */
export interface ForumHubClient {
  getSummary(): Promise<{ data?: unknown } | null>;
  getPosts(params?: { limit?: number }): Promise<{ data?: unknown } | null>;
  deletePost?(id: string): Promise<unknown>;
}

/** 서비스 accent — inline style hex (Tailwind purge 무관) */
export interface ForumHubAccent {
  /** 헤더/숏컷 아이콘 색 (e.g. '#2563eb') */
  iconColor: string;
  /** 헤더 아이콘 박스 배경 (e.g. '#dbeafe') */
  iconBgColor: string;
}

/**
 * 서비스별 nav 타깃 (dead-nav 방지: KPA-only 경로를 서비스별로 주입).
 * 없는 shortcut(예: community)은 미주입 시 렌더하지 않음.
 */
export interface ForumHubNav {
  /** 포럼 관리 / 개설 요청 — KPA: /operator/forum-management, GP/KCos: /operator/forum-requests */
  requests: string;
  /** 삭제 요청 — /operator/forum-delete-requests */
  deleteRequests: string;
  /** 포럼 분석 — /operator/forum-analytics */
  analytics: string;
  /** 커뮤니티 관리 — 해당 route 가 있는 서비스에서만 주입 (KCos 부재) */
  community?: string;
  /** 게시글 상세 이동 (row 클릭) — 미주입 시 row 클릭 비활성 */
  postDetail?: (id: string) => string;
  /** 게시글 수정 이동 (edit 액션) — enablePostActions=true 에서만 사용 */
  postEdit?: (id: string) => string;
}

export interface OperatorForumHubPageProps {
  client: ForumHubClient;
  accent: ForumHubAccent;
  nav: ForumHubNav;
  /** 게시글 edit/delete/bulk 액션 + 선택 노출 (KPA true, GP/KCos false). 기본 false. */
  enablePostActions?: boolean;
  /** DataTable tableId (서비스별 고유) */
  tableId?: string;
  /** 헤더 제목 (기본 '포럼 운영') */
  title?: string;
  /** 헤더 설명 (기본 '커뮤니티 포럼 현황 및 운영 관리') */
  description?: string;
}
