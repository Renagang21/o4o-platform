import { beforeEach, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../../../lib/apiClient', () => ({ api }));
vi.mock('../../../lib/hostProfile', () => ({ CURRENT_HOST_PROFILE: 'carepharm' }));
import { loadPolicy } from '../PolicyDocumentPage';

beforeEach(() => vi.resetAllMocks());
it('keeps common account consent in Neture even when viewed from CarePharm', async () => {
  api.get.mockResolvedValue({ data: { data: { serviceKey: 'neture' } } });
  expect(await loadPolicy('neture', 'terms')).toEqual({ serviceKey: 'neture' });
  expect(api.get).toHaveBeenCalledWith('/public/services/neture/policies/terms');
});
it('loads the business policy only for the explicit CarePharm public page', async () => {
  api.get.mockResolvedValue({ data: { data: { serviceKey: 'business:fixture' } } });
  expect(await loadPolicy('carepharm', 'privacy')).toEqual({ serviceKey: 'business:fixture' });
  expect(api.get).toHaveBeenCalledWith('/neture/businesses/carepharm/legal/policies/privacy');
});
it('does not substitute account policies when a business policy is missing', async () => {
  api.get.mockRejectedValue({ response: { status: 404 } });
  expect(await loadPolicy('carepharm', 'terms')).toBeNull();
  expect(api.get).toHaveBeenCalledTimes(1);
});
