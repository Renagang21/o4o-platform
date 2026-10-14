import { expect, it, vi } from 'vitest';
import { createCommunityForumOwnerAdapters } from '../communityAdapter.js';
it('forum owner actions remain scoped to the selected participant ledger and encode path components', async () => {
  const api = { get: vi.fn(async () => ({ data: { data: [] } })), post: vi.fn(async () => ({ data: { success: true } })), patch: vi.fn(async () => ({ data: { success: true } })), delete: vi.fn(async () => ({ data: { success: true } })) };
  const { owner, members } = createCommunityForumOwnerAdapters(api, 'business/key');
  await owner.listOwnedForums(); await members.approveJoin('board/id', 'request/id');
  await members.rejectJoin('board/id', 'request/id', '반려 사유'); await members.removeMember('board/id', 'user/id');
  expect(api.get).toHaveBeenCalledWith('/communities/business%2Fkey/forum/categories/mine');
  expect(api.post).toHaveBeenCalledWith('/communities/business%2Fkey/forum/categories/board%2Fid/join-requests/request%2Fid/approve');
  expect(api.post).toHaveBeenCalledWith('/communities/business%2Fkey/forum/categories/board%2Fid/join-requests/request%2Fid/reject', { reviewComment: '반려 사유' });
  expect(api.delete).toHaveBeenCalledWith('/communities/business%2Fkey/forum/categories/board%2Fid/members/user%2Fid');
});
