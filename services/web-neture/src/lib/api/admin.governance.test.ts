import { beforeEach, expect, it, vi } from 'vitest';
const get = vi.hoisted(() => vi.fn());
vi.mock('./client', () => ({ api: { get } }));
import { adminSupplierApi } from './admin';
beforeEach(() => { get.mockReset(); });
it.each([new Error('network'), { response: { status: 403 } }, { response: { status: 401 } }])('governance failures propagate instead of becoming empty success', async error => {
  get.mockRejectedValue(error);
  await expect(adminSupplierApi.getGovernanceSuppliers()).rejects.toThrow();
});
it('an actual empty response stays empty but malformed responses fail', async () => {
  get.mockResolvedValueOnce({ data: { data: [] } }).mockResolvedValueOnce({ data: { success: true } });
  await expect(adminSupplierApi.getGovernanceSuppliers()).resolves.toEqual([]);
  await expect(adminSupplierApi.getGovernanceSuppliers()).rejects.toThrow();
});
