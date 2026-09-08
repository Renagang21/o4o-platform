/**
 * 분회 연수교육 평점 API 클라이언트 (운영자 원장 / 회원 본인 조회)
 * WO-O4O-KPA-BRANCH-CONTINUING-EDUCATION-CREDIT-LEDGER-V1
 *
 * tenant 는 URL segment(:branchSlug) 로만 정한다 — organizationId·userId 를 본문에 넣지 않는다.
 * status 도 보내지 않는다: DB generated column 이 정한다.
 *
 * 조회 실패를 빈 목록으로 삼키지 않는다: 실패는 throw 하고 화면이 오류 상태를 표시한다.
 */
import { api } from '../apiClient';

const BASE = '/kpa-branch';
const branch = (slug: string) => `${BASE}/branches/${encodeURIComponent(slug)}`;

export type EducationStatus = 'incomplete' | 'complete' | 'exempt';
export type ExemptionType = 'exempt' | 'deferred';

export const EDUCATION_STATUS_LABEL: Record<EducationStatus, string> = {
  incomplete: '미이수',
  complete: '이수완료',
  exempt: '면제·유예',
};

export const EXEMPTION_TYPE_LABEL: Record<ExemptionType, string> = {
  exempt: '면제',
  deferred: '유예',
};

export interface EducationCreditItem {
  id: string;
  year: number;
  userId: string;
  memberName: string | null;
  memberEmail: string | null;
  requiredCredits: number;
  completedCredits: number;
  /** 면제는 0 이다 — 화면에서 다시 계산하지 않는다 */
  remainingCredits: number;
  exemptionType: ExemptionType | null;
  status: EducationStatus;
  memo: string | null;
  updatedAt: string;
}

export interface EducationSummary {
  count: number;
  complete: number;
  incomplete: number;
  exempt: number;
}

function unwrap<T>(res: { data: { success: boolean; data: T } }): T {
  return res.data.data;
}

// ── 운영자 ──────────────────────────────────────────────────────────────────

export async function listEducationCredits(
  slug: string,
  filter: { year: number; status?: EducationStatus | null },
): Promise<{ items: EducationCreditItem[]; summary: EducationSummary }> {
  const params: Record<string, string> = { year: String(filter.year) };
  if (filter.status) params.status = filter.status;
  const res = await api.get(`${branch(slug)}/operator/education-credits`, { params });
  return unwrap<{ items: EducationCreditItem[]; summary: EducationSummary }>(res);
}

/** 연도 개설. 멱등이다 — 이미 원장이 있는 회원은 건너뛴다. */
export async function openEducationYear(
  slug: string,
  year: number,
  requiredCredits: number,
): Promise<{ year: number; created: number; skipped: Array<{ userId: string; reason: string }>; targetCount: number }> {
  return unwrap(
    await api.post(`${branch(slug)}/operator/education-credits/open`, { year, requiredCredits }),
  );
}

/** status 는 보내지 않는다 — 서버(DB)가 평점과 면제 여부에서 정한다. */
export async function updateEducationCredit(
  slug: string,
  ledgerId: string,
  patch: {
    requiredCredits?: number;
    completedCredits?: number;
    exemptionType?: ExemptionType | null;
    memo?: string | null;
  },
): Promise<EducationCreditItem> {
  return unwrap(await api.patch(`${branch(slug)}/operator/education-credits/${ledgerId}`, patch));
}

// ── 회원 본인 ───────────────────────────────────────────────────────────────

export async function listMyEducationCredits(slug: string): Promise<EducationCreditItem[]> {
  const res = await api.get(`${branch(slug)}/me/education-credits`);
  return unwrap<{ items: EducationCreditItem[] }>(res).items;
}
