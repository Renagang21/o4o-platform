import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
const mocks = vi.hoisted(() => ({ stores: vi.fn(), services: vi.fn() }));
vi.mock('../AuthContext', () => ({ useAuth: () => ({ isAuthenticated: true, isLoading: false, user: { id: 'staff' } }) }));
vi.mock('../../lib/storeApi', () => ({ fetchAccessibleStores: mocks.stores, fetchStoreServices: mocks.services }));
import { StoreProvider, useUnifiedStore } from '../StoreContext';
function Probe() { const state = useUnifiedStore(); return <><p>{state.status}</p>{state.error && <p role="alert">{state.error}</p>}<button onClick={state.reload}>재시도</button></>; }
beforeEach(() => {
  sessionStorage.clear(); vi.clearAllMocks();
  mocks.stores.mockResolvedValue([{ organizationId: 'store-a', organizationName: '합성 매장', memberRole: 'staff' }]);
  mocks.services.mockResolvedValue({ status: 'resolved', organizationId: 'store-a', services: [] });
});
afterEach(cleanup);
it('service failure exits resolving and recovers through retry', async () => {
  mocks.services.mockRejectedValueOnce(new Error('temporary failure'));
  render(<StoreProvider><Probe /></StoreProvider>);
  await screen.findByText('error');
  expect(screen.getByRole('alert').textContent).toContain('서비스 목록');
  fireEvent.click(screen.getByRole('button', { name: '재시도' }));
  await screen.findByText('ready');
  expect(screen.queryByRole('alert')).toBeNull();
});
it('a denied single-store selection stops rather than repeating selection requests', async () => {
  mocks.services.mockResolvedValue({ status: 'none', organizationId: null, services: [], reason: 'NOT_STORE_MEMBER' });
  render(<StoreProvider><Probe /></StoreProvider>);
  await screen.findByText('error');
  await waitFor(() => expect(mocks.services).toHaveBeenCalledTimes(1));
  expect(mocks.stores).toHaveBeenCalledTimes(1);
});
