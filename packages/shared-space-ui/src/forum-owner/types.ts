/**
 * Forum Owner Area — shared contracts
 *
 * WO-O4O-COMMUNITY-FORUM-OWNER-AREA-COMMONIZATION-V1
 * 선행 census: IR-O4O-COMMUNITY-CROSSSERVICE-FULL-CENSUS-V1 (F31 · F34 = VIEW_DUPLICATED)
 *
 * 포럼 개설자(owner)가 자기 포럼을 운영하는 화면의 공통 계약이다.
 * 서비스는 API adapter + config 만 주입하고 화면은 공유한다.
 *
 * 설계 원칙
 *   - 서비스 분기(`serviceType` switch)를 두지 않는다. 차이는 전부
 *     config(links/sections/labels) · theme(accent) · slot(ReactNode) · adapter(api) 로 흡수한다.
 *   - 업무 자체가 다른 것(예: Neture 는 폐쇄형 회원 관리 동선이 없다)은 기능을 만들지 않고
 *     해당 config 를 비워 노출을 끈다.
 *   - 실패 전달은 adapter 가 정규화한다. 서비스마다 다른 응답 형태
 *     (KPA: throw / GP·KCos·Neture: `{ success, error }` axios)를 template 이 알 필요가 없다.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Domain shapes (백엔드 공통 forum 계약 기준)
// ─────────────────────────────────────────────────────────────────────────────

/** 포럼 개설 신청 상태 — 공통 forum_category_requests.status */
export type ForumOwnerRequestStatus =
  | 'pending'
  | 'revision_requested'
  | 'approved'
  | 'rejected';

/** 내가 낸 포럼 개설 신청 1건 */
export interface ForumOwnerRequest {
  id: string;
  name: string;
  description: string;
  reason?: string;
  status: ForumOwnerRequestStatus;
  reviewComment?: string;
  reviewedAt?: string;
  createdCategorySlug?: string;
  createdAt: string;
}

/** 내가 운영 중인 포럼 1건 */
export interface OwnedForum {
  id: string;
  name: string;
  description?: string | null;
  slug: string;
  /** 'closed' 면 폐쇄형 — 회원 관리 동선 대상 */
  forumType?: string;
  isActive: boolean;
  postCount: number;
  iconEmoji?: string | null;
  iconUrl?: string | null;
  /** 삭제 요청 상태 (운영자 검토 흐름) */
  deleteRequestStatus?: 'pending' | 'approved' | 'rejected' | null;
  deleteReviewComment?: string | null;
}

/** 포럼 정보 수정 payload */
export interface OwnedForumUpdate {
  name: string;
  description?: string;
  iconEmoji?: string | null;
  iconUrl?: string | null;
}

/** 폐쇄형 포럼 가입 신청 1건 */
export interface ForumOwnerJoinRequest {
  id: string;
  displayName: string | null;
  email: string | null;
  createdAt: string;
}

/** 폐쇄형 포럼 회원 1건 */
export interface ForumOwnerMember {
  id: string;
  userId: string;
  name: string | null;
  email: string | null;
  role: 'owner' | 'member' | string;
  joinedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Adapters — 서비스가 주입한다
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 소유 포럼 운영 API.
 *
 * 모든 메서드는 **실패 시 throw** 한다 (`Error.message` 가 사용자에게 보인다).
 * 서비스별 응답 envelope 정규화는 adapter 책임이다.
 */
export interface ForumOwnerApi {
  /** 내가 운영 중인 포럼 목록 */
  listOwnedForums(): Promise<OwnedForum[]>;
  /**
   * 내 포럼 개설 신청 내역.
   * 미제공이면 대시보드의 "신청 내역" 섹션이 자동으로 꺼진다
   * (KPA 는 통합 신청함으로 이전 — `noticeSlot` 으로 안내한다).
   */
  listMyRequests?(): Promise<ForumOwnerRequest[]>;
  /** 포럼 정보 수정 (owner) */
  updateForum(forumId: string, data: OwnedForumUpdate): Promise<void>;
  /** 포럼 삭제 요청 (운영자 검토) */
  requestForumDelete(forumId: string, data: { reason?: string }): Promise<void>;
}

/** 폐쇄형 포럼 회원 관리 API. 실패 시 throw. */
export interface ForumOwnerMembershipApi {
  /** 헤더에 표시할 포럼 이름·유형 해석용 */
  listOwnedForums(): Promise<OwnedForum[]>;
  listJoinRequests(forumId: string): Promise<ForumOwnerJoinRequest[]>;
  listMembers(forumId: string): Promise<ForumOwnerMember[]>;
  approveJoin(forumId: string, requestId: string): Promise<void>;
  rejectJoin(forumId: string, requestId: string, comment?: string): Promise<void>;
  removeMember(forumId: string, userId: string): Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

/**
 * accent 토큰.
 *
 * Tailwind 클래스 **문자열 전체**를 서비스가 넘긴다. 조각을 이어붙여 만들면
 * (`text-${c}-600`) JIT 스캔에서 누락돼 색이 사라진다. 기본값은 중립(slate)이라
 * 주입을 잊어도 화면이 깨지지 않고 브랜드색만 빠진다.
 */
export interface ForumOwnerTheme {
  /** 아이콘·스피너 색 — 예: 'text-emerald-600' */
  accentText: string;
  /** 실선 버튼 — 예: 'bg-emerald-600 hover:bg-emerald-700' */
  accentSolid: string;
  /** 옅은 카드 — 예: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100' */
  accentSoft: string;
  /** 옅은 배경 위 본문 — 예: 'text-emerald-600' */
  accentSoftText: string;
  /** 옅은 배경 위 제목 — 예: 'text-emerald-800' */
  accentStrongText: string;
  /** 카운트 배지 — 예: 'bg-emerald-100 text-emerald-700' */
  accentBadge: string;
  /** 아이콘 타일 배경 — 예: 'bg-emerald-50' */
  accentIconBg: string;
  /** 입력 포커스 링 — 예: 'focus:ring-emerald-500' */
  accentRing: string;
  /** 아이콘 버튼 hover — 예: 'hover:text-emerald-600 hover:bg-emerald-50' */
  accentHover: string;
}

/** 대시보드/회원관리가 쓰는 route. 서비스마다 basePath 가 다르다. */
export interface ForumOwnerLinks {
  /** 커뮤니티 포럼 홈 */
  forumHomeHref: string;
  /** 포럼 상세(카테고리) 이동 */
  forumHref: (slug: string) => string;
  /**
   * 포럼 개설 신청 폼.
   * 미지정이면 신청 Quick Action / 빈 상태 CTA 를 노출하지 않는다.
   */
  requestFormHref?: string;
  /**
   * 폐쇄형 포럼 회원 관리.
   * 미지정이면 회원 관리 진입을 노출하지 않는다 (Neture — 해당 동선 없음).
   */
  memberManageHref?: (forumId: string) => string;
}
