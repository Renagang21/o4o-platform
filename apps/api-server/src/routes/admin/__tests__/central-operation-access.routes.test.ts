import express from "express";
import request from "supertest";
jest.mock("../../../database/connection.js", () => ({ AppDataSource: {} }));
const roles = jest.fn();
jest.mock("../../../services/admin/central-operation-access.js", () => ({
  centralOperationRoles: (...args: unknown[]) => roles(...args),
}));
jest.mock("../../../middleware/auth.middleware.js", () => ({
  authenticate: (req: any, res: any, next: any) => {
    if (!req.headers["x-user"]) return res.sendStatus(401);
    req.user = { id: req.headers["x-user"] };
    req.authMethod = req.headers["x-method"];
    next();
  },
}));
import { centralOperationAccessRouter } from "../central-operation-access.routes.js";
const app = express();
app.use("/access", centralOperationAccessRouter);
beforeEach(() => roles.mockReset());
it.each(["password", "kakao", "unknown", undefined])(
  "rejects non-Google proof %s before reading delegation",
  async (method) => {
    let req = request(app).get("/access").set("x-user", "user");
    if (method) req = req.set("x-method", method);
    expect((await req).status).toBe(403);
    expect(roles).not.toHaveBeenCalled();
  },
);
it("rejects anonymous, unassigned, and failed authority reads", async () => {
  expect((await request(app).get("/access")).status).toBe(401);
  roles.mockResolvedValueOnce([]);
  expect(
    (
      await request(app)
        .get("/access")
        .set("x-user", "user")
        .set("x-method", "google")
    ).status,
  ).toBe(403);
  roles.mockRejectedValueOnce(new Error("private"));
  expect(
    (
      await request(app)
        .get("/access")
        .set("x-user", "user")
        .set("x-method", "google")
    ).status,
  ).toBe(503);
});
it("returns only server-resolved current duties", async () => {
  roles.mockResolvedValueOnce(["supplier:operator"]);
  const r = await request(app)
    .get("/access")
    .set("x-user", "user")
    .set("x-method", "google");
  expect(r.status).toBe(200);
  expect(r.body.data.roles).toEqual(["supplier:operator"]);
});
