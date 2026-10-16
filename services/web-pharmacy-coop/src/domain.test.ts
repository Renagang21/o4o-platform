import { describe, expect, it } from "vitest";
import {
  anonymousSession,
  canManageFederation,
  cooperativeAccess,
  membershipIdentity,
  validCooperativeSlug,
  type CooperativeMembership,
  type SessionSnapshot,
} from "./domain";

const member = (
  cooperativeId: string,
  status: CooperativeMembership["status"] = "active",
): CooperativeMembership => ({ cooperativeId, userId: "person", status });
const session = (
  overrides: Partial<SessionSnapshot> = {},
): SessionSnapshot => ({ ...anonymousSession, userId: "person", ...overrides });

describe("personal cooperative membership boundaries", () => {
  it("allows the same person in multiple cooperatives without pharmacy/store identity", () => {
    const snapshot = session({ memberships: [member("a"), member("b")] });
    expect(cooperativeAccess(snapshot, "a").isMember).toBe(true);
    expect(cooperativeAccess(snapshot, "b").isMember).toBe(true);
    expect(membershipIdentity(member("a"))).not.toBe(
      membershipIdentity(member("b")),
    );
  });

  it.each(["pending", "rejected", "suspended", "withdrawn"] as const)(
    "does not let %s membership in A affect B",
    (status) => {
      const snapshot = session({
        memberships: [member("a", status), member("b")],
      });
      expect(cooperativeAccess(snapshot, "a").isMember).toBe(false);
      expect(cooperativeAccess(snapshot, "b").isMember).toBe(true);
    },
  );

  it("does not use another person or another cooperative membership", () => {
    const snapshot = session({
      memberships: [{ ...member("a"), userId: "other" }, member("b")],
    });
    expect(cooperativeAccess(snapshot, "a").isMember).toBe(false);
  });

  it("fails closed on anonymous and conflicting membership snapshots", () => {
    expect(
      cooperativeAccess(
        { ...anonymousSession, memberships: [member("a")] },
        "a",
      ).isMember,
    ).toBe(false);
    expect(
      cooperativeAccess(
        session({ memberships: [member("a"), member("a", "suspended")] }),
        "a",
      ).isMember,
    ).toBe(false);
  });

  it("does not inherit cooperative management from federation or another cooperative", () => {
    const snapshot = session({
      federationOperators: [{ userId: "person" }],
      cooperativeOperators: [{ userId: "person", cooperativeId: "b" }],
    });
    expect(canManageFederation(snapshot)).toBe(true);
    expect(cooperativeAccess(snapshot, "a").canManage).toBe(false);
    expect(cooperativeAccess(snapshot, "b").canManage).toBe(true);
    expect(
      canManageFederation(
        session({
          cooperativeOperators: [{ userId: "person", cooperativeId: "b" }],
        }),
      ),
    ).toBe(false);
  });
});

describe("cooperative URL identity", () => {
  it.each(["coop-a", "regional-01", "a"])("accepts %s", (slug) =>
    expect(validCooperativeSlug(slug)).toBe(true),
  );
  it.each([
    "operator",
    "api",
    "assets",
    "cooperatives",
    "../a",
    "a/b",
    "UPPER",
    "-coop",
    "a--b",
    "a".repeat(64),
  ])("rejects reserved/invalid %s", (slug) =>
    expect(validCooperativeSlug(slug)).toBe(false),
  );
});
