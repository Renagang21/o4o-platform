import express from "express";
import request from "supertest";
import { AppDataSource } from "../database/connection.js";
const getUsersWithRole = jest.fn(),
  hasRole = jest.fn(),
  save = jest.fn();
jest.mock("../modules/auth/services/role-assignment.service.js", () => ({
  roleAssignmentService: {
    getUsersWithRole: (...args: unknown[]) => getUsersWithRole(...args),
    hasRole: (...args: unknown[]) => hasRole(...args),
    getRoleNames: jest.fn(),
    assignRole: jest.fn(),
  },
}));
jest.mock("../middleware/auth.middleware.js", () => ({
  authenticate: (req: any, res: any, next: any) => {
    if (!req.headers["x-fixture-role"])
      return res.status(401).json({ success: false });
    req.user = { id: "actor", roles: [req.headers["x-fixture-role"]] };
    next();
  },
  requireRole: (roles: string[]) => (req: any, res: any, next: any) =>
    roles.includes(req.headers["x-fixture-role"])
      ? next()
      : res.status(403).json({ success: false }),
}));
import router from "../routes/admin/platform-accounts.routes.js";
const app = express()
  .use(express.json())
  .use("/api/v1/admin/platform-accounts", router);
const db = AppDataSource as any;
const row = {
  id: "platform-user",
  email: "admin@example.invalid",
  name: "Synthetic platform admin",
  isActive: true,
  status: "active",
  createdAt: "2026-10-21",
  lastLoginAt: null,
};
beforeEach(() => {
  jest.clearAllMocks();
  getUsersWithRole.mockResolvedValue(["platform-user"]);
  hasRole.mockImplementation(
    async (id: string, role: string) =>
      (id === "platform-user" || id === "actor") &&
      role === "platform:super_admin",
  );
  db.getRepository.mockReturnValue({
    find: jest.fn(async () => [row]),
    findOne: jest.fn(async () => ({ ...row, id: "service-user" })),
    save,
  });
});
it.each([undefined, "neture:admin", "community:operator"])(
  "rejects unauthorized %s before reading accounts",
  async (role) => {
    const call = request(app).get("/api/v1/admin/platform-accounts");
    if (role) call.set("x-fixture-role", role);
    await call.expect(role ? 403 : 401);
    expect(getUsersWithRole).not.toHaveBeenCalled();
  },
);
it("selects only platform administrators and returns only the platform role even if other roles exist", async () => {
  const response = await request(app)
    .get("/api/v1/admin/platform-accounts")
    .set("x-fixture-role", "platform:super_admin")
    .expect(200);
  expect(getUsersWithRole.mock.calls).toEqual([["platform:super_admin"]]);
  expect(response.body.data[0].roles).toEqual(["platform:super_admin"]);
  expect(JSON.stringify(response.body)).not.toContain("neture:admin");
});
it("does not let the platform account status endpoint mutate a service-only account", async () => {
  const response = await request(app)
    .patch("/api/v1/admin/platform-accounts/service-user/status")
    .set("x-fixture-role", "platform:super_admin")
    .send({ isActive: false })
    .expect(404);
  expect(response.body.code).toBe("NOT_PLATFORM_ACCOUNT");
  expect(save).not.toHaveBeenCalled();
});
it("keeps self-lock and last active platform administrator protection", async () => {
  await request(app)
    .patch("/api/v1/admin/platform-accounts/actor/status")
    .set("x-fixture-role", "platform:super_admin")
    .send({ isActive: false })
    .expect(403);
  const response = await request(app)
    .patch("/api/v1/admin/platform-accounts/platform-user/status")
    .set("x-fixture-role", "platform:super_admin")
    .send({ isActive: false })
    .expect(403);
  expect(response.body.code).toBe("LAST_SUPER_ADMIN");
  expect(save).not.toHaveBeenCalled();
});
