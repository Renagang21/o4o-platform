import { CommunityHomeManagementPage as Workspace } from "@o4o/operator-core-ui";
import { homeApi } from "./communityHomeApi";
export default function CommunityHomeManagementPage() {
  return <Workspace api={homeApi} />;
}
