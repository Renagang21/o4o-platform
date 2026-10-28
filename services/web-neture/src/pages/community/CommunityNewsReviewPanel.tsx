import { CommunityNewsReviewPanel as Panel } from "@o4o/operator-core-ui";
import { homeApi, type HomeItem } from "./communityHomeApi";
export function CommunityNewsReviewPanel({
  onApply,
}: {
  onApply: (item: HomeItem, reviewId: string) => void;
}) {
  return <Panel api={homeApi} onApply={onApply} />;
}
