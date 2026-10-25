/** Identity input shared by service and business-space resolvers. No industry policy remains. */
export interface CommunityAccessUser {
  id?: string;
  roles?: string[];
  memberships?: { serviceKey: string; status: string }[];
}

/** Only the independent service's own forum ledger; unknown/retired keys fail closed. */
export function communityForumStorageCodes(key: string | null | undefined): string[] {
  return key === 'community' ? ['community'] : [];
}
