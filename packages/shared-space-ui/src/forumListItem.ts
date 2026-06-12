/**
 * ForumListItem — 포럼 목록 공통 표시 타입 (정규화 기준)
 *
 * WO-O4O-FORUM-LIST-DATA-SHAPE-NORMALIZATION-V1
 *
 * 4서비스 forum list page 가 각자 다른 표시 shape(KPA `ForumPost` flatten / GP local
 * `ForumPost`(author/views/likes/comments 축약) / KCos·Neture `DisplayPost`)를 사용한다.
 * 향후 `ForumListTemplate` 공통화를 위한 단일 표시 기준 타입을 정의한다.
 *
 * - 필수: 전 서비스 공통 렌더 필드 + `routeTo`(상세 경로 — id/slug/basePath 차이를 page 가 흡수).
 * - 선택: 서비스 subset 필드(viewCount/postType/tags/appreciationCount …) → template 이 조건부 렌더.
 * - 이 타입은 presentation 기준이며 raw API 응답을 강하게 알 필요는 없다. raw → ForumListItem
 *   매핑은 각 service page 의 local adapter 가 담당한다(서비스별 raw 차이 흡수).
 */

/** 포럼 게시글 분류(자유 토론/질문/공지/투표/가이드) — @o4o/types/forum ForumPostType 과 동일 union */
export type ForumListItemPostType =
  | 'discussion'
  | 'question'
  | 'announcement'
  | 'poll'
  | 'guide';

export interface ForumListItem {
  /** 게시글 id */
  id: string;
  /** 제목 */
  title: string;
  /** 표시 작성자명(닉네임 우선) */
  authorName: string;
  /** 작성 시각(ISO) — formatForumDate 로 표시 */
  createdAt: string;
  /** 댓글 수 */
  commentCount: number;
  /** 좋아요 수 */
  likeCount: number;
  /** 고정(공지) 여부 */
  isPinned: boolean;
  /** 상세 경로(서비스가 id/slug/basePath 로 계산) */
  routeTo: string;

  // ── optional (서비스 subset) ──
  /** 조회수 (KPA·GlycoPharm) */
  viewCount?: number;
  /** 게시글 유형 배지 (K-Cosmetics·Neture) */
  postType?: ForumListItemPostType;
  /** 인라인 태그 (KPA) */
  tags?: string[];
  /** 감사 포인트 (KPA) */
  appreciationCount?: number;
  /** 요약 */
  excerpt?: string;
  /** 수정 시각(ISO) */
  updatedAt?: string;
}
