import { authClient } from '@o4o/auth-client';
import type {
  ProductCorrectionBatch,
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
  RULE_CHANGED: '기준이 변경됐습니다. 최신 기준을 다시 확인하고 점검해 주세요.',
  BATCH_CHANGED: '다른 작업이 먼저 저장됐습니다. 입력 내용을 보존한 뒤 작업 묶음을 다시 열어 비교해 주세요.',
  PRODUCT_SOURCE_CHANGED: '선택 후 상품 원문 또는 대상 조건이 바뀌었습니다. 다시 점검해 주세요.',
  RULE_DISABLED: '사용 중지된 기준입니다.',
  INVALID_INPUT: '입력값을 확인해 주세요. 검토 대기는 초안·메모·근거가 모두 필요합니다.',
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
  rules: () => call<ProductCorrectionRule[]>('get', '/rules'),
  saveRule: (rule: ProductCorrectionRuleInput, current?: ProductCorrectionRule) =>
    current
      ? call<ProductCorrectionRule>('put', `/rules/${current.id}`, { revision: current.revision, rule })
      : call<ProductCorrectionRule>('post', '/rules', rule),
  versions: (id: string) => call<ProductCorrectionRule[]>('get', `/rules/${id}/versions`),
  preview: (id: string, scope: ProductCorrectionScope) =>
    call<ProductCorrectionPreview>('post', `/rules/${id}/preview`, scope),
  batches: (page = 1) =>
    call<{ items: ProductCorrectionBatchSummary[]; total: number; page: number; pageSize: number }>(
      'get',
      `/batches?page=${page}`,
    ),
  batch: (id: string) => call<ProductCorrectionBatch>('get', `/batches/${id}`),
  createBatch: (
    rule: ProductCorrectionRule,
    scope: ProductCorrectionScope,
    title: string,
    selected: ProductCorrectionMatch[],
  ) =>
    call<ProductCorrectionBatch>('post', '/batches', {
      ruleId: rule.id,
      ruleRevision: rule.revision,
      scope,
      title,
      selected: selected.map((p) => ({ id: p.id, fingerprint: p.fingerprint })),
    }),
  saveTask: (
    batch: ProductCorrectionBatch,
    task: ProductCorrectionTask,
    input: Pick<ProductCorrectionTask, 'state' | 'draft' | 'notes' | 'sources'>,
  ) =>
    call<ProductCorrectionBatch>('patch', `/batches/${batch.id}/items/${task.id}`, {
      revision: batch.revision,
      ...input,
    }),
};
