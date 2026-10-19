import express from "express";
import request from "supertest";
import type { DataSource } from "typeorm";
import { initialHomePresentation } from "@o4o/types";

function mockScopeGuard(scope: string) {
  return (req: any, res: any, next: any) =>
    req.headers["x-test-role"] === scope &&
    req.headers["x-test-membership"] === "active"
      ? next()
      : res.status(403).json({ success: false });
}
jest.mock("../../../middleware/auth.middleware", () => ({
  requireAuth: (req: any, res: any, next: any) => {
    if (!req.headers["x-test-user"]) return res.sendStatus(401);
    req.user = { id: req.headers["x-test-user"] };
    next();
  },
}));
jest.mock("../../../middleware/neture-scope.middleware", () => ({
  requireNetureScope: (scope: string) => mockScopeGuard(scope),
  requireNetureBusinessScope: (req: any, res: any, next: any) => {
    const role = req.headers["x-test-role"];
    const allowed = /^neture:(?:(?:pharmacy|carepharm|megapharm|pharmcoop)_)?(?:admin|operator)$/.test(role || "");
    return allowed && req.headers["x-test-membership"] === "active" ? next() : res.status(403).json({ success: false });
  },
}));
jest.mock("../../../middleware/supplier-service-scope.middleware", () => ({
  requireSupplierScope: (scope: string) => mockScopeGuard(scope),
}));
jest.mock("../../../middleware/funding-service-scope.middleware", () => ({
  requireFundingScope: (scope: string) => mockScopeGuard(scope),
}));
jest.mock("../../../middleware/community-service-scope.middleware", () => ({
  requireCommunityServiceScope: (scope: string) => mockScopeGuard(scope),
}));
jest.mock("../../../middleware/lecture-scope.middleware", () => ({
  requireLectureScope: (scope: string) => mockScopeGuard(scope),
}));
jest.mock("../../../common/middleware/membership-guard.middleware", () => ({
  createMembershipScopeGuard: () => (scope: string) => mockScopeGuard(scope),
}));
jest.mock("../../../middleware/rateLimiter", () => ({
  apiLimiter: (_req: any, _res: any, next: any) => next(),
}));
jest.mock("@o4o/security-core", () => ({ KPA_SCOPE_CONFIG: {} }));
jest.mock(
  "../../../modules/neture-pharmacy/services/semi-franchise.service",
  () => ({
    SemiFranchiseService: jest.fn().mockImplementation(() => ({
      getByKey: mockBusiness,
      requireOperatorOf: mockBusinessOperator,
    })),
  }),
);
const mockBusiness = jest.fn(),
  mockBusinessOperator = jest.fn();
import { createHomePresentationRoutes } from "../home-presentation.routes";
import {
  HomePresentationService,
  PresentationConflict,
} from "../home-presentation.service";
const user = "11111111-1111-4111-8111-111111111111";
let app: express.Express;
let read: jest.SpyInstance,
  save: jest.SpyInstance,
  publicRead: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks();
  read = jest
    .spyOn(HomePresentationService.prototype, "read")
    .mockResolvedValue({ revision: 0, draft: null, published: null });
  save = jest
    .spyOn(HomePresentationService.prototype, "save")
    .mockResolvedValue({
      revision: 1,
      draft: initialHomePresentation("neture"),
      published: null,
    });
  publicRead = jest
    .spyOn(HomePresentationService.prototype, "publicRead")
    .mockResolvedValue(null);
  mockBusiness.mockResolvedValue({
    id: "business",
    organization_id: user,
    status: "active",
  });
  mockBusinessOperator.mockResolvedValue({ id: "business" });
  app = express();
  app.use(express.json());
  app.use("/home", createHomePresentationRoutes({} as DataSource));
});
afterEach(() => jest.restoreAllMocks());
it.each([
  "supplier",
  "funding",
  "community",
  "neture",
  "carepharm",
  "pharmacy",
  "lecture",
])("requires authentication for %s management", async (surface) => {
  expect((await request(app).get(`/home/${surface}/manage`)).status).toBe(401);
  expect(read).not.toHaveBeenCalled();
});
it.each([
  ["supplier", "supplier"],
  ["funding", "funding"],
  ["community", "community"],
  ["neture", "neture"],
  ["carepharm", "neture"],
  ["pharmacy", "kpa"],
  ["lecture", "lecture"],
])("maps %s only to its existing %s scope guard", async (surface, prefix) => {
  const response = await request(app)
    .get(`/home/${surface}/manage`)
    .set("x-test-user", user)
    .set("x-test-role", `${prefix}:operator`)
    .set("x-test-membership", "active");
  expect(response.status).toBe(200);
  expect(read).toHaveBeenCalledWith({ surface, organizationId: null });
  read.mockClear();
  const wrong = prefix === "neture" ? "supplier" : "neture";
  expect(
    (
      await request(app)
        .get(`/home/${surface}/manage`)
        .set("x-test-user", user)
        .set("x-test-role", `${wrong}:operator`)
        .set("x-test-membership", "active")
    ).status,
  ).toBe(403);
  expect(read).not.toHaveBeenCalled();
});
it("does not allow a role without active membership or generic branch management", async () => {
  expect(
    (
      await request(app)
        .get("/home/supplier/manage")
        .set("x-test-user", user)
        .set("x-test-role", "supplier:operator")
    ).status,
  ).toBe(403);
  expect(
    (await request(app).get("/home/branch/manage").set("x-test-user", user))
      .status,
  ).toBe(404);
});
it("returns only the public read and never the editor draft", async () => {
  expect((await request(app).get("/home/supplier")).status).toBe(200);
  expect(publicRead).toHaveBeenCalledWith({
    surface: "supplier",
    organizationId: null,
  });
  expect(read).not.toHaveBeenCalled();
});
function put(body: unknown) {
  return request(app)
    .put("/home/supplier/manage")
    .set("x-test-user", user)
    .set("x-test-role", "supplier:operator")
    .set("x-test-membership", "active")
    .send(body);
}
it("validates before writing and maps stale revisions to 409", async () => {
  const config = initialHomePresentation("supplier");
  config.slides[0].imageUrl = "javascript:alert(1)";
  expect((await put({ config, revision: 0, publish: true })).status).toBe(400);
  expect(save).not.toHaveBeenCalled();
  save.mockRejectedValueOnce(new PresentationConflict("conflict"));
  expect(
    (
      await put({
        config: initialHomePresentation("supplier"),
        revision: 0,
        publish: true,
      })
    ).status,
  ).toBe(409);
});
it("derives the service scope from the route and the actor from authenticated state", async () => {
  const config = initialHomePresentation("supplier");
  expect(
    (
      await put({
        config,
        revision: 0,
        publish: false,
        surface: "funding",
        organizationId: user,
        userId: "spoofed",
      })
    ).status,
  ).toBe(200);
  expect(save).toHaveBeenCalledWith(
    { surface: "supplier", organizationId: null },
    config,
    0,
    false,
    user,
  );
});
it("requires the assigned pharmacy business operator and derives organization from its row", async () => {
  const path = "/home/pharmacy/business/fixture/manage";
  let response = await request(app)
    .get(path)
    .set("x-test-user", user)
    .set("x-test-role", "neture:operator")
    .set("x-test-membership", "active");
  expect(response.status).toBe(200);
  expect(mockBusinessOperator).toHaveBeenCalledWith(user, "fixture");
  expect(read).toHaveBeenCalledWith({
    surface: "pharmacy",
    organizationId: user,
  });
  read.mockClear();
  mockBusinessOperator.mockRejectedValueOnce({ httpStatus: 403 });
  response = await request(app)
    .get(path)
    .set("x-test-user", user)
    .set("x-test-role", "neture:operator")
    .set("x-test-membership", "active");
  expect(response.status).toBe(403);
  expect(read).not.toHaveBeenCalled();
});
