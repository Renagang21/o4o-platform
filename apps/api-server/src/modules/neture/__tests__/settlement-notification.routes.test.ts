import express from "express";
import request from "supertest";
import { createAdminSettlementController } from "../controllers/admin-settlement.controller.js";
import { SettlementNotificationError } from "../services/settlement-notification.service.js";
const mockGet = jest.fn(),
  mockList = jest.fn(),
  mockRetry = jest.fn(),
  mockPay = jest.fn();
jest.mock("../services/settlement-notification.service.js", () => {
  const actual = jest.requireActual(
    "../services/settlement-notification.service.js",
  );
  return {
    ...actual,
    SettlementNotificationService: jest
      .fn()
      .mockImplementation(() => ({
        getStatus: mockGet,
        list: mockList,
        retry: mockRetry,
      })),
  };
});
jest.mock("../services/neture-settlement.service.js", () => ({
  NetureSettlementService: jest
    .fn()
    .mockImplementation(() => ({ paySettlement: mockPay })),
}));
jest.mock("../../../middleware/auth.middleware.js", () => ({
  requireAuth: (req: any, res: any, next: any) =>
    req.user ? next() : res.status(401).json({ error: "UNAUTHORIZED" }),
}));
jest.mock("../../../middleware/neture-scope.middleware.js", () => ({
  requireNetureScope: (scope: string) => (req: any, res: any, next: any) =>
    scope === "neture:admin" && req.user?.role === "admin"
      ? next()
      : res.status(403).json({ error: "FORBIDDEN" }),
}));
const id = "1e255420-b7fb-4453-8f09-9eb3f4a51a81";
const job = {
  settlementId: id,
  state: "failed",
  attempts: 1,
  deliveredCount: 0,
  lastErrorCode: "NO_CURRENT_OWNER",
  deliveredAt: null,
  updatedAt: null,
};
function app() {
  const instance = express();
  instance.use(express.json());
  instance.use((req: any, _res, next) => {
    if (req.header("x-fixture-role"))
      req.user = { id: "fixture-actor", role: req.header("x-fixture-role") };
    next();
  });
  instance.use(createAdminSettlementController({} as any));
  return instance;
}
beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue(job);
  mockList.mockResolvedValue({ items: [job], page: 1, limit: 10, total: 1 });
  mockRetry.mockResolvedValue({
    ...job,
    state: "delivered",
    deliveredCount: 1,
  });
});
it.each([
  "/settlements/notification-jobs",
  "/settlements/" + id + "/notification",
])(
  "requires login and existing admin scope before reading %s",
  async (path) => {
    expect((await request(app()).get(path)).status).toBe(401);
    expect(
      (await request(app()).get(path).set("x-fixture-role", "supplier")).status,
    ).toBe(403);
    expect(
      (await request(app()).get(path).set("x-fixture-role", "operator")).status,
    ).toBe(403);
    expect(mockGet).not.toHaveBeenCalled();
    expect(mockList).not.toHaveBeenCalled();
  },
);
it("guards reprocessing and ignores pay/status/actor body fields", async () => {
  const path = "/settlements/" + id + "/notification/retry";
  expect((await request(app()).post(path)).status).toBe(401);
  expect(
    (await request(app()).post(path).set("x-fixture-role", "supplier")).status,
  ).toBe(403);
  expect(mockRetry).not.toHaveBeenCalled();
  const result = await request(app())
    .post(path)
    .set("x-fixture-role", "admin")
    .send({ status: "paid", notes: "must not alter", actorId: "other" });
  expect(result.status).toBe(200);
  expect(mockRetry).toHaveBeenCalledWith(id);
  expect(mockPay).not.toHaveBeenCalled();
});
it("returns explicit failed/pending counts and job states", async () => {
  expect(
    (
      await request(app())
        .get("/settlements/notification-jobs?state=pending&page=2&limit=10")
        .set("x-fixture-role", "admin")
    ).status,
  ).toBe(200);
  expect(mockList).toHaveBeenCalledWith("pending", 2, 10);
  const result = await request(app())
    .get("/settlements/" + id + "/notification")
    .set("x-fixture-role", "admin");
  expect(result.body).toEqual({ success: true, data: job });
});
it.each([
  "state=delivered",
  "state=failed&state=failed",
  "page=0",
  "page=1.1",
  "page=Infinity",
  "limit=101",
  "limit=0",
])("rejects malformed list input %s", async (query) => {
  expect(
    (
      await request(app())
        .get("/settlements/notification-jobs?" + query)
        .set("x-fixture-role", "admin")
    ).status,
  ).toBe(400);
  expect(mockList).not.toHaveBeenCalled();
});
it.each([
  ["NOT_FOUND", 404],
  ["SETTLEMENT_NOT_PAID", 409],
  ["LEGACY_NOTIFICATION_UNKNOWN", 409],
])("reports %s without re-running payment", async (code, status) => {
  mockRetry.mockRejectedValue(
    new SettlementNotificationError(String(code), Number(status)),
  );
  const result = await request(app())
    .post("/settlements/" + id + "/notification/retry")
    .set("x-fixture-role", "admin");
  expect(result.status).toBe(status);
  expect(result.body.error).toBe(code);
  expect(mockPay).not.toHaveBeenCalled();
});
it("returns 503 on storage errors rather than zero or success, without exposing raw details", async () => {
  mockGet.mockRejectedValue(Error("private fixture database context"));
  const result = await request(app())
    .get("/settlements/" + id + "/notification")
    .set("x-fixture-role", "admin");
  expect(result.status).toBe(503);
  expect(result.body.success).toBe(false);
  expect(JSON.stringify(result.body)).not.toContain("private fixture");
});
it("rejects malformed identifiers before work", async () => {
  expect(
    (
      await request(app())
        .post("/settlements/not-uuid/notification/retry")
        .set("x-fixture-role", "admin")
    ).status,
  ).toBe(400);
  expect(mockRetry).not.toHaveBeenCalled();
});
