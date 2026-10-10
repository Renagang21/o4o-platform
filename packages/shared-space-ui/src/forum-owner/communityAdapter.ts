import { createForumOwnerApi, createForumOwnerMembershipApi } from './adapter.js';

interface CommunityForumTransport {
  get(path: string): Promise<{ data: unknown }>;
  post(path: string, body?: unknown): Promise<{ data: unknown }>;
  patch(path: string, body: unknown): Promise<{ data: unknown }>;
  delete(path: string): Promise<{ data: unknown }>;
}

/** Reuse forum owner functions on a service-owned participant surface without changing its ledger. */
export function createCommunityForumOwnerAdapters(api: CommunityForumTransport, communityKey: string) {
  const base = `/communities/${encodeURIComponent(communityKey)}`;
  const categories = `${base}/forum/categories`;
  const fetchOwnedForums = () => api.get(`${categories}/mine`).then(r => r.data);
  return {
    owner: createForumOwnerApi({
      fetchOwnedForums,
      fetchMyRequests: () => api.get(`${base}/board-requests`).then(r => r.data),
      updateForum: (id, data) => api.patch(`${categories}/${encodeURIComponent(id)}/owner`, data).then(r => r.data),
      requestForumDelete: (id, data) => api.post(`${categories}/${encodeURIComponent(id)}/delete-request`, data).then(r => r.data),
    }),
    members: createForumOwnerMembershipApi({
      fetchOwnedForums,
      fetchJoinRequests: id => api.get(`${categories}/${encodeURIComponent(id)}/join-requests`).then(r => r.data),
      fetchMembers: id => api.get(`${categories}/${encodeURIComponent(id)}/members`).then(r => r.data),
      approveJoin: (id, requestId) => api.post(`${categories}/${encodeURIComponent(id)}/join-requests/${encodeURIComponent(requestId)}/approve`).then(r => r.data),
      rejectJoin: (id, requestId, comment) => api.post(`${categories}/${encodeURIComponent(id)}/join-requests/${encodeURIComponent(requestId)}/reject`, { reviewComment: comment }).then(r => r.data),
      removeMember: (id, userId) => api.delete(`${categories}/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`).then(r => r.data),
    }),
  };
}
