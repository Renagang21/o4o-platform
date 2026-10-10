import { afterEach, describe, expect, it, vi } from 'vitest';
const { get, patch } = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }));
vi.mock('../lib/apiClient', () => ({ api: { get, patch } }));
import { fetchForumPosts, pinCommunityForumPost } from './forumApi';

afterEach(() => { vi.restoreAllMocks(); get.mockReset(); patch.mockReset(); window.history.replaceState({}, '', '/'); });
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

it('공지 변경은 현재 주소가 달라져도 명시된 커뮤니티와 글을 대상으로 한다', async () => {
  window.history.replaceState({}, '', '/communities/other/forum');
  patch.mockResolvedValue({ data: { success: true } });
  await pinCommunityForumPost('fixture', 'post-a', true);
  expect(patch).toHaveBeenCalledWith('/communities/fixture/forum/posts/post-a/pin', { pin: true });
});
