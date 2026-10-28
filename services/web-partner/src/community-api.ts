import { request } from "./api";
import { createPartnerCommunityApi } from "@o4o/operator-core-ui";
export type {
  PartnerCommunityBoard as CommunityBoard,
  PartnerCommunityPost as CommunityPost,
  PartnerCommunityComment as CommunityComment,
  PartnerCommunityPolicy as CommunityPolicy,
  PartnerCommunityReport as CommunityReport,
  PartnerCommunityMembership as Membership,
  PartnerCommunityOverview as OperatorOverview,
} from "@o4o/operator-core-ui";
export const communityApi = createPartnerCommunityApi(request);
