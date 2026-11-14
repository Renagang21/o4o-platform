import express from "express";
import request from "supertest";
// 2026-11-14 통합 담당 결정: 커뮤니티 홈 · 편집 콘텐츠는 로그인한(이용 가능한) 회원만 읽는다.
const home = jest.fn(async () => ({ member: true })), list = jest.fn(async () => ({ items: [] })), one = jest.fn(async () => ({ id: "x" }));
const workspace = jest.fn();
jest.mock("../../database/connection", () => ({ AppDataSource: { query: jest.fn(async () => []) } }));
jest.mock("../../middleware/rateLimiter", () => ({
  apiLimiter: (_req: any, _res: any, next: any) => next(),
  newsBeaconLimiter: (_req: any, _res: any, next: any) => next(),
}));
jest.mock("../../services/community/community-news-auto.service", () => ({}));
jest.mock("../../services/community/community-news-collection.service", () => ({}));
jest.mock("../../services/community/community-news-ai.service", () => ({}));
jest.mock("../../services/community/community-news-review.service", () => ({}));
jest.mock("../../services/community/community-home.service", () => ({
  communityHome: (...a: unknown[]) => (home as any)(...a),
  listEditorial: (...a: unknown[]) => (list as any)(...a),
  getEditorial: (...a: unknown[]) => (one as any)(...a),
  homeKind: (k: unknown) => k ?? "notice",
}));
jest.mock("../../services/community/community-workspace.service", () => ({ resolveCommunityWorkspace: (...a: unknown[]) => workspace(...a) }));
jest.mock("../../services/community/community-management.service", () => ({ CommunityManagementError: class extends Error {} }));
jest.mock("../../services/community/community-public-read.service", () => ({ CommunityPublicReadError: class extends Error {} }));
import { createCommunityHomeRoutes } from "../community-home.routes";
const app = express();
const authenticate = (req: any, res: any, next: any) => {
  if (req.headers.authorization !== "member") return res.status(401).json({ success: false, code: "AUTH_REQUIRED" });
  req.user = { id: "member" };
  next();
};
app.use(createCommunityHomeRoutes((_req, _res, next) => next(), authenticate, async (req: any) => (req.user ? { id: req.user.id, roles: [], memberships: [] } : null)));
beforeEach(() => { jest.clearAllMocks(); workspace.mockResolvedValue({ allowed: true }); });

it.each(["/community/home", "/community/editorial?kind=notice", "/community/editorial/a"])("guests get 401 for %s and nothing is read", async (path) => {
  await request(app).get(path).expect(401);
  expect(home).not.toHaveBeenCalled(); expect(list).not.toHaveBeenCalled(); expect(one).not.toHaveBeenCalled();
});
it("a suspended or withdrawn member gets 403", async () => {
  workspace.mockResolvedValue({ allowed: false });
  const res = await request(app).get("/community/home").set("Authorization", "member").expect(403);
  expect(res.body.code).toBe("COMMUNITY_ACCESS_REQUIRED");
  expect(home).not.toHaveBeenCalled();
});
it("a member reads the home", async () => {
  const res = await request(app).get("/community/home").set("Authorization", "member").expect(200);
  expect(res.body.data).toEqual({ member: true });
});
