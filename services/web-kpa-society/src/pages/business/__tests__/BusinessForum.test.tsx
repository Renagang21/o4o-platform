import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
const transport = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'owner' } }), authClient: { api: transport } }));
vi.mock('@o4o/shared-space-ui', async importOriginal => ({
  ...await importOriginal<typeof import('@o4o/shared-space-ui')>(),
  ForumWriteForm: ({ onSubmit }: { onSubmit: (payload: unknown) => void }) => <button onClick={() => onSubmit({ title: '사업 게시글', editorHtml: '<p>본문</p>' })}>작성 완료</button>,
}));
import BusinessForumPage from '../BusinessForumPage';
const mount = (view: 'write' | 'posts' | 'mine', path = '/community') => render(<MemoryRouter initialEntries={[path]}><Routes>
  <Route element={<Outlet context={{ business: { key: 'pharmacy', communityKey: 'business-only' }, access: { allowed: true, canManage: false } }} />}>
    <Route path="/community" element={<BusinessForumPage view={view} />} />
    <Route path="/community/my-posts" element={<p>내 글 화면</p>} />
  </Route>
</Routes></MemoryRouter>);
beforeEach(() => {
  transport.get.mockReset(); transport.post.mockReset();
  transport.get.mockImplementation(async (path: string) => ({ data: { data: path.endsWith('/categories') ? [{ id: 'business-board', slug: 'members', name: '사업 게시판', forumType: 'open' }] : [], pagination: { totalPages: 1 } } }));
});
afterEach(cleanup);
it('글 작성은 사업에 매핑된 게시판만 사용하고 승인 대기 글은 내 글로 연결한다', async () => {
  transport.post.mockResolvedValue({ data: { data: { status: 'pending' } } }); mount('write');
  fireEvent.click(await screen.findByRole('button', { name: '작성 완료' }));
  await waitFor(() => expect(transport.post).toHaveBeenCalledWith('/communities/business-only/forum/posts', {
    title: '사업 게시글', content: '<p>본문</p>', forumId: 'business-board', type: 'discussion',
  }));
  expect(await screen.findByText('내 글 화면')).toBeTruthy();
});
it('내 글은 author=me 계약으로 조회하고 다른 사업이나 공통 게시판을 조회하지 않는다', async () => {
  mount('mine'); await screen.findByText('내가 쓴 글');
  expect(transport.get).toHaveBeenCalledWith('/communities/business-only/forum/posts', { params: { page: 1, limit: 20, category: undefined, author: 'me' } });
  expect(transport.get.mock.calls.every(([path]) => path.startsWith('/communities/business-only/forum/'))).toBe(true);
});
it('게시판 없는 사업에서는 글을 생성하지 않는다', async () => {
  transport.get.mockResolvedValue({ data: { data: [] } }); mount('write'); fireEvent.click(await screen.findByRole('button', { name: '작성 완료' }));
  expect(await screen.findByRole('alert')).toBeTruthy(); expect(transport.post).not.toHaveBeenCalled();
});
it('닫힌 게시판의 접근 거부를 0건으로 처리하지 않고 기존 가입 신청을 제공한다', async () => {
  transport.get.mockImplementation(async (path: string) => {
    if (path.endsWith('/categories')) return { data: { data: [{ id: 'closed-board', slug: 'closed', name: '닫힌 게시판', forumType: 'closed' }] } };
    throw { response: { data: { error: '가입 승인이 필요합니다.' } } };
  }); transport.post.mockResolvedValue({ data: { data: {} } });
  mount('posts', '/community?category=closed-board'); expect(await screen.findByRole('alert')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '게시판 가입 신청' }));
  await waitFor(() => expect(transport.post).toHaveBeenCalledWith('/communities/business-only/forum/categories/closed-board/join-requests', {}));
});
