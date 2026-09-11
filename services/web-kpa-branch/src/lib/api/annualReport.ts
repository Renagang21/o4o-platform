/**
 * 신상신고 API 클라이언트 (회원 본인)
 * WO-O4O-KPA-BRANCH-ANNUAL-REPORT-SUBMISSION-V1
 * WO-O4O-KPA-BRANCH-ANNUAL-REPORT-REVIEW-V1 §8 (보완요청 상태 노출)
 *
 * 필드 목록·활동유형·미활동 사유를 **여기에 복제하지 않는다.**
 * 서버가 준 schema 만으로 화면을 만든다. 프런트가 아는 고정 목록은 renderer type 뿐이다.
 */
import { api } from '../apiClient';

const BASE = '/kpa-branch';
const me = (slug: string) => `${BASE}/branches/${encodeURIComponent(slug)}/me/annual-report`;

/** W1 Template 의 렌더러 종류. 프런트가 아는 유일한 고정 목록 */
export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'tel'
  | 'email'
  | 'radio'
  | 'checkbox'
  | 'select'
  | 'multiselect'
  | 'address'
  | 'license'
  | 'file'
  | 'signature'
  | 'consent'
  | 'readonly_display';

export type FieldOwnership = 'auto' | 'member' | 'association';

export interface FieldOption {
  value: string | number | boolean;
  label: string;
  group?: string;
}

export interface FieldDefinition {
  key: string;
  label: string;
  type: FieldType;
  step: string;
  group?: string;
  order: number;
  ownership: FieldOwnership;
  required: boolean;
  readonly: boolean;
  options?: FieldOption[];
  validation?: { pattern?: string; maxLength?: number; min?: number; max?: number; message?: string };
  visibleWhen?: { rule: string };
  hint?: string;
}

export interface TemplateStep {
  key: string;
  order: number;
  title: string;
}

export interface TemplateSchema {
  templateVersion: string;
  steps: TemplateStep[];
  fields: FieldDefinition[];
  rules: Array<{
    id: string;
    kind: 'visible' | 'required' | 'notice';
    description: string;
    when: { field: string; op: string; value?: unknown } | null;
    targets: string[];
    releaseRequiredWhenHidden?: boolean;
  }>;
}

export type ReportValues = Record<string, unknown>;

/**
 * 신고서 상태 (서버 계약과 동일한 4종).
 *   draft → submitted → (revision_requested → submitted)* → approved
 * 역방향 전이는 없다. 회원이 값을 고칠 수 있는 상태는 draft / revision_requested 뿐이다.
 */
export type ReportStatus = 'draft' | 'submitted' | 'revision_requested' | 'approved';

export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  draft: '작성중',
  submitted: '제출완료 · 검수대기',
  revision_requested: '보완요청',
  approved: '승인완료',
};

export interface MemberReportMeta {
  id: string;
  status: ReportStatus;
  submittedAt: string | null;
  updatedAt: string;
  /** 보완요청 사유 — 재제출하면 서버가 비운다 */
  revisionReason: string | null;
  revisionRequestedAt: string | null;
  approvedAt: string | null;
  /** 지금까지 받은 보완요청 횟수 */
  revisionRound: number;
}

export interface AnnualReportState {
  template: {
    id: string;
    year: number;
    version: number;
    title: string;
    status: string;
    periodStart: string | null;
    periodEnd: string | null;
    /**
     * 회비·연수교육 기준년도 (WO-O4O-KPA-BRANCH-ANNUAL-REPORT-REFERENCE-YEARS-V1).
     * 신고년도(year)와 다를 수 있다 — 연수교육은 전년도(Y−1)를 참조한다.
     */
    referenceYears: { fee: number; training: number } | null;
  };
  schema: TemplateSchema;
  report: MemberReportMeta | null;
  values: ReportValues;
  /**
   * `values` 의 시점.
   *   'submitted_snapshot' — 제출 당시 값 그대로 (현재 원장으로 덮어쓰지 않는다)
   *   'draft_composed'     — prefill + 내 draft + 현재 association 합성값
   */
  valuesSource: 'submitted_snapshot' | 'draft_composed';
  visible: Record<string, boolean>;
  /**
   * **현재 시점**의 association 연결 가능 여부. `values` 와 같은 시점이 아니다.
   * 제출 완료본(valuesSource='submitted_snapshot')에는 값의 근거로 쓰지 않는다.
   */
  currentAssociationLinkStatus: Record<string, 'resolved' | 'not_linked'>;
  /** 평가할 수 없는 rule (근거 원장 부재). 있는 것처럼 차단하지 않는다 */
  notEvaluableRules: string[];
  /**
   * 신고 기간. canSubmit 은 역할과 무관하다.
   * 기간이 open 이거나, **보완요청 상태**면 true (운영자가 다시 열어준 건이므로 기간 밖에도 재제출 가능).
   */
  period: { status: 'before' | 'open' | 'closed'; canSubmit: boolean };
  readonly: boolean;
}

export interface FieldIssue {
  key: string;
  code: string;
  message: string;
}

function unwrap<T>(res: { data: { success: boolean; data: T } }): T {
  return res.data.data;
}

export async function getAnnualReport(slug: string): Promise<AnnualReportState> {
  return unwrap(await api.get(me(slug)));
}

export async function saveAnnualReportDraft(
  slug: string,
  values: ReportValues,
): Promise<{ id: string; status: string; updatedAt: string; values: ReportValues; ignoredKeys: string[] }> {
  return unwrap(await api.post(`${me(slug)}/draft`, { values }));
}

export async function submitAnnualReport(
  slug: string,
  values: ReportValues,
): Promise<{ id: string; status: string; submittedAt: string; ignoredKeys: string[] }> {
  return unwrap(await api.post(`${me(slug)}/submit`, { values }));
}

/**
 * 서버가 준 rules 로 표시 여부를 계산한다.
 * 서버와 **같은 규칙**을 쓰지만 최종 판정은 서버다 (여기는 UX 용).
 * `$system.` 조건은 평가하지 않는다 — 근거 데이터가 프런트에 없다.
 */
export function computeVisibility(schema: TemplateSchema, values: ReportValues): Record<string, boolean> {
  const visible: Record<string, boolean> = {};
  for (const f of schema.fields) visible[f.key] = true;

  for (const rule of schema.rules) {
    if (rule.kind !== 'visible' || !rule.when) continue;
    if (rule.when.field.startsWith('$system.')) continue;

    const actual = values[rule.when.field];
    let pass = true;
    switch (rule.when.op) {
      case 'eq':
        pass = actual === rule.when.value;
        break;
      case 'neq':
        pass = actual !== rule.when.value;
        break;
      case 'in':
        pass = Array.isArray(rule.when.value) && (rule.when.value as unknown[]).includes(actual);
        break;
      case 'notIn':
        pass = Array.isArray(rule.when.value) && !(rule.when.value as unknown[]).includes(actual);
        break;
      case 'truthy':
        pass = Boolean(actual);
        break;
      default:
        pass = true;
    }
    for (const t of rule.targets) {
      if (t in visible) visible[t] = visible[t] && pass;
    }
  }
  return visible;
}

/** 회원이 값을 넣을 수 있는 필드만 서버로 보낸다 (association·readonly 제외) */
export function writableValues(schema: TemplateSchema, values: ReportValues): ReportValues {
  const out: ReportValues = {};
  for (const f of schema.fields) {
    if (f.ownership === 'association' || f.readonly) continue;
    if (f.key in values) out[f.key] = values[f.key];
  }
  return out;
}
