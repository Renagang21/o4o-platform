import { CommunityBoardReview as Shared } from '@o4o/operator-core-ui/modules/community-forums';
import { api } from '../../lib/apiClient';
export default function CommunityBoardReview({ communityKey }: { communityKey: string }) {
 return <Shared communityKey={communityKey} client={api} />;
}
