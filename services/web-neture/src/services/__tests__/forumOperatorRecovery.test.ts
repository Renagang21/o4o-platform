import { beforeEach, describe, expect, it, vi } from 'vitest';
const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../../lib/apiClient', () => ({ api: { get } }));
import { forumOperatorApi } from '../forumApi';
beforeEach(() => get.mockReset());
describe('Neture operator forum adapter', () => {
  it('propagates read failures to the shared recovery UI', async () => {
    const error = new Error('fixture unavailable'); get.mockRejectedValueOnce(error);
    await expect(forumOperatorApi.getCategories()).rejects.toBe(error);
    expect(get).toHaveBeenCalledWith('/forum/operator/categories?serviceCode=neture');
  });
  it('preserves valid empty results', async () => {
    const response = { success: true, data: [], count: 0 }; get.mockResolvedValueOnce({ data: response });
    expect(await forumOperatorApi.getCategories()).toBe(response);
  });
});
