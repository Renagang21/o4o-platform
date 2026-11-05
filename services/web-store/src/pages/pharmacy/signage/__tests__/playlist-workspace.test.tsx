import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { PlaylistNameEditor } from '../PlaylistNameEditor';
import { signageVideoOrigin } from '../signageVideoList';
import { useSignagePlaylists } from '../../hooks/useSignagePlaylists';
const api = vi.hoisted(() => ({ fetchStorePlaylists: vi.fn(), updateStorePlaylist: vi.fn(), deleteStorePlaylist: vi.fn(), fetchPlaylistItems: vi.fn(async () => []), addPlaylistItem: vi.fn(), addPlaylistItemFromLibrary: vi.fn(), addPlaylistItemFromSignage: vi.fn(), deletePlaylistItem: vi.fn(), reorderPlaylistItems: vi.fn() }));
vi.mock('../../../../api/storePlaylist', () => api);
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const playlist = { id: 'list', name: '대기실', publishStatus: 'draft' } as any;
it('edits a name, prevents empty/duplicate submission and resets on external name change', () => {
  const save = vi.fn(); const view = render(<PlaylistNameEditor playlist={playlist} busy={false} onSave={save} />);
  expect((screen.getByRole('button', { name: '이름 저장' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.change(screen.getByRole('textbox', { name: '재생목록 이름' }), { target: { value: '카운터' } });
  fireEvent.submit(screen.getByRole('form', { name: '재생목록 이름 수정' }));
  expect(save).toHaveBeenCalledWith(playlist, '카운터');
  view.rerender(<PlaylistNameEditor playlist={{...playlist,name:'서버 저장 이름'}} busy onSave={save} />);
  expect(screen.getByDisplayValue('서버 저장 이름')).toBeTruthy();
  expect((screen.getByRole('button', { name: '이름 저장' }) as HTMLButtonElement).disabled).toBe(true);
});
it('renames through the existing API and refreshes actual list data', async () => {
  api.fetchStorePlaylists.mockResolvedValue([playlist]); api.updateStorePlaylist.mockResolvedValue({...playlist,name:'새 이름'});
  const { result } = renderHook(() => useSignagePlaylists('store-a'));
  await waitFor(() => expect(result.current.playlists).toHaveLength(1));
  await act(async () => { await result.current.handleRenamePlaylist(playlist, ' 새 이름 '); });
  expect(api.updateStorePlaylist).toHaveBeenCalledWith('list', {name:'새 이름'});
  expect(api.fetchStorePlaylists).toHaveBeenCalledTimes(2);
});
it('keeps rename errors visible and does not pretend the server saved a new name', async () => {
  api.fetchStorePlaylists.mockResolvedValue([playlist]); api.updateStorePlaylist.mockRejectedValue(new Error('denied'));
  const { result } = renderHook(() => useSignagePlaylists('store-a'));
  await waitFor(() => expect(result.current.playlists).toHaveLength(1));
  act(() => result.current.setSelectedPlaylistId('list'));
  await waitFor(() => expect(result.current.playlistItemsLoading).toBe(false));
  await act(async () => { await result.current.handleRenamePlaylist(playlist, '새 이름'); });
  expect(result.current.playlistActionError).toContain('완료하지 못했습니다');
  expect(result.current.playlists[0].name).toBe('대기실');
});
it.each([['community','커뮤니티'],['semi-franchise','가입 협업체'],['unknown','제공 자료']])('keeps import origin separate from video host: %s', (service,label) => {
  expect(signageVideoOrigin({source:'snapshot',_snapshot:{sourceService:service}} as any)).toBe(label);
  expect(signageVideoOrigin({source:'direct',sourceType:'youtube'} as any)).toBe('직접 등록');
});
