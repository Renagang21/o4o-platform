import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
const api = vi.hoisted(() => ({ heartbeat: vi.fn(), idle: vi.fn(), settings: vi.fn(), clear: vi.fn() }));
vi.mock('../../api/tablet', () => ({
  loadStoredTabletDevice: () => ({ storeSlug: 'fixture', locationId: 'location', deviceToken: 'synthetic-token' }),
  clearStoredTabletDevice: api.clear, deviceHeartbeat: api.heartbeat, fetchTabletIdle: api.idle, fetchTabletSettings: api.settings,
  fetchTabletProducts: vi.fn(), submitTabletInterest: vi.fn(), checkTabletInterestStatus: vi.fn(), fetchTabletScreen: vi.fn(),
}));
vi.mock('@o4o/tablet-kiosk-core', () => ({ TabletKioskPage: () => <div>Kiosk fixture</div> }));
import Page from './TabletRunPage';
const display = () => render(<MemoryRouter initialEntries={['/tablet/fixture']}><Routes><Route path="/tablet/:slug" element={<Page />} /></Routes></MemoryRouter>);
beforeEach(() => { vi.clearAllMocks(); api.idle.mockResolvedValue([]); api.settings.mockResolvedValue({}); });
afterEach(cleanup);
it('retains device revocation and its reconnect action after a successful settings reload', async () => {
  api.heartbeat.mockRejectedValue(Object.assign(new Error('revoked'), { status: 401 }));
  display();
  expect(await screen.findByText('태블릿 연결이 해제되었습니다. 기기를 다시 연결해 주세요.')).toBeTruthy();
  await waitFor(() => expect(api.settings.mock.calls.length).toBeGreaterThanOrEqual(2));
  expect(screen.getByRole('link', { name: '기기 다시 연결' }).getAttribute('href')).toBe('/tablet/setup?reset=1');
  expect(api.clear).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: '다시 확인' }));
  await waitFor(() => expect(api.settings.mock.calls.length).toBeGreaterThanOrEqual(3));
  expect(screen.getByRole('alert').textContent).toContain('연결이 해제되었습니다');
});
it('retries a transient heartbeat immediately and clears its warning only after success', async () => {
  api.heartbeat.mockRejectedValueOnce(new Error('unavailable')).mockResolvedValue({ locationId: 'location', version: 'v2' });
  display();
  await screen.findByText('태블릿 연결 상태를 확인하지 못했습니다.');
  fireEvent.click(screen.getByRole('button', { name: '다시 확인' }));
  await waitFor(() => expect(api.heartbeat).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  expect(api.clear).not.toHaveBeenCalled();
});
