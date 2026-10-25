import { authClient } from '@o4o/auth-client';
import type {
  ProductCorrectionContext,
  ProductCorrectionProposal,
  ProductCorrectionEvidence,
  ProductCorrectionField,
  ProductCorrectionValue,
  ProductCorrectionBatch,
  ProductCorrectionBatchResult,
  ProductCorrectionRun,
  ProductCorrectionRunSummary,
  ProductCorrectionOperations,
  ProductCorrectionOperationFilter,
  ProductCorrectionTaskVersion,
  ProductCorrectionBatchSummary,
  ProductCorrectionMatch,
  ProductCorrectionPreview,
  ProductCorrectionRule,
  ProductCorrectionRuleInput,
  ProductCorrectionScope,
  ProductCorrectionTask,
} from '@o4o/types';

const BASE = '/admin/o4o-product-db/correction';
const messages: Record<string, string> = {
  PROPOSAL_CHANGED: '변경안 버전이 바뀌었습니다. 이력을 다시 불러와 비교해 주세요.',
  ALREADY_APPLIED: '이미 반영된 변경안입니다. 이력에서 결과를 확인해 주세요.',
  APPROVAL_REQUIRED: '승인한 항목만 반영할 수 있습니다.',
  CONFIRMED_EVIDENCE_REQUIRED:
    '승인할 항목의 확인된 근거가 필요합니다. 기본정보에는 상품 사실 근거를 연결하세요.',
  INVALID_EVIDENCE_LINK: '변경 항목에 연결된 근거를 확인해 주세요.',
  UNCHANGED_FIELD: '원본과 같은 값인 항목은 변경 선택을 해제하세요.',
  INVALID_FIELD_VALUE: '변경 값의 형식과 길이를 확인해 주세요.',
  PRODUCT_NOT_ACTIVE: '현재 사용 중인 상품만 반영할 수 있습니다.',
  RULE_CHANGED: '기준이 변경됐습니다. 최신 기준을 다시 확인하고 점검해 주세요.',
  BATCH_CHANGED: '다른 작업이 먼저 저장됐습니다. 입력 내용을 보존한 뒤 작업 묶음을 다시 열어 비교해 주세요.',
  PRODUCT_SOURCE_CHANGED: '선택 후 상품 원문 또는 대상 조건이 바뀌었습니다. 다시 점검해 주세요.',
  FOLLOWUP_MUST_BE_FUTURE: '재확인일은 현재보다 뒤로 지정해 주세요.',
  INVALID_RUN_SELECTION: '점검 이력과 선택 상품이 일치하지 않습니다. 다시 점검해 주세요.',
  RUN_NOT_FAILED: '실패했거나 5분 이상 중단된 점검만 다시 실행할 수 있습니다.',
  RULE_DISABLED: '사용 중지된 기준입니다.',
  INVALID_INPUT: '입력값을 확인해 주세요. 종료에는 메모·근거, 대기·보류에는 사유·재확인일이 필요합니다.',
};
async function call<T>(method: 'get' | 'post' | 'put' | 'patch', path: string, body?: unknown): Promise<T> {
  try {
    const response =
      method === 'get'
        ? await authClient.api.get(`${BASE}${path}`)
        : await authClient.api[method](`${BASE}${path}`, body);
    if (!response.data.success) throw new Error(response.data.code ?? 'CORRECTION_FAILED');
    return response.data.data as T;
  } catch (error) {
    const e = error as { response?: { data?: { code?: string } }; message?: string };
    const code = e.response?.data?.code ?? e.message ?? '';
    throw new Error(messages[code] ?? '보정 작업 공간 요청에 실패했습니다. 다시 시도해 주세요.');
  }
}
export const productCorrectionApi = {
  proposal: (id: string) => call<ProductCorrectionProposal>('get', `/proposals/${id}`),
  proposalQueue: (filter: 'all' | 'pending' | 'reviewed' | 'applied' | 'failed', page = 1) =>
    call<{
      items: Array<{
        id: string;
        batchId: string;
        taskId: string;
        productName: string;
        createdAt: string;
        reviewedAt: string | null;
        appliedAt: string | null;
      }>;
      total: number;
      page: number;
      pageSize: number;
    }>('get', `/proposals?filter=${filter}&page=${page}`),
  changeContext: (batchId: string, taskId: string) =>
    call<ProductCorrectionContext>('get', `/batches/${batchId}/items/${taskId}/change-context`),
  proposals: (batchId: string, taskId: string) =>
    call<ProductCorrectionProposal[]>('get', `/batches/${batchId}/items/${taskId}/proposals`),
  proposalAttempts: (id: string) =>
    call<
      Array<{
        at: string;
        actor: string;
        revision: number;
        fields: ProductCorrectionField[];
        code: string;
      }>
    >('get', `/proposals/${id}/attempts`),
  proposalVersions: (id: string) =>
    call<ProductCorrectionProposal[]>('get', `/proposals/${id}/versions`),
  createProposal: (
    batchId: string,
    taskId: string,
    input: {
      fingerprint: string;
      evidence: ProductCorrectionEvidence[];
      changes: Array<{
        field: ProductCorrectionField;
        after: ProductCorrectionValue;
        reason: string;
        evidenceIds: string[];
      }>;
    },
  ) =>
    call<ProductCorrectionProposal>('post', `/batches/${batchId}/items/${taskId}/proposals`, input),
  reviewProposal: (
    proposal: ProductCorrectionProposal,
    decisions: Array<{
      field: ProductCorrectionField;
      decision: 'approved' | 'rejected';
    }>,
    note: string,
  ) =>
    call<ProductCorrectionProposal>('post', `/proposals/${proposal.id}/review`, {
      revision: proposal.revision,
      decisions,
      note,
    }),
  applyProposal: (proposal: ProductCorrectionProposal, fields: ProductCorrectionField[]) =>
    call<ProductCorrectionProposal>('post', `/proposals/${proposal.id}/apply`, {
      revision: proposal.revision,
      fields,
    }),
  rules: () => call<ProductCorrectionRule[]>('get', '/rules'),
  saveRule: (rule: ProductCorrectionRuleInput, current?: ProductCorrectionRule) =>
    current
      ? call<ProductCorrectionRule>('put', `/rules/${current.id}`, { revision: current.revision, rule })
      : call<ProductCorrectionRule>('post', '/rules', rule),
  versions: (id: string) => call<ProductCorrectionRule[]>('get', `/rules/${id}/versions`),
  preview: async (
    id: string,
    scope: ProductCorrectionScope,
    revision: number,
  ): Promise<ProductCorrectionPreview> => {
    const result = await call<ProductCorrectionRun>('post', `/rules/${id}/runs`, { revision, scope });
    if (result.status !== 'completed' || !result.result)
      throw new Error('점검이 실패했습니다. 실행 이력에서 실패 범위를 다시 실행해 주세요.');
    return result.result;
  },
  runs: (page = 1) =>
    call<{ items: ProductCorrectionRunSummary[]; total: number; page: number; pageSize: number }>(
      'get',
      `/runs?page=${page}`,
    ),
  retryRun: (id: string) => call<ProductCorrectionRun>('post', `/runs/${id}/retry`, {}),
  operations: (filter: ProductCorrectionOperationFilter = 'all', page = 1) =>
    call<ProductCorrectionOperations>('get', `/operations?filter=${filter}&page=${page}`),
  taskVersions: (batchId: string, taskId: string, page = 1) =>
    call<ProductCorrectionTaskVersion[]>('get', `/batches/${batchId}/items/${taskId}/versions?page=${page}`),
  batches: (page = 1) =>
    call<{ items: ProductCorrectionBatchSummary[]; total: number; page: number; pageSize: number }>(
      'get',
      `/batches?page=${page}`,
    ),
  batch: (id: string) => call<ProductCorrectionBatch>('get', `/batches/${id}`),
  aiDraft: (batchId: string, taskId: string, revision: number) =>
    call<{ draft: string; missingEvidence: string[]; taskId: string; batchRevision: number; sourceFingerprint: string }>(
      'post', `/batches/${batchId}/items/${taskId}/ai-draft`, { revision }),
  createBatch: (
    rule: ProductCorrectionRule,
    scope: ProductCorrectionScope,
    title: string,
    selected: ProductCorrectionMatch[],
  ) =>
    call<ProductCorrectionBatchResult>('post', '/batches', {
      ruleId: rule.id,
      ruleRevision: rule.revision,
      scope,
      title,
      selected: selected.map((p) => ({
        id: p.id,
        fingerprint: p.fingerprint,
        ...(p.runId ? { runId: p.runId } : {}),
      })),
    }),
  saveTask: (
    batch: ProductCorrectionBatch,
    task: ProductCorrectionTask,
    input: Pick<ProductCorrectionTask, 'state' | 'draft' | 'notes' | 'sources' | 'followUpAt'>,
  ) =>
    call<ProductCorrectionBatch>('patch', `/batches/${batch.id}/items/${task.id}`, {
      revision: batch.revision,
      ...input,
    }),
};
