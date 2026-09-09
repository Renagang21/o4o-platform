/**
 * 분회 임원 명부 API 클라이언트
 * WO-O4O-KPA-BRANCH-OFFICER-ROSTER-V1
 *
 * tenant 는 URL segment(:branchSlug) 로만 정한다 — organizationId 를 본문에 넣지 않는다.
 * `current`(현직 여부)도 계산하지 않는다: 상태와 임기 날짜를 함께 본 **서버 판정값**을 쓴다.
 *
 * 조회 실패를 빈 목록으로 삼키지 않는다: 실패는 throw 하고 화면이 오류 상태를 표시한다.
 */
import { api } from '../apiClient';

const BASE = '/kpa-branch';
const branch = (slug: string) => `${BASE}/branches/${encodeURIComponent(slug)}`;

export type OfficerStatus = 'active' | 'ended';
export type OfficerVisibility = 'public' | 'members_only';

export const OFFICER_STATUS_LABEL: Record<OfficerStatus, string> = {
  active: '재임',
  ended: '임기종료',
};

export const OFFICER_VISIBILITY_LABEL: Record<OfficerVisibility, string> = {
  public: '전체 공개',
  members_only: '회원 전용',
};

export interface OfficerItem {
  id: string;
  /** 회원 계정 연결 — 외부 인사(고문·자문)는 null */
  userId: string | null;
  name: string;
  position: string;
  groupName: string | null;
  termStart: string;
  termEnd: string | null;
  displayOrder: number;
  status: OfficerStatus;
  visibility: OfficerVisibility;
  /** 오늘 기준 현직인가 — 서버 판정값 */
  current: boolean;
  /** 연결된 회원의 현재 계정 정보. 명부의 `name` 을 대체하지 않는다 */
  linkedMember: { name: string | null; email: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

export interface OfficerInput {
  userId?: string | null;
  name?: string;
  position?: string;
  groupName?: string | null;
  termStart?: string;
  termEnd?: string | null;
  displayOrder?: number;
  status?: OfficerStatus;
  visibility?: OfficerVisibility;
}

function unwrap<T>(res: { data: { success: boolean; data: T } }): T {
  return res.data.data;
}

// ── 운영자 ──────────────────────────────────────────────────────────────────

export async function listOperatorOfficers(
  slug: string,
  status?: OfficerStatus | null,
): Promise<OfficerItem[]> {
  const params: Record<string, string> = {};
  if (status) params.status = status;
  const res = await api.get(`${branch(slug)}/operator/officers`, { params });
  return unwrap<{ items: OfficerItem[] }>(res).items;
}

export async function createOfficer(slug: string, input: OfficerInput): Promise<OfficerItem> {
  return unwrap(await api.post(`${branch(slug)}/operator/officers`, input));
}

/** 임기 종료·공개범위 변경도 이 경로다. **재임은 수정이 아니라 새 등록이다.** */
export async function updateOfficer(
  slug: string,
  officerId: string,
  input: OfficerInput,
): Promise<OfficerItem> {
  return unwrap(await api.patch(`${branch(slug)}/operator/officers/${officerId}`, input));
}

/** 표시순서 일괄 변경 — 한 트랜잭션. 행마다 PATCH 하면 중간 정렬이 화면에 남는다. */
export async function reorderOfficers(
  slug: string,
  items: Array<{ id: string; displayOrder: number }>,
): Promise<OfficerItem[]> {
  const res = await api.put(`${branch(slug)}/operator/officers/order`, { items });
  return unwrap<{ items: OfficerItem[] }>(res).items;
}

// ── 회원 · 공개 ─────────────────────────────────────────────────────────────

/** 회원 명부 — public + members_only, 현직만 */
export async function listMemberOfficers(slug: string): Promise<OfficerItem[]> {
  const res = await api.get(`${branch(slug)}/me/officers`);
  return unwrap<{ items: OfficerItem[] }>(res).items;
}

/** 공개 명부 — visibility='public' + 현직만 (비로그인) */
export async function listPublicOfficers(slug: string): Promise<OfficerItem[]> {
  const res = await api.get(`${branch(slug)}/officers`);
  return unwrap<{ items: OfficerItem[] }>(res).items;
}
