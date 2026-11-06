import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SignageQuickStart } from '../SignageQuickStart';
import { SignagePlaylistPreview } from '../SignagePlaylistPreview';
import type { UnifiedVideoItem } from '../signageVideoList';
import type { StorePlaylist, StorePlaylistItem } from '../../../../api/storePlaylist';

const m = vi.hoisted(() => ({ create: vi.fn(), add: vi.fn(), media: vi.fn(), required: vi.fn(), reorder: vi.fn() }));
vi.mock('../../../../api/storePlaylist', () => ({ createStorePlaylist: m.create, addPlaylistItem: m.add, addPlaylistItemFromSignage: m.media, fetchRequiredPlaylistVideos: m.required, reorderPlaylistItems: m.reorder }));
const playlist = { id: 'new-guide', name: '고객 안내', itemCount: 0, publishStatus: 'draft' } as StorePlaylist;
const videos = [{ id: 'snapshot', title: '고객 안내', source: 'snapshot' }, { id: 'media_video', title: '제품 영상', source: 'direct', sourceUrl: 'https://youtu.be/abcdefghijk' }] as UnifiedVideoItem[];
const saved = vi.fn(), closed = vi.fn();
function fixture(current = () => true) { return <SignageQuickStart videos={videos} organizationId="store-A" isCurrent={current} onSaved={saved} onClose={closed} />; }
async function select() {
  fireEvent.change(screen.getByLabelText('재생목록 제목'), { target: { value: '고객 안내' } });
  fireEvent.click(screen.getByRole('button', { name: /^동영상 추가$/ }));
  fireEvent.click(screen.getByLabelText(/고객 안내/)); fireEvent.click(screen.getByLabelText(/제품 영상/));
  fireEvent.click(screen.getByRole('button', { name: '선택한 동영상 추가' }));
  await waitFor(() => expect((screen.getByRole('button', { name: '재생목록 저장' }) as HTMLButtonElement).disabled).toBe(false));
}
afterEach(cleanup);
beforeEach(() => { vi.resetAllMocks(); m.create.mockResolvedValue(playlist); m.add.mockResolvedValue({id: 'saved-snapshot'}); m.media.mockResolvedValue({id: 'saved-media'}); m.required.mockResolvedValue([]); m.reorder.mockResolvedValue(undefined); });

it('chooses materials before creating a named draft and never publishes or schedules automatically', async () => {
  render(fixture()); await select(); expect(m.create).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '재생목록 저장' }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(m.create).toHaveBeenCalledWith({ name: '고객 안내', playlistType: 'LIST', tags: [], clientRequestId: expect.any(String) });
  expect(m.add).toHaveBeenCalledWith('new-guide', 'snapshot');
  expect(m.media).toHaveBeenCalledWith('new-guide', 'video', 'store-A');
  expect(saved).toHaveBeenCalledWith(expect.objectContaining({ id: 'new-guide', itemCount: 2, publishStatus: 'draft' }));
});
it('reuses the header and confirmed successful materials after an explicit rejected item, blocking duplicate clicks', async () => {
  m.media.mockRejectedValueOnce({ status: 400 });
  render(fixture()); await select(); fireEvent.click(screen.getByRole('button', { name: '재생목록 저장' }));
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: '남은 자료 다시 추가' }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(m.create).toHaveBeenCalledTimes(1); expect(m.add).toHaveBeenCalledTimes(1); expect(m.media).toHaveBeenCalledTimes(2);
});
it('does not blindly resubmit an ambiguous result and lets the user inspect the same saved draft', async () => {
  m.media.mockRejectedValueOnce(new Error('network lost'));
  render(fixture()); await select(); fireEvent.click(screen.getByRole('button', { name: '재생목록 저장' }));
  await screen.findByRole('alert');
  expect((screen.getByRole('button', { name: '저장 결과 확인·재시도' }) as HTMLButtonElement).disabled).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: '저장된 초안에서 이어하기' }));
  expect(closed).toHaveBeenCalledWith(playlist);
});
it('locks close and repeated submissions during saving, then stops later writes after a store switch', async () => {
  let resolve!: (value: StorePlaylist) => void;
  m.create.mockReturnValue(new Promise(yes => { resolve = yes; }));
  let current = true;
  render(fixture(() => current)); await select();
  const save = screen.getByRole('button', { name: '재생목록 저장' });
  fireEvent.click(save); fireEvent.click(save);
  fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: true, cancelable: true }));
  expect(closed).not.toHaveBeenCalled(); expect(m.create).toHaveBeenCalledTimes(1);
  current = false; await act(async () => resolve(playlist));
  expect(m.add).not.toHaveBeenCalled(); expect(m.media).not.toHaveBeenCalled(); expect(saved).not.toHaveBeenCalled();
});
it('preserves selected order through filtering and makes video preview an explicit action', async () => {
  render(fixture()); await select();
  expect(document.querySelector('iframe')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /^동영상 추가$/ }));
  fireEvent.change(screen.getByLabelText('자료 찾기'), { target: { value: '없는 검색' } });
  expect(screen.getByText('검색 결과가 없습니다.')).toBeTruthy();
  expect(screen.getByRole('region', { name: '선택한 자료 확인' }).textContent).toContain('고객 안내');
  fireEvent.click(screen.getByRole('button', { name: '영상 확인' }));
  expect(screen.getByLabelText('선택 영상 미리보기')).toBeTruthy();
});
it('shows actual saved snapshot order and does not embed arbitrary origins in the preview', () => {
  const item = (id: string, title: string, url: string, displayOrder: number): StorePlaylistItem => ({
    id, title, snapshotId: id, contentJson: { sourceUrl: url }, displayOrder,
    isForced: false, isLocked: false, forcedStartAt: null, forcedEndAt: null,
    createdAt: '2026-10-16', assetType: 'signage',
  });
  render(<SignagePlaylistPreview name="매장 안내" items={[
    item('one', '첫 안내', 'javascript:unsafe()', 0),
    item('two', '둘째 안내', 'https://youtu.be/abcdefghijk', 1),
  ]} onClose={closed} />);
  expect(document.querySelector('iframe')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '2. 둘째 안내' }));
  expect(screen.getByLabelText('둘째 안내 미리보기')).toBeTruthy();
});

it('excludes protected materials and refuses a selection whose protection changed before saving', async () => {
  const view = render(fixture()); await select();
  view.rerender(<SignageQuickStart videos={videos.map(video => video.id === 'snapshot' ? { ...video, isLocked: true } : video)} organizationId="store-A" isCurrent={() => true} onSaved={saved} onClose={closed} />);
  expect(screen.queryByRole('checkbox', { name: /고객 안내/ })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '재생목록 저장' }));
  expect(screen.getByRole('alert').textContent).toContain('상태가 바뀌었습니다');
  expect(m.create).not.toHaveBeenCalled(); expect(m.add).not.toHaveBeenCalled();
});

it('allows repeated additions without duplicates, changes order and saves tags and actual item order', async () => {
  render(fixture()); await select();
  fireEvent.change(screen.getByLabelText('재생목록 태그'), { target: { value: '건강, 매장, 건강' } });
  fireEvent.click(screen.getByRole('button', { name: '제품 영상 위로' }));
  fireEvent.click(screen.getByRole('button', { name: /^동영상 추가$/ }));
  expect((screen.getByRole('checkbox', { name: /제품 영상/ }) as HTMLInputElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: '선택한 동영상 추가' }));
  expect(screen.getByRole('region', { name: '선택한 자료 확인' }).textContent).toContain('총 2개');
  fireEvent.click(screen.getByRole('button', { name: '재생목록 저장' }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(m.create).toHaveBeenCalledWith({ name: '고객 안내', playlistType: 'LIST', tags: ['건강', '매장'], clientRequestId: expect.any(String) });
  expect(m.reorder).toHaveBeenCalledWith('new-guide', ['saved-media', 'saved-snapshot']);
});
it('includes effective requirements without a removable choice and removes them at expiry while offline', async () => {
  const end = new Date(Date.now() + 2000).toISOString();
  m.required.mockResolvedValue([{ id: 'forced-fixture', title: 'Required fixture', isForced: true, forcedStartAt: null, forcedEndAt: end, contentJson: { duration: 30 } }]);
  vi.useFakeTimers();
  try {
    await act(async () => { render(fixture()); });
    expect(screen.getByText(/Required fixture/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Required fixture 목록에서 제거' })).toBeNull();
    expect(screen.getByRole('region', { name: '선택한 자료 확인' }).textContent).toContain('0분 30초');
    await act(async () => { vi.advanceTimersByTime(3000); });
    expect(screen.queryByText(/Required fixture/)).toBeNull();
  } finally { vi.useRealTimers(); }
});

it('reuses the same request identity after an unknown header response', async () => {
  m.create.mockRejectedValueOnce(new Error('network lost'));
  render(fixture()); await select();
  fireEvent.click(screen.getByRole('button', { name: '재생목록 저장' })); await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: '저장 결과 확인·재시도' }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(m.create).toHaveBeenCalledTimes(2);
  expect(m.create.mock.calls[0][0]).toEqual(m.create.mock.calls[1][0]);
});

it('keeps the preview action for stored uploads and their snapshots', () => {
  const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  try {
  const stored = [
    { id: 'media_stored', title: 'Stored upload', source: 'direct', sourceUrl: 'https://storage.example.test/video.mp4', _media: { sourceType: 'url' } },
    { id: 'stored-copy', title: 'Stored copy', source: 'snapshot', _snapshot: { contentJson: { sourceType: 'url', sourceUrl: 'https://storage.example.test/copy.mp4' } } },
  ] as UnifiedVideoItem[];
  render(<SignageQuickStart videos={stored} initialSelected={stored.map(video => video.id)} organizationId="store-A" isCurrent={() => true} onSaved={saved} onClose={closed} />);
  const preview = screen.getAllByRole('button', { name: '영상 확인' });
  expect(preview).toHaveLength(2);
  fireEvent.click(preview[0]);
  expect(screen.getByLabelText('선택 영상 미리보기').tagName).toBe('VIDEO');
  fireEvent.click(preview[1]);
  expect(screen.getByLabelText('선택 영상 미리보기').getAttribute('src')).toBe('https://storage.example.test/copy.mp4');
  } finally { cleanup(); play.mockRestore(); pause.mockRestore(); }
});
