import { randomUUID } from "node:crypto";
import { DataSource } from "typeorm";
import { CANONICAL_SCHEMA_BASELINE_STATEMENTS } from "../../../database/bootstrap/canonical-schema-baseline";
import {
  communityHome,
  getEditorial,
  listEditorial,
  managedHomeItems,
  saveEditorial,
  pinHomeForum,
  managedHomeForum,
  parseEditorial,
} from "../community-home.service";
import {
  ORDINARY_CMS_CONTENT_SQL,
  ordinaryCmsMetadata,
  isHomePresentationMetadata,
} from "../../../routes/cms-content/cms-reserved-presentation";
import {
  signPublicReadDesignation,
  PUBLIC_READ_KEY,
} from "../community-public-read-metadata";
jest.mock("../community-management.service", () => ({
  CommunityManagementError: class extends Error {
    constructor(
      public status: number,
      public code: string,
      message: string,
    ) {
      super(message);
    }
  },
  requireCommunityManager: async (_db: unknown, actor: string) => {
    if (actor !== "11111111-1111-4111-8111-111111111111")
      throw new Error("forbidden");
  },
}));
jest.mock("../community-workspace.service", () => ({
  resolveCommunityWorkspace: async (_db: unknown, user: any) => ({
    communityKey: "community",
    name: "커뮤니티",
    kind: "independent",
    communityStatus: "active",
    allowed: user?.id === "11111111-1111-4111-8111-111111111111",
    forumStorageCodes: ["community"],
  }),
}));
const run =
  process.env.O4O_COMMUNITY_HOME_PG_TEST === "1" ? describe : describe.skip;
run("community home PostgreSQL visibility and persistence", () => {
  let db: DataSource;
  const schema = "community_home_" + randomUUID().replaceAll("-", "");
  const actor = "11111111-1111-4111-8111-111111111111",
    user = { id: actor, roles: [], memberships: [] } as any;
  const data = (extra: Record<string, unknown> = {}) => ({
    kind: "content",
    title: "Fixture",
    status: "published",
    audience: "public",
    ...extra,
  });
  beforeAll(async () => {
    process.env.JWT_SECRET = "isolated-community-home-test-signing-material";
    db = new DataSource({
      type: "postgres",
      host: "127.0.0.1",
      port: 55439,
      username: "postgres",
      database: "postgres",
      extra: { options: `-c search_path=${schema}` },
    });
    await db.initialize();
    await db.query(`CREATE SCHEMA ${schema}`);
    for (const table of [
      "cms_contents",
      "forum_category_requests",
      "forum_post",
      "forum_category_members",
      "action_logs",
    ]) {
      const sql = CANONICAL_SCHEMA_BASELINE_STATEMENTS.find((s) =>
        s.startsWith(`CREATE TABLE public.${table} (`),
      );
      if (!sql) throw Error(table);
      await db.query(
        sql
          .replace(`public.${table}`, table)
          .replaceAll("public.uuid_generate_v4()", "gen_random_uuid()"),
      );
    }
  });
  beforeEach(async () => {
    for (const table of [
      "cms_contents",
      "forum_category_requests",
      "forum_post",
      "forum_category_members",
      "action_logs",
    ])
      await db.query(`DELETE FROM ${table}`);
  });
  afterAll(async () => {
    if (db?.isInitialized) {
      await db.query(`DROP SCHEMA ${schema} CASCADE`);
      await db.destroy();
    }
  });
  const save = (value: Record<string, unknown>, id: string | null = null) =>
    db.transaction((m) => saveEditorial(m, actor, id, value));
  it("persists editorial items and has two pinned plus ten recent, with no duplicates", async () => {
    await save(data({ title: "Pin B", isPinned: true, sortOrder: 2 }));
    await save(data({ title: "Pin A", isPinned: true, sortOrder: 1 }));
    for (let i = 0; i < 11; i++) await save(data({ title: `Recent ${i}` }));
    const home = await communityHome(db, null);
    expect(home.content.pinned.map((x: any) => x.title)).toEqual([
      "Pin A",
      "Pin B",
    ]);
    expect(home.content.recent).toHaveLength(10);
    expect(
      new Set(
        [...home.content.pinned, ...home.content.recent].map((x: any) => x.id),
      ).size,
    ).toBe(12);
    expect((await db.query("SELECT * FROM action_logs")).length).toBe(13);
  });
  it("blocks third pin, persists edits and allows unpinning then replacement", async () => {
    const a = await save(data({ isPinned: true }));
    await save(data({ isPinned: true }));
    await expect(save(data({ isPinned: true }))).rejects.toMatchObject({
      code: "HOME_PIN_LIMIT",
    });
    await save(data({ title: "Edited", isPinned: false }), a.id);
    await save(data({ isPinned: true }));
    expect((await getEditorial(db, null, a.id)).title).toBe("Edited");
  });
  it("hides member-only, drafts, archived, expired, foreign and organization rows in home/list/detail", async () => {
    const member = await save(data({ audience: "members", isPinned: true }));
    const draft = await save(data({ status: "draft" }));
    const archived = await save(data({ status: "archived" }));
    const expired = await save(data());
    await db.query(
      "UPDATE cms_contents SET \"expiresAt\"=NOW()-INTERVAL '1 day' WHERE id=$1",
      [expired.id],
    );
    await db.query(
      `INSERT INTO cms_contents ("serviceKey",type,title,status,metadata) VALUES('neture','featured','Foreign','published',$1::jsonb)`,
      [
        JSON.stringify({
          section: "community-editorial",
          kind: "content",
          audience: "public",
        }),
      ],
    );
    expect((await communityHome(db, null)).content).toEqual({
      pinned: [],
      recent: [],
    });
    expect((await listEditorial(db, null, "content")).items).toEqual([]);
    for (const item of [member, draft, archived, expired])
      await expect(getEditorial(db, null, item.id)).rejects.toMatchObject({
        status: 404,
      });
    expect((await getEditorial(db, user, member.id)).id).toBe(member.id);
    expect((await communityHome(db, user)).content.pinned).toHaveLength(1);
  });
  it("excludes reserved items from generic CMS even when published and explicitly public", async () => {
    await save(data());
    expect(
      await db.query(
        `SELECT id FROM cms_contents WHERE ${ORDINARY_CMS_CONTENT_SQL}`,
      ),
    ).toEqual([]);
    expect(isHomePresentationMetadata({ section: "community-editorial" })).toBe(
      true,
    );
    const plain = randomUUID(),
      nullable = randomUUID(),
      presentation = randomUUID();
    await db.query(
      `INSERT INTO cms_contents(id,"serviceKey",type,title,status,metadata) VALUES
      ($1,'neture','notice','Ordinary','published','{}'),($2,'neture','notice','Null section','published','{"section":null}'),
      ($3,'neture','hero','Presentation','published','{"section":"home-presentation"}')`,
      [plain, nullable, presentation],
    );
    // Match KPA/CMS alias-prefixed consumers, including joins that also have metadata.
    const visible = await db.query(
      `SELECT c.id FROM cms_contents c LEFT JOIN (SELECT '{}'::jsonb AS metadata) extra ON true WHERE c.${ORDINARY_CMS_CONTENT_SQL} ORDER BY c.id`,
    );
    expect(visible.map((row: any) => row.id).sort()).toEqual(
      [plain, nullable].sort(),
    );
    expect(
      await db.query(
        `SELECT c.${ORDINARY_CMS_CONTENT_SQL} AS visible FROM (SELECT NULL::jsonb AS metadata) c`,
      ),
    ).toEqual([{ visible: true }]);
    const raw = ordinaryCmsMetadata().getSql!("c.metadata");
    const rawVisible = await db.query(
      `SELECT c.id FROM cms_contents c LEFT JOIN (SELECT '{}'::jsonb AS metadata) extra ON true WHERE ${raw} ORDER BY c.id`,
    );
    expect(rawVisible.map((row: any) => row.id).sort()).toEqual(
      [plain, nullable].sort(),
    );
  });
  it("checks manager and item scope, and does not let client change kinds", async () => {
    await expect(managedHomeItems(db, "other", "content")).rejects.toThrow(
      "forbidden",
    );
    await expect(
      db.transaction((m) => saveEditorial(m, "other", null, data())),
    ).rejects.toThrow("forbidden");
    const item = await save(data());
    await expect(save(data({ kind: "notice" }), item.id)).rejects.toMatchObject(
      { status: 404 },
    );
    await db.query(
      "UPDATE cms_contents SET \"serviceKey\"='neture' WHERE id=$1",
      [item.id],
    );
    await expect(save(data(), item.id)).rejects.toMatchObject({ status: 404 });
  });
  it("keeps records beyond the former 200-row limit manageable", async () => {
    await db.query(`INSERT INTO cms_contents("serviceKey",type,title,status,"sortOrder",metadata)
      SELECT 'community','featured','Record '||n,'published',n,'{"section":"community-editorial","kind":"content","audience":"members"}'::jsonb FROM generate_series(1,205) n`);
    expect(await managedHomeItems(db, actor, "content", 1)).toMatchObject({
      hasNext: true,
      page: 1,
    });
    const tail = await managedHomeItems(db, actor, "content", 11);
    expect(tail.items).toHaveLength(5);
    expect(tail.hasNext).toBe(false);
    const id = tail.items[0].id;
    await save(
      data({
        title: "Edited older record",
        status: "archived",
        sortOrder: 201,
      }),
      id,
    );
    expect(
      (await managedHomeItems(db, actor, "content", 11)).items.find(
        (row: any) => row.id === id,
      ),
    ).toMatchObject({ title: "Edited older record", status: "archived" });
  });
  it("enforces valid HTTPS links, source, lengths and default private draft", () => {
    expect(parseEditorial({ kind: "notice", title: "Hello" })).toMatchObject({
      audience: "members",
      status: "draft",
    });
    for (const linkUrl of [
      "javascript:alert(1)",
      "http://www.kpanews.co.kr/",
      "https://evil.example/",
      "https://www.kpanews.co.kr.evil.example/",
      "https://user:pass@www.kpanews.co.kr/",
    ])
      expect(() => parseEditorial(data({ kind: "news", linkUrl }))).toThrow();
    expect(
      parseEditorial(
        data({
          kind: "news",
          linkUrl: "https://www.kpanews.co.kr/article/show.asp?idx=1",
        }),
      ).linkUrl,
    ).toContain("kpanews");
    expect(() => parseEditorial(data({ sortOrder: -1 }))).toThrow();
    expect(() => parseEditorial(data({ status: ["published"] }))).toThrow();
    expect(() =>
      parseEditorial(
        data({
          kind: "news",
          linkUrl: "https://www.kpanews.co.kr/article/1",
          body: "Copied article",
        }),
      ),
    ).toThrow();
    expect(() => parseEditorial(data({ audience: ["public"] }))).toThrow();
    expect(() => parseEditorial(data({ title: "x".repeat(256) }))).toThrow();
  });
  async function board(
    forumType = "open",
    status = "completed",
    service = "community",
  ) {
    const id = randomUUID();
    await db.query(
      `INSERT INTO forum_category_requests(id,service_code,name,status,forum_type,requester_id,reason,description,requester_name) VALUES($1,$2,'Board',$3,$4,$5,'fixture','Fixture','Fixture')`,
      [id, service, status, forumType, actor],
    );
    return id;
  }
  async function post(boardId: string, title: string, pinned = false) {
    const id = randomUUID();
    await db.query(
      `INSERT INTO forum_post(id,forum_id,title,slug,content,status,author_id,"isPinned") VALUES($1::uuid,$2,$3,$1::uuid::text,'{}','publish',$4,$5)`,
      [id, boardId, title, actor, pinned],
    );
    return id;
  }
  it("shows only signed public posts anonymously; members see permitted open and joined closed boards", async () => {
    const open = await board(),
      closed = await board("closed"),
      paused = await board("open", "archived"),
      foreign = await board("open", "completed", "neture");
    const a = await post(open, "Public", true),
      b = await post(open, "Private");
    await post(closed, "Closed");
    await post(paused, "Paused");
    await post(foreign, "Foreign");
    const signed = signPublicReadDesignation(
      "community",
      open,
      {
        mode: "selected",
        postIds: [a],
        designatedBy: actor,
        designatedAt: new Date().toISOString(),
      },
      process.env.JWT_SECRET!,
    );
    await db.query(
      "UPDATE forum_category_requests SET metadata=$2::jsonb WHERE id=$1",
      [open, JSON.stringify({ [PUBLIC_READ_KEY]: signed })],
    );
    expect(
      (await communityHome(db, null)).forum.recent.map((x: any) => x.id),
    ).toEqual([a]);
    expect(
      (await communityHome(db, user)).forum.recent.map((x: any) => x.id).sort(),
    ).toEqual([a, b].sort());
    await db.query(
      `INSERT INTO forum_category_members(forum_category_id,user_id) VALUES($1,$2)`,
      [closed, actor],
    );
    expect((await communityHome(db, user)).forum.recent).toHaveLength(3);
    await db.transaction((m) => pinHomeForum(m, actor, a.toUpperCase(), true));
    await db.transaction((m) => pinHomeForum(m, actor, b, true));
    expect(
      (await communityHome(db, null)).forum.pinned.map((item: any) => item.id),
    ).toEqual([a]);
    expect((await communityHome(db, user)).forum.pinned).toHaveLength(2);
  });
  it("excludes full bodies from previews while preserving detail and editing", async () => {
    const saved = await save(data({ body: "Detail body", isPinned: true }));
    expect(
      (await communityHome(db, null)).content.pinned[0],
    ).not.toHaveProperty("body");
    expect(
      (await listEditorial(db, null, "content")).items[0],
    ).not.toHaveProperty("body");
    expect((await getEditorial(db, null, saved.id)).body).toBe("Detail body");
    expect((await managedHomeItems(db, actor, "content")).items[0].body).toBe(
      "Detail body",
    );
  });
  it("lets managers search and page older forum posts by title", async () => {
    const id = await board();
    for (let i = 0; i < 25; i++) await post(id, `Forum title ${i}`);
    expect((await managedHomeForum(db, actor, 1)).hasNext).toBe(true);
    expect((await managedHomeForum(db, actor, 2)).recent).toHaveLength(5);
    const match = await managedHomeForum(db, actor, 1, "title 24");
    expect(match.recent).toHaveLength(1);
    await db.transaction((m) =>
      pinHomeForum(m, actor, match.recent[0].id, true),
    );
    await db.query("UPDATE forum_post SET title=$2 WHERE id=$1", [
      match.recent[0].id,
      "Changed title",
    ]);
    expect((await managedHomeForum(db, actor)).pinned[0].title).toBe(
      "Changed title",
    );
    await db.query(
      "UPDATE forum_post SET status='draft',title='Private draft' WHERE id=$1",
      [match.recent[0].id],
    );
    expect((await managedHomeForum(db, actor)).pinned[0].title).toBe(
      "표시할 수 없는 게시글",
    );
    expect((await communityHome(db, user)).forum.pinned).toEqual([]);

    expect(
      (
        await db.query(
          `SELECT title FROM cms_contents WHERE metadata->>'kind'='forum-pin'`,
        )
      )[0].title,
    ).toBe("포럼 상시노출 설정");
  });
  it("persists forum pins with scope and two-slot restriction", async () => {
    const open = await board();
    const ids = [];
    for (let i = 0; i < 3; i++) ids.push(await post(open, `Post ${i}`));
    for (const id of ids.slice(0, 2))
      await db.transaction((m) => pinHomeForum(m, actor, id, true));
    await expect(
      db.transaction((m) => pinHomeForum(m, actor, ids[2], true)),
    ).rejects.toMatchObject({ code: "HOME_PIN_LIMIT" });
    await db.transaction((m) => pinHomeForum(m, actor, ids[0], false));
    await db.transaction((m) => pinHomeForum(m, actor, ids[2], true));
    expect((await communityHome(db, user)).forum.pinned).toHaveLength(2);
    // Board pins and ordinary author edits cannot forge a service-home selection.
    await db.query('UPDATE forum_post SET "isPinned"=true WHERE id=$1', [
      ids[0],
    ]);
    expect(
      (await communityHome(db, user)).forum.pinned.map((p: any) => p.id).sort(),
    ).toEqual([ids[1], ids[2]].sort());
    await db.query(
      "UPDATE forum_category_requests SET status='archived' WHERE id=$1",
      [open],
    );
    expect((await communityHome(db, user)).forum.pinned).toEqual([]);
    expect((await managedHomeForum(db, actor)).pinned).toHaveLength(2);
    await db.transaction((m) => pinHomeForum(m, actor, ids[1], false));
    expect((await managedHomeForum(db, actor)).pinned).toHaveLength(1);
    const foreign = await post(
      await board("open", "completed", "neture"),
      "Foreign",
    );
    await expect(
      db.transaction((m) => pinHomeForum(m, actor, foreign, true)),
    ).rejects.toMatchObject({ status: 404 });
  });
});
