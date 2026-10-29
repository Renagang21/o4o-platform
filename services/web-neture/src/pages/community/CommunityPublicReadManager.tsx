import { CommunityPublicReadManager as Shared } from '@o4o/operator-core-ui/modules/community-forums';
import { api } from '../../lib/apiClient';

export default function CommunityPublicReadManager({ communityKey }: { communityKey: string }) {
 return <Shared communityKey={communityKey} client={api} />;
}
