import express from "express";
import request from "supertest";
const mine = jest.fn(),
  apply = jest.fn(),
  list = jest.fn(),
  decide = jest.fn();
jest.mock("../../database/connection.js", () => ({ AppDataSource: {} }));
jest.mock("../../middleware/rateLimiter.js", () => ({
  apiLimiter: (_req: any, _res: any, next: any) => next(),
}));
jest.mock("../../middleware/auth.middleware.js", () => ({
  authenticate: (req: any, res: any, next: any) => {
    if (!req.headers["x-user"]) return res.sendStatus(401);
    req.user = { id: req.headers["x-user"] };
    req.authMethod = req.headers["x-method"];
    next();
  },
}));
jest.mock(
  "../../services/qualifications/pharmacist-qualification.service.js",
  () => ({
    PharmacistQualificationService: jest
      .fn()
      .mockImplementation(() => ({ mine, request: apply, list, decide })),
  }),
);
import { pharmacistQualificationsRouter } from "../pharmacist-qualifications.routes.js";
import { OperationError } from "../../services/operations/operation-audit.js";
const app = express();
app.use(express.json());
app.use("/qualifications", pharmacistQualificationsRouter);
const actor = "11111111-1111-4111-8111-111111111111",
  target = "22222222-2222-4222-8222-222222222222";
const input = {
  action: "approve",
  reason: "Synthetic evidence checked",
  version: "2026-10-28T00:00:00.123456",
  licenseEvidenceChecked: true,
};
it("uses the common-account list by default and passes explicit status, page and search to the authorized service", async () => {
  list.mockResolvedValue({ items: [], counts: { all: 0 } });
  expect((await request(app).get('/qualifications/review').set('x-user', actor).set('x-method', 'google')).status).toBe(200);
  expect(list).toHaveBeenLastCalledWith(actor, 'all', 1, '', false);
  await request(app).get('/qualifications/review?status=pending&page=2&q=member').set('x-user', actor).set('x-method', 'google');
  expect(list).toHaveBeenLastCalledWith(actor, 'pending', 2, 'member', false);
});
beforeEach(() => {
  jest.clearAllMocks();
  mine.mockResolvedValue({ status: "unrequested" });
  apply.mockResolvedValue({ status: "pending" });
  list.mockResolvedValue({ items: [] });
  decide.mockResolvedValue({ status: "approved" });
});
it("requires authentication and never accepts a target or status from self application", async () => {
  expect((await request(app).get("/qualifications/me")).status).toBe(401);
  for (const extra of [
    { userId: target },
    { status: "approved" },
    { license_verified: true },
  ]) {
    expect(
      (
        await request(app)
          .post("/qualifications/me")
          .set("x-user", actor)
          .send({
            licenseNumber: "synthetic",
            ownLicenseConfirmed: true,
            ...extra,
          })
      ).status,
    ).toBe(400);
  }
  expect(apply).not.toHaveBeenCalled();
});
it.each(["google", "password", "kakao"])(
  "keeps common account self application available with %s login",
  async (method) => {
    const response = await request(app)
      .post("/qualifications/me")
      .set("x-user", actor)
      .set("x-method", method)
      .send({ licenseNumber: " synthetic ", ownLicenseConfirmed: true });
    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toContain("no-store");
    expect(apply).toHaveBeenCalledWith(actor, "synthetic");
  },
);
it("requires own licence confirmation and excludes unknown review fields", async () => {
  expect(
    (
      await request(app)
        .post("/qualifications/me")
        .set("x-user", actor)
        .send({ licenseNumber: "synthetic" })
    ).status,
  ).toBe(400);
  expect(
    (
      await request(app)
        .post(`/qualifications/review/${target}`)
        .set("x-user", actor)
        .set("x-method", "google")
        .send({ ...input, scope: "all" })
    ).status,
  ).toBe(400);
  expect(decide).not.toHaveBeenCalled();
});
it.each(["password", "kakao", undefined])(
  "rejects central review without Google proof %s before invoking the service",
  async (method) => {
    let read = request(app).get("/qualifications/review").set("x-user", actor);
    let write = request(app)
      .post(`/qualifications/review/${target}`)
      .set("x-user", actor);
    if (method) {
      read = read.set("x-method", method);
      write = write.set("x-method", method);
    }
    expect((await read).status).toBe(403);
    expect((await write.send(input)).status).toBe(403);
    expect(list).not.toHaveBeenCalled();
    expect(decide).not.toHaveBeenCalled();
  },
);
it("passes live authority denials and fails closed without exposing database details", async () => {
  list.mockRejectedValueOnce(
    new OperationError(403, "QUALIFICATION_REVIEWER_REQUIRED", "위임 필요"),
  );
  expect(
    (
      await request(app)
        .get("/qualifications/review")
        .set("x-user", actor)
        .set("x-method", "google")
    ).status,
  ).toBe(403);
  decide.mockRejectedValueOnce(new Error("private query arguments"));
  const r = await request(app)
    .post(`/qualifications/review/${target}`)
    .set("x-user", actor)
    .set("x-method", "google")
    .send(input);
  expect(r.status).toBe(503);
  expect(JSON.stringify(r.body)).not.toContain("private");
});
it("uses the authenticated reviewer, URL target and exact version", async () => {
  const r = await request(app)
    .post(`/qualifications/review/${target}`)
    .set("x-user", actor)
    .set("x-method", "google")
    .send(input);
  expect(r.status).toBe(200);
  expect(decide).toHaveBeenCalledWith(actor, target, input);
});
