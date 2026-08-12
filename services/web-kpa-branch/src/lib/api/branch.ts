/**
 * KPA Branch API 클라이언트
 * WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1
 *
 * 모든 호출은 `/kpa-branch/*` 하나의 백엔드로 나간다 (분회별 백엔드 없음).
 * tenant 는 URL segment(:branchSlug) 또는 Host 로만 결정된다 — 본문에 넣지 않는다.
 *
 * 조회 실패를 빈 목록으로 삼키지 않는다: 실패는 throw 하고 화면이 오류 상태를 표시한다.
 */
import { api } from '../apiClient';

const BASE = '/kpa-branch';

export interface BranchSummary {
  id: string;
  slug: string | null;
  name: string;
  /** 표시용. 권한 계산에 사용하지 않는다 (모든 분회는 동급 tenant). */
  parentId: string | null;
  address?: string | null;
  phone?: string | null;
  description?: string | null;
  resolvedBy?: string;
}

export interface BranchMembership {
  id: string;
  userId: string;
  organizationId: string;
  status: 'active' | 'left';
  joinedAt: string;
  leftAt: string | null;
  transferReason: string | null;
  note: string | null;
}

export interface BranchSite {
  organizationId: string;
  slug: string | null;
  branchName: string;
  title: string;
  tagline: string | null;
  logoUrl: string | null;
  intro: string | null;
  contact: { phone?: string; email?: string; address?: string; hours?: string } | null;
  template: 'classic';
  isPublished: boolean;
}

export type BranchPostCategory = 'notice' | 'resource';

export interface BranchPost {
  id: string;
  category: BranchPostCategory;
  title: string;
  content: string;
  attachments: { name: string; url: string }[];
  isPinned: boolean;
  status: 'draft' | 'published';
  publishedAt: string | null;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BranchDomain {
  id: string;
  organizationId: string;
  hostname: string;
  isPrimary: boolean;
  status: 'pending' | 'verifying' | 'active' | 'failed' | 'disabled';
  verification: { recordName: string; recordType: string; recordValue: string };
  verifiedAt: string | null;
  createdAt: string;
}

export interface BranchAccess {
  serviceKey: string;
  membershipStatus: string;
  roles: string[];
  currentBranch: { organizationId: string; joinedAt: string } | null;
  entryPoints: { member: boolean; operator: boolean; admin: boolean };
}

/** `{ success, data }` 표준 응답에서 data 만 꺼낸다. */
function unwrap<T>(res: { data: { success: boolean; data: T } }): T {
  return res.data.data;
}

// ── public ──────────────────────────────────────────────────────────────────

export async function listBranches(params?: { q?: string; parentId?: string }): Promise<BranchSummary[]> {
  return unwrap(await api.get(`${BASE}/branches`, { params }));
}

export async function getBranch(slug: string): Promise<BranchSummary> {
  return unwrap(await api.get(`${BASE}/branches/${encodeURIComponent(slug)}`));
}

/** 자체 도메인 진입 시 Host → 분회 해석 */
export async function resolveBranchByHost(): Promise<BranchSummary> {
  return unwrap(await api.get(`${BASE}/resolve`, { params: { host: window.location.host } }));
}

export async function getPublicSite(slug: string): Promise<BranchSite> {
  return unwrap(await api.get(`${BASE}/branches/${encodeURIComponent(slug)}/site`));
}

export async function getPublicPosts(
  slug: string,
  params?: { category?: BranchPostCategory; limit?: number; offset?: number },
): Promise<{ items: BranchPost[]; total: number }> {
  return unwrap(await api.get(`${BASE}/branches/${encodeURIComponent(slug)}/posts`, { params }));
}

// ── auth (본인 축) ──────────────────────────────────────────────────────────

export async function getMyAccess(): Promise<BranchAccess> {
  return unwrap(await api.get(`${BASE}/me/access`));
}

export async function getMyBranch(): Promise<BranchMembership | null> {
  return unwrap(await api.get(`${BASE}/me/branch`));
}

/** 전입·전출 이력. 과거 기록은 삭제되지 않으므로 재전입도 별도 행으로 보인다. */
export async function getMyBranchHistory(): Promise<BranchMembership[]> {
  return unwrap(await api.get(`${BASE}/me/branch/history`));
}

// ── operator (분회 경계는 backend 가 강제한다) ──────────────────────────────

const op = (slug: string) => `${BASE}/branches/${encodeURIComponent(slug)}/operator`;

export async function getOperatorSite(slug: string): Promise<BranchSite> {
  return unwrap(await api.get(`${op(slug)}/site`));
}

export async function saveOperatorSite(
  slug: string,
  body: Partial<Pick<BranchSite, 'title' | 'tagline' | 'logoUrl' | 'intro' | 'contact' | 'isPublished'>>,
): Promise<BranchSite> {
  return unwrap(await api.put(`${op(slug)}/site`, body));
}

export async function getOperatorPosts(
  slug: string,
  params?: { category?: BranchPostCategory; limit?: number; offset?: number },
): Promise<{ items: BranchPost[]; total: number }> {
  return unwrap(await api.get(`${op(slug)}/posts`, { params }));
}

export type BranchPostInput = {
  category: BranchPostCategory;
  title: string;
  content: string;
  isPinned?: boolean;
  status?: 'draft' | 'published';
};

export async function createPost(slug: string, body: BranchPostInput): Promise<BranchPost> {
  return unwrap(await api.post(`${op(slug)}/posts`, body));
}

export async function updatePost(slug: string, postId: string, body: Partial<BranchPostInput>): Promise<BranchPost> {
  return unwrap(await api.patch(`${op(slug)}/posts/${postId}`, body));
}

export async function deletePost(slug: string, postId: string): Promise<{ id: string }> {
  return unwrap(await api.delete(`${op(slug)}/posts/${postId}`));
}

export async function listDomains(slug: string): Promise<BranchDomain[]> {
  return unwrap(await api.get(`${op(slug)}/domains`));
}

export async function createDomain(slug: string, hostname: string): Promise<BranchDomain> {
  return unwrap(await api.post(`${op(slug)}/domains`, { hostname }));
}

export async function requestDomainVerification(slug: string, domainId: string): Promise<BranchDomain> {
  return unwrap(await api.post(`${op(slug)}/domains/${domainId}/verify-request`, {}));
}

export async function removeDomain(slug: string, domainId: string): Promise<{ id: string }> {
  return unwrap(await api.delete(`${op(slug)}/domains/${domainId}`));
}
