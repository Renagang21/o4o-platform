import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ issueCertificate: vi.fn(), renewCertificate: vi.fn(), revokeCertificate: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock('../../api/lecture', () => ({ operatorApi: api, errorMessage: (_err: unknown, fallback: string) => fallback }));
vi.mock('../../components/Toast', () => ({ useToast: () => api }));
import { useOperatorCertificates } from './useOperatorCertificates';
afterEach(() => { cleanup(); vi.resetAllMocks(); });
it('takes one lock across certificate command types and ignores an unmounted result', async () => {
  let finish!: (value: unknown) => void;
  api.issueCertificate.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const { result, unmount } = renderHook(useOperatorCertificates);
  const previous = result.current; let first!: Promise<boolean>;
  await act(async () => {
    first = previous.execute({ kind: 'issue', userId: 'user', courseId: 'course' });
    expect(await previous.execute({ kind: 'renew', id: 'cert', months: 12 })).toBe(false);
    expect(await previous.execute({ kind: 'revoke', id: 'cert', reason: '' })).toBe(false);
  });
  unmount();
  expect(await previous.execute({ kind: 'renew', id: 'cert', months: 12 })).toBe(false);
  await act(async () => { finish({ data: { certificate: { id: 'old' } } }); expect(await first).toBe(false); });
  expect(api.issueCertificate).toHaveBeenCalledTimes(1); expect(api.renewCertificate).not.toHaveBeenCalled(); expect(api.revokeCertificate).not.toHaveBeenCalled(); expect(api.success).not.toHaveBeenCalled();
});
it.each([0, -1, 1.5, NaN])('rejects an invalid renewal period %s before calling the API', async months => {
  const { result } = renderHook(useOperatorCertificates);
  await act(async () => { expect(await result.current.execute({ kind: 'renew', id: 'cert', months })).toBe(false); });
  expect(api.renewCertificate).not.toHaveBeenCalled();
});
