import { PartnerCommunityOperator } from "@o4o/operator-core-ui";
import PartnerOperatorManagement from "./PartnerOperatorManagement";
import { communityApi } from "./community-api";
import type { PartnerUser, Run } from "./PartnerSite";
export default function CommunityOperator(props: {
  user: PartnerUser;
  admin?: boolean;
  busy: boolean;
  run: Run;
}) {
  return (
    <PartnerCommunityOperator
      {...props}
      api={communityApi}
      operatorManagement={<PartnerOperatorManagement userId={props.user.id} />}
    />
  );
}
