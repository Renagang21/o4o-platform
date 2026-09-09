/**
 * 분회 행사 API 클라이언트 (운영자 CRUD / 회원 RSVP)
 * WO-O4O-KPA-BRANCH-EVENTS-AND-RSVP-V1
 *
 * tenant 는 URL segment(:branchSlug) 로만 정한다 — organizationId·userId 를 본문에 넣지 않는다.
 * `rsvpOpen` 도 계산해서 보내지 않는다: 서버가 판정한 값을 그대로 쓴다
 * (화면이 따로 계산하면 "버튼은 열려 있는데 저장은 409" 가 생긴다).
 *
 * 조회 실패를 빈 목록으로 삼키지 않는다: 실패는 throw 하고 화면이 오류 상태를 표시한다.
 */
import { api } from '../apiClient';

const BASE = '/kpa-branch';
const branch = (slug: string) => `${BASE}/branches/${encodeURIComponent(slug)}`;

export type EventStatus = 'draft' | 'published' | 'cancelled';
export type EventVisibility = 'public' | 'members_only';
export type RsvpStatus = 'attending' | 'not_attending';

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  draft: '작성중',
  published: '게시',
  cancelled: '취소',
};

export const EVENT_VISIBILITY_LABEL: Record<EventVisibility, string> = {
  public: '전체 공개',
  members_only: '회원 전용',
};

export const RSVP_LABEL: Record<RsvpStatus, string> = {
  attending: '참가',
  not_attending: '불참',
};

export interface BranchEventItem {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  externalUrl: string | null;
  rsvpEnabled: boolean;
  rsvpDeadline: string | null;
  visibility: EventVisibility;
  status: EventStatus;
  /** 지금 응답을 받는가 — 서버 판정값. 화면에서 다시 계산하지 않는다 */
  rsvpOpen: boolean;
  counts: { attending: number; notAttending: number };
  /** 본인 응답 (회원 경로에서만 채워진다) */
  myRsvp: { status: RsvpStatus; memo: string | null; respondedAt: string } | null;
  createdAt: string;
}

export interface EventRsvpRow {
  userId: string;
  name: string | null;
  email: string | null;
  status: RsvpStatus;
  memo: string | null;
  respondedAt: string;
}

export interface EventInput {
  title?: string;
  description?: string | null;
  startsAt?: string;
  endsAt?: string | null;
  location?: string | null;
  externalUrl?: string | null;
  rsvpEnabled?: boolean;
  rsvpDeadline?: string | null;
  visibility?: EventVisibility;
  status?: EventStatus;
}

function unwrap<T>(res: { data: { success: boolean; data: T } }): T {
  return res.data.data;
}

// ── 운영자 ──────────────────────────────────────────────────────────────────

export async function listOperatorEvents(
  slug: string,
  status?: EventStatus | null,
): Promise<BranchEventItem[]> {
  const params: Record<string, string> = {};
  if (status) params.status = status;
  const res = await api.get(`${branch(slug)}/operator/events`, { params });
  return unwrap<{ items: BranchEventItem[] }>(res).items;
}

export async function createEvent(slug: string, input: EventInput): Promise<BranchEventItem> {
  return unwrap(await api.post(`${branch(slug)}/operator/events`, input));
}

/** 게시·취소도 이 경로다 — 상태 전용 endpoint 가 없다. */
export async function updateEvent(
  slug: string,
  eventId: string,
  input: EventInput,
): Promise<BranchEventItem> {
  return unwrap(await api.patch(`${branch(slug)}/operator/events/${eventId}`, input));
}

export async function listEventRsvps(
  slug: string,
  eventId: string,
): Promise<{ event: BranchEventItem; items: EventRsvpRow[]; total: number }> {
  return unwrap(await api.get(`${branch(slug)}/operator/events/${eventId}/rsvps`));
}

// ── 회원 ────────────────────────────────────────────────────────────────────

export async function listMyEvents(slug: string): Promise<BranchEventItem[]> {
  const res = await api.get(`${branch(slug)}/me/events`);
  return unwrap<{ items: BranchEventItem[] }>(res).items;
}

/** 기존 응답이 있으면 갱신된다 — 중복 신청이 아니라 정정이다. */
export async function respondToEvent(
  slug: string,
  eventId: string,
  status: RsvpStatus,
  memo?: string | null,
): Promise<BranchEventItem> {
  return unwrap(
    await api.post(`${branch(slug)}/me/events/${eventId}/rsvp`, { status, memo: memo ?? null }),
  );
}
