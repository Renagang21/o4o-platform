import { newsSource } from "./community-news-policy.js";
import { recommendationFor } from "./community-news-review.service.js";
import { COMMUNITY_HOME_PIN_SQL } from "./community-home-pins.js";
import type { EntityManager } from "typeorm";
import type { CommunityAccessUser } from "../../utils/community-access.resolver.js";
import { resolveCommunityWorkspace } from "./community-workspace.service.js";
import {
  requireCommunityManager,
  CommunityManagementError,
} from "./community-management.service.js";
import { publicCommunityHomePosts } from "./community-public-read.service.js";

type Exec = Pick<EntityManager, "query">;
export const EDITORIAL_SECTION = "community-editorial";
export const HOME_KINDS = ["notice", "news", "content", "resource"] as const;
export type HomeKind = (typeof HOME_KINDS)[number];
const TYPES: Record<HomeKind, string> = {
  notice: "notice",
  news: "news",
  content: "featured",
  resource: "knowledge",
};
const UUID = /^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
const SCOPE = `"serviceKey"='community' AND "organizationId" IS NULL AND metadata->>'section'='${EDITORIAL_SECTION}'`;
const COLUMNS = `id,title,summary,"linkUrl","isPinned","sortOrder","createdAt","updatedAt",status,metadata->>'kind' AS kind,metadata->>'audience' AS audience,metadata->'newsRecommendation' AS "newsRecommendation"`;
function fail(status: number, code: string, message: string): never {
  throw new CommunityManagementError(status, code, message);
}
export function homeKind(value: unknown): HomeKind {
  if (!HOME_KINDS.includes(value as HomeKind))
    fail(400, "INVALID_HOME_KIND", "분류를 확인해 주세요.");
  return value as HomeKind;
}
export function homeUuid(value: string): string {
  if (!UUID.test(value))
    fail(400, "INVALID_RESOURCE_ID", "항목을 확인해 주세요.");
  return value.toLowerCase();
}
function validateEditorialLink(kind: HomeKind, linkUrl: string) {
  if (linkUrl) {
    let url: URL;
    try {
      url = new URL(linkUrl);
    } catch {
      return fail(400, "INVALID_HOME_LINK", "HTTPS 링크를 입력해 주세요.");
    }
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      (url.port && url.port !== "443")
    )
      fail(400, "INVALID_HOME_LINK", "HTTPS 링크를 입력해 주세요.");
    if (kind === "news" && !newsSource(linkUrl))
      fail(
        400,
        "INVALID_NEWS_SOURCE",
        "약사공론·데일리팜·메디파나 기사 원문 주소를 입력해 주세요.",
      );
  }
  if (kind === "news" && !linkUrl)
    fail(400, "INVALID_NEWS_SOURCE", "기사 원문 주소가 필요합니다.");
}
export function parseEditorial(input: Record<string, unknown>) {
  const kind = homeKind(input.kind);
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const text = (key: string, max: number) => {
    const value = input[key] ?? "";
    if (typeof value !== "string" || value.length > max)
      fail(400, "INVALID_HOME_ITEM", "입력 내용의 길이를 확인해 주세요.");
    return value.trim();
  };
  if (!title || title.length > 255)
    fail(400, "INVALID_HOME_ITEM", "제목을 입력해 주세요(255자 이내).");
  const body = text("body", 50000),
    summary = text("summary", 1000),
    linkUrl = text("linkUrl", 500);
  validateEditorialLink(kind, linkUrl);
  if (kind === "news" && body)
    fail(
      400,
      "NEWS_LINK_ONLY",
      "뉴스는 본문 복제 없이 제목·요약·원문 링크로 등록해 주세요.",
    );
  const status = input.status ?? "draft",
    audience = input.audience ?? "members";
  if (
    typeof status !== "string" ||
    typeof audience !== "string" ||
    !["draft", "published", "archived"].includes(status) ||
    !["public", "members"].includes(audience)
  )
    fail(400, "INVALID_HOME_ITEM", "게시·공개 상태를 확인해 주세요.");
  const sortOrder = input.sortOrder ?? 0;
  if (
    !Number.isInteger(sortOrder) ||
    Number(sortOrder) < 0 ||
    Number(sortOrder) > 9999
  )
    fail(400, "INVALID_HOME_ITEM", "표시 순서를 확인해 주세요.");
  if (input.isPinned !== undefined && typeof input.isPinned !== "boolean")
    fail(400, "INVALID_HOME_ITEM", "상시 노출 설정을 확인해 주세요.");
  return {
    kind,
    title,
    body,
    summary,
    linkUrl,
    status,
    audience,
    sortOrder,
    isPinned: input.isPinned === true,
  };
}
async function access(db: Exec, user: CommunityAccessUser | null) {
  const w = await resolveCommunityWorkspace(db, user, "community");
  if (w?.communityStatus !== "active")
    fail(404, "COMMUNITY_NOT_FOUND", "커뮤니티를 찾을 수 없습니다.");
  return w;
}
const eligible = `status='published' AND ("expiresAt" IS NULL OR "expiresAt">NOW())`;
const visibility = `($1::boolean OR metadata->>'audience'='public')`;
export async function listEditorial(
  db: Exec,
  user: CommunityAccessUser | null,
  kind: HomeKind,
  page = 1,
) {
  const w = await access(db, user);
  const rows = await db.query(
    `SELECT ${COLUMNS} FROM cms_contents WHERE ${SCOPE} AND ${eligible} AND ${visibility}
    AND metadata->>'kind'=$2 ORDER BY "isPinned" DESC,"sortOrder", "createdAt" DESC,id LIMIT 21 OFFSET $3`,
    [w.allowed, kind, (page - 1) * 20],
  );
  return { items: rows.slice(0, 20), hasNext: rows.length > 20, page };
}
export async function getEditorial(
  db: Exec,
  user: CommunityAccessUser | null,
  id: string,
) {
  homeUuid(id);
  const w = await access(db, user);
  const [item] = await db.query(
    `SELECT ${COLUMNS},body FROM cms_contents WHERE ${SCOPE} AND ${eligible} AND ${visibility} AND id=$2`,
    [w.allowed, id],
  );
  if (!item)
    fail(404, "HOME_ITEM_NOT_FOUND", "열람할 수 있는 항목이 없습니다.");
  return item;
}
async function editorialPreview(db: Exec, allowed: boolean, kind: HomeKind) {
  const base = `FROM cms_contents WHERE ${SCOPE} AND ${eligible} AND ${visibility} AND metadata->>'kind'=$2`;
  const pinned = await db.query(
    `SELECT ${COLUMNS} ${base} AND "isPinned"=true ORDER BY "sortOrder", "createdAt" DESC,id LIMIT 2`,
    [allowed, kind],
  );
  const recent = await db.query(
    `SELECT ${COLUMNS} ${base} AND NOT(id=ANY($3::uuid[])) ORDER BY "createdAt" DESC,id LIMIT 10`,
    [allowed, kind, pinned.map((p: { id: string }) => p.id)],
  );
  return { pinned, recent };
}
export async function homeForumItems(
  db: Exec,
  user: CommunityAccessUser | null,
) {
  const w = await access(db, user);
  if (!w.allowed) {
    // The existing signed designation is the only anonymous forum authority.
    return publicCommunityHomePosts(db);
  }
  // Same closed-board branches as ForumControllerBase.checkClosedForumAccess:
  // live service moderation, requester ownership, or current board membership.
  const base = `FROM forum_post p JOIN forum_category_requests b ON b.id=p.forum_id
    WHERE b.service_code='community' AND b.organization_id IS NULL AND b.status='completed'
    AND p.organization_id IS NULL AND p.is_organization_exclusive=false AND p.status='publish'
    AND (b.forum_type IS DISTINCT FROM 'closed' OR $2::boolean OR b.requester_id=$1
      OR EXISTS(SELECT 1 FROM forum_category_members m WHERE m.forum_category_id=b.id AND m.user_id=$1))`;
  const fields = `p.id,p.slug,p.title,p.excerpt AS summary,p.created_at AS "createdAt",b.name AS "boardName"`;
  const pinned = await db.query(
    `SELECT ${fields},true AS "isPinned" ${base} AND ${COMMUNITY_HOME_PIN_SQL} ORDER BY p.updated_at DESC,p.id LIMIT 2`,
    [user!.id, w.canManage === true],
  );
  const recent = await db.query(
    `SELECT ${fields},false AS "isPinned" ${base} AND NOT(p.id=ANY($3::uuid[])) ORDER BY p.created_at DESC,p.id LIMIT 10`,
    [user!.id, w.canManage === true, pinned.map((p: { id: string }) => p.id)],
  );
  return { pinned, recent };
}
export async function communityHome(
  db: Exec,
  user: CommunityAccessUser | null,
) {
  const w = await access(db, user);
  const [notice, news, forum, content, resource] = await Promise.all([
    editorialPreview(db, w.allowed, "notice"),
    editorialPreview(db, w.allowed, "news"),
    homeForumItems(db, user),
    editorialPreview(db, w.allowed, "content"),
    editorialPreview(db, w.allowed, "resource"),
  ]);
  return { member: w.allowed, notice, news, forum, content, resource };
}
export async function managedHomeItems(
  db: Exec,
  actor: string,
  kind: HomeKind,
  page = 1,
) {
  await requireCommunityManager(db, actor, false, 'editorial');
  const rows = await db.query(
    `SELECT ${COLUMNS},body FROM cms_contents WHERE ${SCOPE} AND metadata->>'kind'=$1
      ORDER BY "isPinned" DESC,"sortOrder","createdAt" DESC,id LIMIT 21 OFFSET $2`,
    [kind, (page - 1) * 20],
  );
  return { items: rows.slice(0, 20), hasNext: rows.length > 20, page };
}
/** Scope lock serializes the two-slot check and writes without a new schema. */
export async function saveEditorial(
  db: Exec,
  actor: string,
  id: string | null,
  input: Record<string, unknown>,
) {
  await requireCommunityManager(db, actor, false, 'editorial');
  const item = parseEditorial(input);
  await db.query(
    "SELECT pg_advisory_xact_lock(hashtext('community-editorial'))",
  );
  let newsRecommendation: unknown;
  if (id) {
    homeUuid(id);
    const [existing] = await db.query(
      `SELECT id,"linkUrl",metadata,metadata->>'kind' AS kind FROM cms_contents WHERE ${SCOPE} AND id=$1 FOR UPDATE`,
      [id],
    );
    if (existing?.kind !== item.kind)
      fail(
        404,
        "HOME_ITEM_NOT_FOUND",
        "같은 분류의 커뮤니티 항목을 선택해 주세요.",
      );
    if (item.kind === "news" && existing.linkUrl === item.linkUrl)
      newsRecommendation = existing.metadata?.newsRecommendation;
  }
  if (item.kind === "news" && input.newsReviewId !== undefined) {
    if (!id)
      fail(
        400,
        "INVALID_NEWS_REVIEW",
        "기존 기사 초안에 AI 정리를 적용해 주세요.",
      );
    newsRecommendation = await recommendationFor(
      db,
      input.newsReviewId,
      id!,
      item.linkUrl,
    );
  }
  if (item.isPinned) {
    const rows = await db.query(
      `SELECT id FROM cms_contents WHERE ${SCOPE} AND metadata->>'kind'=$1 AND "isPinned"=true AND ($2::uuid IS NULL OR id<>$2)`,
      [item.kind, id],
    );
    if (rows.length >= 2)
      fail(
        409,
        "HOME_PIN_LIMIT",
        "상시 노출은 분류별 최대 2개입니다. 기존 항목을 해제해 주세요.",
      );
  }
  const metadata = JSON.stringify({
    section: EDITORIAL_SECTION,
    kind: item.kind,
    audience: item.audience,
    ...(newsRecommendation ? { newsRecommendation } : {}),
  });
  const params = [
    item.title,
    item.summary,
    item.body,
    item.linkUrl || null,
    item.status,
    item.isPinned,
    item.sortOrder,
    metadata,
  ];
  let rows;
  if (id) {
    rows = await db.query(
      `UPDATE cms_contents SET title=$1,summary=$2,body=$3,"linkUrl"=$4,status=$5::varchar,"isPinned"=$6,"sortOrder"=$7,metadata=$8::jsonb,
      "publishedAt"=CASE WHEN $5::varchar='published' THEN COALESCE("publishedAt",NOW()) ELSE "publishedAt" END,"updatedAt"=NOW() WHERE ${SCOPE} AND id=$9 RETURNING id`,
      [...params, id],
    );
    rows = rows[0]; // TypeORM UPDATE returns [rows, affected].
  } else {
    rows = await db.query(
      `INSERT INTO cms_contents ("serviceKey","organizationId",type,title,summary,body,"linkUrl",status,"isPinned","sortOrder",metadata,"createdBy","authorRole","visibilityScope","publishedAt")
      VALUES('community',NULL,$9,$1,$2,$3,$4,$5::varchar,$6,$7,$8::jsonb,$10,'service_admin','service',CASE WHEN $5::varchar='published' THEN NOW() ELSE NULL END) RETURNING id`,
      [...params, TYPES[item.kind], actor],
    );
  }
  const saved = rows[0];
  await homeAudit(db, actor, "community:editorial_save", {
    id: saved.id,
    kind: item.kind,
    status: item.status,
    isPinned: item.isPinned,
  });
  return saved;
}
export async function managedHomeForum(
  db: Exec,
  actor: string,
  page = 1,
  search: unknown = "",
) {
  await requireCommunityManager(db, actor, false, 'editorial');
  if (typeof search !== "string" || search.length > 200)
    fail(400, "INVALID_HOME_SEARCH", "검색어는 200자 이내로 입력해 주세요.");
  const pinned =
    await db.query(`SELECT h.metadata->>'postId' AS id,COALESCE(p.title,'표시할 수 없는 게시글') AS title,
    p.slug,true AS "isPinned",h."createdAt" FROM
    (SELECT metadata,"createdAt",id FROM cms_contents WHERE ${SCOPE} AND metadata->>'kind'='forum-pin' AND status='published') h
    LEFT JOIN forum_post p ON p.id::text=h.metadata->>'postId' AND p.status='publish' AND p.organization_id IS NULL AND p.is_organization_exclusive=false
      AND p.forum_id IN(SELECT id FROM forum_category_requests WHERE service_code='community' AND organization_id IS NULL)
    ORDER BY h."createdAt",h.id`);
  const rows = await db.query(
    `SELECT p.id,p.slug,p.title,p.excerpt AS summary,false AS "isPinned",p.created_at AS "createdAt"
    FROM forum_post p JOIN forum_category_requests b ON b.id=p.forum_id
    WHERE b.service_code='community' AND b.organization_id IS NULL AND b.status='completed'
      AND p.organization_id IS NULL AND p.is_organization_exclusive=false AND p.status='publish' AND p.title ILIKE $1
    ORDER BY p.created_at DESC,p.id LIMIT 21 OFFSET $2`,
    ["%" + search.trim() + "%", (page - 1) * 20],
  );
  const ids = new Set(pinned.map((item: { id: string }) => item.id));
  return {
    pinned,
    recent: rows
      .slice(0, 20)
      .filter((item: { id: string }) => !ids.has(item.id)),
    hasNext: rows.length > 20,
    page,
  };
}
export async function pinHomeForum(
  db: Exec,
  actor: string,
  id: string,
  pinned: unknown,
) {
  await requireCommunityManager(db, actor, false, 'editorial');
  id = homeUuid(id);
  if (typeof pinned !== "boolean")
    fail(400, "INVALID_HOME_ITEM", "상시 노출 설정을 확인해 주세요.");
  await db.query(
    "SELECT pg_advisory_xact_lock(hashtext('community-forum-home-pins'))",
  );
  const selection = `${SCOPE} AND metadata->>'kind'='forum-pin'`;
  // Unpin works even if the post/board was stopped or removed after designation.
  if (!pinned) {
    await db.query(
      `UPDATE cms_contents SET status='archived',"updatedAt"=NOW() WHERE ${selection} AND metadata->>'postId'=$1`,
      [id],
    );
  } else {
    const [post] = await db.query(
      `SELECT p.id,p.title FROM forum_post p JOIN forum_category_requests b ON b.id=p.forum_id
      WHERE b.service_code='community' AND b.organization_id IS NULL AND b.status='completed'
      AND p.organization_id IS NULL AND p.is_organization_exclusive=false AND p.status='publish' AND p.id=$1 FOR SHARE OF p,b`,
      [id],
    );
    if (!post)
      fail(404, "HOME_ITEM_NOT_FOUND", "게시된 커뮤니티 글을 선택해 주세요.");
    const active = await db.query(
      `SELECT metadata->>'postId' AS id FROM cms_contents WHERE ${selection} AND status='published'`,
    );
    if (
      !active.some((row: { id: string }) => row.id === id) &&
      active.length >= 2
    )
      fail(409, "HOME_PIN_LIMIT", "포럼 상시 노출은 최대 2개입니다.");
    const existing = await db.query(
      `SELECT id FROM cms_contents WHERE ${selection} AND metadata->>'postId'=$1 LIMIT 1`,
      [id],
    );
    if (existing.length) {
      await db.query(
        `UPDATE cms_contents SET status='published',title=$2,"updatedAt"=NOW() WHERE ${selection} AND id=$1`,
        [existing[0].id, "포럼 상시노출 설정"],
      );
    } else {
      await db.query(
        `INSERT INTO cms_contents ("serviceKey",type,title,status,metadata,"createdBy","authorRole","visibilityScope")
        VALUES('community','featured',$1,'published',$2::jsonb,$3,'service_admin','service')`,
        [
          "포럼 상시노출 설정",
          JSON.stringify({
            section: EDITORIAL_SECTION,
            kind: "forum-pin",
            postId: id,
          }),
          actor,
        ],
      );
    }
  }
  await homeAudit(db, actor, "community:home_forum_pin", { id, pinned });
  return { id, isPinned: pinned };
}
async function homeAudit(
  db: Exec,
  actor: string,
  action: string,
  detail: Record<string, unknown>,
) {
  await db.query(
    `INSERT INTO action_logs(service_key,user_id,action_key,source,status,meta) VALUES('community',$1,$2,'manual','success',$3::jsonb)`,
    [actor, action, JSON.stringify(detail)],
  );
}
