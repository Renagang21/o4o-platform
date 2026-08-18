/**
 * Forum Owner Area — adapter factory
 *
 * WO-O4O-COMMUNITY-FORUM-OWNER-AREA-COMMONIZATION-V1
 *
 * 4서비스의 forum owner API 는 **응답 형태가 같다** (공통 forum controller 를 쓰므로).
 * 다른 것은 (1) 어떤 함수를 호출하는가 (2) 실패를 throw 로 주는가 envelope 으로 주는가 뿐이다.
 * 따라서 매핑·unwrap·실패 정규화를 여기서 한 번만 구현하고, 서비스는 자기 호출 함수만 넘긴다.
 *
 * 이 파일이 없으면 서비스마다 같은 mapper 를 4벌 복제하게 된다 — View 만 합치고 adapter 를
 * 복제하면 공통화가 절반만 되는 것이다.
 */

import type {
  ForumOwnerApi,
  ForumOwnerJoinRequest,
  ForumOwnerMember,
  ForumOwnerMembershipApi,
  ForumOwnerRequest,
  OwnedForum,
  OwnedForumUpdate,
} from './types.js';

/** 서비스가 이미 갖고 있는 원본 응답 형태. `{ success, error, data }` envelope 또는 throw 둘 다 수용한다. */
export interface ForumOwnerEnvelope<T> {
  success?: boolean;
  error?: string;
  data?: T;
}

/** 대시보드용 원본 호출 묶음 */
export interface ForumOwnerRawApi {
  fetchOwnedForums: () => Promise<ForumOwnerEnvelope<any[]> | any>;
  /** 미제공이면 대시보드 신청 내역 섹션이 꺼진다 */
  fetchMyRequests?: () => Promise<ForumOwnerEnvelope<any[]> | any>;
  updateForum: (forumId: string, data: OwnedForumUpdate) => Promise<ForumOwnerEnvelope<unknown> | any>;
  requestForumDelete: (forumId: string, data: { reason?: string }) => Promise<ForumOwnerEnvelope<unknown> | any>;
}

/** 회원 관리용 원본 호출 묶음 */
export interface ForumOwnerMembershipRawApi {
  fetchOwnedForums: () => Promise<ForumOwnerEnvelope<any[]> | any>;
  fetchJoinRequests: (forumId: string) => Promise<ForumOwnerEnvelope<any[]> | any>;
  fetchMembers: (forumId: string) => Promise<ForumOwnerEnvelope<any[]> | any>;
  approveJoin: (forumId: string, requestId: string) => Promise<unknown>;
  rejectJoin: (forumId: string, requestId: string, comment?: string) => Promise<unknown>;
  removeMember: (forumId: string, userId: string) => Promise<unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// 정규화 helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 응답 본문에서 배열을 꺼낸다.
 * 서비스별로 `T[]` · `{ data: T[] }` · `{ data: { data: T[] } }` 3가지가 모두 관측된다.
 */
function unwrapList(res: unknown): Record<string, any>[] {
  if (Array.isArray(res)) return res as Record<string, any>[];
  const body = (res as { data?: unknown })?.data;
  if (Array.isArray(body)) return body as Record<string, any>[];
  const inner = (body as { data?: unknown })?.data;
  if (Array.isArray(inner)) return inner as Record<string, any>[];
  return [];
}

/**
 * 실패를 공통 계약(`throw new Error(사용자 문구)`)으로 승격한다.
 *
 * - axios 기본 message("Request failed with status code 403")는 그대로 노출하지 않는다.
 * - `{ success:false, error }` envelope 도 오류로 승격한다 —
 *   조회 실패를 "정상 0건" 으로 위장하지 않기 위해서다.
 * - 회원 관리의 403 분기를 위해 `status` 를 보존한다.
 */
async function call<T>(fn: () => Promise<T>, fallback: string): Promise<T> {
  let res: T;
  try {
    res = await fn();
  } catch (err: any) {
    const status = err?.response?.status ?? err?.status;
    const message =
      err?.response?.data?.error || err?.response?.data?.message || err?.message || fallback;
    const normalized = new Error(message) as Error & { status?: number };
    if (status) normalized.status = status;
    throw normalized;
  }
  const envelope = res as ForumOwnerEnvelope<unknown>;
  if (envelope && envelope.success === false) {
    throw new Error(envelope.error || fallback);
  }
  return res;
}

// ─────────────────────────────────────────────────────────────────────────────
// mappers — 백엔드 공통 forum 응답 → 공통 도메인 형태
// ─────────────────────────────────────────────────────────────────────────────

export function mapOwnedForum(raw: Record<string, any>): OwnedForum {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description ?? null,
    slug: raw.slug,
    forumType: raw.forumType,
    isActive: raw.isActive !== false,
    postCount: raw.postCount ?? 0,
    iconEmoji: raw.iconEmoji ?? null,
    iconUrl: raw.iconUrl ?? null,
    deleteRequestStatus: raw.metadata?.deleteRequestStatus ?? null,
    deleteReviewComment: raw.metadata?.deleteReviewComment ?? null,
  };
}

export function mapForumRequest(raw: Record<string, any>): ForumOwnerRequest {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    reason: raw.reason,
    status: raw.status,
    reviewComment: raw.reviewComment,
    reviewedAt: raw.reviewedAt,
    createdCategorySlug: raw.createdCategorySlug,
    createdAt: raw.createdAt,
  };
}

/** 가입 신청 — 백엔드가 snake_case 로 주고 이름 필드가 3가지 후보로 온다. */
export function mapJoinRequest(raw: Record<string, any>): ForumOwnerJoinRequest {
  return {
    id: raw.id,
    displayName: raw.user_display_name || raw.requester_name || raw.user_name || null,
    email: raw.requester_email || raw.user_email || null,
    createdAt: raw.created_at,
  };
}

export function mapForumMember(raw: Record<string, any>): ForumOwnerMember {
  return {
    id: raw.id,
    userId: raw.user_id,
    name: raw.user_name ?? null,
    email: raw.user_email ?? null,
    role: raw.role,
    joinedAt: raw.joined_at,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// factories
// ─────────────────────────────────────────────────────────────────────────────

export function createForumOwnerApi(raw: ForumOwnerRawApi): ForumOwnerApi {
  const api: ForumOwnerApi = {
    async listOwnedForums() {
      const res = await call(() => raw.fetchOwnedForums(), '운영 중인 포럼을 불러오지 못했습니다.');
      return unwrapList(res).map(mapOwnedForum);
    },
    async updateForum(forumId, data) {
      await call(() => raw.updateForum(forumId, data), '저장에 실패했습니다.');
    },
    async requestForumDelete(forumId, data) {
      await call(() => raw.requestForumDelete(forumId, data), '삭제 요청에 실패했습니다.');
    },
  };

  // 제공한 서비스에서만 신청 내역 섹션이 켜진다 (KPA 는 통합 신청함으로 이전).
  if (raw.fetchMyRequests) {
    const fetchMyRequests = raw.fetchMyRequests;
    api.listMyRequests = async () => {
      const res = await call(() => fetchMyRequests(), '포럼 신청 내역을 불러오지 못했습니다.');
      return unwrapList(res).map(mapForumRequest);
    };
  }

  return api;
}

export function createForumOwnerMembershipApi(raw: ForumOwnerMembershipRawApi): ForumOwnerMembershipApi {
  return {
    async listOwnedForums() {
      const res = await call(() => raw.fetchOwnedForums(), '포럼 정보를 불러오지 못했습니다.');
      return unwrapList(res).map(mapOwnedForum);
    },
    async listJoinRequests(forumId) {
      const res = await call(() => raw.fetchJoinRequests(forumId), '가입 신청을 불러오지 못했습니다.');
      return unwrapList(res).map(mapJoinRequest);
    },
    async listMembers(forumId) {
      const res = await call(() => raw.fetchMembers(forumId), '회원 목록을 불러오지 못했습니다.');
      return unwrapList(res).map(mapForumMember);
    },
    async approveJoin(forumId, requestId) {
      await call(() => raw.approveJoin(forumId, requestId), '승인에 실패했습니다.');
    },
    async rejectJoin(forumId, requestId, comment) {
      await call(() => raw.rejectJoin(forumId, requestId, comment), '거절에 실패했습니다.');
    },
    async removeMember(forumId, userId) {
      await call(() => raw.removeMember(forumId, userId), '회원 삭제에 실패했습니다.');
    },
  };
}
