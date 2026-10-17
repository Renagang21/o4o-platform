import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SignagePlaybackPage } from '../../SignagePlaybackPage';
import { SignagePlayerSelectPage } from '../../SignagePlayerSelectPage';

const m = vi.hoisted(() => ({ store: 'A', get: vi.fn(), active: vi.fn(), playlists: vi.fn(), publicCatalog: vi.fn() }));
vi.mock('../../../../hooks/useStoreOperationScope', () => ({ useStoreOperationScope: () => ({ key: m.store, isCurrent: () => true }) }));
vi.mock('../../../../hooks/useStoreOrganizationId', () => ({ useStoreOrganizationId: () => ({ organizationId: m.store, loading: false }) }));
vi.mock('../../../../api/client', () => ({ apiClient: { get: m.get } }));
vi.mock('../../../../api/signageSchedule', () => ({ fetchActiveContent: m.active }));
vi.mock('../../../../api/storePlaylist', () => ({ fetchStorePlaylists: m.playlists }));
vi.mock('../../../../contexts/AuthContext', () => ({ getAccessToken: () => null }));
vi.mock('../../../../lib/api/signageV2', () => ({ publicContentApi: { getPlaylist: m.publicCatalog } }));
const snapshot = { id: 'item', title: '제품 안내', contentJson: { sourceUrl: 'https://youtu.be/abcdefghijk', mediaType: 'video' }, displayOrder: 0 };
const app = (id = 'store-guide') => <MemoryRouter initialEntries={[`/store/marketing/signage/play/${id}`]}><Routes><Route path="/store/marketing/signage/play/:playlistId" element={<SignagePlaybackPage />} /></Routes></MemoryRouter>;
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
beforeEach(() => {
  vi.clearAllMocks(); m.store = 'A';
  m.get.mockResolvedValue({ success: true, data: { name: '매장 안내 A', items: [snapshot] } });
  m.active.mockResolvedValue({ schedule: null, items: [] }); m.playlists.mockResolvedValue([]);
});
it('plays the store model returned by selection through its existing published snapshot reader', async () => {
  const network = vi.fn(); vi.stubGlobal('fetch', network);
  render(app()); await screen.findByText('매장 안내 A');
  expect(m.get).toHaveBeenCalledWith('/store-playlists/public/store-guide');
  expect(network).not.toHaveBeenCalled(); expect(m.publicCatalog).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /일반 화면으로 재생/ }));
  expect(document.querySelector('iframe')?.title).toBe('제품 안내');
});
it('never uses a public catalog fallback for access failures, and offers a deliberate retry', async () => {
  const network = vi.fn(); vi.stubGlobal('fetch', network);
  m.get.mockRejectedValueOnce({ status: 403 }); render(app());
  await screen.findByText(/재생 자료를 불러오지 못했습니다/);
  expect(network).not.toHaveBeenCalled(); expect(m.publicCatalog).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
  await screen.findByText('매장 안내 A'); expect(m.get).toHaveBeenCalledTimes(2);
});
it('retains the legacy broadcast reader only when the ID is absent from the store model', async () => {
  m.get.mockRejectedValue({ status: 404 });
  const network = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { id: 'broadcast-guide', name: '방송 안내', items: [] } }), { status: 200 }));
  vi.stubGlobal('fetch', network); render(app('broadcast-guide'));
  await screen.findByText('재생할 항목이 없습니다.');
  expect(network.mock.calls[0][0]).toContain('/playlists/broadcast-guide');
  expect(m.publicCatalog).not.toHaveBeenCalled();
});
it('ignores a delayed playback response after switching stores', async () => {
  let resolve!: (value: object) => void;
  m.get.mockReturnValueOnce(new Promise(yes => { resolve = yes; }));
  const view = render(app()); m.store = 'B';
  m.get.mockResolvedValue({ success: true, data: { name: '매장 안내 B', items: [snapshot] } });
  view.rerender(app()); await screen.findByText('매장 안내 B');
  await act(async () => resolve({ success: true, data: { name: '매장 안내 A', items: [snapshot] } }));
  expect(screen.queryByText('매장 안내 A')).toBeNull();
});
it('distinguishes a failed schedule lookup from an empty schedule and supports retry', async () => {
  m.active.mockRejectedValueOnce(new Error('private'));
  render(<MemoryRouter initialEntries={['/work/kpa-society/store/marketing/signage/player']}><SignagePlayerSelectPage /></MemoryRouter>);
  await screen.findByRole('alert');
  expect(screen.queryByText('현재 시간에 적용된 일정이 없습니다.')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '일정 다시 시도' }));
  await screen.findByText('현재 시간에 적용된 일정이 없습니다.');
  expect(m.active).toHaveBeenCalledTimes(2);
  expect(screen.getByRole('link', { name: '재생 시간 확인' }).getAttribute('href')).toBe('/work/kpa-society/store/marketing/signage/schedules');
});
it('clears the previous schedule when a store switch receives an empty result', async () => {
  m.active.mockResolvedValueOnce({ schedule: { id: 'schedule', name: '매장 A 일정', startTime: '09:00:00', endTime: '18:00:00', storePlaylistId: 'store-guide' }, items: [snapshot] });
  const view = render(<MemoryRouter><SignagePlayerSelectPage /></MemoryRouter>);
  await screen.findByText('현재 시간의 재생 일정: 매장 A 일정');
  m.store = 'B'; view.rerender(<MemoryRouter><SignagePlayerSelectPage /></MemoryRouter>);
  await waitFor(() => expect(screen.queryByText('현재 시간의 재생 일정: 매장 A 일정')).toBeNull());
  await screen.findByText('현재 시간에 적용된 일정이 없습니다.');
});
