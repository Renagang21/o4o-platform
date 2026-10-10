import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { ForumOwnerMemberManagement, createCommunityForumOwnerAdapters } from '@o4o/shared-space-ui';
import { NETURE_FORUM_OWNER_THEME } from '../../services/forumOwnerAdapter';
import { api } from '../../lib/apiClient';

export default function CommunityForumMembersPage({ basePath }: { basePath: string }) {
  const { communityKey, forumId } = useParams();
  const adapter = useMemo(() => createCommunityForumOwnerAdapters(api, communityKey ?? '').members, [communityKey]);
  return <ForumOwnerMemberManagement forumId={forumId} api={adapter} theme={NETURE_FORUM_OWNER_THEME} backHref={`${basePath}/owned`} />;
}
