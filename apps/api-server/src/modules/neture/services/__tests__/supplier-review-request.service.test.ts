jest.mock("../../../../services/auth/demo-account.service.js", () => ({
  demoAccountService: {
    isDemoAccount: jest.fn().mockResolvedValue(false),
    isDemoOrganization: jest.fn().mockResolvedValue(false),
  },
}));
import {
  reviewItems,
  reviewText,
  SupplierReviewRequestService,
} from "../supplier-review-request.service.js";
import { demoAccountService } from "../../../../services/auth/demo-account.service.js";
const supplier = "20000000-0000-4000-8000-000000000001",
  request = "30000000-0000-4000-8000-000000000001",
  actor = "10000000-0000-4000-8000-000000000001";
const insert = jest.fn();
const manager = { query: jest.fn(), getRepository: () => ({ insert }) };
const ds: any = { transaction: (fn: any) => fn(manager), query: jest.fn() };
beforeEach(() => {
  jest.clearAllMocks();
  (demoAccountService.isDemoAccount as jest.Mock).mockResolvedValue(false);
  (demoAccountService.isDemoOrganization as jest.Mock).mockResolvedValue(false);
  insert.mockResolvedValue({});
});
it.each([null, "", [], ["unsupported"], ["contact", 3]])(
  "rejects invalid item lists %p",
  (value) => {
    expect(() => reviewItems(value)).toThrow();
  },
);
it("normalizes known items without allowing arbitrary fields", () => {
  expect(reviewItems(["contact", "contact"])).toEqual(["contact"]);
  expect(reviewText("  보완 설명  ")).toBe("보완 설명");
});
it.each([null, "", " ".repeat(3), "a".repeat(2001), "a\0b"])(
  "rejects invalid note %p",
  (value) => {
    expect(() => reviewText(value)).toThrow();
  },
);
it("rejects inactive and Demo targets before creating a request", async () => {
  const service = new SupplierReviewRequestService(ds);
  manager.query.mockResolvedValueOnce([{ status: "INACTIVE" }]);
  await expect(
    service.create(supplier, actor, { items: ["contact"], note: "fixture" }),
  ).rejects.toMatchObject({ code: "SUPPLIER_INACTIVE" });
  manager.query.mockResolvedValueOnce([{ status: "PENDING", user_id: actor }]);
  (demoAccountService.isDemoAccount as jest.Mock).mockResolvedValue(true);
  await expect(
    service.create(supplier, actor, { items: ["contact"], note: "fixture" }),
  ).rejects.toMatchObject({ code: "DEMO_ACCOUNT_FORBIDDEN" });
  expect(insert).not.toHaveBeenCalled();
});
it("rejects stale versions and cross-supplier request lookups", async () => {
  const service = new SupplierReviewRequestService(ds);
  manager.query
    .mockResolvedValueOnce([{ status: "PENDING" }])
    .mockResolvedValueOnce([{ version: 2, state: "submitted" }]);
  await expect(
    service.transition(supplier, request, actor, "submit", {
      version: 1,
      note: "fixture",
    }),
  ).rejects.toMatchObject({ code: "REVIEW_REQUEST_CHANGED" });
  expect(manager.query.mock.calls[1][1]).toEqual([request, supplier]);
  expect(insert).not.toHaveBeenCalled();
});
it("does not convert audit insertion failure into successful request creation", async () => {
  manager.query
    .mockResolvedValueOnce([{ status: "PENDING" }])
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([{ id: request, version: 1 }]);
  insert.mockRejectedValueOnce(new Error("audit unavailable"));
  await expect(
    new SupplierReviewRequestService(ds).create(supplier, actor, {
      items: ["contact"],
      note: "fixture",
    }),
  ).rejects.toThrow("audit unavailable");
});
it("refuses to resolve a request the supplier has not submitted", async () => {
  manager.query
    .mockResolvedValueOnce([{ status: "PENDING" }])
    .mockResolvedValueOnce([{ id: request, version: 1, state: "requested" }]);
  await expect(
    new SupplierReviewRequestService(ds).transition(
      supplier,
      request,
      actor,
      "resolve",
      { version: 1, note: "fixture" },
    ),
  ).rejects.toMatchObject({ code: "REVIEW_REQUEST_NOT_SUBMITTED" });
  expect(manager.query).toHaveBeenCalledTimes(2);
  expect(insert).not.toHaveBeenCalled();
});
it("resolves submitted requests only when the locked state and version still match", async () => {
  manager.query
    .mockResolvedValueOnce([{ status: "PENDING" }])
    .mockResolvedValueOnce([{ id: request, version: 2, state: "submitted" }])
    .mockResolvedValueOnce([{ id: request, version: 3, state: "resolved" }]);
  const row = await new SupplierReviewRequestService(ds).transition(
    supplier,
    request,
    actor,
    "resolve",
    { version: 2, note: "fixture" },
  );
  expect(row.state).toBe("resolved");
  expect(manager.query.mock.calls[2][0]).toContain("AND state = $5 AND version = $6");
  expect(manager.query.mock.calls[2][1].slice(2)).toEqual([request, supplier, "submitted", 2]);
  manager.query
    .mockResolvedValueOnce([{ status: "PENDING" }])
    .mockResolvedValueOnce([{ id: request, version: 2, state: "submitted" }])
    .mockResolvedValueOnce([]);
  await expect(
    new SupplierReviewRequestService(ds).transition(
      supplier,
      request,
      actor,
      "resolve",
      { version: 2, note: "fixture" },
    ),
  ).rejects.toMatchObject({ code: "REVIEW_REQUEST_CHANGED" });
  expect(insert).toHaveBeenCalledTimes(1);
});
