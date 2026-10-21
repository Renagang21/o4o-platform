import { MemberPaidFeatureService } from "../services/member-paid-features.js";
const owner = "10000000-0000-4000-8000-000000000001";
const store = "20000000-0000-4000-8000-000000000001";
function fixture({
  paid = true,
  activeStore = true,
  ambiguousOwner = false,
} = {}) {
  const query = jest.fn(async (sql: string, params?: unknown[]) => {
    if (sql.startsWith("SELECT id, status"))
      return [{ id: owner, status: "active", isActive: true }];
    if (sql.includes("FROM member_paid_service_entitlements"))
      return paid ? [{ user_id: owner }] : [];
    if (sql.includes("FROM settings WHERE key"))
      return [
        {
          value: {
            features:
              params?.[0] === "pharmacy-service-features:paid"
                ? ["tablet"]
                : [],
          },
        },
      ];
    if (sql.includes("FROM organization_members om"))
      return [
        {
          id: store,
          name: "Synthetic pharmacy",
          pharmacyStatus: activeStore ? "active" : "pending",
        },
      ];
    if (sql.includes("WHERE membership.organization_id=ANY"))
      return [
        {
          organizationId: store,
          key: "carepharm",
          name: "Synthetic business",
          status: "active",
          businessStatus: "active",
        },
      ];
    if (sql.includes("FROM semi_franchises sf"))
      return [
        {
          key: "carepharm",
          name: "Synthetic business",
          features: ["tablet", "store-staff-support"],
        },
      ];
    if (sql.includes('AS "ownerUserId"'))
      return ambiguousOwner
        ? [{ ownerUserId: owner }, { ownerUserId: "other" }]
        : [{ ownerUserId: owner }];
    if (sql.includes("metadata->'pharmacyServiceFeatures'"))
      return [{ role: "owner" }];
    throw new Error("Unexpected fixture query");
  });
  return { query, service: new MemberPaidFeatureService({ query } as any) };
}
it("projects approved owned-store eligibility through the runtime resolver and reports all grant sources", async () => {
  const { service, query } = fixture();
  const result = await service.describe(owner);
  expect(result.paidEligible).toBe(true);
  expect(result.pharmacies).toHaveLength(1);
  expect(result.pharmacies[0].memberships).toEqual([
    expect.objectContaining({ key: "carepharm", status: "active" }),
  ]);
  const tablet = result.pharmacies[0].features!.find(
    (feature: any) => feature.key === "tablet",
  )!;
  expect(tablet.allowed).toBe(true);
  expect(tablet.sources).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ type: "member", key: "paid-member" }),
      expect.objectContaining({ type: "semi-franchise", key: "carepharm" }),
    ]),
  );
  expect(query.mock.calls.every(([sql]) => /^SELECT/.test(sql))).toBe(true);
  const storeQuery = query.mock.calls.find(([sql]) =>
    sql.includes("FROM organization_members om"),
  )!;
  expect(storeQuery[0]).toContain("om.role='owner' AND om.left_at IS NULL");
  expect(storeQuery[1]).toEqual([owner]);
  expect(storeQuery[0]).toContain("JOIN neture_pharmacy_memberships p ON p.organization_id=o.id");
  expect(storeQuery[0]).not.toMatch(/LEFT\s+JOIN\s+neture_pharmacy_memberships/);

});
it("does not remove business grants when the paid entitlement is invalid", async () => {
  const { service } = fixture({ paid: false });
  const result = await service.describe(owner);
  expect(result.paidEligible).toBe(false);
  expect(
    result.pharmacies[0].features!.find(
      (feature: any) => feature.key === "tablet",
    ),
  ).toMatchObject({
    allowed: true,
    sources: [
      { type: "semi-franchise", key: "carepharm", name: "Synthetic business" },
    ],
  });
});
it("reports pending store status without deriving feature access before store approval", async () => {
  const { service, query } = fixture({ activeStore: false });
  const result = await service.describe(owner);
  expect(result.pharmacies[0]).toMatchObject({
    pharmacyStatus: "pending",
    features: null,
  });
  expect(
    query.mock.calls.some(([sql]) => sql.includes("FROM semi_franchises sf")),
  ).toBe(false);
});
it("does not turn an ambiguous owner or a read failure into an empty grant list", async () => {
  await expect(
    fixture({ ambiguousOwner: true }).service.describe(owner),
  ).rejects.toMatchObject({
    httpStatus: 503,
    code: "FEATURE_ACCESS_UNAVAILABLE",
  });
  const query = jest
    .fn()
    .mockRejectedValue(new Error("private database details"));
  await expect(
    new MemberPaidFeatureService({ query } as any).describe(owner),
  ).rejects.toMatchObject({ code: "FEATURE_ACCESS_UNAVAILABLE" });
});
it("keeps no-store membership and missing-user outcomes distinct", async () => {
  const query = jest
    .fn()
    .mockResolvedValueOnce([{ id: owner, status: "active", isActive: true }])
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([]);
  expect(
    await new MemberPaidFeatureService({ query } as any).describe(owner),
  ).toMatchObject({ paidEligible: false, pharmacies: [] });
  query.mockResolvedValueOnce([]);
  await expect(
    new MemberPaidFeatureService({ query } as any).describe(owner),
  ).rejects.toMatchObject({ code: "MEMBER_NOT_FOUND" });
});
