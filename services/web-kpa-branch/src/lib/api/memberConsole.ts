/**
 * 회원 업무 콘솔 API 클라이언트
 * WO-O4O-KPA-BRANCH-MEMBER-OPERATIONS-CONSOLE-V1
 *
 * **이 파일에는 조인이 없다.** 서버가 소속·신상신고·회비·연수교육을 합쳐서 주므로
 * 화면은 받은 것을 그리기만 한다. 여기에 회원별 추가 호출을 넣는 순간
 * 회원 수만큼 요청이 늘어나는 구조가 된다 (WO §1·§2 가 막으려는 것).
 *
 * 조회 실패를 빈 목록으로 삼키지 않는다: 실패는 throw 하고 화면이 오류 상태를 표시한다.
 */
import { api } from '../apiClient';

const BASE = '/kpa-branch';
const branch = (slug: string) => `${BASE}/branches/${encodeURIComponent(slug)}`;

export type ReportSummaryStatus =
  | 'not_submitted'
  | 'draft'
  | 'submitted'
  | 'revision_requested'
  | 'approved';
export type FeeSummaryStatus = 'not_assessed' | 'unpaid' | 'partial' | 'paid' | 'exempt';
export type EducationSummaryStatus = 'not_recorded' | 'incomplete' | 'complete' | 'exempt';

export type AttentionCode =
  | 'REPORT_REVIEW_PENDING'
  | 'REPORT_REVISION_OPEN'
  | 'REPORT_SYNC_PENDING'
  | 'REPORT_MISSING'
  | 'FEE_OUTSTANDING'
  | 'FEE_NOT_ASSESSED'
  | 'EDUCATION_INCOMPLETE'
  | 'EDUCATION_NOT_RECORDED';

export const REPORT_LABEL: Record<ReportSummaryStatus, string> = {
  not_submitted: '미작성',
  draft: '작성중',
  submitted: '제출',
  revision_requested: '보완요청',
  approved: '승인',
};

export const FEE_LABEL: Record<FeeSummaryStatus, string> = {
  not_assessed: '미부과',
  unpaid: '미납',
  partial: '부분납부',
  paid: '완납',
  exempt: '면제',
};

export const EDUCATION_LABEL: Record<EducationSummaryStatus, string> = {
  not_recorded: '기록없음',
  incomplete: '미이수',
  complete: '이수',
  exempt: '면제·유예',
};

export const ATTENTION_LABEL: Record<AttentionCode, string> = {
  REPORT_REVIEW_PENDING: '신고 검수대기',
  REPORT_REVISION_OPEN: '보완 대기',
  REPORT_SYNC_PENDING: '원장 미반영',
  REPORT_MISSING: '신고 미제출',
  FEE_OUTSTANDING: '회비 미수',
  FEE_NOT_ASSESSED: '회비 미부과',
  EDUCATION_INCOMPLETE: '교육 미이수',
  EDUCATION_NOT_RECORDED: '교육 미기록',
};

export interface MemberConsoleListItem {
  id: string;
  userId: string;
  organizationId: string;
  status: string;
  joinedAt: string;
  leftAt: string | null;
  transferReason: string | null;
  note: string | null;
  name: string | null;
  email: string | null;
  licenseNumber: string | null;
  activityType: string | null;
  feeCategory: string | null;
  report: { status: ReportSummaryStatus; submittedAt: string | null; approvedAt: string | null };
  fee: { status: FeeSummaryStatus; assessedAmount: number | null; paidAmount: number | null };
  education: {
    status: EducationSummaryStatus;
    requiredCredits: number | null;
    completedCredits: number | null;
  };
  attention: AttentionCode[];
}

export interface MemberConsoleDetail {
  year: number;
  member: {
    userId: string;
    name: string | null;
    email: string | null;
    licenseNumber: string | null;
    activityType: string | null;
    feeCategory: string | null;
  };
  affiliation: {
    membershipId: string;
    organizationId: string;
    status: string;
    joinedAt: string;
    leftAt: string | null;
    transferReason: string | null;
    note: string | null;
  };
  report: {
    id?: string;
    status: ReportSummaryStatus;
    submittedAt?: string | null;
    approvedAt?: string | null;
    syncedToMembership?: boolean;
    revisionReason?: string | null;
    revisionRequestedAt?: string | null;
    revisionRound?: number;
    changes?: Array<{ key: string; label: string; before: unknown; after: unknown }>;
    diffUnavailable?: string | null;
  };
  fee: {
    id?: string;
    status: FeeSummaryStatus;
    feeCategory?: string | null;
    assessedAmount?: number | null;
    paidAmount?: number | null;
    outstanding?: number;
    paidAt?: string | null;
    memo?: string | null;
  };
  education: {
    id?: string;
    status: EducationSummaryStatus;
    requiredCredits?: number | null;
    completedCredits?: number | null;
    remainingCredits?: number;
    exemptionType?: 'exempt' | 'deferred' | null;
    memo?: string | null;
  };
  attention: AttentionCode[];
}

function unwrap<T>(res: { data: { success: boolean; data: T } }): T {
  return res.data.data;
}

/** 목록 — 요청 1회. 회원별 추가 호출을 하지 않는다. */
export async function listMemberConsole(
  slug: string,
  filter: { year: number; status?: 'active' | 'left' | 'all'; attention?: AttentionCode | null; q?: string },
): Promise<{ items: MemberConsoleListItem[]; total: number; year: number }> {
  const params: Record<string, string> = { year: String(filter.year) };
  if (filter.status) params.status = filter.status;
  if (filter.attention) params.attention = filter.attention;
  if (filter.q && filter.q.trim()) params.q = filter.q.trim();
  return unwrap(await api.get(`${branch(slug)}/operator/members`, { params }));
}

/** 상세 — 요청 1회로 4영역을 모두 받는다. */
export async function getMemberConsoleDetail(
  slug: string,
  userId: string,
  year: number,
): Promise<MemberConsoleDetail> {
  return unwrap(
    await api.get(`${branch(slug)}/operator/members/${encodeURIComponent(userId)}`, {
      params: { year: String(year) },
    }),
  );
}

/* ── 소속(전입·전출) ─────────────────────────────────────────────
 * WO-O4O-KPA-BRANCH-MEMBER-AFFILIATION-TRANSFER-OPERATIONS-V1
 *
 * 대상 분회는 언제나 URL 의 branchSlug 다. 클라이언트가 organizationId·
 * sourceOrganizationId·targetOrganizationId 를 만들어 보내지 않는다 (WO §4·§7).
 * 서버가 req.branch 로 확정하고, 타 분회 종료가 필요하면 서버 트랜잭션 안에서 처리한다.
 */

export interface AffiliationHistoryItem {
  id: string;
  userId: string;
  organizationId: string;
  organizationName: string | null;
  organizationSlug: string | null;
  isCurrentBranch: boolean;
  status: string;
  joinedAt: string;
  leftAt: string | null;
  transferReason: string | null;
  note: string | null;
}

/** 소속 이력 (오래된 순). 과거 행을 재활성화하지 않으므로 이동 순서가 그대로 보인다. */
export async function getAffiliationHistory(
  slug: string,
  userId: string,
): Promise<{ items: AffiliationHistoryItem[] }> {
  return unwrap(
    await api.get(`${branch(slug)}/operator/members/${encodeURIComponent(userId)}/history`),
  );
}

/** 신규 소속 / 전입. 다른 분회 active 면 서버가 같은 트랜잭션에서 전출 후 전입한다. */
export async function joinMember(
  slug: string,
  params: { userId?: string; email?: string; effectiveDate?: string; reason?: string; note?: string },
): Promise<{ id: string; userId: string; organizationId: string; status: string; joinedAt: string }> {
  return unwrap(await api.post(`${branch(slug)}/operator/members`, params));
}

/** 전출. 현재 분회의 active 소속만 대상이며, 행을 삭제하지 않고 left 로 마감한다. */
export async function leaveMember(
  slug: string,
  userId: string,
  params: { effectiveDate?: string; reason?: string } = {},
): Promise<{ id: string; status: string; leftAt: string | null }> {
  return unwrap(
    await api.post(`${branch(slug)}/operator/members/${encodeURIComponent(userId)}/leave`, params),
  );
}
