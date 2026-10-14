import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
const mocks = vi.hoisted(() => ({ fetch: vi.fn(), pin: vi.fn(), comments: vi.fn(), roles: ['user'] as string[] }));
vi.mock('../../contexts', () => ({ useAuth: () => ({ user: { id: 'operator', roles: mocks.roles }, isAuthenticated: true }), useLoginModal: () => ({ openLoginModal: vi.fn() }) }));
vi.mock('../../services/forumApi', async original => ({
  ...await original<typeof import('../../services/forumApi')>(),
  fetchForumPostBySlug: mocks.fetch, pinCommunityForumPost: mocks.pin, fetchForumComments: mocks.comments,
}));
import ForumPostPage from './ForumPostPage';
const post = { id: 'post-a', slug: 'notice', title: '참여자 안내', content: '<p>안내 본문</p>', type: 'discussion', authorId: 'other', author: { id: 'other', name: '작성자' }, createdAt: '2026-10-11T00:00:00Z', isPinned: false, likeCount: 0, commentCount: 0, tags: [], allowComments: true };
const mount = (canModerate = true, basePath = '/communities/fixture/forum') => render(<MemoryRouter initialEntries={[`${basePath}/post/notice`]}><Link to={`${basePath}/post/next`}>다른 글</Link><Routes><Route path={`${basePath}/post/:slug`} element={<ForumPostPage basePath={basePath} canModerate={canModerate} />} /></Routes></MemoryRouter>);
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }) });
  mocks.roles = ['user'];
  mocks.fetch.mockReset(); mocks.pin.mockReset(); mocks.comments.mockReset();
  mocks.fetch.mockResolvedValue({ success: true, data: post }); mocks.comments.mockResolvedValue({ success: true, data: [] });
});
afterEach(cleanup);
it.each([false, true])('담당 운영자는 공지 상태를 변경하고 재조회 결과를 표시한다 (고정=%s)', async pinned => {
  let current = { ...post, isPinned: pinned };
  mocks.fetch.mockImplementation(async () => ({ success: true, data: current }));
  mocks.pin.mockImplementation(async () => { current = { ...current, isPinned: !pinned }; });
  mount(); fireEvent.click(await screen.findByRole('button', { name: pinned ? '공지 해제' : '공지로 고정' }));
  expect(await screen.findByRole('button', { name: pinned ? '공지로 고정' : '공지 해제' })).toBeTruthy();
  expect(mocks.pin).toHaveBeenCalledWith('fixture', 'post-a', !pinned);
});
it.each([[false, '/communities/fixture/forum'], [true, '/forum']])('일반 회원과 기존 서비스 화면의 권한을 확장하지 않는다 (%s,%s)', async (moderator, basePath) => {
  mount(moderator as boolean, basePath as string); await screen.findByText('참여자 안내');
  expect(screen.queryByRole('button', { name: '공지로 고정' })).toBeNull();
});
it('처리 실패를 알리고 재시도할 수 있다', async () => {
  mocks.pin.mockRejectedValue(new Error('권한이 해제됐습니다.')); mount();
  fireEvent.click(await screen.findByRole('button', { name: '공지로 고정' }));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', '권한이 해제됐습니다.');
  expect((screen.getByRole('button', { name: '공지로 고정' }) as HTMLButtonElement).disabled).toBe(false);
});
it('처리 중 중복 요청을 막고 성공 후 조회 실패는 쓰기 없이 재조회한다', async () => {
  let release!: () => void;
  mocks.pin.mockImplementation(() => new Promise<void>(resolve => { release = resolve; }));
  mount(); const button = await screen.findByRole('button', { name: '공지로 고정' });
  mocks.fetch.mockRejectedValueOnce(new Error('조회 실패'));
  fireEvent.click(button); fireEvent.click(button); expect(mocks.pin).toHaveBeenCalledTimes(1);
  await act(async () => release()); await screen.findByRole('alert');
  expect((button as HTMLButtonElement).disabled).toBe(true);
  mocks.fetch.mockResolvedValue({ success: true, data: { ...post, isPinned: true } });
  fireEvent.click(screen.getByRole('button', { name: '공지 상태 다시 조회' }));
  await screen.findByRole('button', { name: '공지 해제' }); expect(mocks.pin).toHaveBeenCalledTimes(1);
});

it('공지 변경 중 다른 글로 이동하면 이전 응답을 새 글에 적용하지 않는다', async () => {
  let release!: () => void;
  mocks.pin.mockImplementation(() => new Promise<void>(resolve => { release = resolve; }));
  mocks.fetch.mockImplementation(async (slug: string) => ({ success: true, data: slug === 'next' ? { ...post, id: 'post-b', title: '다음 안내' } : post }));
  mount(); fireEvent.click(await screen.findByRole('button', { name: '공지로 고정' }));
  fireEvent.click(screen.getByRole('link', { name: '다른 글' })); await screen.findByText('다음 안내');
  await act(async () => release());
  expect(screen.queryByText('공지로 고정했습니다.')).toBeNull(); expect(screen.getByText('다음 안내')).toBeTruthy();
});


it('funding notices use the explicit project pin adapter and closed projects expose no mutations', async () => {
  const pin = vi.fn().mockResolvedValue(undefined);
  const basePath = '/market-trial/project/forum';
  const view = render(<MemoryRouter initialEntries={[`${basePath}/post/notice`]}><Routes><Route path={`${basePath}/post/:slug`} element={<ForumPostPage basePath={basePath} canModerate pinPost={pin} />} /></Routes></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: '공지로 고정' }));
  await act(async () => {}); expect(pin).toHaveBeenCalledWith('post-a', true); expect(mocks.pin).not.toHaveBeenCalled();
  view.unmount();
  render(<MemoryRouter initialEntries={[`${basePath}/post/notice`]}><Routes><Route path={`${basePath}/post/:slug`} element={<ForumPostPage basePath={basePath} canModerate readOnly pinPost={pin} />} /></Routes></MemoryRouter>);
  await screen.findByText('참여자 안내'); expect(screen.queryByRole('button', { name: '공지로 고정' })).toBeNull(); expect(screen.queryByPlaceholderText('댓글을 입력하세요...')).toBeNull();
});

it.each(['neture:admin', 'platform:super_admin'])('uses explicit funding moderation instead of client role %s for another author', async role => {
  mocks.roles = [role];
  mount(false, '/market-trial/project/forum');
  await screen.findByText('참여자 안내');
  expect(screen.queryByRole('button', { name: '수정', exact: true })).toBeNull();
  expect(screen.queryByRole('button', { name: '삭제', exact: true })).toBeNull();
});
it('preserves existing Neture forum admin controls', async () => {
  mocks.roles = ['neture:admin'];
  mount(false, '/forum');
  await screen.findByText('참여자 안내');
  expect(screen.getByRole('button', { name: '수정', exact: true })).toBeTruthy();
  expect(screen.getByRole('button', { name: '삭제', exact: true })).toBeTruthy();
});
