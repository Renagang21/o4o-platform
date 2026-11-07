import { randomUUID } from "node:crypto";
import { DataSource } from "typeorm";
import { CANONICAL_SCHEMA_BASELINE_STATEMENTS } from "../../../database/bootstrap/canonical-schema-baseline";
import { CreateCommunityNewsAutomation1794013771244 } from "../../../database/migrations/1794013771244-CreateCommunityNewsAutomation";
import {
  communityHome,
  getEditorial,
  managedHomeItems,
  recordNewsEngagement,
  saveEditorial,
} from "../community-home.service";
import {
  enforceNewsRetention,
  listNewsAutoRuns,
  runManualNewsWindow,
  runScheduledNewsWindow,
} from "../community-news-auto.service";
import type { NewsClusterInput } from "../community-news-auto-policy";
import { newsDay } from "../community-news-review.service";
import type { FeedArticle, NewsSourceId } from "../community-news-source";

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
    canManage: false,
    forumStorageCodes: ["community"],
  }),
}));
jest.mock("../../../utils/logger", () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn() },
}));

const run =
  process.env.O4O_COMMUNITY_HOME_PG_TEST === "1" ? describe : describe.skip;
const actor = "11111111-1111-4111-8111-111111111111";
const user = { id: actor, roles: [], memberships: [] } as any;
const today = newsDay(new Date());
const dayBefore = (day: string, n = 1) =>
  new Date(new Date(`${day}T12:00:00Z`).getTime() - n * 86400000)
    .toISOString()
    .slice(0, 10);
const at = (day: string, hour: number) =>
  new Date(`${day}T${String(hour).padStart(2, "0")}:00:00+09:00`);
const HOSTS: Record<NewsSourceId, (n: number) => string> = {
  kpanews: (n) => `https://kpanews.co.kr/news/articleView.html?idxno=${n}`,
  dailypharm: (n) => `https://dailypharm.com/user/news/${n}`,
  medipana: (n) => `https://medipana.com/news/articleView.html?idxno=${n}`,
};
const article = (
  source: NewsSourceId,
  n: number,
  title: string,
  now: Date,
  minutesAgo = 30,
): FeedArticle => ({
  url: HOSTS[source](n),
  title,
  lead: `${title} 합성 리드`,
  section: null,
  publishedAt: new Date(now.getTime() - minutesAgo * 60000),
});
const loaderOf =
  (feeds: Partial<Record<NewsSourceId, FeedArticle[]>>) =>
  async (id: NewsSourceId) =>
    feeds[id] ?? [];
const pick =
  (groups: { titles: string[]; s: number }[]) =>
  async (input: readonly NewsClusterInput[]) =>
    groups.map((group) => ({
      indexes: group.titles.map((title) => {
        const index = input.findIndex((a) => a.title === title);
        if (index < 0) throw new Error(`fixture missing ${title}`);
        return index;
      }),
      score: group.s,
      reason: "합성 이유",
    }));

run("community news automation on isolated PostgreSQL", () => {
  let db: DataSource;
  const schema = "community_news_" + randomUUID().replaceAll("-", "");
  beforeAll(async () => {
    process.env.JWT_SECRET = "isolated-community-news-test-signing-material";
    db = new DataSource({
      type: "postgres",
      host: "127.0.0.1",
      port: Number(process.env.O4O_COMMUNITY_HOME_PG_PORT ?? 55439),
      username: process.env.O4O_COMMUNITY_HOME_PG_USER ?? "postgres",
      password: process.env.O4O_COMMUNITY_HOME_PG_PASSWORD,
      database: process.env.O4O_COMMUNITY_HOME_PG_DATABASE ?? "postgres",
      extra: { options: `-c search_path=${schema}` },
    });
    await db.initialize();
    await db.query(`CREATE SCHEMA ${schema}`);
    await db.query(
      "CREATE TABLE ai_query_policy(id int PRIMARY KEY,ai_enabled boolean NOT NULL)",
    );
    for (const table of [
      "cms_contents",
      "action_logs",
      "forum_category_requests",
      "forum_post",
      "forum_category_members",
    ]) {
      const sql = CANONICAL_SCHEMA_BASELINE_STATEMENTS.find((s) =>
        s.startsWith(`CREATE TABLE public.${table} (`),
      );
      if (!sql) throw new Error(table);
      await db.query(
        sql
          .replace(`public.${table}`, table)
          .replaceAll("public.uuid_generate_v4()", "gen_random_uuid()"),
      );
    }
    const runner = db.createQueryRunner();
    await new CreateCommunityNewsAutomation1794013771244().up(runner);
    await runner.release();
  });
  beforeEach(async () => {
    await db.query(
      "INSERT INTO ai_query_policy(id,ai_enabled) VALUES(1,true) ON CONFLICT(id) DO UPDATE SET ai_enabled=true",
    );
    for (const table of [
      "cms_contents",
      "action_logs",
      "community_news_articles",
      "community_news_engagement_daily",
    ])
      await db.query(`DELETE FROM ${table}`);
  });
  afterAll(async () => {
    if (db?.isInitialized) {
      await db.query(`DROP SCHEMA ${schema} CASCADE`);
      await db.destroy();
    }
  });
  const newsRows = () =>
    db.query(
      `SELECT id,title,summary,"linkUrl",status,"isPinned",metadata FROM cms_contents WHERE metadata->>'kind'='news' ORDER BY "createdAt" DESC,id`,
    );
  const save = (id: string, row: any, extra: Record<string, unknown>) =>
    db.transaction((m) =>
      saveEditorial(m, actor, id, {
        kind: "news",
        title: row.title,
        summary: row.summary,
        linkUrl: row.linkUrl,
        status: row.status,
        audience: row.metadata.audience,
        isPinned: row.isPinned,
        ...extra,
      }),
    );
  /** Publishes one non-kpanews issue in the morning of `day`. */
  async function morningIssue(day = today) {
    const now = at(day, 9);
    const a = article("dailypharm", 100, "합성 이슈 데일리팜", now);
    const b = article("medipana", 101, "합성 이슈 메디파나", now);
    await runScheduledNewsWindow(db, {
      now,
      loader: loaderOf({ dailypharm: [a], medipana: [b] }),
      generate: pick([{ titles: [a.title, b.title], s: 70 }]),
    });
    const [row] = await newsRows();
    return { row, a, b, now };
  }

  it("publishes the top seven plus one exploration item in ranking order, with no article body", async () => {
    const now = at(today, 9);
    const items = Array.from({ length: 20 }, (_, i) =>
      article("medipana", i + 1, `합성 기사 ${i + 1}`, now, i + 1),
    );
    const result = await runScheduledNewsWindow(db, {
      now,
      loader: loaderOf({ medipana: items }),
      generate: pick(
        items.map((item, i) => ({ titles: [item.title], s: 90 - i })),
      ),
    });
    expect(result).toMatchObject({
      state: "done",
      ai: "done",
      published: 8,
      window: "morning",
      trigger: "schedule",
    });
    const rows = await newsRows();
    expect(rows).toHaveLength(8);
    expect(rows.slice(0, 7).map((r: any) => r.title)).toEqual(
      items.slice(0, 7).map((i) => i.title),
    );
    const last = rows[7].metadata.autoNews;
    expect(last.exploration).toBe(true);
    expect(last.rank).toBeGreaterThanOrEqual(9);
    expect(last.rank).toBeLessThanOrEqual(20);
    expect(rows.filter((r: any) => r.metadata.autoNews.exploration)).toHaveLength(1);
    expect(rows.every((r: any) => r.metadata.audience === "members")).toBe(true);
    const home = await communityHome(db, user);
    expect(home.news.recent.map((r: any) => r.title)).toEqual(
      rows.map((r: any) => r.title),
    );
    expect(home.news.recent[0].autoPublished).toBe(true);
    expect((await communityHome(db, null)).news.recent).toEqual([]);
    const [body] = await db.query(
      `SELECT count(*)::int AS n FROM cms_contents WHERE metadata->>'kind'='news' AND body IS NOT NULL AND body<>''`,
    );
    expect(body.n).toBe(0);
    const ledger = await db.query(
      `SELECT count(*)::int AS n FROM community_news_articles`,
    );
    expect(ledger[0].n).toBe(20);
  });
  it("reserves each day and window once across concurrent runs, also for the manual run", async () => {
    const now = at(today, 9);
    const item = article("kpanews", 1, "합성 예약 기사", now);
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    const loader = jest.fn(async (id: NewsSourceId) => {
      await gate;
      return id === "kpanews" ? [item] : [];
    });
    const generate = jest.fn(pick([{ titles: [item.title], s: 80 }]));
    const first = runScheduledNewsWindow(db, { now, loader, generate });
    await new Promise((r) => setTimeout(r, 100));
    const others = await Promise.all([
      runScheduledNewsWindow(db, { now, loader, generate }),
      runManualNewsWindow(db, actor, { now, loader, generate }),
    ]);
    expect(others.map((r) => r?.state)).toEqual(["running", "running"]);
    release();
    expect((await first)?.state).toBe("done");
    expect(generate).toHaveBeenCalledTimes(1);
    expect(loader).toHaveBeenCalledTimes(3);
    const again = await runManualNewsWindow(db, actor, {
      now: new Date(now.getTime() + 3600000),
      loader,
      generate,
    });
    expect(again.state).toBe("done");
    expect(generate).toHaveBeenCalledTimes(1);
    const runs = await listNewsAutoRuns(db, actor);
    expect(runs).toHaveLength(1);
    expect(runs[0].sources.map((s) => s.id)).toEqual([
      "kpanews",
      "dailypharm",
      "medipana",
    ]);
    // A different window is a separate reservation; nothing new means no paid call.
    const afternoon = await runScheduledNewsWindow(db, {
      now: at(today, 15),
      loader: loaderOf({ kpanews: [item] }),
      generate,
    });
    expect(afternoon).toMatchObject({ window: "afternoon", ai: "skipped" });
    expect(generate).toHaveBeenCalledTimes(1);
    expect(await listNewsAutoRuns(db, actor)).toHaveLength(2);
  });
  it("forces kpanews as representative whatever the model answers, and adds multi-source weight", async () => {
    const now = at(today, 9);
    const kpa = article("kpanews", 1, "합성 약사공론 기사", now, 5);
    const daily = article("dailypharm", 2, "합성 데일리팜 먼저", now, 300);
    const solo = article("medipana", 3, "합성 메디파나 단독", now, 10);
    await runScheduledNewsWindow(db, {
      now,
      loader: loaderOf({
        kpanews: [kpa],
        dailypharm: [daily],
        medipana: [solo],
      }),
      generate: async (input) => [
        {
          indexes: [input.findIndex((a) => a.title === daily.title)],
          score: 60,
          reason: "합성",
        },
        {
          indexes: [input.findIndex((a) => a.title === kpa.title)],
          score: 60,
          reason: "합성",
        },
        {
          indexes: [input.findIndex((a) => a.title === solo.title)],
          score: 60,
          reason: "합성",
        },
      ],
    });
    await db.query(`DELETE FROM cms_contents`);
    await db.query(
      `UPDATE community_news_articles SET cluster_key=NULL,published_content_id=NULL`,
    );
    const result = await runScheduledNewsWindow(db, {
      now: at(today, 15),
      loader: loaderOf({}),
      generate: pick([
        { titles: [solo.title], s: 65 },
        { titles: [daily.title, kpa.title], s: 60 },
      ]),
    });
    expect(result?.published).toBe(2);
    const rows = await newsRows();
    expect(rows[0].linkUrl).toBe(kpa.url);
    expect(rows[0].metadata.newsSource).toBe("kpanews");
    expect(rows[0].metadata.autoNews.score).toBe(68);
    expect(rows[1].linkUrl).toBe(solo.url);
    const [flag] = await db.query(
      `SELECT representative FROM community_news_articles WHERE url=$1`,
      [kpa.url],
    );
    expect(flag.representative).toBe(true);
  });
  it("swaps the representative in the afternoon when a later kpanews article joins, keeping the same item", async () => {
    const { row, a, b } = await morningIssue();
    expect(row.linkUrl).toBe(a.url);
    const later = at(today, 15);
    const kpa = article("kpanews", 200, "합성 이슈 약사공론 후속", later, 10);
    const result = await runScheduledNewsWindow(db, {
      now: later,
      loader: loaderOf({ kpanews: [kpa] }),
      generate: pick([{ titles: [kpa.title, a.title, b.title], s: 75 }]),
    });
    expect(result).toMatchObject({ swapped: 1, published: 0, state: "done" });
    const rows = await newsRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: row.id,
      linkUrl: kpa.url,
      title: kpa.title,
    });
    const flags = await db.query(
      `SELECT url,representative,published_content_id AS content FROM community_news_articles ORDER BY url`,
    );
    expect(flags.filter((f: any) => f.representative).map((f: any) => f.url)).toEqual([kpa.url]);
    expect(flags.every((f: any) => f.content === row.id)).toBe(true);
  });
  it("adds only new important issues in the afternoon, within the home's daily limit", async () => {
    const { a } = await morningIssue();
    const later = at(today, 15);
    const low = article("medipana", 300, "합성 낮은 점수", later);
    const high = Array.from({ length: 12 }, (_, i) =>
      article("kpanews", 400 + i, `합성 중요 ${i}`, later, i + 1),
    );
    const result = await runScheduledNewsWindow(db, {
      now: later,
      loader: loaderOf({ kpanews: high, medipana: [low] }),
      generate: pick([
        { titles: [a.title], s: 70 },
        { titles: [low.title], s: 59 },
        ...high.map((h) => ({ titles: [h.title], s: 80 })),
      ]),
    });
    expect(result?.published).toBe(9);
    expect(await newsRows()).toHaveLength(10);
    expect((await newsRows()).some((r: any) => r.title === low.title)).toBe(false);
  });
  it("never undoes an operator's hide: later runs, AI regrouping, a new kpanews member or a new day", async () => {
    const { row, a, b } = await morningIssue();
    await save(row.id, row, { status: "archived" });
    const saved = (await newsRows())[0];
    expect(saved.metadata.autoNews.clusterKey).toBe(
      row.metadata.autoNews.clusterKey,
    );
    expect(saved.metadata.autoNews.lastSignal).toBe("hide");
    const later = at(today, 15);
    const kpa = article("kpanews", 500, "합성 숨긴 이슈 약사공론", later, 5);
    const result = await runScheduledNewsWindow(db, {
      now: later,
      loader: loaderOf({ kpanews: [kpa] }),
      generate: pick([
        { titles: [a.title, kpa.title], s: 95 },
        { titles: [b.title], s: 95 },
      ]),
    });
    expect(result).toMatchObject({ published: 0, swapped: 0, suppressed: 1 });
    let rows = await newsRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: row.id,
      status: "archived",
      linkUrl: a.url,
    });
    expect((await communityHome(db, user)).news.recent).toEqual([]);
    const tomorrow = at(today, 23);
    await db.query(
      `DELETE FROM cms_contents WHERE metadata->>'kind'='news-run'`,
    );
    const next = await runScheduledNewsWindow(db, {
      now: tomorrow,
      loader: loaderOf({
        medipana: [article("medipana", 501, "합성 다른 신규", tomorrow)],
      }),
      generate: pick([
        { titles: [kpa.title], s: 99 },
        { titles: ["합성 다른 신규"], s: 40 },
      ]),
    });
    expect(next?.suppressed).toBe(1);
    rows = await newsRows();
    expect(rows.find((r: any) => r.id === row.id).status).toBe("archived");
    expect(rows.some((r: any) => r.linkUrl === kpa.url)).toBe(false);
    const signals = await db.query(
      `SELECT meta FROM action_logs WHERE action_key='community:news_operator_signal'`,
    );
    expect(signals[0].meta).toMatchObject({ signal: "hide", id: row.id });
  });
  it("honours a hide made while the model is answering", async () => {
    const { row, a } = await morningIssue();
    const later = at(today, 15);
    const kpa = article("kpanews", 510, "합성 경쟁 약사공론", later);
    const result = await runScheduledNewsWindow(db, {
      now: later,
      loader: loaderOf({ kpanews: [kpa] }),
      generate: async (input) => {
        await save(row.id, row, { status: "archived" });
        return pick([{ titles: [a.title, kpa.title], s: 90 }])(input);
      },
    });
    expect(result).toMatchObject({ swapped: 0, suppressed: 1 });
    expect((await newsRows())[0]).toMatchObject({
      status: "archived",
      linkUrl: a.url,
    });
  });
  it("keeps an operator's pin visible past expiry and across later runs, and releases it on unpin", async () => {
    const { row, a } = await morningIssue();
    await save(row.id, row, { isPinned: true });
    await db.query(
      `UPDATE cms_contents SET "expiresAt"=NOW()-INTERVAL '3 day' WHERE id=$1`,
      [row.id],
    );
    const shown = await communityHome(db, user);
    expect(shown.news.pinned.map((r: any) => r.id)).toEqual([row.id]);
    expect((await getEditorial(db, user, row.id)).id).toBe(row.id);
    const later = at(today, 15);
    const kpa = article("kpanews", 520, "합성 고정 이슈 약사공론", later);
    const result = await runScheduledNewsWindow(db, {
      now: later,
      loader: loaderOf({ kpanews: [kpa] }),
      generate: pick([{ titles: [a.title, kpa.title], s: 80 }]),
    });
    // A pinned issue stays live, so the later kpanews article still becomes its representative.
    expect(result?.swapped).toBe(1);
    const pinned = (await newsRows())[0];
    expect(pinned).toMatchObject({
      id: row.id,
      isPinned: true,
      status: "published",
      linkUrl: kpa.url,
    });
    expect((await communityHome(db, user)).news.pinned).toHaveLength(1);
    await save(row.id, pinned, { isPinned: false });
    const after = await communityHome(db, user);
    expect(after.news.pinned).toEqual([]);
    expect(after.news.recent).toEqual([]);
    const signals = await db.query(
      `SELECT meta->>'signal' AS signal FROM action_logs WHERE action_key='community:news_operator_signal' ORDER BY id`,
    );
    expect(signals.map((s: any) => s.signal).sort()).toEqual(["pin", "unpin"]);
  });
  it("does not overwrite an operator's edit with a representative swap", async () => {
    const { row, a } = await morningIssue();
    await save(row.id, row, { title: "운영자가 고친 제목" });
    const later = at(today, 15);
    const kpa = article("kpanews", 530, "합성 편집 이슈 약사공론", later);
    const result = await runScheduledNewsWindow(db, {
      now: later,
      loader: loaderOf({ kpanews: [kpa] }),
      generate: pick([{ titles: [a.title, kpa.title], s: 80 }]),
    });
    expect(result?.swapped).toBe(0);
    expect((await newsRows())[0]).toMatchObject({
      title: "운영자가 고친 제목",
      linkUrl: a.url,
    });
  });
  it("drops the previous day's items through expiresAt when the new morning publishes", async () => {
    const yesterday = dayBefore(today);
    const { row } = await morningIssue(yesterday);
    const now = at(today, 9);
    const item = article("kpanews", 600, "합성 오늘 기사", now);
    await runScheduledNewsWindow(db, {
      now,
      loader: loaderOf({ kpanews: [item] }),
      generate: pick([{ titles: [item.title], s: 80 }]),
    });
    const [old] = await db.query(
      `SELECT "expiresAt"<=$2::timestamptz AS ended FROM cms_contents WHERE id=$1`,
      [row.id, now],
    );
    expect(old.ended).toBe(true);
    const [fresh] = await db.query(
      `SELECT "expiresAt">$1::timestamptz AS live FROM cms_contents WHERE "linkUrl"=$2`,
      [now, item.url],
    );
    expect(fresh.live).toBe(true);
  });
  it("keeps yesterday's items and publishes nothing when AI fails or is disabled, and spends no second call", async () => {
    const now = at(today, 9);
    const item = article("kpanews", 700, "합성 실패 기사", now);
    const generate = jest.fn().mockRejectedValue(Error("provider failure"));
    const failed = await runScheduledNewsWindow(db, {
      now,
      loader: loaderOf({ kpanews: [item] }),
      generate,
    });
    expect(failed).toMatchObject({ state: "failed", ai: "failed", published: 0 });
    await runScheduledNewsWindow(db, { now, generate });
    expect(generate).toHaveBeenCalledTimes(1);
    expect(await newsRows()).toEqual([]);
    await db.query("UPDATE ai_query_policy SET ai_enabled=false");
    const later = at(today, 15);
    const disabled = await runScheduledNewsWindow(db, {
      now: later,
      loader: loaderOf({ kpanews: [item] }),
      generate,
    });
    expect(disabled).toMatchObject({ state: "ai_disabled", ai: "disabled" });
    expect(generate).toHaveBeenCalledTimes(1);
  });
  it("fills the home in the afternoon when the morning produced nothing", async () => {
    const now = at(today, 15);
    const items = Array.from({ length: 10 }, (_, i) =>
      article("medipana", 800 + i, `합성 오후 ${i}`, now, i + 1),
    );
    const result = await runScheduledNewsWindow(db, {
      now,
      loader: loaderOf({ medipana: items }),
      generate: pick(items.map((item) => ({ titles: [item.title], s: 20 }))),
    });
    expect(result?.published).toBe(8);
  });
  it("isolates a failing publisher and reports each source", async () => {
    const now = at(today, 9);
    const item = article("kpanews", 900, "합성 부분 기사", now);
    const old = article("kpanews", 901, "합성 오래된 기사", now, 60 * 30);
    const result = await runScheduledNewsWindow(db, {
      now,
      loader: async (id) => {
        if (id === "dailypharm") throw new Error("ROBOTS_BLOCKED");
        if (id === "medipana") throw new Error("connect ECONNREFUSED 10.0.0.1");
        return [item, old, { ...item, url: HOSTS.kpanews(902) }];
      },
      generate: pick([{ titles: [item.title], s: 70 }]),
    });
    expect(result?.state).toBe("partial");
    expect(result?.sources).toEqual([
      {
        id: "kpanews",
        status: "ok",
        fetched: 3,
        added: 1,
        duplicates: 1,
        outOfWindow: 1,
      },
      {
        id: "dailypharm",
        status: "ROBOTS_BLOCKED",
        fetched: 0,
        added: 0,
        duplicates: 0,
        outOfWindow: 0,
      },
      {
        id: "medipana",
        status: "SOURCE_UNAVAILABLE",
        fetched: 0,
        added: 0,
        duplicates: 0,
        outOfWindow: 0,
      },
    ]);
  });
  it("respects news rows that already exist for the same address", async () => {
    const now = at(today, 9);
    const insert = (url: string, status: string, metadata: object) =>
      db.query(
        `INSERT INTO cms_contents("serviceKey",type,title,summary,"linkUrl",status,metadata,"authorRole","visibilityScope")
         VALUES('community','news','기존 항목','',$1,$2,$3::jsonb,'service_admin','service') RETURNING id`,
        [url, status, JSON.stringify(metadata)],
      );
    const base = {
      section: "community-editorial",
      kind: "news",
      audience: "members",
    };
    const v1 = article("kpanews", 1001, "합성 V1 초안", now);
    const manual = article("medipana", 1002, "합성 수동 게시", now);
    const draft = article("dailypharm", 1003, "합성 운영자 초안", now);
    const archived = article("medipana", 1004, "합성 보관", now);
    const [v1Row] = await insert(v1.url, "draft", { ...base, collected: true });
    const [manualRow] = await insert(
      manual.url.replace("medipana.com", "www.medipana.com"),
      "published",
      base,
    );
    await insert(draft.url, "draft", base);
    await insert(archived.url, "archived", base);
    const result = await runScheduledNewsWindow(db, {
      now,
      loader: loaderOf({
        kpanews: [v1],
        medipana: [manual, archived],
        dailypharm: [draft],
      }),
      generate: pick(
        [v1, manual, draft, archived].map((a) => ({
          titles: [a.title],
          s: 90,
        })),
      ),
    });
    expect(result).toMatchObject({ published: 1, suppressed: 2 });
    const rows = await newsRows();
    expect(rows).toHaveLength(4);
    const promoted = rows.find((r: any) => r.id === v1Row.id);
    expect(promoted).toMatchObject({ status: "published", title: v1.title });
    expect(promoted.metadata.autoNews).toBeTruthy();
    expect(rows.find((r: any) => r.id === manualRow.id).metadata.autoNews).toBeUndefined();
  });
  it("caps the model input at 400 articles", async () => {
    const now = at(today, 9);
    await db.query(
      `INSERT INTO community_news_articles(source,url,title,lead,published_at,day)
       SELECT 'medipana','https://medipana.com/news/articleView.html?idxno='||n,'합성 '||n,'',$1::timestamptz,$2::date FROM generate_series(1,450) n`,
      [new Date(now.getTime() - 3600000), today],
    );
    const generate = jest.fn().mockResolvedValue([]);
    await runScheduledNewsWindow(db, { now, loader: loaderOf({}), generate });
    expect(generate.mock.calls[0][0]).toHaveLength(400);
  });
  it("requires the operator for manual actions before any reservation or spending", async () => {
    const generate = jest.fn();
    const loader = jest.fn();
    await expect(
      runManualNewsWindow(db, "other", {
        now: at(today, 9),
        loader,
        generate,
      }),
    ).rejects.toThrow("forbidden");
    await expect(listNewsAutoRuns(db, "other")).rejects.toThrow("forbidden");
    expect(await db.query(`SELECT id FROM cms_contents`)).toEqual([]);
    expect(loader).not.toHaveBeenCalled();
    await expect(
      runManualNewsWindow(db, actor, { now: at(today, 7), loader, generate }),
    ).rejects.toMatchObject({ code: "NEWS_WINDOW_CLOSED" });
    expect(
      await runScheduledNewsWindow(db, { now: at(today, 7), loader, generate }),
    ).toBeNull();
    expect(generate).not.toHaveBeenCalled();
  });
  it("keeps run records out of every member surface", async () => {
    const { row } = await morningIssue();
    const [control] = await db.query(
      `SELECT id FROM cms_contents WHERE metadata->>'kind'='news-run'`,
    );
    await expect(getEditorial(db, user, control.id)).rejects.toMatchObject({
      status: 404,
    });
    const managed = await managedHomeItems(db, actor, "news");
    expect(managed.items.map((i: any) => i.id)).toEqual([row.id]);
    expect(managed.items[0].autoPublished).toBe(true);
  });
  describe("engagement beacon", () => {
    const send = (contentId: string, position: number, event = "click") =>
      recordNewsEngagement(db, user, {
        event,
        items: [{ contentId, position }],
      });
    it("increments an anonymous daily aggregate per article and position by upsert only", async () => {
      const { row } = await morningIssue();
      await send(row.id, 3);
      await send(row.id, 3);
      await send(row.id, 3, "impression");
      await send(row.id, 4, "impression");
      const rows = await db.query(
        `SELECT article_id AS id,"position",impressions,clicks FROM community_news_engagement_daily ORDER BY "position"`,
      );
      expect(rows).toEqual([
        {
          id: row.metadata.autoNews.articleId,
          position: 3,
          impressions: 1,
          clicks: 2,
        },
        {
          id: row.metadata.autoNews.articleId,
          position: 4,
          impressions: 1,
          clicks: 0,
        },
      ]);
      const columns = await db.query(
        `SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name='community_news_engagement_daily' ORDER BY 1`,
        [schema],
      );
      expect(columns.map((c: any) => c.column_name)).toEqual([
        "article_id",
        "clicks",
        "day",
        "impressions",
        "position",
      ]);
    });
    it("rejects anything but a visible auto-published news item", async () => {
      const { row } = await morningIssue();
      const [manual] = await db.query(
        `INSERT INTO cms_contents("serviceKey",type,title,"linkUrl",status,metadata,"authorRole","visibilityScope")
         VALUES('community','news','수동','https://medipana.com/x','published',$1::jsonb,'service_admin','service') RETURNING id`,
        [
          JSON.stringify({
            section: "community-editorial",
            kind: "news",
            audience: "members",
          }),
        ],
      );
      await expect(send(manual.id, 1)).rejects.toMatchObject({ status: 404 });
      await expect(send(randomUUID(), 1)).rejects.toMatchObject({ status: 404 });
      await expect(
        recordNewsEngagement(db, null, {
          event: "click",
          items: [{ contentId: row.id, position: 1 }],
        }),
      ).rejects.toMatchObject({ status: 404 });
      await save(row.id, row, { status: "archived" });
      await expect(send(row.id, 1)).rejects.toMatchObject({ status: 404 });
      expect(
        await db.query(`SELECT 1 FROM community_news_engagement_daily`),
      ).toEqual([]);
    });
    it("rejects malformed payloads before touching the database", async () => {
      const id = randomUUID();
      const bad: unknown[] = [
        {},
        { event: "view", items: [{ contentId: id, position: 1 }] },
        { event: "click", items: [] },
        { event: "click", items: "x" },
        {
          event: "click",
          items: [
            { contentId: id, position: 1 },
            { contentId: randomUUID(), position: 2 },
          ],
        },
        { event: "impression", items: [{ contentId: "1 OR 1=1", position: 1 }] },
        { event: "impression", items: [{ contentId: id, position: 0 }] },
        { event: "impression", items: [{ contentId: id, position: 13 }] },
        { event: "impression", items: [{ contentId: id, position: 1.5 }] },
        {
          event: "impression",
          items: [
            { contentId: id, position: 1 },
            { contentId: id, position: 2 },
          ],
        },
        {
          event: "impression",
          items: Array.from({ length: 13 }, (_, i) => ({
            contentId: randomUUID(),
            position: i + 1,
          })),
        },
      ];
      for (const body of bad)
        await expect(
          recordNewsEngagement(db, user, body as Record<string, unknown>),
        ).rejects.toMatchObject({ code: "INVALID_NEWS_ENGAGEMENT" });
    });
  });
  it("enforces 90-day ledger and 1-year aggregate retention independently", async () => {
    const now = new Date();
    const articleId = randomUUID();
    await db.query(
      `INSERT INTO community_news_articles(id,source,url,title,published_at,collected_at,day) VALUES
       ($1,'kpanews','https://kpanews.co.kr/old','합성 오래된',$2::timestamptz,$2::timestamptz,$3::date),
       ($4,'kpanews','https://kpanews.co.kr/new','합성 최근',$5::timestamptz,$5::timestamptz,$3::date)`,
      [
        articleId,
        new Date(now.getTime() - 91 * 86400000),
        today,
        randomUUID(),
        new Date(now.getTime() - 89 * 86400000),
      ],
    );
    await db.query(
      `INSERT INTO community_news_engagement_daily(article_id,day,"position",impressions) VALUES
       ($1,$2::date,1,1),($1,$3::date,1,1)`,
      [
        articleId,
        newsDay(new Date(now.getTime() - 300 * 86400000)),
        newsDay(new Date(now.getTime() - 366 * 86400000)),
      ],
    );
    await enforceNewsRetention(db, now);
    expect(
      (await db.query(`SELECT url FROM community_news_articles`)).map(
        (r: any) => r.url,
      ),
    ).toEqual(["https://kpanews.co.kr/new"]);
    // The aggregate outlives the ledger row it counted.
    expect(
      await db.query(`SELECT 1 FROM community_news_engagement_daily`),
    ).toHaveLength(1);
  });
});
