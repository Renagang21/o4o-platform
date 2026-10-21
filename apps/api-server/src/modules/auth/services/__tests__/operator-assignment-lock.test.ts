import "reflect-metadata";
const mockRepository = {
  findOne: jest.fn(),
  create: jest.fn((v: any) => v),
  save: jest.fn(async (v: any) => v),
};
const mockManager = {
  query: jest.fn(async () => []),
  getRepository: () => mockRepository,
};
jest.mock("../../../../database/connection.js", () => ({
  AppDataSource: {
    getRepository: () => mockRepository,
    transaction: jest.fn(async (fn: any) => fn(mockManager)),
  },
}));
jest.mock("../../utils/role-cache.js", () => ({ invalidateRoles: jest.fn() }));
import { AppDataSource } from "../../../../database/connection.js";
import { RoleAssignmentService } from "../role-assignment.service.js";
import { isOperatorAssignmentRole } from "../operator-assignment-lock.js";
beforeEach(() => {
  jest.clearAllMocks();
  mockRepository.findOne.mockResolvedValue(null);
});
it.each([
  "neture:operator",
  "lecture:operator",
  "kpa:operator",
  "neture:carepharm_operator",
  "kpa-branch:operator",
])("serializes %s grants without a caller transaction", async (role) => {
  const service = new RoleAssignmentService();
  await service.assignRole({ userId: "target", role });
  expect(AppDataSource.transaction).toHaveBeenCalledTimes(1);
  expect(mockManager.query).toHaveBeenCalledWith(
    expect.stringContaining("pg_advisory_xact_lock"),
    ["operator-assignment:target"],
  );
});
it("uses the supplied transaction for operator revocation and preserves deactivation", async () => {
  const row = { deactivate: jest.fn() };
  mockRepository.findOne.mockResolvedValue(row);
  await new RoleAssignmentService().removeRole(
    "target",
    "funding:operator",
    mockManager as any,
  );
  expect(AppDataSource.transaction).not.toHaveBeenCalled();
  expect(mockManager.query).toHaveBeenCalled();
  expect(row.deactivate).toHaveBeenCalled();
  expect(mockRepository.save).toHaveBeenCalledWith(row);
});
it("opens a transaction for an operator revocation without a supplied manager", async () => {
  await expect(
    new RoleAssignmentService().removeRole("target", "funding:operator"),
  ).resolves.toBe(false);
  expect(AppDataSource.transaction).toHaveBeenCalledTimes(1);
  expect(mockManager.query).toHaveBeenCalledTimes(1);
});
it.each([
  "neture:admin",
  "platform:super_admin",
  "neture:supplier",
  "kpa:store_owner",
])(
  "does not change %s transaction or last-admin locking behavior",
  async (role) => {
    expect(isOperatorAssignmentRole(role)).toBe(false);
    await new RoleAssignmentService().assignRole({ userId: "target", role });
    expect(AppDataSource.transaction).not.toHaveBeenCalled();
    expect(mockManager.query).not.toHaveBeenCalled();
  },
);
