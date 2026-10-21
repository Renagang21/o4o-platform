import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ profile: 'community', get: vi.fn() }));
vi.mock('../../hostProfile', () => ({ get CURRENT_HOST_PROFILE() { return state.profile; } }));
vi.mock('../../apiClient', () => ({ api: { get: state.get } }));
beforeEach(() => { vi.resetModules(); state.get.mockReset(); });
it.each([['community', 'community'], ['main', 'neture'], ['supplier', 'supplier'], ['funding', 'funding'], ['carepharm', 'carepharm']])('notification scope for %s is %s', async (profile, serviceKey) => {
  state.profile = profile;
  state.get.mockResolvedValue({ data: { data: { count: 2, notifications: [], total: 0 } } });
  const { notificationsApi, NOTIFICATION_SERVICE_KEY } = await import('../notifications');
  expect(NOTIFICATION_SERVICE_KEY).toBe(serviceKey);
  expect(await notificationsApi.getUnreadCount({ serviceKey: NOTIFICATION_SERVICE_KEY })).toBe(2);
  await notificationsApi.list({ serviceKey: NOTIFICATION_SERVICE_KEY });
  expect(state.get.mock.calls.map(([, options]) => options.params.serviceKey)).toEqual([serviceKey, serviceKey]);
});
