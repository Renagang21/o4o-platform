import express from "express";
import request from "supertest";
const collect = jest.fn(),
  read = jest.fn();
jest.mock("../../database/connection", () => ({ AppDataSource: {query: jest.fn(async () => [])} }));
jest.mock("../../middleware/rateLimiter", () => ({
  apiLimiter: (_req: any, _res: any, next: any) => next(),
}));
jest.mock("../../services/community/community-news-collection.service", () => ({
  collectNews: (...a: unknown[]) => collect(...a),
  getNewsCollection: (...a: unknown[]) => read(...a),
}));
jest.mock("../../services/community/community-news-ai.service", () => ({
  generateNewsSuggestions: jest.fn(),
}));
jest.mock("../../services/community/community-home.service", () => ({}));
jest.mock("../../services/community/community-news-review.service", () => ({}));
jest.mock("../../services/community/community-management.service", () => ({
  CommunityManagementError: class extends Error {
    constructor(
      public status: number,
      public code: string,
      message: string,
    ) {
      super(message);
    }
  },
}));
jest.mock("../../services/community/community-public-read.service", () => ({
  CommunityPublicReadError: class extends Error {},
}));
import { createCommunityHomeRoutes } from "../community-home.routes";
const app = express();
app.use(express.json());
const authenticate = (req: any, res: any, next: any) => {
  if (req.headers.authorization !== "fixture")
    return res.status(401).json({ success: false });
  req.user = { id: "manager" };
  next();
};
app.use(
  createCommunityHomeRoutes(
    (_req, _res, next) => next(),
    authenticate,
    async () => null,
  ),
);
beforeEach(() => {
  jest.clearAllMocks();
  read.mockResolvedValue(null);
  collect.mockResolvedValue({ state: "done", sources: [] });
});
it("requires authentication for both collection reads and writes", async () => {
  await request(app).get("/community/management/news-collection").expect(401);
  await request(app).post("/community/management/news-collection").expect(401);
  expect(read).not.toHaveBeenCalled();
  expect(collect).not.toHaveBeenCalled();
});
it("GET only reads stored state and prevents caching", async () => {
  const response = await request(app)
    .get("/community/management/news-collection")
    .set("Authorization", "fixture")
    .expect(200);
  expect(response.headers["cache-control"]).toBe("no-store");
  expect(read.mock.calls[0][1]).toBe("manager");
  expect(collect).not.toHaveBeenCalled();
});
it("POST takes actor from authenticated identity, never from request body", async () => {
  await request(app)
    .post("/community/management/news-collection")
    .set("Authorization", "fixture")
    .send({ actor: "someone-else", source: "https://evil.invalid" })
    .expect(200);
  expect(collect).toHaveBeenCalledWith(expect.objectContaining({query:expect.any(Function)}), "manager");
});
