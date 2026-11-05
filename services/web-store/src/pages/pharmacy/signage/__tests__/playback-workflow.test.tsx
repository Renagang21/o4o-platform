import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SignagePlaybackPage } from '../../SignagePlaybackPage';
import { SignagePlayerSelectPage } from '../../SignagePlayerSelectPage';

const m = vi.hoisted(() => ({ store: 'A', get: vi.fn(), playlists: vi.fn(), publicCatalog: vi.fn() }));
vi.mock('../../../../hooks/useStoreOperationScope', () => ({ useStoreOperationScope: () => ({ key: m.store, isCurrent: () => true }) }));
vi.mock('../../../../hooks/useStoreOrganizationId', () => ({ useStoreOrganizationId: () => ({ organizationId: m.store, loading: false }) }));
vi.mock('../../../../api/client', () => ({ apiClient: { get: m.get } }));
vi.mock('../../../../api/storePlaylist', () => ({ fetchStorePlaylists: m.playlists }));
vi.mock('../../../../contexts/AuthContext', () => ({ getAccessToken: () => null }));
vi.mock('../../../../lib/api/signageV2', () => ({ publicContentApi: { getPlaylist: m.publicCatalog } }));
const snapshot = { id: 'item', title: '제품 안내', contentJson: { sourceUrl: 'https://youtu.be/abcdefghijk', mediaType: 'video' }, displayOrder: 0 };
const app = (id = 'store-guide') => <MemoryRouter initialEntries={[`/store/marketing/signage/play/${id}`]}><Routes><Route path="/store/marketing/signage/play/:playlistId" element={<SignagePlaybackPage />} /></Routes></MemoryRouter>;
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
beforeEach(() => {
  vi.clearAllMocks(); m.store = 'A';
  m.get.mockResolvedValue({ success: true, data: { name: '매장 안내 A', items: [snapshot] } });
  m.playlists.mockResolvedValue([]);
});
it('plays the store model returned by selection through its existing published snapshot reader', async () => {
  const network = vi.fn(); vi.stubGlobal('fetch', network);
  render(app()); await screen.findByText('매장 안내 A');
  expect(m.get).toHaveBeenCalledWith('/store-playlists/public/store-guide');
  expect(network).not.toHaveBeenCalled(); expect(m.publicCatalog).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /일반 화면으로 재생/ }));
  expect(screen.getByLabelText('제품 안내')).toBeTruthy();
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
it('does not refetch on an ended event and supports an explicit reload', async () => {
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  m.get.mockResolvedValue({ success: true, data: { name: 'Stored A', items: [{ ...snapshot, contentJson: { sourceUrl: '/a.mp4', mediaType: 'video' } }] } });
  render(app()); await screen.findByText('Stored A');
  fireEvent.click(screen.getByRole('button', { name: /일반 화면으로 재생/ }));
  fireEvent.ended(document.querySelector('video')!); expect(m.get).toHaveBeenCalledTimes(1);
  m.get.mockResolvedValue({ success: true, data: { name: 'Stored B', items: [snapshot] } });
  fireEvent.click(screen.getByRole('button', { name: '변경한 목록 다시 적용' }));
  await screen.findByText('Stored B'); expect(m.get).toHaveBeenCalledTimes(2);
  vi.restoreAllMocks();
});

it('plays forced-content hosted URLs without mediaType as videos and never starts an image cutoff timer', async () => {
  let events: any; const destroy = vi.fn();
  (window as any).YT = { Player: class { constructor(_node: unknown, options: any) { events = options.events; } playVideo() {} destroy = destroy; } };
  m.get.mockResolvedValue({ success: true, data: { name: 'Forced', items: [{ ...snapshot, contentJson: { url: 'https://youtu.be/abcdefghijk', sourceType: 'youtube', embedId: 'abcdefghijk' } }] } });
  render(app()); await screen.findByText('Forced');
  fireEvent.click(screen.getByRole('button', { name: /일반 화면으로 재생/ })); await act(async () => {});
  expect(screen.getByLabelText('제품 안내')).toBeTruthy(); expect(document.querySelector('img')).toBeNull();
  vi.useFakeTimers(); act(() => { events.onStateChange({ data: 1 }); vi.advanceTimersByTime(60000); });
  expect(destroy).not.toHaveBeenCalled(); expect(m.get).toHaveBeenCalledTimes(1);
  act(() => events.onStateChange({ data: 0 })); expect(destroy).toHaveBeenCalledTimes(1);
  cleanup(); delete (window as any).YT; vi.useRealTimers();
});

it('opens an isolated chooser tab and does not read schedules or playlists in the management page', () => {
  render(<MemoryRouter initialEntries={['/store/marketing/signage/player']}><SignagePlayerSelectPage /></MemoryRouter>);
  const link = screen.getByRole('link', { name: '재생 화면 열기' });
  expect(link.getAttribute('href')).toBe('/store/marketing/signage/display');
  expect(link.getAttribute('target')).toBe('_blank');
  expect(m.playlists).not.toHaveBeenCalled();
});
it('shows only published playlists, keeps selection actionable, and chooses in the display tab', async () => {
  m.playlists.mockResolvedValue([{ id: 'store-guide', name: '게시 안내', publishStatus: 'published', itemCount: 1 }, { id: 'draft', name: '비공개 초안', publishStatus: 'draft' }, { id: 'inactive', name: '중지된 안내', publishStatus: 'published', isActive: false }]);
  render(<MemoryRouter initialEntries={['/store/marketing/signage/display']}><Routes>
    <Route path="/store/marketing/signage/display" element={<SignagePlayerSelectPage selection />} />
    <Route path="/store/marketing/signage/play/:playlistId" element={<SignagePlaybackPage />} />
  </Routes></MemoryRouter>);
  await screen.findByText('게시 안내'); expect(screen.queryByText('비공개 초안')).toBeNull(); expect(screen.queryByText('중지된 안내')).toBeNull();
  fireEvent.click(screen.getAllByRole('checkbox')[1]);
  fireEvent.click(screen.getByRole('button', { name: '선택한 재생목록 열기' }));
  await screen.findByText('매장 안내 A');
  expect(m.get).toHaveBeenCalledWith('/store-playlists/public/store-guide');
});
it('distinguishes failed playlist loading from empty results and allows retry', async () => {
  m.playlists.mockRejectedValueOnce(new Error('offline'));
  render(<MemoryRouter><SignagePlayerSelectPage selection /></MemoryRouter>);
  await screen.findByText('플레이리스트를 불러오지 못했습니다.');
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
  await waitFor(() => expect(m.playlists).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.queryByText('플레이리스트를 불러오지 못했습니다.')).toBeNull());
});
it('falls back to normal playback if the browser rejects fullscreen', async () => {
  Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', { configurable: true, value: vi.fn().mockRejectedValue(new Error('denied')) });
  m.get.mockResolvedValue({ success: true, data: { name: 'Image', items: [{ ...snapshot, contentJson: { sourceUrl: '/image.png', mediaType: 'image' } }] } });
  render(app()); await screen.findByText('Image');
  fireEvent.click(screen.getByRole('button', { name: /전체화면으로 재생/ }));
  await screen.findByText('전체화면을 사용할 수 없어 일반 화면으로 재생합니다.');
  expect(screen.getByRole('img')).toBeTruthy();
  delete (HTMLElement.prototype as any).requestFullscreen;
});
it('skips failed videos and offers a retry when every video fails', async () => {
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  m.get.mockResolvedValue({ success: true, data: { name: 'Videos', items: [
    { ...snapshot, id: 'one', contentJson: { sourceUrl: '/one.mp4', mediaType: 'video' } },
    { ...snapshot, id: 'two', contentJson: { sourceUrl: '/two.mp4', mediaType: 'video' } },
  ] } });
  render(app()); await screen.findByText('Videos'); fireEvent.click(screen.getByRole('button', { name: /일반 화면으로 재생/ }));
  fireEvent.error(document.querySelector('video')!);
  await waitFor(() => expect(document.querySelector('video')?.getAttribute('src')).toBe('/two.mp4'), { timeout: 4000 });
  fireEvent.error(document.querySelector('video')!);
  await screen.findByText(/재생할 수 있는 영상이 없습니다/);
  fireEvent.click(screen.getByRole('button', { name: '다시 재생' }));
  await waitFor(() => expect(document.querySelector('video')?.getAttribute('src')).toBe('/one.mp4'));
  vi.restoreAllMocks();
});
it('reports clipboard failure without claiming the address was copied', async () => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
  render(app()); await screen.findByText('매장 안내 A');
  fireEvent.click(screen.getByRole('button', { name: '재생 주소 복사' }));
  await screen.findByText(/주소 복사에 실패했습니다/);
  expect(screen.queryByText('재생 주소를 복사했습니다.')).toBeNull();
});

it('drops the previous display list response after a store switch', async () => {
  let resolve!: (value: object[]) => void;
  m.playlists.mockReturnValueOnce(new Promise(yes => { resolve = yes; }));
  const view = render(<MemoryRouter><SignagePlayerSelectPage selection /></MemoryRouter>);
  m.store = 'B'; m.playlists.mockResolvedValue([{id:'new',name:'새 매장 목록',publishStatus:'published'}]);
  view.rerender(<MemoryRouter><SignagePlayerSelectPage selection /></MemoryRouter>);
  await screen.findByText('새 매장 목록');
  await act(async () => resolve([{id:'old',name:'이전 매장 목록',publishStatus:'published'}]));
  expect(screen.queryByText('이전 매장 목록')).toBeNull();
});
it('redirects retired schedule playback URLs to the playlist chooser without reading a schedule', async () => {
  render(<MemoryRouter initialEntries={['/store/marketing/signage/play/_schedule']}><Routes>
    <Route path="/store/marketing/signage/play/:playlistId" element={<SignagePlaybackPage />} />
    <Route path="/store/marketing/signage/display" element={<SignagePlayerSelectPage selection />} />
  </Routes></MemoryRouter>);
  await screen.findByText('게시된 플레이리스트가 없습니다.');
  expect(m.get).not.toHaveBeenCalled();
});

it('stops a playing required video at its deadline without waiting for a network refresh', async () => {
  vi.useFakeTimers();
  try {
    m.get.mockResolvedValue({ success: true, data: { name: 'Window fixture', items: [
      { ...snapshot, id: 'forced-fixture', title: 'Required fixture', isForced: true, contentJson: { ...snapshot.contentJson, forcedEndAt: new Date(Date.now() + 2000).toISOString() } },
      { ...snapshot, id: 'ordinary-fixture', title: 'Ordinary fixture' },
    ] } });
    await act(async () => { render(app()); });
    fireEvent.click(screen.getByRole('button', { name: /일반 화면으로 재생/ }));
    expect(screen.getByLabelText('Required fixture')).toBeTruthy();
    m.get.mockRejectedValue(new Error('offline'));
    await act(async () => { vi.advanceTimersByTime(3000); });
    expect(screen.queryByLabelText('Required fixture')).toBeNull();
    expect(screen.getByLabelText('Ordinary fixture')).toBeTruthy();
  } finally { vi.useRealTimers(); }
});
