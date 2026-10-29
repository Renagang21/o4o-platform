const mockRepository = {
  findOne: jest.fn(),
  create: jest.fn((x: any) => ({ ...x })),
  save: jest.fn(async (x: any) => x),
};
jest.mock("../../../../database/connection.js", () => ({
  AppDataSource: { getRepository: () => mockRepository },
}));
jest.mock("../../utils/role-cache.js", () => ({ invalidateRoles: jest.fn() }));
import { RoleAssignmentService } from "../role-assignment.service.js";
import {
  resolvePlatformInvitationRole,
  resolveCentralOperationRole,
} from "../../../../config/operator-role-catalog.js";
const manager = {
  getRepository: () => mockRepository,
  query: jest.fn(async () => []),
};
beforeEach(() => jest.clearAllMocks());
it("ordinary service regrant cannot inherit an old central delegation marker", async () => {
  mockRepository.findOne.mockResolvedValueOnce({
    id: "role",
    userId: "user",
    role: "supplier:operator",
    scopeType: "o4o-direct",
    isActive: false,
  });
  const row = await new RoleAssignmentService().assignRole(
    { userId: "user", role: "supplier:operator", assignedBy: "service-admin" },
    manager as any,
  );
  expect(row.scopeType).toBe("global");
});
it.each([
  "supplier:operator",
  "supplier:admin",
  "neture:pharmcoop_admin",
  "neture:pharmcoop_operator",
])(
  "explicit central acceptance marks %s using the real role classifier",
  async (role) => {
    mockRepository.findOne.mockResolvedValueOnce({
      id: "role",
      userId: "user",
      role,
      scopeType: "global",
      isActive: true,
    });
    const row = await new RoleAssignmentService().assignRole(
      {
        userId: "user",
        role,
        assignedBy: "central-admin",
        scopeType: "o4o-direct",
      },
      manager as any,
    );
    expect(row).toMatchObject({
      scopeType: "o4o-direct",
      role,
      assignedBy: "central-admin",
    });
  },
);
it.each([
  "neture:carepharm_admin",
  "neture:megapharm_operator",
  "kpa:operator",
  "platform:operator",
])("never treats independent/retired %s as a central duty", (role) => {
  expect(() => resolveCentralOperationRole(role, role.split(":")[0])).toThrow();
});
it("central invitations require Admin even with explicit delegation provenance", () => {
  expect(() =>
    resolvePlatformInvitationRole("supplier:operator", "supplier", ""),
  ).toThrow();
  expect(() =>
    resolvePlatformInvitationRole("supplier:operator", "supplier", "o4o-direct"),
  ).toThrow();
  expect(
    resolvePlatformInvitationRole("supplier:admin", "supplier", "o4o-direct"),
  ).toMatchObject({ role: "supplier:admin", serviceKey: "supplier" });
});

it("does not turn an unrelated organization role into a global role", async () => {
  mockRepository.findOne.mockResolvedValueOnce({
    id: "scoped",
    role: "supplier:operator",
    scopeType: "organization",
    scopeId: "synthetic-organization",
  });
  const row = await new RoleAssignmentService().assignRole(
    { userId: "user", role: "supplier:operator", assignedBy: "service-admin" },
    manager as any,
  );
  expect(row).toMatchObject({
    scopeType: "organization",
    scopeId: "synthetic-organization",
  });
});
it("cannot mark an organization role as central even through the canonical writer", async () => {
  mockRepository.findOne.mockResolvedValueOnce({
    id: "scoped",
    role: "supplier:operator",
    scopeType: "organization",
    scopeId: "synthetic-organization",
  });
  await expect(
    new RoleAssignmentService().assignRole(
      {
        userId: "user",
        role: "supplier:operator",
        assignedBy: "central-admin",
        scopeType: "o4o-direct",
      },
      manager as any,
    ),
  ).rejects.toThrow("INVALID_CENTRAL_DELEGATION_SCOPE");
  expect(mockRepository.save).not.toHaveBeenCalled();
});
