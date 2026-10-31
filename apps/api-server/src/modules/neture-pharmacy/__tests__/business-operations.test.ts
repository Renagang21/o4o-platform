import {
  businessPolicyScope,
  isBusinessPolicyScope,
} from "../services/business-policy-scope.js";
import {
  businessDemandSummary,
  businessOperationsAccess,
} from "../services/business-operations.js";
import { SemiFranchiseService } from "../services/semi-franchise.service.js";

const id = "11111111-1111-4111-8111-111111111111";
afterEach(() => jest.restoreAllMocks());
it("uses a stable namespace within existing policy column limits, rejecting display keys", () => {
  expect(businessPolicyScope(id)).toHaveLength(45);
  expect(isBusinessPolicyScope(`business:${id}`)).toBe(true);
  expect(() => businessPolicyScope("drugstore")).toThrow();
  expect(isBusinessPolicyScope("neture")).toBe(false);
});
it("does not translate authorization or query failure to an empty list", async () => {
  const db = { query: jest.fn() } as any;
  jest
    .spyOn(SemiFranchiseService.prototype, "requireOperatorOf")
    .mockRejectedValue(new Error("denied"));
  await expect(
    businessDemandSummary(db, "actor", "other", "2026-10"),
  ).rejects.toThrow("denied");
  expect(db.query).not.toHaveBeenCalled();
});
it("does not offer settings for a closed business", async () => {
  jest
    .spyOn(SemiFranchiseService.prototype, "requireOperatorOf")
    .mockResolvedValue({ id, status: "closed" } as any);
  await expect(
    businessOperationsAccess({ query: jest.fn() } as any, "actor", "drugstore"),
  ).rejects.toHaveProperty("httpStatus", 404);
});
it.each(["2026-13", "", undefined, ["2026-10"]])(
  "rejects invalid month %j before reading store data",
  async (month) => {
    const query = jest.fn();
    await expect(
      businessDemandSummary({ query } as any, "actor", "drugstore", month),
    ).rejects.toHaveProperty("code", "INVALID_MONTH");
    expect(query).not.toHaveBeenCalled();
  },
);
