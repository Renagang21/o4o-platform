import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { StoreQRPage } from '../../StoreQRPage';

const api = vi.hoisted(() => ({ store: 'A', list: vi.fn(), placements: vi.fn(), scans: vi.fn() }));
vi.mock('../../../../hooks/useStoreOrganizationId', () => ({ useStoreOrganizationId: () => ({ organizationId: api.store }) }));
vi.mock('../../../../lib/storeOrganizationHeader', () => ({ getActiveStoreOrganizationId: () => api.store }));
vi.mock('../../../../contexts/AuthContext', () => ({ getAccessToken: () => null }));
vi.mock('../../../../api/storeQr', async original => ({ ...await original<object>(), getStoreQrCodes: api.list, listQrPlacements: api.placements, getQrPlacementAnalytics: api.scans }));
const qr = (id: string) => ({ id, title: `QR ${id}`, slug: id, landingType: 'page', isActive: true, landable: true, scanCount: 0 });
const feed = (ids = ['chosen', 'other']) => ({ success: true, data: { items: ids.map(qr), total: ids.length } });
beforeEach(() => {
  vi.resetAllMocks(); api.store = 'A'; api.list.mockResolvedValue(feed());
  api.placements.mockResolvedValue({ success: true, data: { items: [], activeCount: 0 } });
  api.scans.mockResolvedValue({ success: true, data: { byPlacement: [] } });
});
afterEach(cleanup);
const view = () => <MemoryRouter initialEntries={[{ pathname: '/store/marketing/qr', search: '?workspace=use', state: {
  storeOperationEntry: { scope: 'A:kpa-society', kind: 'qr', id: 'chosen', returnPath: '/store/execution', returnState: null },
} }]}><StoreQRPage /></MemoryRouter>;

it('opens the chosen QR once and keeps bulk selection within the displayed target', async () => {
  render(view()); await screen.findByRole('heading', { name: '사용처 · QR chosen' });
  expect(api.list).toHaveBeenCalledWith({ limit: 200, includeInactive: true });
  expect(screen.queryByText('QR other')).toBeNull();
  fireEvent.click(screen.getByLabelText('전체 선택 (1/1)'));
  fireEvent.click(screen.getByLabelText('전체 선택 (0/1)'));
  expect(screen.getByRole('button', { name: '선택 QR 출력 (1)' })).toBeTruthy();
  fireEvent.click(screen.getByTitle('사용처 닫기'));
  expect(screen.queryByRole('heading', { name: '사용처 · QR chosen' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '전체 QR 보기' }));
  await screen.findByText('QR other'); expect(api.placements).toHaveBeenCalledOnce();
});
it('distinguishes list failure from a missing target and can retry the same entry', async () => {
  api.list.mockRejectedValueOnce(Error('synthetic')).mockResolvedValueOnce(feed(['other']));
  render(view()); await screen.findByRole('alert');
  expect(screen.queryByText(/선택한 QR을 현재 조회한 목록에서 확인하지 못했습니다/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
  await screen.findByText(/선택한 QR을 현재 조회한 목록에서 확인하지 못했습니다/);
  expect(api.placements).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'QR 다시 확인' }));
  await screen.findByRole('heading', { name: '사용처 · QR chosen' });
});
it('a pending old-store list cannot reopen its target after switching stores', async () => {
  let resolve!: (value: ReturnType<typeof feed>) => void;
  api.list.mockReturnValueOnce(new Promise(done => { resolve = done; }));
  const h = render(view()); await waitFor(() => expect(api.list).toHaveBeenCalledOnce());
  api.store = 'B'; h.rerender(view());
  await screen.findByText('매장 또는 업무가 변경되었습니다. 현재 매장의 QR을 다시 선택해 주세요.');
  await act(async () => resolve(feed()));
  expect(api.placements).not.toHaveBeenCalled();
  expect(screen.queryByRole('link', { name: '위치별 현황으로 돌아가기' })).toBeNull();
});
