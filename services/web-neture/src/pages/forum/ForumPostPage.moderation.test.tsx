import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
// 2026-11-14 커뮤니티 점검: 운영자 중재는 사유를 받고(서버 기록), 운영자는 글을 잠그거나 댓글을 막을 수 있다.
const m = vi.hoisted(() => ({ fetch: vi.fn(), comments: vi.fn(), del: vi.fn(), delComment: vi.fn(), moderate: vi.fn() }));
vi.mock('../../contexts', () => ({ useAuth: () => ({ user: { id: 'operator', roles: ['user'] }, isAuthenticated: true }), useLoginModal: () => ({ openLoginModal: vi.fn() }) }));
vi.mock('../../services/forumApi', async original => ({
  ...await original<typeof import('../../services/forumApi')>(),
  fetchForumPostBySlug: m.fetch, fetchForumComments: m.comments, deleteForumPost: m.del, deleteForumComment: m.delComment, moderateForumPost: m.moderate,
}));
import ForumPostPage from './ForumPostPage';
const base = '/communities/fixture/forum';
const post = { id: 'post-a', slug: 'notice', title: '회원 글', content: '<p>본문</p>', type: 'discussion', authorId: 'other', author: { id: 'other', name: '작성자' }, createdAt: '2026-10-11T00:00:00Z', isPinned: false, isLocked: false, likeCount: 0, commentCount: 1, tags: [], allowComments: true };
const mount = () => render(<MemoryRouter initialEntries={[`${base}/post/notice`]}><Routes>
  <Route path={`${base}/post/:slug`} element={<ForumPostPage basePath={base} canModerate />} />
  <Route path={base} element={<p>목록</p>} />
</Routes></MemoryRouter>);
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }) });
  for (const f of Object.values(m)) f.mockReset();
  m.fetch.mockResolvedValue({ success: true, data: post });
  m.comments.mockResolvedValue({ success: true, data: [{ id: 'c1', content: '남의 댓글', authorId: 'someone', author: { id: 'someone', name: '회원' }, createdAt: '2026-10-11T00:00:00Z' }] });
  m.del.mockResolvedValue({ success: true }); m.delComment.mockResolvedValue({ success: true });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('deleting someone else\'s post asks for a reason and sends it; cancel or a too-short reason sends nothing', async () => {
  const ask = vi.spyOn(window, 'prompt').mockReturnValueOnce(null).mockReturnValueOnce(' ').mockReturnValueOnce('  광고성 글  ');
  mount();
  await screen.findByText('남의 댓글');
  const del = screen.getAllByRole('button', { name: '삭제' })[0];
  fireEvent.click(del); fireEvent.click(del);
  expect(m.del).not.toHaveBeenCalled();
  fireEvent.click(del);
  await waitFor(() => expect(m.del).toHaveBeenCalledWith('post-a', '광고성 글'));
  expect(ask).toHaveBeenCalledTimes(3);
  expect(await screen.findByText('목록')).toBeTruthy();
});

it('locks the post and blocks comments through the moderation API and shows the server result', async () => {
  m.moderate.mockResolvedValueOnce({ success: true, data: { id: 'post-a', isLocked: true, allowComments: true } })
    .mockResolvedValueOnce({ success: true, data: { id: 'post-a', isLocked: true, allowComments: false } });
  mount();
  fireEvent.click(await screen.findByRole('button', { name: '글 잠금' }));
  await waitFor(() => expect(m.moderate).toHaveBeenCalledWith('post-a', { isLocked: true }));
  expect(await screen.findByRole('button', { name: '잠금 해제' })).toBeTruthy();
  expect(screen.getByText('이 게시글은 댓글 작성이 제한되어 있습니다.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '댓글 막기' }));
  await waitFor(() => expect(m.moderate).toHaveBeenLastCalledWith('post-a', { allowComments: false }));
  expect(await screen.findByRole('button', { name: '댓글 허용' })).toBeTruthy();
});

it('a refused moderation keeps the post as it was', async () => {
  m.moderate.mockResolvedValueOnce({ success: false, error: '게시판 운영자만 처리할 수 있습니다.' });
  mount();
  fireEvent.click(await screen.findByRole('button', { name: '글 잠금' }));
  await waitFor(() => expect(m.moderate).toHaveBeenCalled());
  expect(screen.getByRole('button', { name: '글 잠금' })).toBeTruthy();
});

it('deleting someone else\'s comment sends the reason', async () => {
  vi.spyOn(window, 'prompt').mockReturnValue('욕설');
  mount();
  await screen.findByText('남의 댓글');
  const buttons = screen.getAllByRole('button', { name: '삭제' });
  fireEvent.click(buttons[buttons.length - 1]);
  await waitFor(() => expect(m.delComment).toHaveBeenCalledWith('c1', '욕설'));
  expect(m.del).not.toHaveBeenCalled();
});
