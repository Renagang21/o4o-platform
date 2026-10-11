import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
const mocks = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock('../../lib/apiClient', () => ({ api: mocks }));
import PublicPage from './CommunityPublicPostsPage';
import Manager from './CommunityPublicReadManager';
const post = { id: 'fixture', slug: 'fixture', title: '명시적 공개 글', boardName: '샘플 게시판', createdAt: '2026-10-11', content: [] };
const renderPublic = () => render(<MemoryRouter initialEntries={['/communities/fixture/public']}><Routes>
  <Route path="/communities/:communityKey/public" element={<PublicPage />} />
  <Route path="/communities/:communityKey/public/post/:slug" element={<PublicPage />} />
</Routes></MemoryRouter>);
beforeEach(() => vi.resetAllMocks()); afterEach(cleanup);

describe('explicit public read screens', () => {
  it('guest list opens a detail and a revoked detail removes previously loaded content', async () => {
    mocks.get.mockResolvedValueOnce({ data: { data: { name: '샘플 커뮤니티', items: [post], hasNext: false } } })
      .mockRejectedValueOnce({ response: { status: 404 } });
    renderPublic();
    fireEvent.click(await screen.findByRole('link', { name: post.title }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('공개된 커뮤니티 또는 게시글을 찾을 수 없습니다.'));
    expect(screen.queryByText(post.title)).toBeNull();
    expect(mocks.get.mock.calls[1][0]).toBe('/communities/fixture/public/posts/fixture');
  });
  it('read failure retries and successful empty content is distinguishable', async () => {
    mocks.get.mockRejectedValueOnce(new Error('fixture failure')).mockResolvedValueOnce({ data: { data: { name: '샘플 커뮤니티', items: [], hasNext: false } } });
    renderPublic(); await screen.findByRole('alert');
    expect(screen.queryByText('현재 공개된 게시글이 없습니다.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    await screen.findByText('현재 공개된 게시글이 없습니다.'); expect(screen.queryByRole('alert')).toBeNull();
  });
  it('operator explicitly selects a post and closed boards offer only private mode', async () => {
    mocks.get.mockResolvedValue({ data: { data: { boards: [{ id: 'board', name: '샘플 게시판', forumType: 'open', publicRead: { mode: 'private' } },
      { id: 'closed', name: '폐쇄 게시판', forumType: 'closed', publicRead: { mode: 'private' } }], posts: [{ ...post, forumId: 'board' }] } } });
    mocks.put.mockResolvedValue({});
    render(<MemoryRouter><Manager communityKey="fixture" /></MemoryRouter>);
    fireEvent.click(screen.getByText('운영자 · 비로그인 공개 설정'));
    const select = await screen.findByRole('combobox', { name: '샘플 게시판 공개 범위' });
    expect((select as HTMLSelectElement).value).toBe('private');
    expect((screen.getByRole('combobox', { name: '폐쇄 게시판 공개 범위' }) as HTMLSelectElement).options).toHaveLength(1);
    fireEvent.change(select, { target: { value: 'selected' } }); fireEvent.click(screen.getByRole('checkbox', { name: post.title }));
    fireEvent.click(screen.getAllByRole('button', { name: '공개 설정 저장' })[0]);
    await screen.findByText('선택한 공개 범위를 저장했습니다.');
    expect(mocks.put).toHaveBeenCalledWith('/communities/fixture/boards/board/public-read', { mode: 'selected', postIds: [post.id] });
  });
  it('failed operator save preserves selection for a retry', async () => {
    mocks.get.mockResolvedValue({ data: { data: { boards: [{ id: 'board', name: '샘플 게시판', forumType: 'open', publicRead: { mode: 'private' } }], posts: [] } } });
    mocks.put.mockRejectedValueOnce(new Error('fixture failure')).mockResolvedValueOnce({});
    render(<MemoryRouter><Manager communityKey="fixture" /></MemoryRouter>); fireEvent.click(screen.getByText('운영자 · 비로그인 공개 설정'));
    fireEvent.change(await screen.findByRole('combobox'), { target: { value: 'board' } });
    fireEvent.click(screen.getByRole('button', { name: '공개 설정 저장' })); await screen.findByRole('alert');
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('board');
    fireEvent.click(screen.getByRole('button', { name: '공개 설정 저장' }));
    await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(2));
    await screen.findByText('선택한 공개 범위를 저장했습니다.');
  });
});
