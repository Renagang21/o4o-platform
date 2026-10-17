import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SignageQuickStart } from '../SignageQuickStart';
import { SignagePlaylistPreview } from '../SignagePlaylistPreview';
import type { UnifiedVideoItem } from '../signageVideoList';
import type { StorePlaylist, StorePlaylistItem } from '../../../../api/storePlaylist';

const m = vi.hoisted(() => ({ create: vi.fn(), add: vi.fn(), media: vi.fn() }));
vi.mock('../../../../api/storePlaylist', () => ({ createStorePlaylist: m.create, addPlaylistItem: m.add, addPlaylistItemFromSignage: m.media }));
const playlist = { id: 'new-guide', name: '고객 안내', itemCount: 0, publishStatus: 'draft' } as StorePlaylist;
const videos = [{ id: 'snapshot', title: '고객 안내', source: 'snapshot' }, { id: 'media_video', title: '제품 영상', source: 'direct', sourceUrl: 'https://youtu.be/abcdefghijk' }] as UnifiedVideoItem[];
const saved = vi.fn(), closed = vi.fn();
function fixture(current = () => true) { return <SignageQuickStart videos={videos} organizationId="store-A" isCurrent={current} onSaved={saved} onClose={closed} />; }
function select() { fireEvent.click(screen.getByLabelText(/고객 안내/)); fireEvent.click(screen.getByLabelText(/제품 영상/)); }
afterEach(cleanup);
beforeEach(() => { vi.resetAllMocks(); m.create.mockResolvedValue(playlist); m.add.mockResolvedValue({}); m.media.mockResolvedValue({}); });

it('chooses materials before creating a named draft and never publishes or schedules automatically', async () => {
  render(fixture()); select(); expect(m.create).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '선택 자료로 초안 저장' }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(m.create).toHaveBeenCalledWith({ name: '고객 안내', playlistType: 'LIST' });
  expect(m.add).toHaveBeenCalledWith('new-guide', 'snapshot');
  expect(m.media).toHaveBeenCalledWith('new-guide', 'video', 'store-A');
  expect(saved).toHaveBeenCalledWith(expect.objectContaining({ id: 'new-guide', itemCount: 2, publishStatus: 'draft' }));
});
it('reuses the header and confirmed successful materials after an explicit rejected item, blocking duplicate clicks', async () => {
  m.media.mockRejectedValueOnce({ status: 400 });
  render(fixture()); select(); fireEvent.click(screen.getByRole('button', { name: '선택 자료로 초안 저장' }));
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: '남은 자료 다시 추가' }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(m.create).toHaveBeenCalledTimes(1); expect(m.add).toHaveBeenCalledTimes(1); expect(m.media).toHaveBeenCalledTimes(2);
});
it('does not blindly resubmit an ambiguous result and lets the user inspect the same saved draft', async () => {
  m.media.mockRejectedValueOnce(new Error('network lost'));
  render(fixture()); select(); fireEvent.click(screen.getByRole('button', { name: '선택 자료로 초안 저장' }));
  await screen.findByRole('alert');
  expect((screen.getByRole('button', { name: '남은 자료 다시 추가' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: '저장된 초안에서 이어하기' }));
  expect(closed).toHaveBeenCalledWith(playlist);
});
it('locks close and repeated submissions during saving, then stops later writes after a store switch', async () => {
  let resolve!: (value: StorePlaylist) => void;
  m.create.mockReturnValue(new Promise(yes => { resolve = yes; }));
  let current = true;
  render(fixture(() => current)); select();
  const save = screen.getByRole('button', { name: '선택 자료로 초안 저장' });
  fireEvent.click(save); fireEvent.click(save);
  fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: true, cancelable: true }));
  expect(closed).not.toHaveBeenCalled(); expect(m.create).toHaveBeenCalledTimes(1);
  current = false; await act(async () => resolve(playlist));
  expect(m.add).not.toHaveBeenCalled(); expect(m.media).not.toHaveBeenCalled(); expect(saved).not.toHaveBeenCalled();
});
it('preserves selected order through filtering and makes video preview an explicit action', () => {
  render(fixture()); select();
  expect(document.querySelector('iframe')).toBeNull();
  fireEvent.change(screen.getByLabelText('자료 찾기'), { target: { value: '없는 검색' } });
  expect(screen.getByText('검색 결과가 없습니다.')).toBeTruthy();
  expect(screen.getByRole('region', { name: '선택한 자료 확인' }).textContent).toContain('고객 안내제품 영상');
  fireEvent.click(screen.getByRole('button', { name: '영상 확인' }));
  expect(document.querySelector('iframe')?.src).toBe('https://www.youtube-nocookie.com/embed/abcdefghijk');
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
  expect(document.querySelector('iframe')?.title).toBe('둘째 안내 미리보기');
});

it('excludes protected materials and refuses a selection whose protection changed before saving', () => {
  const view = render(fixture()); fireEvent.click(screen.getByLabelText(/고객 안내/));
  view.rerender(<SignageQuickStart videos={videos.map(video => video.id === 'snapshot' ? { ...video, isLocked: true } : video)} organizationId="store-A" isCurrent={() => true} onSaved={saved} onClose={closed} />);
  expect(screen.queryByRole('checkbox', { name: /고객 안내/ })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '선택 자료로 초안 저장' }));
  expect(screen.getByRole('alert').textContent).toContain('상태가 바뀌었습니다');
  expect(m.create).not.toHaveBeenCalled(); expect(m.add).not.toHaveBeenCalled();
});
