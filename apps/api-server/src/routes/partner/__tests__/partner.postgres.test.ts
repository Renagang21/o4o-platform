import express, { type RequestHandler } from "express";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { DataSource } from "typeorm";
import { createPartnerSupportRoutes } from "../partner.routes";
import { emptyPartnerWorkspace } from "../partner.schema";
import { CreatePartnerSupportSpaces1792886400000 } from "../../../database/migrations/1792886400000-CreatePartnerSupportSpaces";

const url = process.env.PARTNER_TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;
suite("Partner API / isolated PostgreSQL transactions and ACL", () => {
  let db: DataSource, app: express.Express;
  const schema = `partner_it_${randomUUID().replaceAll("-", "")}`;
  const users = {
    owner: randomUUID(),
    editor: randomUUID(),
    viewer: randomUUID(),
    outsider: randomUUID(),
  };
  const auth: RequestHandler = (req, res, next) => {
    const actor = req.get("x-test-actor") as keyof typeof users;
    if (!users[actor]) {
      res.status(401).json({ success: false, code: "UNAUTHENTICATED" });
      return;
    }
    Object.assign(req, { user: { id: users[actor] } });
    next();
  };
  const call = (actor: keyof typeof users) => ({
    get: (path: string) =>
      request(app).get(`/partner${path}`).set("x-test-actor", actor),
    post: (path: string, body: unknown) =>
      request(app)
        .post(`/partner${path}`)
        .set("x-test-actor", actor)
        .send(body),
    put: (path: string, body: unknown) =>
      request(app).put(`/partner${path}`).set("x-test-actor", actor).send(body),
    delete: (path: string) =>
      request(app)
        .delete(`/partner${path}`)
        .set("x-test-actor", actor)
        .set("Content-Type", "application/json"),
  });
  const create = async () => {
    const r = await call("owner").post("/spaces", { name: "테스트 공동공간" });
    expect(r.status).toBe(201);
    return r.body.data;
  };
  const invite = async (id: string, role: string) => {
    const r = await call("owner").post(`/spaces/${id}/invites`, { role });
    expect(r.status).toBe(201);
    return r.body.data;
  };
  beforeAll(async () => {
    const target = new URL(url!);
    if (
      !["localhost", "127.0.0.1"].includes(target.hostname) ||
      target.port !== "55439" ||
      target.pathname !== "/partner_test"
    )
      throw new Error(
        "Only the disposable local Partner test database is allowed",
      );
    db = new DataSource({
      type: "postgres",
      url,
      extra: { options: `-c search_path=${schema}` },
      synchronize: false,
    });
    await db.initialize();
    await db.query(`CREATE SCHEMA "${schema}"`);
    await db.query(
      "CREATE TABLE users(id uuid PRIMARY KEY,name text NOT NULL)",
    );
    for (const [name, id] of Object.entries(users))
      await db.query("INSERT INTO users(id,name) VALUES($1,$2)", [
        id,
        `테스트 ${name}`,
      ]);
    const q = db.createQueryRunner();
    await q.connect();
    try {
      await new CreatePartnerSupportSpaces1792886400000().up(q);
    } finally {
      await q.release();
    }
    app = express();
    app.use("/partner", createPartnerSupportRoutes(db, auth));
  }, 30000);
  afterAll(async () => {
    if (db?.isInitialized) {
      await db.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await db.destroy();
    }
  });

  it("requires authentication and JSON for mutations", async () => {
    expect((await request(app).get("/partner/spaces")).status).toBe(401);
    expect(
      (
        await request(app)
          .post("/partner/spaces")
          .set("x-test-actor", "owner")
          .type("form")
          .send({ name: "test" })
      ).status,
    ).toBe(415);
    expect(
      (
        await call("owner").post("/spaces", {
          name: "",
          ownerId: users.outsider,
        })
      ).status,
    ).toBe(400);
  });
  it("isolates spaces and avoids disclosing inaccessible IDs", async () => {
    const s = await create();
    expect((await call("outsider").get("/spaces")).body.data).toEqual([]);
    for (const suffix of ["", "/members", "/invites", "/events"])
      expect(
        (await call("outsider").get(`/spaces/${s.id}${suffix}`)).status,
      ).toBe(404);
    expect(
      (
        await call("outsider").put(`/spaces/${s.id}`, {
          revision: 0,
          workspace: emptyPartnerWorkspace(),
        })
      ).status,
    ).toBe(404);
    expect((await call("owner").get("/spaces/not-a-uuid")).status).toBe(400);
    expect(
      (await call("owner").get(`/spaces/${s.id}`)).headers["cache-control"],
    ).toBe("no-store");
  });
  it("uses single-use hashed invitations, with viewer ACL enforced", async () => {
    const s = await create(),
      i = await invite(s.id, "viewer");
    const [stored] = await db.query(
      "SELECT token_hash FROM partner_support_invites WHERE id=$1",
      [i.id],
    );
    expect(stored.token_hash).not.toBe(i.token);
    expect(stored.token_hash).toHaveLength(64);
    expect(
      (await call("viewer").post("/join", { token: i.token })).status,
    ).toBe(200);
    expect(
      (await call("outsider").post("/join", { token: i.token })).status,
    ).toBe(404);
    expect((await call("viewer").get(`/spaces/${s.id}`)).body.data.role).toBe(
      "viewer",
    );
    expect(
      (
        await call("viewer").put(`/spaces/${s.id}`, {
          revision: 0,
          workspace: emptyPartnerWorkspace(),
        })
      ).status,
    ).toBe(403);
    expect(
      (await call("viewer").post(`/spaces/${s.id}/invites`, { role: "editor" }))
        .status,
    ).toBe(403);
    expect((await call("viewer").get(`/spaces/${s.id}/events`)).status).toBe(
      403,
    );
  });
  it("rejects expired and revoked invitations and cross-space revocation", async () => {
    const a = await create(),
      b = await create(),
      i = await invite(a.id, "editor");
    expect(
      (await call("owner").delete(`/spaces/${b.id}/invites/${i.id}`)).status,
    ).toBe(404);
    expect(
      (await call("owner").delete(`/spaces/${a.id}/invites/${i.id}`)).status,
    ).toBe(200);
    expect(
      (await call("editor").post("/join", { token: i.token })).status,
    ).toBe(404);
    const expired = await invite(a.id, "editor");
    await db.query(
      `UPDATE partner_support_invites SET expires_at=now()-interval '1 day' WHERE id=$1`,
      [expired.id],
    );
    expect(
      (await call("editor").post("/join", { token: expired.token })).status,
    ).toBe(404);
    const list = await call("owner").get(`/spaces/${a.id}/invites`);
    expect(JSON.stringify(list.body)).not.toContain(i.token);
  });
  it("permits editor content changes but only owner settlement changes; records immutable audit history", async () => {
    const s = await create(),
      i = await invite(s.id, "editor");
    await call("editor").post("/join", { token: i.token });
    const w = emptyPartnerWorkspace(),
      p = randomUUID(),
      c = randomUUID();
    w.proposals.push({
      id: p,
      createdAt: new Date().toISOString(),
      title: "제품 소개",
      business: "테스트 브랜드",
      category: "생활",
      channel: "유튜브",
      description: "제품 정보",
      destination: "https://example.com/product",
      contact: "",
    });
    w.creators.push({
      id: c,
      createdAt: new Date().toISOString(),
      name: "테스트 홍보자",
      channel: "유튜브",
      topic: "생활",
      portfolio: "",
    });
    expect(
      (
        await call("editor").put(`/spaces/${s.id}`, {
          revision: 0,
          workspace: w,
        })
      ).status,
    ).toBe(200);
    w.settlements.push({
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      proposalId: p,
      creatorId: c,
      memo: "활동비",
      amount: 25000,
      status: "recorded",
      paidAt: null,
    });
    expect(
      (
        await call("editor").put(`/spaces/${s.id}`, {
          revision: 1,
          workspace: w,
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await call("owner").put(`/spaces/${s.id}`, {
          revision: 1,
          workspace: w,
        })
      ).status,
    ).toBe(200);
    // Same JSON with different object-key ordering must not look like a financial change.
    const unchanged = JSON.parse(JSON.stringify(w));
    unchanged.settlements = unchanged.settlements.map(
      (row: Record<string, unknown>) =>
        Object.fromEntries(Object.entries(row).reverse()),
    );
    expect(
      (
        await call("editor").put(`/spaces/${s.id}`, {
          revision: 2,
          workspace: unchanged,
        })
      ).status,
    ).toBe(200);
    w.settlements[0].amount = 30000;
    expect(
      (
        await call("owner").put(`/spaces/${s.id}`, {
          revision: 3,
          workspace: w,
        })
      ).status,
    ).toBe(200);
    const events = (await call("owner").get(`/spaces/${s.id}/events`)).body
      .data;
    const change = events.find((e: any) => e.revision === 4).changes
      .settlements[0];
    expect(change.before.amount).toBe(25000);
    expect(change.after.amount).toBe(30000);
    expect(events.find((e: any) => e.revision === 4).actor_id).toBe(
      users.owner,
    );
  });
  it("returns conflicts for stale saves and serializes concurrent writes", async () => {
    const s = await create(),
      body = { revision: 0, workspace: emptyPartnerWorkspace() };
    const results = await Promise.all([
      call("owner").put(`/spaces/${s.id}`, body),
      call("owner").put(`/spaces/${s.id}`, body),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(
      (await call("owner").get(`/spaces/${s.id}`)).body.data.revision,
    ).toBe(1);
  });
  it("revokes access immediately and prevents removal of the owner", async () => {
    const s = await create(),
      i = await invite(s.id, "editor");
    await call("editor").post("/join", { token: i.token });
    expect(
      (await call("editor").delete(`/spaces/${s.id}/members/${users.owner}`))
        .status,
    ).toBe(403);
    expect(
      (await call("owner").delete(`/spaces/${s.id}/members/${users.owner}`))
        .status,
    ).toBe(400);
    expect(
      (await call("owner").delete(`/spaces/${s.id}/members/${users.editor}`))
        .status,
    ).toBe(200);
    expect((await call("editor").get(`/spaces/${s.id}`)).status).toBe(404);
  });
  it("validates references, unsafe links and forbidden contract fields at the server", async () => {
    const s = await create();
    expect(
      (
        await call("owner").put(`/spaces/${s.id}`, {
          revision: 0,
          workspace: { ...emptyPartnerWorkspace(), agreements: [] },
        })
      ).status,
    ).toBe(400);
    const w = emptyPartnerWorkspace();
    w.activities.push({
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      proposalId: randomUUID(),
      creatorId: randomUUID(),
      url: "https://example.com/post",
      publishedAt: "2026-01-01",
      views: 0,
    });
    expect(
      (
        await call("owner").put(`/spaces/${s.id}`, {
          revision: 0,
          workspace: w,
        })
      ).status,
    ).toBe(400);
    w.activities[0].url = "javascript:alert(1)";
    expect(
      (
        await call("owner").put(`/spaces/${s.id}`, {
          revision: 0,
          workspace: w,
        })
      ).status,
    ).toBe(400);
  });
  it("rolls back workspace changes when the audit write fails and hides SQL errors", async () => {
    const s = await create();
    await db.query(
      `CREATE FUNCTION fail_partner_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'private driver details'; END $$`,
    );
    await db.query(
      "CREATE TRIGGER fail_audit BEFORE INSERT ON partner_support_events FOR EACH ROW EXECUTE FUNCTION fail_partner_audit()",
    );
    try {
      const r = await call("owner").put(`/spaces/${s.id}`, {
        revision: 0,
        workspace: emptyPartnerWorkspace(),
      });
      expect(r.status).toBe(503);
      expect(JSON.stringify(r.body)).not.toContain("private");
      expect(
        (await call("owner").get(`/spaces/${s.id}`)).body.data.revision,
      ).toBe(0);
    } finally {
      await db.query("DROP TRIGGER fail_audit ON partner_support_events");
      await db.query("DROP FUNCTION fail_partner_audit()");
    }
  });
  it("refuses to drop a populated workspace schema on rollback", async () => {
    const q = db.createQueryRunner();
    await q.connect();
    try {
      await expect(
        new CreatePartnerSupportSpaces1792886400000().down(q),
      ).rejects.toThrow("PARTNER_SUPPORT_DATA_EXISTS");
    } finally {
      await q.release();
    }
  });
});
