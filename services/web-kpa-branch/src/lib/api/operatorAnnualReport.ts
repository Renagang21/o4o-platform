/**
 * 운영자 신상신고 검수 API 클라이언트
 * WO-O4O-KPA-BRANCH-ANNUAL-REPORT-REVIEW-V1 §2 §3 §4 §5 §6 §7
 *
 * tenant 는 URL segment(:branchSlug) 로만 정한다 — organizationId·userId 를 본문에 넣지 않는다.
 * 필터는 year / status 2개뿐이다 (WO §3 — 검색·정렬 옵션을 늘리지 않는다).
 *
 * 조회 실패를 빈 목록으로 삼키지 않는다: 실패는 throw 하고 화면이 오류 상태를 표시한다.
 */
import { api } from '../apiClient';
import type { ReportStatus, ReportValues, TemplateSchema } from './annualReport';

const BASE = '/kpa-branch';
const ops = (slug: string) => `${BASE}/branches/${encodeURIComponent(slug)}/operator/annual-reports`;

export interface ReviewListItem {
  id: string;
  year: number;
  status: ReportStatus;
  submittedAt: string | null;
  member: { userId: string; name: string | null; email: string | null };
  /** 원장과 달라지는 항목 수 — 목록의 "주요 변경사항" */
  changedCount: number;
  changedLabels: string[];
  /** 원장 비교가 불가능한 경우의 사유. null 이면 비교가 성립한 것이다 */
  diffUnavailable: string | null;
  syncedToMembership: boolean;
  revisionRound: number;
  approvedAt: string | null;
}

export interface LedgerChange {
  key: string;
  label: string;
  /** sync 대상 식별자 (양식의 syncTarget — 2026 양식은 legacy `kpa_members.*` alias) */
  target?: string;
  column?: string;
  before: unknown;
  after: unknown;
  /** 선택지 필드의 raw code 를 양식 label 로 바꾼 표시용 값 (없으면 before/after 그대로) */
  beforeLabel?: string | null;
  afterLabel?: string | null;
}

export interface LedgerSkip {
  key: string;
  label: string;
  reason: string;
}

export interface ReviewDetail {
  report: {
    id: string;
    year: number;
    status: ReportStatus;
    submittedAt: string | null;
    updatedAt: string;
    syncedToMembership: boolean;
    syncedChanges: unknown;
    revisionReason: string | null;
    revisionRequestedAt: string | null;
    revisionRequestedBy: string | null;
    approvedAt: string | null;
    approvedBy: string | null;
    revisionHistory: Array<{
      round: number;
      submittedAt: string | null;
      reason: string;
      requestedAt: string;
      requestedBy: string;
      templateId: string;
      values: ReportValues;
    }>;
  };
  member: { userId: string; name: string | null; email: string | null };
  /** 제출 당시 양식. version 을 화면에 그대로 표시한다 (WO §4) */
  template: { id: string; year: number; version: number; title: string; status: string };
  schema: TemplateSchema;
  /** 제출 스냅샷 그대로. 현재 회원정보를 재주입한 값이 아니다 */
  values: ReportValues;
  ledgerDiff: {
    unavailable: string | null;
    changes: LedgerChange[];
    skipped: LedgerSkip[];
    invalid: Array<{ key: string; reason: string; message: string }>;
  };
}

function unwrap<T>(res: { data: { success: boolean; data: T } }): T {
  return res.data.data;
}

export async function listAnnualReports(
  slug: string,
  filter: { year?: number | null; status?: ReportStatus | null },
): Promise<ReviewListItem[]> {
  const params: Record<string, string> = {};
  if (filter.year) params.year = String(filter.year);
  if (filter.status) params.status = filter.status;
  const res = await api.get(ops(slug), { params });
  return unwrap<{ items: ReviewListItem[] }>(res).items;
}

export async function getAnnualReportDetail(slug: string, reportId: string): Promise<ReviewDetail> {
  return unwrap(await api.get(`${ops(slug)}/${reportId}`));
}

/** 승인만 한다. 원장은 바뀌지 않는다 (반영은 아래 sync 로 따로 실행). */
export async function approveAnnualReport(slug: string, reportId: string) {
  return unwrap<{ id: string; status: ReportStatus; approvedAt: string }>(
    await api.post(`${ops(slug)}/${reportId}/approve`, {}),
  );
}

/** 보완요청. 사유는 필수이며 회원 화면에 그대로 보인다. */
export async function requestAnnualReportRevision(slug: string, reportId: string, reason: string) {
  return unwrap<{ id: string; status: ReportStatus; round: number }>(
    await api.post(`${ops(slug)}/${reportId}/request-revision`, { reason }),
  );
}

/** 회원 원장 반영. 승인된 신고서에서만 성공한다 (서버가 409 REPORT_NOT_APPROVED). */
export async function syncAnnualReportToMembership(slug: string, reportId: string) {
  return unwrap<{
    reportId: string;
    applied: boolean;
    alreadySynced: boolean;
    syncedToMembership: boolean;
    syncedChanges: { changes: LedgerChange[]; skipped: LedgerSkip[] };
  }>(await api.post(`${ops(slug)}/${reportId}/sync`, {}));
}
