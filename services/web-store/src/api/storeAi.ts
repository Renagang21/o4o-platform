import { storeJsonFetch } from './storeJsonFetch';
import { API_BASE_URL } from '../lib/apiClient';

export type StoreAiTask = 'question' | 'summary' | 'draft';
export interface StoreAiRequest {
  question: string;
  serviceId: string;
  task: StoreAiTask;
  contextData: { pageTitle: string; serviceInfo: Record<string, unknown> };
}
interface StoreAiResponse {
  success: boolean;
  answer?: string;
  remainingQueries?: number;
  errorCode?: string;
}

// Reuse authentication and captured store headers. No provider or domain write API here.
export async function askStoreAi(request: StoreAiRequest): Promise<StoreAiResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  try {
    const result = await storeJsonFetch<StoreAiResponse>(`${API_BASE_URL}/api/ai/query`, {
      method: 'POST', signal: controller.signal,
      body: JSON.stringify({ ...request, contextType: 'service', pageType: 'store' }),
    }, (body, status) => Object.assign(new Error('AI_RESPONSE_UNAVAILABLE'), { status, code: body.errorCode }));
    if (!result.success || !result.answer?.trim()) {
      throw Object.assign(new Error('AI_RESPONSE_UNAVAILABLE'), { code: result.errorCode });
    }
    return result;
  } catch (cause) {
    if (controller.signal.aborted) throw Object.assign(new Error('AI_TIMEOUT'), { status: 408 });
    throw cause;
  } finally {
    clearTimeout(timer);
  }
}

export function storeAiError(error: unknown): string {
  const { code, status } = (error ?? {}) as { code?: string; status?: number };
  if (status === 401) return '로그인 상태를 확인한 후 다시 시도해 주세요.';
  if (status === 429 || code === 'LIMIT_EXCEEDED' || code === 'QUOTA_EXCEEDED') return 'AI 사용 한도에 도달했습니다. 직접 작업을 계속할 수 있습니다.';
  if (['AI_DISABLED', 'NO_API_KEY', 'NOT_CONFIGURED'].includes(code ?? '')) return '지금은 AI를 사용할 수 없습니다. 직접 작업을 계속할 수 있습니다.';
  if (status === 408) return '응답을 확인하는 시간이 초과됐습니다. 사용량이 반영됐을 수 있으니 잠시 후 확인하고 다시 요청해 주세요.';
  return 'AI 응답을 받지 못했습니다. 입력은 보존됐습니다. 잠시 후 다시 시도해 주세요.';
}
