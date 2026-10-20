import express from "express";
import request from "supertest";
import type { DataSource } from "typeorm";
import { cooperativeManagementRoutes } from "../cooperative-management.routes.js";
import { CooperativeManagementService } from "../services/cooperative-management.service.js";
import { NeturePharmacyError } from "../constants.js";
jest.mock("../../../middleware/auth.middleware.js", () => ({
  requireAuth: (req: any, res: any, next: any) => {
    if (!req.headers["x-test-user"])
      return res.status(401).json({ success: false });
    req.user = { id: req.headers["x-test-user"] };
    next();
  },
}));
const id = "22222222-2222-4222-8222-222222222222";
const actor = "11111111-1111-4111-8111-111111111111";
const app = () => {
  const a = express();
  a.use(express.json());
  a.use("/manage", cooperativeManagementRoutes({} as DataSource));
  return a;
};
afterEach(() => jest.restoreAllMocks());
describe("cooperative management HTTP boundary", () => {
  it("requires authentication on federation, member, role and application paths", async () => {
    for (const path of ["/federation", `/${id}/members`, `/${id}/roles`])
      expect((await request(app()).get("/manage" + path)).status).toBe(401);
    expect(
      (await request(app()).post("/manage/affiliations").send({})).status,
    ).toBe(401);
  });
  it("uses authenticated identity and scoped target, preserves server denial and no-store", async () => {
    const decide = jest
      .spyOn(CooperativeManagementService.prototype, "memberAction")
      .mockRejectedValue(
        new NeturePharmacyError(
          403,
          "COOPERATIVE_FORBIDDEN",
          "조합 admin 권한이 필요합니다.",
        ),
      );
    const response = await request(app())
      .post(`/manage/${id}/members/${id}/actions/approve`)
      .set("x-test-user", actor)
      .send({ userId: "spoof", reason: "검토" });
    expect(response.status).toBe(403);
    expect(response.headers["cache-control"]).toBe("private, no-store");
    expect(decide).toHaveBeenCalledWith(actor, id, id, "approve", "검토");
  });
  it("rejects malformed IDs before querying and never interprets GET as a mutation", async () => {
    const decide = jest
      .spyOn(CooperativeManagementService.prototype, "memberAction")
      .mockResolvedValue({ ok: true });
    expect(
      (
        await request(app())
          .post(`/manage/not-a-uuid/members/${id}/actions/approve`)
          .set("x-test-user", actor)
          .send({ reason: "검토" })
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app())
          .get(`/manage/${id}/members/${id}/actions/approve`)
          .set("x-test-user", actor)
      ).status,
    ).toBe(404);
    expect(decide).not.toHaveBeenCalled();
  });
});
