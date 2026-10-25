import { afterEach, describe, expect, it, vi } from 'vitest';
const { get, patch, post } = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn(), post: vi.fn() }));
vi.mock('../lib/apiClient', () => ({ api: { get, patch, post } }));
import { createForumPost, fetchForumCategories, fetchForumPosts, pinCommunityForumPost } from './forumApi';

afterEach(() => { vi.restoreAllMocks(); get.mockReset(); patch.mockReset(); post.mockReset(); window.history.replaceState({}, '', '/'); });
describe('회원 커뮤니티 API 실패 처리', () => {
  it('mock 플래그와 무관하게 현재 공간 API를 사용하고 접근 거부를 재귀 호출하지 않는다', async () => {
    window.history.replaceState({}, '', '/communities/local-business/forum/posts');
    const failure = new Error('Access denied');
    get.mockRejectedValue(failure);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(fetchForumPosts({ page: 1 })).rejects.toBe(failure);
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith('/communities/local-business/forum/posts?page=1');
  });
});
it.each(['business:carepharm', 'business%3Acarepharm', 'business:pharmacy', 'business%3Amegapharm'])('uses real scoped reads and writes for %s, independent of the demo flag', async key => {
  window.history.replaceState({}, '', `/communities/${key}/forum/posts`);
  const scope = encodeURIComponent(decodeURIComponent(key));
  get.mockResolvedValue({ data: { success: true, data: [], totalCount: 0, pagination: { page: 1, totalPages: 0 } } });
  expect((await fetchForumPosts({ page: 1 })).data).toEqual([]);
  expect(get).toHaveBeenLastCalledWith(`/communities/${scope}/forum/posts?page=1`);
  await fetchForumCategories(); expect(get).toHaveBeenLastCalledWith(`/communities/${scope}/forum/categories`);
  post.mockResolvedValue({ data: { success: true, data: { id: 'actual-server-post' } } });
  expect(await createForumPost({ title: '회원 글', content: '내용', categorySlug: 'operating', forumId: 'board' })).toEqual({ success: true, data: { id: 'actual-server-post' } });
  expect(post).toHaveBeenCalledWith(`/communities/${scope}/forum/posts`, expect.objectContaining({ forumId: 'board' }));
});
it('preserves the server rejection for colon scopes instead of falling back to a successful demo write', async () => {
  window.history.replaceState({}, '', '/communities/business%3Acarepharm/forum/write');
  vi.spyOn(console, 'error').mockImplementation(() => {});
  get.mockRejectedValue(new Error('Forbidden'));
  await expect(fetchForumPosts({})).rejects.toThrow('Forbidden');
  post.mockRejectedValue({ response: { status: 403, data: { error: '회원 자격이 필요합니다.' } } });
  expect(await createForumPost({ title: '거절되는 글', content: '내용', categorySlug: 'operating' })).toEqual({ success: false, error: '회원 자격이 필요합니다.' });
});
it.each(['%ZZ', 'business%2Fcarepharm', 'business%253Acarepharm', '.private'])('rejects malformed scope %s before constructing an API path or returning demo data', async key => {
  window.history.replaceState({}, '', `/communities/${key}/forum/posts`);
  await expect(fetchForumPosts({})).rejects.toThrow('Invalid community scope');
  expect(get).not.toHaveBeenCalled();
});

it('공지 변경은 현재 주소가 달라져도 명시된 커뮤니티와 글을 대상으로 한다', async () => {
  window.history.replaceState({}, '', '/communities/other/forum');
  patch.mockResolvedValue({ data: { success: true } });
  await pinCommunityForumPost('fixture', 'post-a', true);
  expect(patch).toHaveBeenCalledWith('/communities/fixture/forum/posts/post-a/pin', { pin: true });
});


it('funding posts always use the exact project API, even with mock mode enabled', async () => {
  const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  window.history.replaceState({}, '', `/market-trial/${id}/forum`);
  get.mockResolvedValue({ data: { success: true, data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } } });
  await fetchForumPosts({ page: 1 });
  expect(get).toHaveBeenCalledWith(`/funding/${id}/forum/posts?page=1`);
});
