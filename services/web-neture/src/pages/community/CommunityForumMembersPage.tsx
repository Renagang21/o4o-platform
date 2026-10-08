import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { ForumOwnerMemberManagement, createForumOwnerMembershipApi } from '@o4o/shared-space-ui';
import { NETURE_FORUM_OWNER_THEME } from '../../services/forumOwnerAdapter';
import { api } from '../../lib/apiClient';

export default function CommunityForumMembersPage({ basePath }: { basePath: string }) {
  const { communityKey, forumId } = useParams();
  const adapter = useMemo(() => {
    const base = `/communities/${encodeURIComponent(communityKey ?? '')}/forum/categories`;
    return createForumOwnerMembershipApi({
      fetchOwnedForums: () => api.get(`${base}/mine`).then((r: { data: any }) => r.data),
      fetchJoinRequests: id => api.get(`${base}/${id}/join-requests`).then((r: { data: any }) => r.data),
      fetchMembers: id => api.get(`${base}/${id}/members`).then((r: { data: any }) => r.data),
      approveJoin: (id, requestId) => api.post(`${base}/${id}/join-requests/${requestId}/approve`).then((r: { data: any }) => r.data),
      rejectJoin: (id, requestId, comment) => api.post(`${base}/${id}/join-requests/${requestId}/reject`, { comment }).then((r: { data: any }) => r.data),
      removeMember: (id, userId) => api.delete(`${base}/${id}/members/${userId}`).then((r: { data: any }) => r.data),
    });
  }, [communityKey]);
  return <ForumOwnerMemberManagement forumId={forumId} api={adapter} theme={NETURE_FORUM_OWNER_THEME} backHref={`${basePath}/owned`} />;
}
