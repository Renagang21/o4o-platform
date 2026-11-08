import express from "express";
import request from "supertest";
const runManual = jest.fn(),
  list = jest.fn(),
  beacon = jest.fn(),
  generate = jest.fn(),
  limiter = jest.fn((_req: any, _res: any, next: any) => next()),
  central = jest.fn();
jest.mock("../../database/connection", () => ({
  AppDataSource: { query: jest.fn(async () => []) },
}));
jest.mock("../../middleware/rateLimiter", () => ({
  apiLimiter: (_req: any, _res: any, next: any) => next(),
  newsBeaconLimiter: (...args: unknown[]) => (limiter as any)(...args),
}));
jest.mock("../../middleware/central-operation-menu.middleware", () => ({
  centralOperationRequest:
    (...args: unknown[]) =>
    (_req: any, _res: any, next: any) => {
      central(...args);
      next();
    },
}));
jest.mock("../../services/community/community-news-auto.service", () => ({
  runManualNewsWindow: (...a: unknown[]) => runManual(...a),
  listNewsAutoRuns: (...a: unknown[]) => list(...a),
}));
jest.mock("../../services/community/community-news-collection.service", () => ({}));
jest.mock("../../services/community/community-news-ai.service", () => ({
  generateNewsSuggestions: jest.fn(),
  generateNewsClusters: (...a: unknown[]) => generate(...a),
}));
jest.mock("../../services/community/community-home.service", () => ({
  recordNewsEngagement: (...a: unknown[]) => beacon(...a),
}));
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
const resolveUser = jest.fn(async () => null);
app.use(
  createCommunityHomeRoutes(
    (_req, _res, next) => next(),
    authenticate,
    resolveUser,
  ),
);
const RUNS = "/community/management/news-auto-runs";
beforeEach(() => {
  jest.clearAllMocks();
  list.mockResolvedValue([]);
  runManual.mockResolvedValue({ state: "done" });
  beacon.mockResolvedValue({ recorded: 1 });
});
it("requires authentication for run results and manual runs", async () => {
  await request(app).get(RUNS).expect(401);
  await request(app).post(RUNS).expect(401);
  expect(list).not.toHaveBeenCalled();
  expect(runManual).not.toHaveBeenCalled();
});
it("reading results starts nothing and is not cached", async () => {
  const response = await request(app)
    .get(RUNS)
    .set("Authorization", "fixture")
    .expect(200);
  expect(response.headers["cache-control"]).toBe("no-store");
  expect(list.mock.calls[0][1]).toBe("manager");
  expect(runManual).not.toHaveBeenCalled();
});
it("the manual run takes the actor from authentication, never from the body, under the editorial menu", async () => {
  await request(app)
    .post(RUNS)
    .set("Authorization", "fixture")
    .send({ actor: "someone-else", day: "2020-01-01", window: "morning" })
    .expect(200);
  expect(runManual).toHaveBeenCalledWith(expect.anything(), "manager", {
    generate: expect.any(Function),
  });
  await runManual.mock.calls[0][2].generate([]);
  expect(generate).toHaveBeenCalledWith([], "manager");
  expect(central).toHaveBeenCalledWith("community", expect.any(Function));
});
it("the beacon is POST only, rate limited first and passes no user to storage logic beyond visibility", async () => {
  await request(app).get("/community/news-engagement").expect(404);
  expect(beacon).not.toHaveBeenCalled();
  const body = { event: "click", items: [{ contentId: "x", position: 1 }] };
  const response = await request(app)
    .post("/community/news-engagement")
    .send(body)
    .expect(200);
  expect(response.body).toEqual({ success: true, data: { recorded: 1 } });
  expect(limiter).toHaveBeenCalledTimes(1);
  expect(beacon).toHaveBeenCalledWith(expect.anything(), null, body);
});
it("a limiter refusal stops the beacon before any work", async () => {
  limiter.mockImplementationOnce((_req: any, res: any) =>
    res.status(429).json({ success: false, code: "RATE_LIMITED" }),
  );
  await request(app).post("/community/news-engagement").send({}).expect(429);
  expect(beacon).not.toHaveBeenCalled();
  expect(resolveUser).not.toHaveBeenCalled();
});
