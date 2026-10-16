import { afterEach, expect, it, vi } from 'vitest';
import { askStoreAi, storeAiError } from '../storeAi';
const m = vi.hoisted(() => ({ json: vi.fn() }));
vi.mock('../storeJsonFetch', () => ({ storeJsonFetch: m.json }));
vi.mock('../../lib/apiClient', () => ({ API_BASE_URL: 'https://fixtures.example.test' }));
afterEach(() => { vi.clearAllMocks(); vi.useRealTimers(); });
const request = { question: '내용', serviceId: 'kpa-society', task: 'summary' as const, contextData: { pageTitle: '매장', serviceInfo: {} } };

it('uses the existing authenticated query contract and preserves server error codes without raw errors', async () => {
  m.json.mockResolvedValue({ success: true, answer: '요약', remainingQueries: 2 });
  expect(await askStoreAi(request)).toMatchObject({ answer: '요약' });
  const [url, options, errorFactory] = m.json.mock.calls[0];
  expect(url).toBe('https://fixtures.example.test/api/ai/query');
  expect(JSON.parse(options.body)).toMatchObject({ ...request, contextType: 'service', pageType: 'store' });
  const error = errorFactory({ errorCode: 'NO_API_KEY', error: 'private provider detail' }, 500);
  expect(storeAiError(error)).toContain('지금은 AI를 사용할 수 없습니다');
  expect(storeAiError(error)).not.toContain('private');
});
it('rejects empty replies instead of treating them as success', async () => {
  m.json.mockResolvedValue({ success: true, answer: ' ' });
  await expect(askStoreAi(request)).rejects.toThrow();
});
it('times out without automatically retrying a potentially charged call', async () => {
  vi.useFakeTimers();
  m.json.mockImplementation((_url, options) => new Promise((_yes, no) => options.signal.addEventListener('abort', () => no(new Error('aborted')))));
  const result = askStoreAi(request).catch(cause => cause);
  await vi.advanceTimersByTimeAsync(60_000);
  expect(storeAiError(await result)).toContain('사용량이 반영됐을 수');
  expect(m.json).toHaveBeenCalledTimes(1);
});
