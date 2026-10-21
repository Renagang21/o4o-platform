import express from "express";
import request from "supertest";
import { AppDataSource } from "../database/connection.js";
import adminRouter from "../routes/ai-admin.routes.js";

jest.mock("../services/ai-admin.service.js", () => ({ aiAdminService: {} }));
// Exercise the mount's authentication/role gate, not an alternate unguarded test mount.
jest.mock("../middleware/auth.middleware.js", () => ({
  authenticate: (req: any, res: any, next: any) => {
    if (!req.headers["x-fixture-role"]) return res.status(401).json({ success: false });
    req.user = { id: '10000000-0000-4000-8000-000000000001' };
    return next();
  },
  requireAdmin: (req: any, res: any, next: any) =>
    req.headers["x-fixture-role"] === "platform:super_admin"
      ? next()
      : res.status(403).json({ success: false }),
}));
const app = express().use(express.json()).use("/api/ai/admin", adminRouter);
const db = AppDataSource as any;

beforeEach(() => {
  db.isInitialized = true;
  db.query.mockReset().mockResolvedValue([]);
});

it.each(["/management", "/management/usage?days=7"])(
  "guards %s before querying",
  async (path) => {
    await request(app).get(`/api/ai/admin${path}`).expect(401);
    await request(app)
      .get(`/api/ai/admin${path}`)
      .set("x-fixture-role", "neture:admin")
      .expect(403);
    expect(db.query).not.toHaveBeenCalled();
  },
);

it("returns the inventory only to the platform admin and keeps the inventory root read-only", async () => {
  const reply = await request(app)
    .get("/api/ai/admin/management")
    .set("x-fixture-role", "platform:super_admin")
    .expect(200);
  expect(reply.body.data.usages).toHaveLength(31);
  expect(reply.headers["cache-control"]).toBe("private, no-store");
  await request(app)
    .put("/api/ai/admin/management")
    .set("x-fixture-role", "platform:super_admin")
    .send({ enabled: true })
    .expect(404);
  expect(
    db.query.mock.calls.every(([sql]: [string]) => /^SELECT/.test(sql)),
  ).toBe(true);
});

it.each(["7.0", "0", "7&days=30", "7%20OR%201=1", "7&days[x]=7"])(
  "rejects malformed period %s",
  async (days) => {
    await request(app)
      .get(`/api/ai/admin/management/usage?days=${days}`)
      .set("x-fixture-role", "platform:super_admin")
      .expect(400);
    expect(db.query).not.toHaveBeenCalled();
  },
);

it("sanitizes database failures instead of exposing private details or a zero count", async () => {
  db.query.mockRejectedValue(new Error("fixture-private-database-detail"));
  const response = await request(app)
    .get("/api/ai/admin/management/usage")
    .set("x-fixture-role", "platform:super_admin")
    .expect(503);
  expect(response.body.code).toBe("AI_USAGE_UNAVAILABLE");
  expect(JSON.stringify(response.body)).not.toContain(
    "fixture-private-database-detail",
  );
  expect(response.body.data).toBeUndefined();
});


it.each([
  ['get', '/models'], ['post', '/models'], ['put', '/models/openai/gpt-4o'],
  ['delete', '/models/openai/gpt-4o'], ['put', '/model-selections/home.chat'],
] as const)('guards model management %s %s before storage access', async (method, path) => {
  await request(app)[method]('/api/ai/admin/management' + path).send({}).expect(401);
  await request(app)[method]('/api/ai/admin/management' + path).set('x-fixture-role', 'neture:admin').send({}).expect(403);
  expect(db.query).not.toHaveBeenCalled();
});

it('uses the registered model and current revision through the actual admin HTTP routes', async () => {
  let value: any = null;
  db.query.mockImplementation(async (sql: string, params: any[]) => {
    if (sql.startsWith('SELECT value FROM settings')) return value ? [{ value }] : [];
    if (sql.startsWith("SELECT 'gemini'")) return [];
    if (sql.startsWith('INSERT INTO settings')) { if (value && value.revision !== params[2]) return []; value = JSON.parse(params[1]); return [{ key: params[0] }]; }
    throw new Error('Unexpected SQL');
  });
  const base = '/api/ai/admin/management';
  const model = { provider: 'openai', id: 'gpt-http-fixture', name: '합성 모델', capabilities: ['text'] };
  const admin = (r: any) => r.set('x-fixture-role', 'platform:super_admin');
  const created = await admin(request(app).post(base + '/models')).send({ revision: 0, model: { ...model, apiKey: 'synthetic-not-a-credential' } }).expect(201);
  expect(JSON.stringify(created.body)).not.toContain('synthetic-not-a-credential');
  expect(JSON.stringify(value)).not.toContain('synthetic-not-a-credential');
  await admin(request(app).put(base + '/model-selections/home.chat')).send({ revision: 1, selection: { provider: model.provider, model: model.id } }).expect(200);
  await admin(request(app).delete(base + '/models/openai/' + model.id)).send({ revision: 2 }).expect(409);
  await admin(request(app).put(base + '/model-selections/home.chat')).send({ revision: 2, selection: null }).expect(200);
  await admin(request(app).delete(base + '/models/openai/' + model.id)).send({ revision: 3 }).expect(200);
  const latest = await admin(request(app).get(base + '/models')).expect(200);
  expect(latest.headers['cache-control']).toBe('private, no-store');
  expect(latest.body.data.deleted).toContain('openai:' + model.id);
  expect(latest.body.data.models.some((x: any) => x.id === model.id)).toBe(false);
  expect(latest.body.data.updatedBy).toBeUndefined();
});
