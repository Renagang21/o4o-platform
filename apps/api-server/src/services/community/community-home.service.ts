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
const COLUMNS = `id,title,summary,body,"linkUrl","isPinned","sortOrder","createdAt","updatedAt",status,metadata->>'kind' AS kind,metadata->>'audience' AS audience`;
const fail = (status: number, code: string, message: string): never => {
  throw new CommunityManagementError(status, code, message);
};
export function homeKind(value: unknown): HomeKind {
  if (!HOME_KINDS.includes(value as HomeKind))
    fail(400, "INVALID_HOME_KIND", "분류를 확인해 주세요.");
  return value as HomeKind;
}
export function homeUuid(value: string): string {
  if (!UUID.test(value))
    fail(400, "INVALID_RESOURCE_ID", "항목을 확인해 주세요.");
  return value;
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
    if (
      kind === "news" &&
      !["www.kpanews.co.kr", "kpanews.co.kr"].includes(url.hostname)
    )
      fail(400, "INVALID_NEWS_SOURCE", "약사공론 원문 주소를 입력해 주세요.");
  }
  if (kind === "news" && !linkUrl)
    fail(400, "INVALID_NEWS_SOURCE", "약사공론 원문 주소가 필요합니다.");
}
export function parseEditorial(input: Record<string, unknown>) {
  const kind = homeKind(input.kind);
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const text = (key: string, max: number) => {
    const value = input[key] ?? "";
    if (typeof value !== "string" || value.length > max)
      fail(400, "INVALID_HOME_ITEM", "입력 내용의 길이를 확인해 주세요.");
    return String(value).trim();
  };
  if (!title || title.length > 255)
    fail(400, "INVALID_HOME_ITEM", "제목을 입력해 주세요(255자 이내).");
  const body = text("body", 50000),
    summary = text("summary", 1000),
    linkUrl = text("linkUrl", 500);
  validateEditorialLink(kind, linkUrl);
  const status = input.status ?? "draft",
    audience = input.audience ?? "members";
  if (
    !["draft", "published", "archived"].includes(String(status)) ||
    !["public", "members"].includes(String(audience))
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
  if (!w || w.communityStatus !== "active")
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
    `SELECT ${COLUMNS} FROM cms_contents WHERE ${SCOPE} AND ${eligible} AND ${visibility} AND id=$2`,
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
  const base = `FROM forum_post p JOIN forum_category_requests b ON b.id=p.forum_id
    WHERE b.service_code='community' AND b.organization_id IS NULL AND b.status='completed'
    AND p.organization_id IS NULL AND p.is_organization_exclusive=false AND p.status='publish'
    AND (b.forum_type='open' OR EXISTS(SELECT 1 FROM forum_category_members m WHERE m.forum_category_id=b.id AND m.user_id=$1))`;
  const fields = `p.id,p.slug,p.title,p.excerpt AS summary,p."isPinned",p.created_at AS "createdAt",b.name AS "boardName"`;
  const pinned = await db.query(
    `SELECT ${fields} ${base} AND p."isPinned"=true ORDER BY p.updated_at DESC,p.id LIMIT 2`,
    [user!.id],
  );
  const recent = await db.query(
    `SELECT ${fields} ${base} AND NOT(p.id=ANY($2::uuid[])) ORDER BY p.created_at DESC,p.id LIMIT 10`,
    [user!.id, pinned.map((p: { id: string }) => p.id)],
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
) {
  await requireCommunityManager(db, actor);
  return db.query(
    `SELECT ${COLUMNS} FROM cms_contents WHERE ${SCOPE} AND metadata->>'kind'=$1 ORDER BY "isPinned" DESC,"sortOrder","createdAt" DESC,id LIMIT 200`,
    [kind],
  );
}
/** Scope lock serializes the two-slot check and writes without a new schema. */
export async function saveEditorial(
  db: Exec,
  actor: string,
  id: string | null,
  input: Record<string, unknown>,
) {
  await requireCommunityManager(db, actor);
  const item = parseEditorial(input);
  await db.query(
    "SELECT pg_advisory_xact_lock(hashtext('community-editorial'))",
  );
  if (id) {
    homeUuid(id);
    const [existing] = await db.query(
      `SELECT id,metadata->>'kind' AS kind FROM cms_contents WHERE ${SCOPE} AND id=$1 FOR UPDATE`,
      [id],
    );
    if (!existing || existing.kind !== item.kind)
      fail(
        404,
        "HOME_ITEM_NOT_FOUND",
        "같은 분류의 커뮤니티 항목을 선택해 주세요.",
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
export async function pinHomeForum(
  db: Exec,
  actor: string,
  id: string,
  pinned: unknown,
) {
  await requireCommunityManager(db, actor);
  homeUuid(id);
  if (typeof pinned !== "boolean")
    fail(400, "INVALID_HOME_ITEM", "상시 노출 설정을 확인해 주세요.");
  await db.query(
    "SELECT pg_advisory_xact_lock(hashtext('community-forum-home-pins'))",
  );
  const scope = `forum_id IN(SELECT id FROM forum_category_requests WHERE service_code='community' AND organization_id IS NULL AND status='completed') AND organization_id IS NULL AND is_organization_exclusive=false AND status='publish'`;
  const [post] = await db.query(
    `SELECT id FROM forum_post WHERE ${scope} AND id=$1 FOR UPDATE`,
    [id],
  );
  if (!post)
    fail(404, "HOME_ITEM_NOT_FOUND", "게시된 커뮤니티 글을 선택해 주세요.");
  if (pinned) {
    const rows = await db.query(
      `SELECT id FROM forum_post WHERE ${scope} AND "isPinned"=true AND id<>$1`,
      [id],
    );
    if (rows.length >= 2)
      fail(409, "HOME_PIN_LIMIT", "포럼 상시 노출은 최대 2개입니다.");
  }
  await db.query(
    'UPDATE forum_post SET "isPinned"=$2,updated_at=NOW() WHERE id=$1',
    [id, pinned],
  );
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
