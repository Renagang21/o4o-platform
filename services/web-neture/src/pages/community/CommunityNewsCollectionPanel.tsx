import { CommunityNewsCollectionPanel as Panel } from "@o4o/operator-core-ui";
import { homeApi } from "./communityHomeApi";
export function CommunityNewsCollectionPanel({
  onCollected,
}: {
  onCollected: () => void;
}) {
  return <Panel api={homeApi} onCollected={onCollected} />;
}
