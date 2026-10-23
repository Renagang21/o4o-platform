import { randomUUID } from "node:crypto";
import type { DataSource, EntityManager } from "typeorm";
import {
  CommunityManagementError,
  requireCommunityManager,
} from "./community-management.service.js";
import {
  NEWS_SOURCES,
  newsKey,
  newsSource,
  type NewsCandidate,
  type NewsSuggestion,
} from "./community-news-policy.js";

type Db = Pick<DataSource, "query" | "transaction">;
type Query = Pick<EntityManager, "query">;
export interface NewsReview {
  id: string;
  day: string;
  state: "pending" | "done" | "failed";
  items: NewsSuggestion[];
}
const scope = `"serviceKey"='community' AND "organizationId" IS NULL AND metadata->>'section'='community-editorial'`;
const control = `${scope} AND metadata->>'kind'='news-review' AND status='draft'`;
export const newsDay = (now: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

async function read(db: Query, day: string): Promise<NewsReview | null> {
  const [row] = await db.query(
    `SELECT id,metadata FROM cms_contents WHERE ${control} AND metadata->>'day'=$1 ORDER BY "createdAt" DESC LIMIT 1`,
    [day],
  );
  return row
    ? {
        id: row.id,
        day,
        state: row.metadata.state,
        items: row.metadata.items ?? [],
      }
    : null;
}
export async function getNewsReview(
  db: Query,
  actor: string,
  now = new Date(),
) {
  await requireCommunityManager(db, actor);
  return read(db, newsDay(now));
}
async function candidates(db: Query): Promise<NewsCandidate[]> {
  const rows =
    await db.query(`SELECT id,title,summary,"linkUrl" FROM cms_contents WHERE ${scope} AND metadata->>'kind'='news'
    AND status='draft' AND ("expiresAt" IS NULL OR "expiresAt">NOW()) ORDER BY "createdAt" DESC,id`);
  const history = await db.query(
    `SELECT metadata->'inputKeys' AS keys FROM cms_contents WHERE ${control} AND metadata->>'state'='done'`,
  );
  const used = new Set<string>(
    history.flatMap((r: { keys: string[] }) => r.keys ?? []),
  );
  const selected: NewsCandidate[] = [];
  for (const source of NEWS_SOURCES) {
    let count = 0;
    for (const row of rows) {
      if (count === 2) break;
      if (newsSource(row.linkUrl)?.id !== source.id) continue;
      const key = newsKey(row.linkUrl);
      if (used.has(key)) continue;
      used.add(key);
      selected.push({
        id: row.id,
        title: row.title.slice(0, 160),
        summary: (row.summary ?? "").slice(0, 240),
        linkUrl: row.linkUrl,
      });
      count++;
    }
  }
  return selected;
}

/** Scheduled authority is internal and separately gated; no HTTP route accepts a system actor. */
export async function requireNewsAutomationEnabled(db: Query) {
  const [policy] = await db.query(
    "SELECT ai_enabled FROM ai_query_policy WHERE id=1",
  );
  if (policy?.ai_enabled !== true) throw new Error("AI_DISABLED");
}
export function reviewNews(
  db: Db,
  actor: string,
  generate: (
    items: readonly NewsCandidate[],
    actor: string,
  ) => Promise<NewsSuggestion[]>,
  now = new Date(),
) {
  return runReview(
    db,
    actor,
    (items) => generate(items, actor),
    (m) => requireCommunityManager(m, actor),
    now,
  );
}
export function reviewScheduledNews(
  db: Db,
  generate: (items: readonly NewsCandidate[]) => Promise<NewsSuggestion[]>,
  now = new Date(),
) {
  return runReview(db, null, generate, requireNewsAutomationEnabled, now);
}

/** A durable daily reservation precedes paid work; failures/process loss never permit another attempt that day. */
async function runReview(
  db: Db,
  actor: string | null,
  generate: (items: readonly NewsCandidate[]) => Promise<NewsSuggestion[]>,
  authorize: (db: Query) => Promise<void>,
  now = new Date(),
): Promise<NewsReview> {
  const day = newsDay(now);
  const started = await db.transaction(async (m) => {
    await authorize(m);
    const [lock] = await m.query(
      `SELECT pg_try_advisory_xact_lock(hashtext('community-news-review')) AS locked`,
    );
    if (!lock.locked)
      throw new CommunityManagementError(
        409,
        "NEWS_REVIEW_BUSY",
        "뉴스 정리를 시작하고 있습니다. 잠시 후 결과를 확인해 주세요.",
      );
    const existing = await read(m, day);
    if (existing) return { review: existing, input: null };
    const input = await candidates(m);
    if (!input.length)
      throw new CommunityManagementError(
        400,
        "NO_NEWS_DRAFTS",
        "세 매체의 미처리 뉴스 초안을 먼저 등록해 주세요.",
      );
    const id = randomUUID();
    const review: NewsReview = { id, day, state: "pending", items: [] };
    await m.query(
      `INSERT INTO cms_contents(id,"serviceKey",type,title,status,metadata,"createdBy","authorRole","visibilityScope")
      VALUES($1,'community','featured','뉴스 AI 정리 실행 기록','draft',$2::jsonb,$3,'service_admin','service')`,
      [
        id,
        JSON.stringify({
          section: "community-editorial",
          kind: "news-review",
          ...review,
          inputKeys: input.map((i) => newsKey(i.linkUrl)),
        }),
        actor,
      ],
    );
    return { review, input };
  });
  if (!started.input) return started.review;
  let items: NewsSuggestion[];
  try {
    items = await generate(started.input);
    await authorize(db);
  } catch {
    await db.query(
      `UPDATE cms_contents SET metadata=metadata||'{"state":"failed"}'::jsonb,"updatedAt"=NOW() WHERE ${control} AND id=$1`,
      [started.review.id],
    );
    // The reservation remains durable, but a revoked manager cannot receive even a failed result.
    await authorize(db);
    return { ...started.review, state: "failed" };
  }
  await db.transaction(async (m) => {
    await authorize(m);
    await m.query(
      `UPDATE cms_contents SET metadata=metadata||$2::jsonb,"updatedAt"=NOW() WHERE ${control} AND id=$1`,
      [started.review.id, JSON.stringify({ state: "done", items })],
    );
  });
  return { ...started.review, state: "done", items };
}

export async function recommendationFor(
  db: Query,
  reviewId: unknown,
  articleId: string,
  link: string,
) {
  if (
    typeof reviewId !== "string" ||
    !/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(reviewId)
  )
    throw new CommunityManagementError(
      400,
      "INVALID_NEWS_REVIEW",
      "AI 정리 결과를 다시 확인해 주세요.",
    );
  const [row] = await db.query(
    `SELECT metadata FROM cms_contents WHERE ${control} AND id=$1 AND metadata->>'state'='done'`,
    [reviewId],
  );
  const item = (row?.metadata.items as NewsSuggestion[] | undefined)?.find(
    (i) => i.id === articleId && i.linkUrl === link,
  );
  if (!item)
    throw new CommunityManagementError(
      400,
      "INVALID_NEWS_REVIEW",
      "선택한 기사와 AI 정리 결과가 일치하지 않습니다.",
    );
  return { reviewId, recommended: item.recommended, reason: item.reason };
}
