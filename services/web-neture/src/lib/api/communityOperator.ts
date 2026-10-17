import { api } from '../apiClient';

/** My Home compatibility adapter: service operation, never entity membership. */
export async function listOperatedCommunities(): Promise<Array<{ id: string; slug: string; name: string; pendingCount: number; canRestrictMembers: boolean }>> {
  const { data } = await api.get('/communities/community/access');
  return data?.data?.canManage ? [{ id: 'community', slug: 'community', name: '커뮤니티', pendingCount: 0, canRestrictMembers: true }] : [];
}
