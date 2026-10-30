import { randomUUID } from "node:crypto";
import type { DataSource, EntityManager } from "typeorm";
import { NEWS_SOURCES, newsKey, newsSource } from "./community-news-policy.js";
import {
  CommunityManagementError,
  requireCommunityManager,
} from "./community-management.service.js";
import { newsDay } from "./community-news-review.service.js";
import {
  collectSource,
  type NewsSourceId,
  type CollectedNews,
} from "./community-news-source.js";

type Db = Pick<DataSource, "query" | "transaction">;
type Query = Pick<EntityManager, "query">;
const SCOPE = `"serviceKey"='community' AND "organizationId" IS NULL AND metadata->>'section'='community-editorial'`;
const CONTROL = `${SCOPE} AND metadata->>'kind'='news-collection' AND status='draft'`;
export interface NewsCollection {
  id: string;
  day: string;
  state: "pending" | "done" | "partial" | "failed";
  sources: { id: NewsSourceId; added: number; status: string }[];
}
async function read(db: Query, day: string): Promise<NewsCollection | null> {
  const [row] = await db.query(
    `SELECT id,metadata FROM cms_contents WHERE ${CONTROL} AND metadata->>'day'=$1 ORDER BY "createdAt" DESC LIMIT 1`,
    [day],
  );
  return row
    ? {
        id: row.id,
        day,
        state: row.metadata.state,
        sources: row.metadata.sources ?? [],
      }
    : null;
}
export async function getNewsCollection(
  db: Query,
  actor: string,
  now = new Date(),
) {
  await requireCommunityManager(db, actor, false, 'editorial');
  return read(db, newsDay(now));
}
function sourceFailure(error: unknown): string {
  const code = error instanceof Error ? error.message : "";
  return [
    "ROBOTS_BLOCKED",
    "ROBOTS_INVALID",
    "ROBOTS_DELAY_UNSUPPORTED",
    "SOURCE_LAYOUT_CHANGED",
  ].includes(code)
    ? code
    : "SOURCE_UNAVAILABLE";
}
async function persistArticles(
  db: Query,
  source: NewsSourceId,
  items: CollectedNews[],
  actor: string | null,
) {
  const rows = await db.query(
    `SELECT "linkUrl" FROM cms_contents WHERE ${SCOPE} AND metadata->>'kind'='news'`,
  );
  const seen = new Set<string>(
    rows.flatMap((r: { linkUrl: string }) =>
      newsSource(r.linkUrl) ? [newsKey(r.linkUrl)] : [],
    ),
  );
  let added = 0;
  for (const item of items.slice(0, 2)) {
    if (
      newsSource(item.linkUrl)?.id !== source ||
      !item.title.trim() ||
      item.title.length > 160 ||
      item.summary.length > 240
    )
      throw new Error("SOURCE_INVALID_RESPONSE");
    const key = newsKey(item.linkUrl);
    if (seen.has(key)) continue;
    await db.query(
      `INSERT INTO cms_contents("serviceKey",type,title,summary,"linkUrl",status,metadata,"createdBy","authorRole","visibilityScope")
      VALUES('community','news',$1,$2,$3,'draft',$4::jsonb,$5,'service_admin','service')`,
      [
        item.title,
        item.summary,
        key,
        JSON.stringify({
          section: "community-editorial",
          kind: "news",
          audience: "members",
          newsSource: source,
          collected: true,
        }),
        actor,
      ],
    );
    seen.add(key);
    added++;
  }
  return added;
}
function collectionState(successful: number): NewsCollection["state"] {
  if (successful === NEWS_SOURCES.length) return "done";
  return successful > 0 ? "partial" : "failed";
}
async function collect(
  db: Db,
  actor: string | null,
  loader: (id: NewsSourceId) => Promise<CollectedNews[]>,
  now: Date,
): Promise<NewsCollection> {
  const day = newsDay(now);
  const reservation = await db.transaction(async (m) => {
    if (actor !== null) await requireCommunityManager(m, actor, false, 'editorial');
    const [lock] = await m.query(
      `SELECT pg_try_advisory_xact_lock(hashtext('community-news-collection')) AS locked`,
    );
    if (!lock.locked)
      throw new CommunityManagementError(
        409,
        "NEWS_COLLECTION_BUSY",
        "뉴스 수집을 시작하고 있습니다. 잠시 후 결과를 확인해 주세요.",
      );
    const existing = await read(m, day);
    if (existing) return { value: existing, created: false };
    const value: NewsCollection = {
      id: randomUUID(),
      day,
      state: "pending",
      sources: [],
    };
    await m.query(
      `INSERT INTO cms_contents(id,"serviceKey",type,title,status,metadata,"createdBy","authorRole","visibilityScope")
      VALUES($1,'community','featured','뉴스 수집 실행 기록','draft',$2::jsonb,$3,'service_admin','service')`,
      [
        value.id,
        JSON.stringify({
          section: "community-editorial",
          kind: "news-collection",
          ...value,
        }),
        actor,
      ],
    );
    return { value, created: true };
  });
  if (!reservation.created) return reservation.value;
  const sources: NewsCollection["sources"] = [];
  // At most two requests to each publisher (robots and homepage); no article/detail requests.
  for (const source of NEWS_SOURCES) {
    try {
      const items = await loader(source.id);
      const added = await db.transaction(async (m) => {
        if (actor !== null) await requireCommunityManager(m, actor, false, 'editorial');
        await m.query(
          `SELECT pg_advisory_xact_lock(hashtext('community-editorial'))`,
        );
        return persistArticles(m, source.id, items, actor);
      });
      sources.push({ id: source.id, added, status: "ok" });
    } catch (error) {
      sources.push({ id: source.id, added: 0, status: sourceFailure(error) });
    }
  }
  const successful = sources.filter((s) => s.status === "ok").length;
  const result: NewsCollection = {
    ...reservation.value,
    state: collectionState(successful),
    sources,
  };
  await db.transaction(async (m) => {
    if (actor !== null) await requireCommunityManager(m, actor, false, 'editorial');
    await m.query(
      `UPDATE cms_contents SET metadata=metadata||$2::jsonb,"updatedAt"=NOW() WHERE ${CONTROL} AND id=$1`,
      [result.id, JSON.stringify(result)],
    );
  });
  return result;
}
export function collectNews(
  db: Db,
  actor: string,
  now = new Date(),
  loader = collectSource,
) {
  return collect(db, actor, loader, now);
}
/** Internal startup job; never exported as an unauthenticated HTTP capability. */
export function collectScheduledNews(
  db: Db,
  now = new Date(),
  loader = collectSource,
) {
  return collect(db, null, loader, now);
}
