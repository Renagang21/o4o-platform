import { authClient } from '@o4o/auth-client';
import type {
  ProductCorrectionBulkJob,
  ProductCorrectionRule,
  ProductCorrectionRun,
  ProductCorrectionSchedule,
  ProductDescriptionRenewal,
  ProductCorrectionNotice,
} from '@o4o/types';
const BASE = '/admin/o4o-product-db/correction';
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
export type ProductWorkspaceSection = 'descriptions' | 'tasks' | 'proposals' | 'renewals' | 'edits';
export interface ProductWorkspaceItem {
  id: string; title: string; state: string; at: string; href: string;
  notes?: string; sources?: string; content?: string; summary?: string; truncated?: boolean;
  sourceType?: string; sourceRefId?: string; nextReviewAt?: string; followUpAt?: string;
  evidence?: Array<{ id: string; kind: string; source: string; checkedOn: string; status: string }>;
  changes?: Array<{ field: string; before: unknown; after: unknown; reason?: string; decision?: string }>;
}
export interface ProductWorkspaceDetail extends Page<ProductWorkspaceItem> {
  product: { id: string; name: string; barcode: string | null; manufacturerName: string | null;
    specification: string | null; regulatoryType: string; status: string };
  section: ProductWorkspaceSection;
}
export interface PeriodicDashboard {
  renewalOpen: number;
  proposalPending: number;
  proposalUnapplied: number;
  proposalFailed: number;
  bulkOpen: number;
  bulkFailed: number;
  bulkPaused: number;
  scheduleDue: number;
  noticeUnread: number;
  evidenceWaiting: number;
  lastTickAt: string | null;
  worker?: { source?: 'server' | 'job'; lastSucceededAt?: string; lastFailedAt?: string;
    lastErrorCode?: string | null; lastDurationMs?: number; pagesProcessed?: number } | null;
}
export interface RenewalDetail {
  record: ProductDescriptionRenewal;
  fingerprint: string;
  productExists: boolean;
  description: { id: string; content: string; summary: string | null } | null;
}
const messages: Record<string, string> = {
  BULK_CHANGED: '다른 요청이 실행 상태를 바꿨습니다. 최신 실행을 다시 불러오세요.',
  BULK_TERMINAL: '완료·취소된 실행은 재개할 수 없습니다. 새 점검을 만드세요.',
  BULK_SCOPE_TOO_LARGE: '대상 50,000개를 초과합니다. 상품군·검색 조건으로 범위를 나누세요.',
  BULK_STEP_FAILED: '점검 처리에 실패했습니다. 실행 현황에서 재시도 상태를 확인하세요.',
  RULE_CHANGED: '기준이 변경됐습니다. 최신 기준을 다시 불러오세요.',
  RULE_DISABLED: '사용 중지된 기준입니다.',
  SCHEDULE_CHANGED: '예약이 변경됐습니다. 최신 예약을 다시 불러오세요.',
  SCHEDULE_FUTURE_REQUIRED: '한국시간 기준으로 미래 최초 실행 시각을 지정하세요.',
  RENEWAL_CHANGED: '갱신 작업이 변경됐습니다. 최신 기록을 다시 확인하세요.',
  PRODUCT_SOURCE_CHANGED: '상품·설명서 원문이 바뀌었습니다. 최신 자료를 다시 불러와 검토하세요.',
  MASTER_NOT_FOUND: '상품을 찾을 수 없습니다. 상품 ID를 확인하세요.',
  INVALID_INPUT: '입력값을 확인하세요. 갱신 검토에는 목적과 메모가 필요합니다.',
};
async function call<T>(
  method: 'get' | 'post' | 'put' | 'patch',
  path: string,
  body?: unknown,
): Promise<T> {
  try {
    const result =
      method === 'get'
        ? await authClient.api.get(BASE + path)
        : await authClient.api[method](BASE + path, body);
    if (!result.data.success) throw new Error(result.data.code);
    return result.data.data as T;
  } catch (error) {
    const e = error as { message?: string; response?: { data?: { code?: string } } };
    throw new Error(
      messages[e.response?.data?.code ?? e.message ?? ''] ??
        '상품 정기 관리 요청이 실패했습니다. 다시 확인하세요.',
    );
  }
}
export const productCorrectionPeriodicApi = {
  productWorkspace: (id: string, section: ProductWorkspaceSection = 'descriptions', page = 1) =>
    call<ProductWorkspaceDetail>('get', `/products/${encodeURIComponent(id)}/workspace?section=${section}&page=${page}`),
  dashboard: () => call<PeriodicDashboard>('get', '/periodic/dashboard'),
  renewals: (state: 'open' | 'all' = 'open', page = 1) =>
    call<Page<ProductDescriptionRenewal>>('get', `/renewals?state=${state}&page=${page}`),
  renewalVersions: (id: string) =>
    call<ProductDescriptionRenewal[]>('get', `/renewals/${encodeURIComponent(id)}/versions`),
  renewal: (id: string) => call<RenewalDetail>('get', `/renewals/${encodeURIComponent(id)}`),
  saveRenewal: (
    detail: RenewalDetail,
    input: {
      state: ProductDescriptionRenewal['state'];
      notes: string;
      purposes: Array<ProductCorrectionRule['purpose']>;
    },
  ) =>
    call<ProductDescriptionRenewal>('patch', `/renewals/${encodeURIComponent(detail.record.id)}`, {
      revision: detail.record.revision,
      fingerprint: detail.fingerprint,
      ...input,
    }),
  bulk: (page = 1) => call<Page<ProductCorrectionBulkJob>>('get', `/bulk?page=${page}`),
  createBulk: (rule: ProductCorrectionRule, search: string) =>
    call<ProductCorrectionBulkJob>('post', '/bulk', {
      ruleId: rule.id,
      revision: rule.revision,
      search,
    }),
  controlBulk: (job: ProductCorrectionBulkJob, action: 'pause' | 'resume' | 'cancel') =>
    call<ProductCorrectionBulkJob>('post', `/bulk/${job.id}/control`, {
      revision: job.revision,
      action,
    }),
  bulkControls: (id: string) =>
    call<
      Array<{
        action: 'pause' | 'resume' | 'cancel';
        actor: string | null;
        at: string;
        cursor: number;
      }>
    >('get', `/bulk/${id}/controls`),
  stepBulk: (id: string) => call<ProductCorrectionBulkJob | null>('post', `/bulk/${id}/step`, {}),
  bulkPages: (id: string, page = 1) =>
    call<{
      job: ProductCorrectionBulkJob;
      run: ProductCorrectionRun | null;
      totalPages: number;
      page: number;
    }>('get', `/bulk/${id}/pages?page=${page}`),
  schedules: (page = 1) => call<Page<ProductCorrectionSchedule>>('get', `/schedules?page=${page}`),
  schedule: (ruleId: string) =>
    call<ProductCorrectionSchedule | null>('get', `/rules/${ruleId}/schedule`),
  saveSchedule: (
    ruleId: string,
    input: {
      revision: number;
      enabled: boolean;
      intervalDays: number;
      timeZone: 'Asia/Seoul';
      nextDueAt: string;
    },
  ) => call<ProductCorrectionSchedule>('put', `/rules/${ruleId}/schedule`, input),
  notices: (page = 1) => call<Page<ProductCorrectionNotice>>('get', `/notices?page=${page}`),
  acknowledge: (id: string) =>
    call<ProductCorrectionNotice>('post', `/notices/${encodeURIComponent(id)}/acknowledge`, {}),
};
