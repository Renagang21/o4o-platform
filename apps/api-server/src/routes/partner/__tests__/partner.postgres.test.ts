import express, { type RequestHandler } from "express";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { DataSource } from "typeorm";
import { createPartnerSupportRoutes } from "../partner.routes";
import { emptyPartnerWorkspace } from "../partner.schema";
import { CreatePartnerSupportSpaces1792886600000 } from "../../../database/migrations/1792886600000-CreatePartnerSupportSpaces";
import { AddPartnerMediaAndReadState1792886700000 } from "../../../database/migrations/1792886700000-AddPartnerMediaAndReadState";
import { DiskMediaStore, MAX_MEDIA_BYTES } from "../partner.media";
import { mkdtemp, rm, writeFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const url = process.env.PARTNER_TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;
suite("Partner API / isolated PostgreSQL transactions and ACL", () => {
  let db: DataSource, app: express.Express;
  let mediaRoot: string;
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
  const assetSpace = async () => {
    const s = await create(),
      w = emptyPartnerWorkspace();
    const a = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      title: "테스트 자료",
      business: "테스트",
      channel: "라인" as const,
      content: "초기 내용",
      url: "",
      usage: "직접 제작",
    };
    w.assets.push(a);
    const r = await call("owner").put(`/spaces/${s.id}`, {
      revision: 0,
      workspace: w,
    });
    expect(r.status).toBe(200);
    return { space: r.body.data, asset: a };
  };
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aJ1kAAAAASUVORK5CYII=",
    "base64",
  );
  const upload = (
    actor: keyof typeof users,
    space: string,
    asset: string,
    bytes = png,
    mime = "image/png",
    previous?: string,
  ) =>
    request(app)
      .post(
        `/partner/spaces/${space}/assets/${asset}/files${previous ? `/${previous}/versions` : ""}`,
      )
      .set("x-test-actor", actor)
      .set("X-Requested-With", "O4O-Partner")
      .attach("file", bytes, { filename: "테스트.png", contentType: mime });
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
    // Isolated auth/storage harness: the real privacy fence is verified by canonical migration checks.
    await db.query(`CREATE FUNCTION account_erasure_write_fence() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$`);
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
      await new CreatePartnerSupportSpaces1792886600000().up(q);
      await new AddPartnerMediaAndReadState1792886700000().up(q);
    } finally {
      await q.release();
    }
    mediaRoot = await mkdtemp(join(tmpdir(), "partner-media-it-"));
    app = express();
    app.use(
      "/partner",
      createPartnerSupportRoutes(db, auth, new DiskMediaStore(mediaRoot)),
    );
  }, 30000);
  afterAll(async () => {
    if (mediaRoot) await rm(mediaRoot, { recursive: true, force: true });
    if (db?.isInitialized) {
      await db.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await db.destroy();
    }
  });

  it("registers the enabled INSERT/UPDATE erasure fence on all six Partner tables", async () => {
    const rows = await db.query(`SELECT c.relname, t.tgtype FROM pg_trigger t
      JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname=$1 AND t.tgname='account_erasure_write_fence' AND t.tgenabled='O'
      ORDER BY c.relname`, [schema]);
    expect(rows.map((r: {relname:string}) => r.relname)).toEqual([
      "partner_support_events", "partner_support_files", "partner_support_invites",
      "partner_support_members", "partner_support_reads", "partner_support_spaces",
    ]);
    for (const row of rows) expect(Number(row.tgtype) & 23).toBe(23);
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
        new CreatePartnerSupportSpaces1792886600000().down(q),
      ).rejects.toThrow("PARTNER_SUPPORT_DATA_EXISTS");
    } finally {
      await q.release();
    }
  });
  it("stores authorized file versions, supports byte ranges and denies cross-space access", async () => {
    const { space, asset } = await assetSpace(),
      i = await invite(space.id, "viewer");
    await call("viewer").post("/join", { token: i.token });
    const first = await upload("owner", space.id, asset.id);
    expect(first.status).toBe(201);
    expect(first.body.data.sha256).toHaveLength(64);
    expect((await upload("viewer", space.id, asset.id)).status).toBe(403);
    expect(
      (
        await call("outsider").get(
          `/spaces/${space.id}/files/${first.body.data.id}`,
        )
      ).status,
    ).toBe(404);
    const downloaded = await call("viewer").get(
      `/spaces/${space.id}/files/${first.body.data.id}`,
    );
    expect(downloaded.status).toBe(200);
    expect(downloaded.body).toEqual(png);
    expect(downloaded.headers["x-content-type-options"]).toBe("nosniff");
    const partial = await call("viewer")
      .get(`/spaces/${space.id}/files/${first.body.data.id}`)
      .set("Range", "bytes=0-3");
    expect(partial.status).toBe(206);
    expect(partial.body).toEqual(png.subarray(0, 4));
    expect(
      (
        await call("owner")
          .get(`/spaces/${space.id}/files/${first.body.data.id}`)
          .set("Range", "bytes=999999-")
      ).status,
    ).toBe(416);
    const second = await upload(
      "owner",
      space.id,
      asset.id,
      png,
      "image/png",
      first.body.data.id,
    );
    expect(second.status).toBe(201);
    expect(second.body.data.version).toBe(2);
    expect(second.body.data.group_id).toBe(first.body.data.group_id);
    expect(
      (
        await call("owner").put(`/spaces/${space.id}`, {
          revision: 1,
          workspace: emptyPartnerWorkspace(),
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await call("owner")
          .delete(`/spaces/${space.id}/files/${second.body.data.id}`)
          .set("X-Requested-With", "O4O-Partner")
      ).status,
    ).toBe(200);
    expect(
      (
        await call("owner").get(
          `/spaces/${space.id}/files/${first.body.data.id}`,
        )
      ).status,
    ).toBe(404);
    expect(await readdir(join(mediaRoot, space.id))).toHaveLength(0);
  });
  it("rejects MIME spoofing, HTML/SVG, excess upload and unconfigured storage", async () => {
    const { space, asset } = await assetSpace();
    expect(
      (
        await upload(
          "owner",
          space.id,
          asset.id,
          Buffer.from('<svg onload="alert(1)"/>'),
          "image/png",
        )
      ).status,
    ).toBe(415);
    expect(
      (await upload("owner", space.id, asset.id, png, "video/mp4")).status,
    ).toBe(415);
    expect(
      (
        await upload(
          "owner",
          space.id,
          asset.id,
          Buffer.alloc(MAX_MEDIA_BYTES + 1),
          "image/png",
        )
      ).status,
    ).toBe(413);
    const disabled = express();
    disabled.use("/partner", createPartnerSupportRoutes(db, auth));
    expect(
      (
        await request(disabled)
          .post(`/partner/spaces/${space.id}/assets/${asset.id}/files`)
          .set("x-test-actor", "owner")
          .set("X-Requested-With", "O4O-Partner")
          .attach("file", png, {
            filename: "fixture.png",
            contentType: "image/png",
          })
      ).status,
    ).toBe(503);
  });
  it("does not serve changed disk contents and cleans a failed metadata transaction", async () => {
    const { space, asset } = await assetSpace();
    const file = await upload("owner", space.id, asset.id);
    expect(file.status).toBe(201);
    await writeFile(join(mediaRoot, space.id, file.body.data.id), "tampered");
    expect(
      (
        await call("owner").get(
          `/spaces/${space.id}/files/${file.body.data.id}`,
        )
      ).status,
    ).toBe(503);
    await db.query(
      `CREATE FUNCTION fail_media_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'audit unavailable'; END $$`,
    );
    await db.query(
      "CREATE TRIGGER fail_media_audit BEFORE INSERT ON partner_support_events FOR EACH ROW EXECUTE FUNCTION fail_media_audit()",
    );
    try {
      expect((await upload("owner", space.id, asset.id)).status).toBe(503);
      expect(await readdir(join(mediaRoot, space.id))).toHaveLength(1);
    } finally {
      await db.query("DROP TRIGGER fail_media_audit ON partner_support_events");
      await db.query("DROP FUNCTION fail_media_audit()");
    }
  });
  it("records content versions and keeps financial audit private from viewers", async () => {
    const { space, asset } = await assetSpace(),
      i = await invite(space.id, "viewer");
    await call("viewer").post("/join", { token: i.token });
    const w = space.workspace;
    w.assets[0].content = "수정한 내용";
    expect(
      (
        await call("owner").put(`/spaces/${space.id}`, {
          revision: 1,
          workspace: w,
        })
      ).status,
    ).toBe(200);
    const versions = await call("viewer").get(
      `/spaces/${space.id}/assets/${asset.id}/versions`,
    );
    expect(versions.status).toBe(200);
    expect(versions.body.data.map((v: any) => v.asset.content)).toEqual([
      "수정한 내용",
      "초기 내용",
    ]);
    expect(
      (
        await call("outsider").get(
          `/spaces/${space.id}/assets/${asset.id}/versions`,
        )
      ).status,
    ).toBe(404);
    expect(
      (await call("viewer").get(`/spaces/${space.id}/events`)).status,
    ).toBe(403);
  });
  it("keeps notifications and read cursors scoped to the account and space", async () => {
    const { space } = await assetSpace(),
      i = await invite(space.id, "viewer");
    await call("viewer").post("/join", { token: i.token });
    const notes = await call("viewer").get("/notifications"),
      own = notes.body.data.find((n: any) => n.id === space.id);
    expect(own.unread).toBeGreaterThan(0);
    expect(
      (
        await call("outsider").post(`/spaces/${space.id}/read`, {
          cursor: own.cursor,
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await call("viewer").post(`/spaces/${space.id}/read`, {
          cursor: own.cursor,
        })
      ).status,
    ).toBe(200);
    const after = (await call("viewer").get("/notifications")).body.data.find(
      (n: any) => n.id === space.id,
    );
    expect(after.unread).toBe(0);
    expect(
      (await call("owner").get("/notifications")).body.data.find(
        (n: any) => n.id === space.id,
      ).unread,
    ).toBeGreaterThan(0);
  });
  it("enforces aggregate media quota without leaving the rejected object on disk", async () => {
    const { space, asset } = await assetSpace();
    const id = randomUUID();
    await db.query(
      `INSERT INTO partner_support_files(id,space_id,asset_id,group_id,version,name,mime,size,sha256,created_by) VALUES($1,$2,$3,$1,1,'quota-fixture','image/png',$4,$5,$6)`,
      [id, space.id, asset.id, 500 * 1024 * 1024, "0".repeat(64), users.owner],
    );
    const result = await upload("owner", space.id, asset.id);
    expect(result.status).toBe(409);
    expect(result.body.code).toBe("MEDIA_QUOTA");
    expect(await readdir(join(mediaRoot, space.id))).toHaveLength(0);
  });
});
