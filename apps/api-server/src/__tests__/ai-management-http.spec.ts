import express from "express";
import request from "supertest";
import { AppDataSource } from "../database/connection.js";
import adminRouter from "../routes/ai-admin.routes.js";

jest.mock("../services/ai-admin.service.js", () => ({ aiAdminService: {} }));
// Exercise the mount's authentication/role gate, not an alternate unguarded test mount.
jest.mock("../middleware/auth.middleware.js", () => ({
  authenticate: (req: any, res: any, next: any) =>
    req.headers["x-fixture-role"]
      ? next()
      : res.status(401).json({ success: false }),
  requireAdmin: (req: any, res: any, next: any) =>
    req.headers["x-fixture-role"] === "platform:super_admin"
      ? next()
      : res.status(403).json({ success: false }),
}));
const app = express().use("/api/ai/admin", adminRouter);
const db = AppDataSource as any;

beforeEach(() => {
  db.isInitialized = true;
  db.query.mockReset().mockResolvedValue([]);
});

it.each(["/management", "/management/usage?days=7"])(
  "guards %s before querying",
  async (path) => {
    await request(app).get(`/api/ai/admin${path}`).expect(401);
    await request(app)
      .get(`/api/ai/admin${path}`)
      .set("x-fixture-role", "neture:admin")
      .expect(403);
    expect(db.query).not.toHaveBeenCalled();
  },
);

it("returns the catalog only to the platform admin and exposes no write endpoint", async () => {
  const reply = await request(app)
    .get("/api/ai/admin/management")
    .set("x-fixture-role", "platform:super_admin")
    .expect(200);
  expect(reply.body.data.usages).toHaveLength(31);
  expect(reply.headers["cache-control"]).toBe("private, no-store");
  await request(app)
    .put("/api/ai/admin/management")
    .set("x-fixture-role", "platform:super_admin")
    .send({ enabled: true })
    .expect(404);
  expect(
    db.query.mock.calls.every(([sql]: [string]) => /^SELECT/.test(sql)),
  ).toBe(true);
});

it.each(["7.0", "0", "7&days=30", "7%20OR%201=1", "7&days[x]=7"])(
  "rejects malformed period %s",
  async (days) => {
    await request(app)
      .get(`/api/ai/admin/management/usage?days=${days}`)
      .set("x-fixture-role", "platform:super_admin")
      .expect(400);
    expect(db.query).not.toHaveBeenCalled();
  },
);

it("sanitizes database failures instead of exposing private details or a zero count", async () => {
  db.query.mockRejectedValue(new Error("fixture-private-database-detail"));
  const response = await request(app)
    .get("/api/ai/admin/management/usage")
    .set("x-fixture-role", "platform:super_admin")
    .expect(503);
  expect(response.body.code).toBe("AI_USAGE_UNAVAILABLE");
  expect(JSON.stringify(response.body)).not.toContain(
    "fixture-private-database-detail",
  );
  expect(response.body.data).toBeUndefined();
});
