import express from "express";
import request from "supertest";
const snapshot = jest.fn(async () => ({
  checkedAt: "2026-10-21T04:00:00.000Z",
  services: [],
  infrastructure: [],
}));
jest.mock("../modules/platform/service-health.service.js", () => ({
  ServiceHealthService: jest.fn().mockImplementation(() => ({ snapshot })),
}));
jest.mock("../middleware/auth.middleware.js", () => ({
  requireAuth: (req: any, res: any, next: any) =>
    req.headers["x-fixture-role"]
      ? next()
      : res.status(401).json({ success: false }),
  requireRole: (roles: string[]) => (req: any, res: any, next: any) =>
    roles.includes(req.headers["x-fixture-role"])
      ? next()
      : res.status(403).json({ success: false }),
}));
import { createPlatformHubController } from "../modules/platform/platform-hub.controller.js";
const app = express().use(
  "/api/v1/platform/hub",
  createPlatformHubController({} as any),
);
beforeEach(() => snapshot.mockClear());
it.each([undefined, "neture:admin", "community:operator"])(
  "guards service health before any probe for %s",
  async (role) => {
    const call = request(app).get("/api/v1/platform/hub/summary");
    if (role) call.set("x-fixture-role", role);
    await call.expect(role ? 403 : 401);
    expect(snapshot).not.toHaveBeenCalled();
  },
);
it("returns no-store health only to the platform admin and retires cross-service business triggers", async () => {
  const response = await request(app)
    .get("/api/v1/platform/hub/summary")
    .set("x-fixture-role", "platform:super_admin")
    .expect(200);
  expect(response.headers["cache-control"]).toBe("private, no-store");
  await request(app)
    .post("/api/v1/platform/hub/trigger")
    .set("x-fixture-role", "platform:super_admin")
    .send({ service: "neture", actionKey: "neture.trigger.approve_supplier" })
    .expect(404);
});
