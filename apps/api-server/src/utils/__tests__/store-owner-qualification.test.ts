import { isStoreOwner } from "../store-owner.utils.js";
import { hasApprovedPharmacist } from "../../services/qualifications/pharmacist-qualification.service.js";
import { resolveStoreOrganization } from "../store-organization.resolver.js";
import { policyAcceptanceService } from "../../modules/policy-acceptance/policy-acceptance.service.js";
jest.mock("../../database/connection.js", () => ({ AppDataSource: {} }));
jest.mock(
  "../../services/qualifications/pharmacist-qualification.service.js",
  () => ({ hasApprovedPharmacist: jest.fn() }),
);
jest.mock("../store-organization.resolver.js", () => ({
  resolveStoreOrganization: jest.fn(),
}));
jest.mock(
  "../../modules/policy-acceptance/policy-acceptance.service.js",
  () => ({
    policyAcceptanceService: {
      getPendingStoreOwnerAgreementsForUser: jest.fn(),
    },
  }),
);
const qualified = jest.mocked(hasApprovedPharmacist),
  resolve = jest.mocked(resolveStoreOrganization),
  agreements = jest.mocked(
    policyAcceptanceService.getPendingStoreOwnerAgreementsForUser,
  );
const resolution = {
  status: "resolved" as const,
  organizationId: "store-a",
  memberRole: "owner",
  candidateCount: 1,
};
beforeEach(() => {
  jest.clearAllMocks();
  qualified.mockResolvedValue(true);
  resolve.mockResolvedValue(resolution);
  agreements.mockResolvedValue([]);
});
it("an active pharmacy and owner relation are insufficient without personal qualification; revocation takes effect immediately", async () => {
  const db = { query: jest.fn() } as any;
  expect(await isStoreOwner(db, "owner", "kpa", "store-a")).toMatchObject({
    isOwner: true,
    organizationId: "store-a",
  });
  qualified.mockResolvedValue(false);
  expect(await isStoreOwner(db, "owner", "kpa", "store-a")).toMatchObject({
    isOwner: false,
    organizationId: null,
    qualificationRequired: true,
  });
  expect(qualified).toHaveBeenCalledWith(db, "owner");
});
it("a qualification never substitutes missing pharmacy authority or an unsigned business agreement", async () => {
  resolve.mockResolvedValueOnce({
    ...resolution,
    status: "none",
    organizationId: null,
    memberRole: "",
    candidateCount: 0,
  });
  expect((await isStoreOwner({} as any, "pharmacist", "kpa")).isOwner).toBe(
    false,
  );
  expect(qualified).not.toHaveBeenCalled();
  agreements.mockResolvedValueOnce([{ policyId: "agreement" }] as any);
  expect(await isStoreOwner({} as any, "owner", "kpa")).toMatchObject({
    isOwner: false,
    pendingAgreement: { policyId: "agreement" },
  });
});
it("does not impose a pharmacy credential on ordinary retail owners", async () => {
  const db = { query: jest.fn().mockResolvedValue([{ ok: 1 }]) } as any;
  expect((await isStoreOwner(db, "retailer", "cosmetics")).isOwner).toBe(true);
  expect(qualified).not.toHaveBeenCalled();
});
it("the legacy unscoped entry still checks personal qualification when the resolved store is a pharmacy", async () => {
  const db = {
    query: jest
      .fn()
      .mockImplementation(async (sql: string) =>
        sql.includes("SELECT type") ? [{ type: "pharmacy" }] : [{ ok: 1 }],
      ),
  } as any;
  qualified.mockResolvedValue(false);
  expect(await isStoreOwner(db, "owner")).toMatchObject({
    isOwner: false,
    qualificationRequired: true,
  });
});
