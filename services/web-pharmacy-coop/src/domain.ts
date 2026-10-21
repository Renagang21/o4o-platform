/** Cooperative membership belongs to a person, never to a pharmacy/store. */
export type MembershipStatus =
  | "pending"
  | "active"
  | "rejected"
  | "suspended"
  | "withdrawn";

export interface Cooperative {
  /** Explicit backend business binding, never inferred from the display slug or personal membership. */
  businessKey?: string;
  id: string;
  slug: string;
  name: string;
  introduction: string;
  eligibilityDescription: string;
}

export interface CooperativeMembership {
  cooperativeId: string;
  userId: string;
  status: MembershipStatus;
}

/** Federation enrollment concerns a cooperative, not an individual member. */
export interface FederationAffiliation {
  cooperativeId: string;
  status: MembershipStatus;
}

/** Assignments must eventually come from the server; UI state is not authorization. */
export interface CooperativeOperator {
  role?: "admin" | "operator";
  cooperativeId: string;
  userId: string;
}

export interface FederationOperator {
  role?: "admin" | "operator";
  userId: string;
}

export interface SessionSnapshot {
  userId: string | null;
  memberships: readonly CooperativeMembership[];
  cooperativeOperators: readonly CooperativeOperator[];
  federationOperators: readonly FederationOperator[];
}

export const anonymousSession: SessionSnapshot = {
  userId: null,
  memberships: [],
  cooperativeOperators: [],
  federationOperators: [],
};

export function cooperativeAccess(
  session: SessionSnapshot,
  cooperativeId: string,
) {
  if (!session.userId)
    return { isMember: false, canManage: false, isAdmin: false, status: null };
  const rows = session.memberships.filter(
    (row) =>
      row.userId === session.userId && row.cooperativeId === cooperativeId,
  );
  // Ambiguous membership data must not accidentally grant access.
  const status = rows.length === 1 ? rows[0].status : null;
  const canManage = session.cooperativeOperators.some(
    (row) =>
      row.userId === session.userId && row.cooperativeId === cooperativeId,
  );
  const isAdmin = session.cooperativeOperators.some(
    (row) =>
      row.userId === session.userId &&
      row.cooperativeId === cooperativeId &&
      row.role === "admin",
  );
  return { isMember: status === "active", canManage, isAdmin, status };
}

export function canManageFederation(session: SessionSnapshot) {
  return (
    !!session.userId &&
    session.federationOperators.some((row) => row.userId === session.userId)
  );
}

/** An individual may hold one independent membership in each cooperative. */
export function membershipIdentity(
  row: Pick<CooperativeMembership, "userId" | "cooperativeId">,
) {
  return JSON.stringify([row.userId, row.cooperativeId]);
}

const reservedSlugs = new Set([
  "cooperatives",
  "about",
        "contact",
        "notifications",
  "operator",
  "preview",
  "login",
  "assets",
  "api",
]);
export function validCooperativeSlug(slug: string) {
  return (
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) &&
    slug.length <= 63 &&
    !reservedSlugs.has(slug)
  );
}

/** New cooperative membership never creates store access. Existing Store owns that decision. */
export const storeWorkspaceUrl = "https://store.neture.co.kr";
