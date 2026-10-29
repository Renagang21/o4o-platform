import "reflect-metadata";
import express from "express";
import request from "supertest";
jest.mock("../../../modules/auth/services/role-assignment.service.js", () => ({
  roleAssignmentService: { assignRole: jest.fn(), removeRole: jest.fn() },
}));
import {
  delegationScope,
  OPERATOR_DELEGATION_SCOPES,
  ServiceOperatorManagementService,
} from "../service-operator-management.service.js";
import { createServiceOperatorManagementRoutes } from "../../../routes/service-operator-management.routes.js";

it.each(Object.keys(OPERATOR_DELEGATION_SCOPES))(
  "%s derives exact admin/operator and canonical membership on the server",
  (key) => {
    const scope = delegationScope(key);
    expect(scope.adminRole).not.toContain("super_admin");
    expect(scope.operatorRole).toBe(
      scope.adminRole.replace(/admin$/, "operator"),
    );
    expect(scope.membershipKey).toBe(
      key === "kpa-society"
        ? "kpa-society"
        : ["pharmacy", "carepharm", "megapharm", "pharmcoop"].includes(key)
          ? "neture"
          : key,
    );
  },
);
it.each([
  "__proto__",
  "constructor",
  "platform",
  "k-cosmetics",
  "pharmacy-hub",
  "kpa-branch",
  "store",
  "coop-someone",
])("rejects unsupported or entity-scoped target %s", (key) => {
  expect(() => delegationScope(key)).toThrow("운영 범위를");
});
it("rejects stale/non-admin authority before candidate reads", async () => {
  const query = jest.fn(async () => []);
  const m = { query };
  const s = new ServiceOperatorManagementService({
    transaction: (fn: any) => fn(m),
  } as any);
  await expect(s.list("actor", "funding", "someone")).rejects.toMatchObject({
    status: 403,
  });
  expect(query.mock.calls.some(([, args]) => Array.isArray(args) && args.includes('someone'))).toBe(false);
});
function app() {
  const a = express();
  a.use(express.json());
  a.use(
    "/manage",
    createServiceOperatorManagementRoutes({} as any, (req, _res, next) => {
      req.user = { id: "actor" } as any;
      next();
    }),
  );
  return a;
}
it.each(["post", "delete"] as const)(
  "rejects injected admin/foreign role fields on %s before any DB mutation",
  async (method) => {
    const http = request(app());
    const res = await http[method](
      "/manage/funding/operators/00000000-0000-4000-8000-000000000001",
    ).send({ role: "platform:super_admin", serviceKey: "supplier" });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("UNEXPECTED_OPERATOR_FIELDS");
  },
);
it("requires authentication for reads and writes", async () => {
  const a = express();
  a.use(
    "/manage",
    createServiceOperatorManagementRoutes({} as any, (_req, _res, next) =>
      next(),
    ),
  );
  expect((await request(a).get("/manage/funding")).status).toBe(401);
});
