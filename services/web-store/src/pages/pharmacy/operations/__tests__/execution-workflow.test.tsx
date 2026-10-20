import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import Execution from '../../StoreExecutionPage';
const api = vi.hoisted(() => ({ store: 'A', tablets: vi.fn(), qrs: vi.fn() }));
vi.mock('../../../../hooks/useStoreOrganizationId', () => ({ useStoreOrganizationId: () => ({ organizationId: api.store }) }));
vi.mock('../../../../lib/storeOrganizationHeader', () => ({ getActiveStoreOrganizationId: () => api.store }));
vi.mock('../../../../lib/serviceContext', () => ({ getActiveServiceKey: () => 'kpa-society' }));
vi.mock('../../../../api/tabletDisplays', () => ({ fetchTablets: api.tablets }));
vi.mock('../../../../api/storeQr', () => ({ getStoreQrCodes: api.qrs }));
const tablet = (name = 'Tablet A') => ({ id: 'one', name, location: 'Counter', is_active: true });
const qrFeed = { success: true, data: { items: [], total: 0 } };
beforeEach(() => { vi.resetAllMocks(); api.store = 'A'; api.tablets.mockResolvedValue([tablet()]); api.qrs.mockResolvedValue(qrFeed); });
afterEach(cleanup);
const view = <MemoryRouter initialEntries={['/work/kpa-society/store/execution']}><Execution /></MemoryRouter>;
it('partial QR failure preserves confirmed tablets and retries only QR without a false empty state', async () => {
  api.qrs.mockResolvedValueOnce({ success: false, data: { items: [], total: 0 } });
  render(view);
  await screen.findByRole('alert'); await screen.findByText('Tablet A');
  expect(screen.getByRole('status').textContent).toContain('사용 없음으로 집계하지 않습니다');
  expect(screen.getByRole('link', { name: '태블릿 화면 변경' }).getAttribute('href')).toBe('/work/kpa-society/store/commerce/tablet-displays?workspace=use');
  fireEvent.click(screen.getByRole('button', { name: 'QR 현황 다시 시도' }));
  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  expect(api.tablets).toHaveBeenCalledOnce(); expect(api.qrs).toHaveBeenCalledTimes(2);
});
it('two failed sources never become an empty execution overview', async () => {
  api.tablets.mockRejectedValue(Error('synthetic')); api.qrs.mockRejectedValue(Error('synthetic'));
  render(view); await waitFor(() => expect(screen.getAllByRole('alert')).toHaveLength(2));
  expect(screen.queryByText('태블릿 화면 적용으로 가기')).toBeNull();
});
it('switching stores hides old results and rejects an old late response', async () => {
  let resolve!: (value: unknown) => void;
  api.tablets.mockReturnValueOnce(new Promise(done => { resolve = done; })).mockResolvedValueOnce([tablet('Tablet B')]);
  const { rerender } = render(view); api.store = 'B'; rerender(<MemoryRouter><Execution /></MemoryRouter>);
  await screen.findByText('Tablet B'); await act(async () => resolve([tablet('Late Tablet A')]));
  expect(screen.queryByText('Late Tablet A')).toBeNull();
});
it('truncated QR overview explicitly reports its loaded scope', async () => {
  api.qrs.mockResolvedValue({ success: true, data: { items: [], total: 250 } });
  render(view); await screen.findByText(/QR 전체 250건 중 0건 기준/);
});

it('filtered workspace capabilities also apply to location actions and the empty overview', async () => {
  const { rerender } = render(<MemoryRouter><Execution workspace availableKeys={['store-execution']} /></MemoryRouter>);
  await screen.findByText('현재 이용 가능한 태블릿·QR 기능이 없습니다.');
  expect(api.tablets).not.toHaveBeenCalled(); expect(api.qrs).not.toHaveBeenCalled();
  expect(screen.queryByRole('link', { name: '이 위치의 화면 변경' })).toBeNull();
  expect(screen.queryByRole('link', { name: '태블릿 화면 변경' })).toBeNull();
  expect(screen.queryByRole('link', { name: '태블릿 화면 적용으로 가기' })).toBeNull();
  api.tablets.mockResolvedValue([]);
  rerender(<MemoryRouter><Execution workspace availableKeys={['store-execution', 'tablet-displays']} /></MemoryRouter>);
  await screen.findByRole('link', { name: '태블릿 화면 적용으로 가기' });
  expect(api.tablets).toHaveBeenCalledOnce(); expect(api.qrs).not.toHaveBeenCalled();
});
it('a QR-only store never queries unavailable tablets, including on refresh', async () => {
  api.tablets.mockRejectedValue(Error('SERVICE_FEATURE_REQUIRED'));
  render(<MemoryRouter><Execution workspace availableKeys={['store-execution', 'qr']} /></MemoryRouter>);
  await screen.findByText('조회한 QR이 없습니다');
  expect(screen.queryByRole('alert')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '새로고침' }));
  await waitFor(() => expect(api.qrs).toHaveBeenCalledTimes(2));
  expect(api.tablets).not.toHaveBeenCalled();
});

it('the detail route inherits filtered workspace capabilities without explicit page props', async () => {
  const config = { basePath: '/store', menuSections: [{ items: [{ key: 'store-execution', subPath: '/execution' }, { key: 'qr', subPath: '/marketing/qr' }] }] };
  render(<MemoryRouter initialEntries={['/store/execution']}><Routes><Route element={<Outlet context={{ config }} />}><Route path="/store/execution" element={<Execution />} /></Route></Routes></MemoryRouter>);
  await screen.findByText('조회한 QR이 없습니다');
  expect(api.tablets).not.toHaveBeenCalled();
  expect(api.qrs).toHaveBeenCalledOnce();
  expect(screen.queryByRole('link', { name: '태블릿 화면 변경' })).toBeNull();
  expect(screen.getByRole('heading', { name: '위치별 저장 설정' })).toBeTruthy();
});
