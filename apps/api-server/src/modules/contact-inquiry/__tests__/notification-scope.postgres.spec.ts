import express from "express";
import request from "supertest";
import { DataSource, Entity, PrimaryColumn } from "typeorm";
import { randomUUID } from "crypto";
jest.mock("../../../database/connection.js", () => ({
  AppDataSource: { getRepository: jest.fn() },
}));
jest.mock("../../../middleware/auth.middleware.js", () => ({
  authenticate: (req: any, res: any, next: any) => {
    if (!req.headers["x-test-user"])
      return res.status(401).json({ code: "AUTH_REQUIRED" });
    req.user = { id: req.headers["x-test-user"] };
    next();
  },
}));
jest.mock("../../../services/forum/NotificationEventHub.js", () => ({
  notificationEventHub: {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    emitNotification: jest.fn(),
  },
}));
import { AppDataSource } from "../../../database/connection.js";
import { Notification } from "../../../entities/Notification.js";
import {
  NotificationService,
  notificationService,
} from "../../../services/NotificationService.js";
import router from "../../../routes/notifications.routes.js";
@Entity("users")
class User {
  @PrimaryColumn("uuid") id!: string;
}
const socket = process.env.CONTACT_REVIEW_PG_SOCKET;
const suite = socket ? describe : describe.skip;
suite("local PostgreSQL notification scope union", () => {
  let db: DataSource, app: express.Express, service: NotificationService;
  const schema = `notification_review_${randomUUID().replace(/-/g, "")}`,
    user = randomUUID(),
    other = randomUUID(),
    org = randomUUID(),
    otherOrg = randomUUID();
  const ids = Array.from({ length: 8 }, () => randomUUID());
  beforeAll(async () => {
    if (!socket?.startsWith("/workspace/") && !socket?.startsWith("/tmp/"))
      throw Error("Local PostgreSQL socket required");
    db = new DataSource({
      type: "postgres",
      host: socket,
      username: "o4o_local",
      database: "o4o_platform",
      schema,
      entities: [Notification, User],
      extra: { options: `-c search_path=${schema},public` },
    });
    await db.initialize();
    await db.query(`CREATE SCHEMA ${schema}`);
    await db.query(`CREATE TABLE users(id uuid PRIMARY KEY);
   CREATE TABLE notifications(id uuid PRIMARY KEY,"userId" uuid,"serviceKey" varchar(100),"organizationId" uuid,"actorId" uuid,channel varchar(50) DEFAULT 'in_app',type varchar(50) DEFAULT 'custom',title varchar(255) DEFAULT 'synthetic',message text,metadata jsonb,priority varchar(20),"isRead" boolean DEFAULT false,"createdAt" timestamptz,"updatedAt" timestamptz DEFAULT now(),"readAt" timestamptz);`);
    const rows = [
      ["neture", user, false, null],
      ["supplier", user, false, null],
      ["neture", user, true, null],
      ["funding", user, false, null],
      ["supplier", other, false, null],
      ["neture", other, false, null],
      ["supplier", user, false, org],
      ["neture", user, false, otherOrg],
    ];
    const days = [1, 3, 2, 4, 5, 6, 7, 8];
    for (let i = 0; i < rows.length; i++)
      await db.query(
        'INSERT INTO notifications(id,"serviceKey","userId","isRead","organizationId","createdAt") VALUES($1,$2,$3,$4,$5,$6)',
        [
          ids[i],
          ...rows[i],
          `2026-01-${String(days[i]).padStart(2, "0")}T00:00:00Z`,
        ],
      );
    (AppDataSource.getRepository as jest.Mock).mockReturnValue(
      db.getRepository(Notification),
    );
    service = new NotificationService();
    jest
      .spyOn(notificationService, "listNotifications")
      .mockImplementation((options) => service.listNotifications(options));
    jest
      .spyOn(notificationService, "getUnreadCount")
      .mockImplementation((id, options) => service.getUnreadCount(id, options));
    app = express();
    app.use("/notifications", router);
  }, 30000);
  afterAll(async () => {
    jest.restoreAllMocks();
    if (db?.isInitialized) {
      await db.query(`DROP SCHEMA ${schema} CASCADE`);
      await db.destroy();
    }
  });
  it("merges legacy and host scopes with correct ordering, counts, paging and recipient isolation", async () => {
    const count = await request(app)
      .get("/notifications/unread-count")
      .query({ serviceKeys: "supplier,neture", userId: other })
      .set("x-test-user", user);
    expect(count.status).toBe(200);
    expect(count.body.data.count).toBe(4);
    const first = await request(app)
      .get("/notifications")
      .query({
        serviceKeys: "supplier,neture",
        page: 1,
        limit: 2,
        userId: other,
      })
      .set("x-test-user", user);
    expect(first.status).toBe(200);
    expect(first.body.data.notifications.map((n: any) => n.id)).toEqual([
      ids[7],
      ids[6],
    ]);
    expect(first.body.data).toMatchObject({
      total: 5,
      totalPages: 3,
      hasMore: true,
    });
    const second = await request(app)
      .get("/notifications")
      .query({ serviceKeys: "supplier,neture", page: 2, limit: 2 })
      .set("x-test-user", user);
    expect(second.body.data.notifications.map((n: any) => n.id)).toEqual([
      ids[1],
      ids[2],
    ]);
    const last = await request(app)
      .get("/notifications")
      .query({ serviceKeys: "supplier,neture", page: 3, limit: 2 })
      .set("x-test-user", user);
    expect(last.body.data.notifications.map((n: any) => n.id)).toEqual([
      ids[0],
    ]);
    expect(last.body.data.hasMore).toBe(false);
  });
  it.each([
    ["neture", 2, 3],
    ["supplier", 2, 2],
  ])("keeps the single %s scope unchanged", async (key, count, total) => {
    expect(
      await service.getUnreadCount(user, { serviceKey: key as string }),
    ).toBe(count);
    expect(
      (
        await service.listNotifications({
          userId: user,
          serviceKey: key as string,
        })
      ).total,
    ).toBe(total);
  });
  it("keeps organization filtering inside both scope and recipient filters", async () => {
    const result = await request(app)
      .get("/notifications")
      .query({ serviceKeys: "supplier,neture", organizationId: org })
      .set("x-test-user", user);
    expect(result.status).toBe(200);
    expect(result.body.data.notifications.map((n: any) => n.id)).toEqual([
      ids[6],
    ]);
    expect(
      await service.getUnreadCount(user, {
        serviceKeys: ["supplier", "neture"],
        organizationId: otherOrg,
      }),
    ).toBe(1);
  });
  it.each([
    { serviceKeys: "" },
    { serviceKeys: "neture,,supplier" },
    { serviceKeys: "neture,supplier", serviceKey: "neture" },
    { serviceKeys: Array.from({ length: 11 }, () => "neture").join(",") },
    { "serviceKeys[x]": "neture" },
  ])(
    "rejects malformed multi-scope filters instead of dropping them",
    async (query) => {
      for (const path of ["/notifications", "/notifications/unread-count"]) {
        const result = await request(app)
          .get(path)
          .query(query)
          .set("x-test-user", user);
        expect(result.status).toBe(400);
        expect(result.body.code).toBe("NOTIFICATION_SCOPE_INVALID");
      }
    },
  );
  it("keeps multi-scope notification access authenticated", async () => {
    expect(
      (
        await request(app)
          .get("/notifications")
          .query({ serviceKeys: "supplier,neture" })
      ).status,
    ).toBe(401);
  });
  it("does not turn an explicitly empty internal scope list into all scopes", async () => {
    expect(await service.getUnreadCount(user, { serviceKeys: [] })).toBe(0);
    expect(
      (
        await service.listNotifications({
          userId: user,
          serviceKeys: [],
        })
      ).total,
    ).toBe(0);
  });
});
