/**
 * 분회 연회비 API 클라이언트 (운영자 정책·원장 / 회원 본인 조회)
 * WO-O4O-KPA-BRANCH-ANNUAL-FEE-LEDGER-V1
 *
 * tenant 는 URL segment(:branchSlug) 로만 정한다 — organizationId·userId 를 본문에 넣지 않는다.
 * status 도 보내지 않는다: 금액과 면제 여부에서 서버가 파생한다.
 *
 * 조회 실패를 빈 목록으로 삼키지 않는다: 실패는 throw 하고 화면이 오류 상태를 표시한다.
 */
import { api } from '../apiClient';

const BASE = '/kpa-branch';
const branch = (slug: string) => `${BASE}/branches/${encodeURIComponent(slug)}`;

export type FeeStatus = 'unpaid' | 'partial' | 'paid' | 'exempt';

/**
 * 면제 사유 구분 (WO-O4O-KPA-BRANCH-FEE-EXEMPTION-REASON-LEDGER-V1).
 * `unemployed` / `exempted` 는 신상신고 양식의 `fee.exemptionType` option 과 같은 값이다.
 */
export type FeeExemptionType = 'unemployed' | 'exempted' | 'other';

export const FEE_EXEMPTION_LABEL: Record<FeeExemptionType, string> = {
  unemployed: '미취업자',
  exempted: '회비면제자',
  other: '기타',
};

export const FEE_EXEMPTION_OPTIONS: Array<{ value: FeeExemptionType; label: string }> = [
  { value: 'unemployed', label: '미취업자' },
  { value: 'exempted', label: '회비면제자' },
  { value: 'other', label: '기타 (사유 입력)' },
];

export const FEE_STATUS_LABEL: Record<FeeStatus, string> = {
  unpaid: '미납',
  partial: '일부납부',
  paid: '완납',
  exempt: '면제',
};

/**
 * `kpa_members.fee_category` 코드 — 회비 정책의 구분 키다.
 * 화면에서 새 코드를 만들지 않는다. 서버·DB 와 같은 값을 그대로 쓴다.
 */
export const FEE_CATEGORIES: Array<{ value: string; label: string }> = [
  { value: 'A1_pharmacy_owner', label: '갑1 · 약국 개설약사' },
  { value: 'A2_pharma_manager', label: '갑2 · 제약 관리약사' },
  { value: 'B1_pharmacy_employee', label: '을1 · 약국 근무약사' },
  { value: 'B2_pharma_company_employee', label: '을2 · 제약회사 근무' },
  { value: 'C1_hospital', label: '병1 · 의료기관' },
  { value: 'C2_admin_edu_research', label: '병2 · 행정·교육·연구' },
  { value: 'D_fee_exempted', label: '정 · 회비면제 대상' },
];

export function feeCategoryLabel(code: string | null): string {
  if (!code) return '미지정';
  return FEE_CATEGORIES.find((c) => c.value === code)?.label ?? code;
}

export interface FeePolicyItem {
  feeCategory: string;
  amount: number;
  memo: string | null;
}

export interface FeeLedgerItem {
  id: string;
  year: number;
  userId: string;
  memberName: string | null;
  memberEmail: string | null;
  feeCategory: string | null;
  assessedAmount: number;
  paidAmount: number;
  /** 면제는 0 이다 — 화면에서 다시 계산하지 않는다 */
  outstanding: number;
  paidAt: string | null;
  status: FeeStatus;
  /** 면제 사유 구분. status='exempt' 일 때만 값이 있다 */
  exemptionType: FeeExemptionType | null;
  /** 자유 사유 — `other` 일 때만. **회원 조회에서는 항상 null** (운영자 기록) */
  exemptionReason: string | null;
  memo: string | null;
  updatedAt: string;
}

export interface FeeLedgerSummary {
  assessed: number;
  paid: number;
  outstanding: number;
  count: number;
}

export interface FeeAssessSkip {
  userId: string;
  reason: 'ALREADY_ASSESSED' | 'NO_FEE_CATEGORY' | 'NO_POLICY';
  feeCategory: string | null;
}

export const ASSESS_SKIP_LABEL: Record<FeeAssessSkip['reason'], string> = {
  ALREADY_ASSESSED: '이미 부과됨',
  NO_FEE_CATEGORY: '회비구분 미지정',
  NO_POLICY: '해당 구분의 정책 없음',
};

function unwrap<T>(res: { data: { success: boolean; data: T } }): T {
  return res.data.data;
}

// ── 운영자 ──────────────────────────────────────────────────────────────────

export async function listFeePolicies(slug: string, year: number): Promise<FeePolicyItem[]> {
  const res = await api.get(`${branch(slug)}/operator/fee-policies`, { params: { year: String(year) } });
  return unwrap<{ year: number; items: FeePolicyItem[] }>(res).items;
}

/** 보낸 목록이 그 연도 정책의 전부가 된다 (빠진 구분은 삭제). */
export async function replaceFeePolicies(
  slug: string,
  year: number,
  items: FeePolicyItem[],
): Promise<FeePolicyItem[]> {
  const res = await api.put(`${branch(slug)}/operator/fee-policies/${year}`, { items });
  return unwrap<{ year: number; items: FeePolicyItem[] }>(res).items;
}

export async function listFeeLedgers(
  slug: string,
  filter: { year: number; status?: FeeStatus | null },
): Promise<{ items: FeeLedgerItem[]; summary: FeeLedgerSummary }> {
  const params: Record<string, string> = { year: String(filter.year) };
  if (filter.status) params.status = filter.status;
  const res = await api.get(`${branch(slug)}/operator/fee-ledgers`, { params });
  return unwrap<{ items: FeeLedgerItem[]; summary: FeeLedgerSummary }>(res);
}

/** 연도 일괄 부과. 멱등이다 — 이미 원장이 있는 회원은 건너뛴다. */
export async function assessFeeYear(
  slug: string,
  year: number,
): Promise<{ year: number; created: number; skipped: FeeAssessSkip[]; targetCount: number }> {
  return unwrap(await api.post(`${branch(slug)}/operator/fee-ledgers/assess`, { year }));
}

/** status 는 보내지 않는다 — 서버가 금액·면제에서 파생한다. */
export async function updateFeeLedger(
  slug: string,
  ledgerId: string,
  patch: {
    assessedAmount?: number;
    paidAmount?: number;
    paidAt?: string | null;
    exempt?: boolean;
    /** exempt=true 일 때 필수. exempt=false 면 서버가 사유를 지운다 */
    exemptionType?: FeeExemptionType | null;
    /** exemptionType='other' 일 때 필수 */
    exemptionReason?: string | null;
    memo?: string | null;
    feeCategory?: string | null;
  },
): Promise<FeeLedgerItem> {
  return unwrap(await api.patch(`${branch(slug)}/operator/fee-ledgers/${ledgerId}`, patch));
}

// ── 회원 본인 ───────────────────────────────────────────────────────────────

export async function listMyFees(slug: string): Promise<FeeLedgerItem[]> {
  const res = await api.get(`${branch(slug)}/me/fees`);
  return unwrap<{ items: FeeLedgerItem[] }>(res).items;
}
