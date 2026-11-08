import { randomUUID } from "node:crypto";
import type { DataSource, EntityManager } from "typeorm";
import logger from "../../utils/logger.js";
import {
  CommunityManagementError,
  requireCommunityManager,
} from "./community-management.service.js";
import {
  NEWS_AUTO_LIMITS,
  NEWS_PUBLISH,
  chooseRepresentative,
  clusterFinalScore,
  newsExpiry,
  newsWindow,
  selectAfternoon,
  selectMorning,
  type NewsClusterInput,
  type NewsClusterOutput,
  type NewsSelection,
  type NewsWindow,
} from "./community-news-auto-policy.js";
import { NEWS_SOURCES, newsKey, newsSource } from "./community-news-policy.js";
import {
  requireNewsAutomationEnabled,
  newsDay,
} from "./community-news-review.service.js";
import {
  collectFeed,
  type FeedArticle,
  type NewsSourceId,
} from "./community-news-source.js";

type Db = Pick<DataSource, "query" | "transaction">;
type Query = Pick<EntityManager, "query">;
const SCOPE = `"serviceKey"='community' AND "organizationId" IS NULL AND metadata->>'section'='community-editorial'`;
const CONTROL = `${SCOPE} AND metadata->>'kind'='news-run' AND status='draft'`;
const NEWS = `${SCOPE} AND metadata->>'kind'='news'`;
const DAY_MS = 86400000;
const RETENTION_ARTICLES_DAYS = 90;
const RETENTION_ENGAGEMENT_DAYS = 365;

export type NewsRunState =
  | "running"
  | "done"
  | "partial"
  | "no_articles"
  | "ai_disabled"
  | "failed";
export interface NewsRunSource {
  id: NewsSourceId;
  status: string;
  fetched: number;
  added: number;
  duplicates: number;
  outOfWindow: number;
}
export interface NewsAutoRun {
  id: string;
  day: string;
  window: NewsWindow;
  state: NewsRunState;
  trigger: "schedule" | "manual";
  sources: NewsRunSource[];
  ai: "pending" | "done" | "skipped" | "disabled" | "failed";
  candidates: number;
  clusters: number;
  published: number;
  swapped: number;
  suppressed: number;
  startedAt: string;
  finishedAt: string | null;
}
function toRun(row: { id: string; metadata: Record<string, any> }): NewsAutoRun {
  const m = row.metadata;
  return {
    id: row.id,
    day: m.day,
    window: m.window,
    state: m.state,
    trigger: m.trigger,
    sources: m.sources ?? [],
    ai: m.ai ?? "pending",
    candidates: m.candidates ?? 0,
    clusters: m.clusters ?? 0,
    published: m.published ?? 0,
    swapped: m.swapped ?? 0,
    suppressed: m.suppressed ?? 0,
    startedAt: m.startedAt,
    finishedAt: m.finishedAt ?? null,
  };
}
export async function listNewsAutoRuns(db: Query, actor: string) {
  await requireCommunityManager(db, actor, false, "editorial");
  const rows = await db.query(
    `SELECT id,metadata FROM cms_contents WHERE ${CONTROL} ORDER BY "createdAt" DESC,id LIMIT 14`,
  );
  return rows.map(toRun) as NewsAutoRun[];
}

const sourceFailure = (error: unknown) => {
  const code = error instanceof Error ? error.message : "";
  return [
    "ROBOTS_BLOCKED",
    "ROBOTS_INVALID",
    "ROBOTS_DELAY_UNSUPPORTED",
    "SOURCE_LAYOUT_CHANGED",
    "SOURCE_INVALID_RESPONSE",
  ].includes(code)
    ? code
    : "SOURCE_UNAVAILABLE";
};
const titleKey = (title: string) =>
  title
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");

async function persistFeed(
  db: Query,
  source: NewsSourceId,
  items: readonly FeedArticle[],
  now: Date,
): Promise<NewsRunSource> {
  const result: NewsRunSource = {
    id: source,
    status: "ok",
    fetched: items.length,
    added: 0,
    duplicates: 0,
    outOfWindow: 0,
  };
  const from = new Date(now.getTime() - DAY_MS);
  const to = new Date(now.getTime() + 10 * 60000);
  const recent = await db.query(
    `SELECT title FROM community_news_articles WHERE source=$1 AND published_at>=$2`,
    [source, new Date(now.getTime() - 2 * DAY_MS)],
  );
  const titles = new Set<string>(
    recent.map((r: { title: string }) => titleKey(r.title)),
  );
  for (const item of items) {
    if (item.publishedAt < from || item.publishedAt > to) {
      result.outOfWindow++;
      continue;
    }
    const key = titleKey(item.title);
    if (titles.has(key)) {
      result.duplicates++;
      continue;
    }
    const inserted = await db.query(
      `INSERT INTO community_news_articles(source,url,title,lead,section,published_at,collected_at,day)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (url) DO NOTHING RETURNING id`,
      [
        source,
        item.url,
        item.title.slice(0, NEWS_AUTO_LIMITS.titleChars),
        item.lead.slice(0, NEWS_AUTO_LIMITS.leadChars),
        item.section,
        item.publishedAt,
        now,
        newsDay(item.publishedAt),
      ],
    );
    if (inserted.length) {
      result.added++;
      titles.add(key);
    } else result.duplicates++;
  }
  return result;
}

interface ArticleRow {
  id: string;
  source: NewsSourceId;
  url: string;
  title: string;
  lead: string;
  section: string | null;
  publishedAt: Date;
  clusterKey: string | null;
  publishedContentId: string | null;
}
const ARTICLE_COLUMNS = `id,source,url,title,lead,section,published_at AS "publishedAt",cluster_key AS "clusterKey",published_content_id AS "publishedContentId"`;
const toArticle = (row: ArticleRow): ArticleRow => ({
  ...row,
  publishedAt: new Date(row.publishedAt),
});
async function candidates(db: Query, now: Date): Promise<ArticleRow[]> {
  const rows = await db.query(
    `SELECT ${ARTICLE_COLUMNS} FROM community_news_articles WHERE published_at>=$1
     ORDER BY published_at DESC,id LIMIT $2`,
    [new Date(now.getTime() - DAY_MS), NEWS_AUTO_LIMITS.maxArticles],
  );
  return rows.map(toArticle);
}
function clusterInputs(articles: readonly ArticleRow[]): NewsClusterInput[] {
  const groups = new Map<string, number>();
  return articles.map((a) => {
    let group: number | null = null;
    if (a.clusterKey) {
      if (!groups.has(a.clusterKey)) groups.set(a.clusterKey, groups.size + 1);
      group = groups.get(a.clusterKey)!;
    }
    return {
      source: a.source,
      title: a.title,
      lead: a.lead,
      section: a.section,
      group,
    };
  });
}

interface ContentRow {
  id: string;
  status: string;
  linkUrl: string | null;
  isPinned: boolean;
  notExpired: boolean;
  metadata: Record<string, any>;
}
const isAuto = (row: ContentRow) => !!row.metadata?.autoNews;
// cms_contents timestamps have no zone; ::timestamptz makes writes and NOW() comparisons use the same session zone.
/** A V1 collected draft nobody saved. saveEditorial drops the collected flag, so an operator's draft is never this. */
const isUntouchedCollected = (row: ContentRow) =>
  row.status === "draft" && row.metadata?.collected === true && !isAuto(row);
const isHidden = (row: ContentRow) =>
  row.status !== "published" && !isUntouchedCollected(row);
const isLive = (row: ContentRow) =>
  row.status === "published" && (row.isPinned || row.notExpired);
/** Operators may register either host spelling; compare on the canonical key. */
const linkKey = (link: string | null) =>
  link && newsSource(link) ? newsKey(link) : link;
function hostVariants(url: string) {
  const parsed = new URL(url);
  const hosts = newsSource(url)?.hosts ?? [parsed.hostname];
  return hosts.map((host) => {
    parsed.hostname = host;
    return parsed.href;
  });
}

interface Cluster {
  key: string;
  members: ArticleRow[];
  score: number;
  reason: string;
  contents: ContentRow[];
}
type ClusterStatus = "published" | "hidden" | "open";
function clusterStatus(contents: readonly ContentRow[]): ClusterStatus {
  if (contents.some((c) => c.status === "published")) return "published";
  return contents.some(isHidden) ? "hidden" : "open";
}
const STATUS_PRIORITY: Record<ClusterStatus, number> = {
  published: 0,
  hidden: 1,
  open: 2,
};

/**
 * Runs inside the lock saveEditorial takes and re-reads everything, so a hide or pin made while the
 * model was answering is honoured. An article already in an issue stays there; only new articles join.
 */
async function applyClusters(
  db: Query,
  articles: readonly ArticleRow[],
  outputs: readonly NewsClusterOutput[],
  day: string,
  window: NewsWindow,
  now: Date,
) {
  await db.query(
    `SELECT pg_advisory_xact_lock(hashtext('community-editorial'))`,
  );
  const fresh: ArticleRow[] = (
    await db.query(
      `SELECT ${ARTICLE_COLUMNS} FROM community_news_articles WHERE id=ANY($1::uuid[])`,
      [articles.map((a) => a.id)],
    )
  ).map(toArticle);
  const priorKeys = [
    ...new Set(fresh.flatMap((a) => (a.clusterKey ? [a.clusterKey] : []))),
  ];
  const priorMembers: ArticleRow[] = priorKeys.length
    ? (
        await db.query(
          `SELECT ${ARTICLE_COLUMNS} FROM community_news_articles WHERE cluster_key=ANY($1::uuid[])`,
          [priorKeys],
        )
      ).map(toArticle)
    : [];
  // `fresh` wins so that cluster assignment below mutates the one object per article.
  const everyone = new Map(
    [...priorMembers, ...fresh].map((a) => [a.id, a] as const),
  );
  const contentIds = [
    ...new Set(
      [...everyone.values()].flatMap((a) =>
        a.publishedContentId ? [a.publishedContentId] : [],
      ),
    ),
  ];
  const urls = [...new Set([...everyone.values()].map((a) => a.url))];
  // Operators may save a link with tracking parameters or a fragment. Find candidates by the bare
  // address, keep only those with the same canonical key, and lock just those rows.
  const keys = new Set(urls.map(linkKey));
  const bareUrls = [
    ...new Set(urls.flatMap(hostVariants).map((u) => u.split(/[?#]/)[0])),
  ];
  const linkedIds = (
    (await db.query(
      `SELECT id,"linkUrl" FROM cms_contents
       WHERE ${NEWS} AND split_part(split_part("linkUrl",'#',1),'?',1)=ANY($1::text[])`,
      [bareUrls],
    )) as { id: string; linkUrl: string | null }[]
  )
    .filter((r) => keys.has(linkKey(r.linkUrl)))
    .map((r) => r.id);
  const rows: ContentRow[] = await db.query(
    `SELECT id,status,"linkUrl","isPinned",("expiresAt" IS NULL OR "expiresAt">$2::timestamptz) AS "notExpired",metadata FROM cms_contents
     WHERE ${NEWS} AND id=ANY($1::uuid[]) FOR UPDATE`,
    [[...new Set([...contentIds, ...linkedIds])], now],
  );
  const byId = new Map(rows.map((r) => [r.id, r]));
  const byUrl = new Map<string, ContentRow[]>();
  for (const row of rows) {
    const key = linkKey(row.linkUrl);
    if (key) byUrl.set(key, [...(byUrl.get(key) ?? []), row]);
  }
  const linked = (members: readonly ArticleRow[]) => {
    const found = new Map<string, ContentRow>();
    for (const member of members) {
      const direct = member.publishedContentId
        ? byId.get(member.publishedContentId)
        : undefined;
      if (direct) found.set(direct.id, direct);
      for (const row of byUrl.get(member.url) ?? []) found.set(row.id, row);
    }
    return [...found.values()];
  };
  const members = new Map<string, ArticleRow[]>();
  const add = (key: string, article: ArticleRow) =>
    members.set(key, [...(members.get(key) ?? []), article]);
  for (const member of everyone.values())
    if (member.clusterKey) add(member.clusterKey, member);
  const priorStatus = (key: string) =>
    clusterStatus(linked(members.get(key) ?? []));
  const scores = new Map<string, { score: number; reason: string }>();
  const remember = (key: string, output: NewsClusterOutput) => {
    const known = scores.get(key);
    if (!known || output.score > known.score)
      scores.set(key, { score: output.score, reason: output.reason });
  };
  for (const output of outputs) {
    const group = output.indexes.flatMap((index) => {
      const article = everyone.get(articles[index].id);
      return article ? [article] : [];
    });
    const existing = [
      ...new Set(group.flatMap((a) => (a.clusterKey ? [a.clusterKey] : []))),
    ].sort(
      (a, b) =>
        STATUS_PRIORITY[priorStatus(a)] - STATUS_PRIORITY[priorStatus(b)] ||
        a.localeCompare(b),
    );
    const key = existing[0] ?? randomUUID();
    remember(key, output);
    for (const article of group) {
      if (article.clusterKey) {
        remember(article.clusterKey, output);
        continue;
      }
      article.clusterKey = key;
      add(key, article);
    }
  }
  const scored: (Cluster & { finalScore: number })[] = [...scores].map(
    ([key, { score, reason }]) => {
      const clusterMembers = members.get(key) ?? [];
      return {
        key,
        members: clusterMembers,
        score,
        reason,
        contents: linked(clusterMembers),
        finalScore: clusterFinalScore(
          score,
          new Set(clusterMembers.map((m) => m.source)).size,
        ),
      };
    },
  );
  const suppressed = scored.filter(
    (c) => clusterStatus(c.contents) === "hidden",
  ).length;
  const ranked = scored
    .filter((c) => clusterStatus(c.contents) === "open")
    .sort(
      (a, b) =>
        b.finalScore - a.finalScore ||
        chooseRepresentative(b.members).publishedAt.getTime() -
          chooseRepresentative(a.members).publishedAt.getTime() ||
        a.key.localeCompare(b.key),
    );
  const [{ total, live }] = await db.query(
    `SELECT count(*)::int AS total,count(*) FILTER (WHERE status='published')::int AS live
     FROM cms_contents WHERE ${NEWS} AND metadata->'autoNews'->>'day'=$1`,
    [day],
  );
  // A missed morning (cold instance, failed AI) must not leave the home empty for the day.
  const firstOfDay = window === "morning" || total === 0;
  const selection: NewsSelection<(typeof ranked)[number]>[] = firstOfDay
    ? selectMorning(ranked, day)
    : selectAfternoon(ranked, NEWS_PUBLISH.dailyMax - live);

  const expiresAt = newsExpiry(day);
  const contentFor = new Map<string, string>();
  for (const [position, chosen] of selection.entries()) {
    const cluster = chosen.item;
    const representative = chooseRepresentative(cluster.members);
    const metadata = {
      section: "community-editorial",
      kind: "news",
      audience: "members",
      newsSource: representative.source,
      autoNews: {
        day,
        window,
        clusterKey: cluster.key,
        articleId: representative.id,
        rank: chosen.rank,
        exploration: chosen.exploration,
        score: cluster.finalScore,
      },
    };
    // The newest row sorts first on the home; a millisecond per position keeps the ranking.
    const createdAt = new Date(now.getTime() - position);
    const promoted = cluster.contents.find(
      (c) => linkKey(c.linkUrl) === representative.url && isUntouchedCollected(c),
    );
    const params = [
      representative.title,
      representative.lead,
      representative.url,
      expiresAt,
      now,
      createdAt,
      JSON.stringify(metadata),
    ];
    if (promoted) {
      await db.query(
        `UPDATE cms_contents SET title=$1,summary=$2,"linkUrl"=$3,status='published',"expiresAt"=$4::timestamptz,"publishedAt"=$5::timestamptz,"createdAt"=$6::timestamptz,"updatedAt"=$5::timestamptz,metadata=$7::jsonb
         WHERE ${NEWS} AND id=$8`,
        [...params, promoted.id],
      );
      contentFor.set(cluster.key, promoted.id);
    } else {
      const [row] = await db.query(
        `INSERT INTO cms_contents("serviceKey",type,title,summary,"linkUrl",status,"expiresAt","publishedAt","createdAt","updatedAt",metadata,"authorRole","visibilityScope")
         VALUES('community','news',$1,$2,$3,'published',$4::timestamptz,$5::timestamptz,$6::timestamptz,$5::timestamptz,$7::jsonb,'service_admin','service') RETURNING id`,
        params,
      );
      contentFor.set(cluster.key, row.id);
    }
  }
  if (firstOfDay && selection.length) {
    await db.query(
      `UPDATE cms_contents SET "expiresAt"=$1::timestamptz,"updatedAt"=$1::timestamptz WHERE ${NEWS} AND metadata->'autoNews'->>'day'<$2 AND ("expiresAt" IS NULL OR "expiresAt">$1::timestamptz)`,
      [now, day],
    );
  }

  let swapped = 0;
  for (const cluster of scored) {
    const representative = chooseRepresentative(cluster.members);
    const row = cluster.contents.find(
      (c) => isAuto(c) && isLive(c) && !c.metadata.autoNews.operatorEdited,
    );
    if (
      !row ||
      representative.source !== "kpanews" ||
      linkKey(row.linkUrl) === representative.url ||
      (byUrl.get(representative.url) ?? []).some(
        (other) => other.id !== row.id && !isUntouchedCollected(other),
      )
    )
      continue;
    await db.query(
      `UPDATE cms_contents SET title=$2,summary=$3,"linkUrl"=$4,"updatedAt"=$5::timestamptz,metadata=$6::jsonb WHERE ${NEWS} AND id=$1`,
      [
        row.id,
        representative.title,
        representative.lead,
        representative.url,
        now,
        JSON.stringify({
          ...row.metadata,
          newsSource: representative.source,
          autoNews: { ...row.metadata.autoNews, articleId: representative.id },
        }),
      ],
    );
    swapped++;
  }

  const updates = scored.flatMap((cluster) => {
    const representative = chooseRepresentative(cluster.members);
    const contentId =
      contentFor.get(cluster.key) ??
      cluster.contents.find((c) => c.status === "published")?.id ??
      cluster.contents.find(isHidden)?.id ??
      null;
    return cluster.members.map((member) => ({
      id: member.id,
      key: cluster.key,
      score: cluster.score,
      reason: cluster.reason,
      representative: member.id === representative.id,
      contentId,
    }));
  });
  if (updates.length) {
    await db.query(
      `UPDATE community_news_articles a SET cluster_key=v.key,ai_score=v.score,ai_reason=v.reason,representative=v.rep,published_content_id=COALESCE(v.content,a.published_content_id)
       FROM unnest($1::uuid[],$2::uuid[],$3::smallint[],$4::varchar[],$5::boolean[],$6::uuid[]) AS v(id,key,score,reason,rep,content) WHERE a.id=v.id`,
      [
        updates.map((u) => u.id),
        updates.map((u) => u.key),
        updates.map((u) => u.score),
        updates.map((u) => u.reason),
        updates.map((u) => u.representative),
        updates.map((u) => u.contentId),
      ],
    );
  }
  return {
    clusters: scored.length,
    published: selection.length,
    swapped,
    suppressed,
  };
}

export async function enforceNewsRetention(db: Query, now: Date) {
  const articles = new Date(now.getTime() - RETENTION_ARTICLES_DAYS * DAY_MS);
  const engagement = newsDay(
    new Date(now.getTime() - RETENTION_ENGAGEMENT_DAYS * DAY_MS),
  );
  await db.query(`DELETE FROM community_news_articles WHERE collected_at<$1`, [
    articles,
  ]);
  await db.query(`DELETE FROM community_news_engagement_daily WHERE day<$1`, [
    engagement,
  ]);
  await db.query(`DELETE FROM cms_contents WHERE ${CONTROL} AND "createdAt"<$1::timestamptz`, [
    articles,
  ]);
}

export interface NewsRunDeps {
  loader?: (id: NewsSourceId) => Promise<FeedArticle[]>;
  generate: (
    input: readonly NewsClusterInput[],
  ) => Promise<NewsClusterOutput[]>;
  now?: Date;
}
function reserve(
  db: Db,
  day: string,
  window: NewsWindow,
  actor: string | null,
  now: Date,
  authorize: (m: Query) => Promise<void>,
) {
  return db.transaction(async (m) => {
    await authorize(m);
    // Blocking and transaction-scoped: every revision and operator sees one committed reservation.
    await m.query(
      `SELECT pg_advisory_xact_lock(hashtext('community-news-auto-run'))`,
    );
    const [existing] = await m.query(
      `SELECT id,metadata FROM cms_contents WHERE ${CONTROL} AND metadata->>'day'=$1 AND metadata->>'window'=$2 LIMIT 1`,
      [day, window],
    );
    if (existing) return { run: toRun(existing), created: false };
    const id = randomUUID();
    const metadata = {
      section: "community-editorial",
      kind: "news-run",
      day,
      window,
      state: "running",
      trigger: actor ? "manual" : "schedule",
      startedAt: now.toISOString(),
    };
    await m.query(
      `INSERT INTO cms_contents(id,"serviceKey",type,title,status,metadata,"createdBy","authorRole","visibilityScope")
       VALUES($1,'community','featured','뉴스 자동 게시 실행 기록','draft',$2::jsonb,$3,'service_admin','service')`,
      [id, JSON.stringify(metadata), actor],
    );
    return { run: toRun({ id, metadata }), created: true };
  });
}
async function runWindow(
  db: Db,
  actor: string | null,
  deps: NewsRunDeps,
): Promise<NewsAutoRun | null> {
  const now = deps.now ?? new Date();
  const window = newsWindow(now);
  const authorize = async (m: Query) => {
    if (actor) await requireCommunityManager(m, actor, false, "editorial");
  };
  if (!window) {
    if (!actor) return null;
    await authorize(db);
    throw new CommunityManagementError(
      409,
      "NEWS_WINDOW_CLOSED",
      "자동 게시는 한국시간 오전 8시부터 실행할 수 있습니다.",
    );
  }
  const day = newsDay(now);
  const reservation = await reserve(db, day, window, actor, now, authorize);
  if (!reservation.created) return reservation.run;
  const { run } = reservation;
  const close = async (
    patch: Partial<NewsAutoRun> & { state: NewsRunState },
  ) => {
    const finishedAt = new Date().toISOString();
    await db.query(
      `UPDATE cms_contents SET metadata=metadata||$2::jsonb,"updatedAt"=NOW() WHERE ${CONTROL} AND id=$1`,
      [run.id, JSON.stringify({ ...patch, finishedAt })],
    );
    return { ...run, ...patch, finishedAt };
  };
  try {
    await enforceNewsRetention(db, now);
  } catch {
    logger.warn("[COMMUNITY_NEWS_AUTO] retention deferred");
  }
  const sources: NewsRunSource[] = [];
  // robots and feed per publisher, one attempt each; article pages are never requested.
  for (const source of NEWS_SOURCES) {
    try {
      const items = await (deps.loader ?? collectFeed)(source.id);
      sources.push(await persistFeed(db, source.id, items, now));
    } catch (error) {
      sources.push({
        id: source.id,
        status: sourceFailure(error),
        fetched: 0,
        added: 0,
        duplicates: 0,
        outOfWindow: 0,
      });
    }
  }
  const allOk = sources.every((s) => s.status === "ok");
  const anyOk = sources.some((s) => s.status === "ok");
  const articles = await candidates(db, now);
  const base = { sources, candidates: articles.length };
  if (!articles.length)
    return close({
      ...base,
      state: anyOk ? "no_articles" : "failed",
      ai: "skipped",
    });
  // Nothing new since the last run: no paid call.
  if (articles.every((a) => a.clusterKey))
    return close({
      ...base,
      state: allOk ? "done" : "partial",
      ai: "skipped",
    });
  try {
    await requireNewsAutomationEnabled(db);
  } catch {
    return close({ ...base, state: "ai_disabled", ai: "disabled" });
  }
  let outputs: NewsClusterOutput[];
  try {
    outputs = await deps.generate(clusterInputs(articles));
  } catch {
    const result = await close({ ...base, state: "failed", ai: "failed" });
    // The reservation stays, but a revoked manager cannot receive even a failed result.
    await authorize(db);
    return result;
  }
  try {
    const applied = await db.transaction(async (m) => {
      await authorize(m);
      const result = await applyClusters(
        m,
        articles,
        outputs,
        day,
        window,
        now,
      );
      if (actor)
        await m.query(
          `INSERT INTO action_logs(service_key,user_id,action_key,source,status,meta) VALUES('community',$1,'community:news_auto_run','manual','success',$2::jsonb)`,
          [actor, JSON.stringify({ runId: run.id, day, window, ...result })],
        );
      return result;
    });
    return await close({
      ...base,
      ...applied,
      state: allOk ? "done" : "partial",
      ai: "done",
    });
  } catch (error) {
    const result = await close({ ...base, state: "failed", ai: "done" });
    if (error instanceof CommunityManagementError) throw error;
    logger.warn("[COMMUNITY_NEWS_AUTO] publish step failed");
    return result;
  }
}
/** Internal job only; no HTTP route accepts a system actor. */
export function runScheduledNewsWindow(db: Db, deps: NewsRunDeps) {
  return runWindow(db, null, deps);
}
export async function runManualNewsWindow(
  db: Db,
  actor: string,
  deps: NewsRunDeps,
) {
  return (await runWindow(db, actor, deps)) as NewsAutoRun;
}
