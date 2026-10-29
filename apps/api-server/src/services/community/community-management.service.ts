import { assertCentralOperationMenu } from '../admin/central-operation-menu-grants.js';
import { OperationError } from '../operations/operation-audit.js';
import { createHash } from 'node:crypto';
import type { EntityManager } from 'typeorm';
import { hasCommunityServiceOperator } from './community-service-operator-access.js';

type Exec = Pick<EntityManager, 'query'>;
export class CommunityManagementError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) { super(message); }
}
const fail = (status: number, code: string, message: string): never => { throw new CommunityManagementError(status, code, message); };
const uuid = /^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
export async function requireCommunityManager(db: Exec, actor: string, admin = false, area: string | string[] = 'boards') {
  if (!await hasCommunityServiceOperator(db, actor, admin)) fail(403, admin ? 'COMMUNITY_ADMIN_REQUIRED' : 'COMMUNITY_OPERATOR_REQUIRED', '커뮤니티 서비스의 활성 운영 권한이 필요합니다.');
  try { await assertCentralOperationMenu(db,actor,'community',(Array.isArray(area) ? area : [area]).map(key => `community.${key}`)); } catch(error) { if(error instanceof OperationError) fail(error.status,error.code,error.message); throw error; }
}
async function audit(db: Exec, actor: string, action: string, meta: unknown) {
  await db.query(`INSERT INTO action_logs(service_key,user_id,action_key,source,status,meta)
    VALUES('community',$1,$2,'manual','success',$3::jsonb)`, [actor, action, JSON.stringify(meta)]);
}
export async function listManagedCommunityBoards(db: Exec, actor: string) {
  await requireCommunityManager(db, actor, false, ['boards','erase-boards']);
  return db.query(`SELECT id,name,status FROM forum_category_requests
    WHERE service_code='community' AND organization_id IS NULL AND status IN ('completed','archived') ORDER BY name,id`);
}
export async function setCommunityBoardStatus(db: Exec, actor: string, id: string, status: unknown) {
  await requireCommunityManager(db, actor);
  if (!uuid.test(id) || (typeof status !== 'string' || !['completed', 'archived'].includes(status))) fail(400, 'INVALID_BOARD_STATUS', '게시판과 이용 상태를 확인해 주세요.');
  const [board] = await db.query(`SELECT id,status FROM forum_category_requests WHERE id=$1 AND service_code='community'
    AND organization_id IS NULL AND status IN ('completed','archived') FOR UPDATE`, [id]);
  if (!board) fail(404, 'BOARD_NOT_FOUND', '게시판을 찾을 수 없습니다.');
  await db.query('UPDATE forum_category_requests SET status=$2,updated_at=NOW() WHERE id=$1', [id, status]);
  await audit(db, actor, 'community:board_status', { boardId: id, from: board.status, to: status });
  return { id, status };
}

// Fixed service predicates: never accept service codes, SQL or target scopes from the caller.
const boards = `SELECT id FROM forum_category_requests WHERE service_code='community' AND organization_id IS NULL`;
const servicePosts = `SELECT id FROM forum_post WHERE forum_id IN (${boards}) AND organization_id IS NULL AND is_organization_exclusive=false`;
const serviceComments = `SELECT id FROM forum_comment WHERE "postId" IN (${servicePosts})`;
const tables = ['forum_notifications','forum_like','forum_bookmark','forum_post_like','forum_comment','forum_category_members','forum_join_requests','forum_post','forum_category_requests','service_memberships','role_assignments'] as const;
type Table = typeof tables[number];
type Selection = Record<Table, string[]>;
export type CommunityDeletionKind = 'boards' | 'members';

interface DeletionTarget { target: unknown; blockers: string[] }
async function boardDeletionTarget(db: Exec, id: string): Promise<DeletionTarget> {
  const blockers: string[] = [];
  const [board] = await db.query(`SELECT * FROM forum_category_requests WHERE id=$1 AND service_code='community' AND organization_id IS NULL`, [id]);
  if (!board) fail(404, 'BOARD_NOT_FOUND', '게시판을 찾을 수 없습니다.');

  if (board.status !== 'archived') blockers.push('게시판을 먼저 운영 중지해 주세요.');
  return { target: board, blockers };
}
async function memberDeletionTarget(db: Exec, actor: string, id: string): Promise<DeletionTarget> {
  const blockers: string[] = [];
  const [member] = await db.query(`SELECT * FROM service_memberships WHERE user_id=$1 AND service_key='community'`, [id]);
  if (!member) fail(404, 'MEMBER_NOT_FOUND', '커뮤니티 회원을 찾을 수 없습니다.');

  if (!['suspended','withdrawn','rejected'].includes(member.status)) blockers.push('회원 이용을 먼저 정지하거나 탈퇴 처리해 주세요.');
  if (actor === id) blockers.push('자신의 서비스 데이터를 삭제할 수 없습니다.');
  // Expired grants cannot confer authority again; preserve their history without blocking data deletion.
  // Non-expired future grants remain protected: only central management may cancel a reserved operational role.
  const roles = await db.query(`SELECT id FROM role_assignments WHERE user_id=$1 AND is_active=true
    AND (valid_until IS NULL OR valid_until>=CURRENT_TIMESTAMP) AND role IN ('community:admin','community:operator')`, [id]);
  if (roles.length) blockers.push('중앙 관리에서 현재 또는 예약된 커뮤니티 운영 역할을 먼저 회수해 주세요.');
  const owned = await db.query(`SELECT f.id FROM forum_category_requests f WHERE f.id IN (${boards}) AND status IN ('completed','archived')
    AND (requester_id=$1 OR EXISTS (SELECT 1 FROM forum_category_members m WHERE m.forum_category_id=f.id AND m.user_id=$1 AND m.role='owner'))`, [id]);
  if (owned.length) blockers.push('소유 게시판을 먼저 정리하거나 소유권을 이전해 주세요.');
  return { target: member, blockers };
}

function deletionScope(kind: CommunityDeletionKind) {
  if (kind === 'boards') {
    const posts = 'SELECT id FROM forum_post WHERE forum_id=$1';
    const comments = `SELECT id FROM forum_comment WHERE "postId" IN (${posts})`;
    const predicates: Record<Table,string> = {
      forum_notifications: `t."postId" IN (${posts}) OR t."commentId" IN (${comments})`,
      forum_like: `(t."targetType"='post' AND t."targetId" IN (${posts})) OR (t."targetType"='comment' AND t."targetId" IN (${comments}))`,
      forum_bookmark: `t."postId" IN (${posts})`, forum_post_like: `t.post_id IN (${posts})`,
      forum_comment: `t.id IN (${comments})`, forum_category_members: 't.forum_category_id=$1',
      forum_join_requests: 't.forum_category_id=$1', forum_post: `t.id IN (${posts})`, forum_category_requests: 't.id=$1',
      service_memberships: 'false AND $1::uuid IS NOT NULL', role_assignments: 'false AND $1::uuid IS NOT NULL',
    };
    return { posts, predicates };
  }
  const posts = `SELECT id FROM forum_post WHERE id IN (${servicePosts}) AND author_id=$1`;
  const comments = `WITH RECURSIVE selected AS (SELECT id FROM forum_comment WHERE id IN (${serviceComments}) AND (author_id=$1 OR "postId" IN (${posts}))
    UNION SELECT c.id FROM forum_comment c JOIN selected s ON c."parentId"=s.id WHERE c.id IN (${serviceComments})) SELECT id FROM selected`;
  const predicates: Record<Table,string> = {
    forum_notifications: `t."postId" IN (${posts}) OR t."commentId" IN (${comments}) OR ((t."userId"=$1 OR t."actorId"=$1) AND (t."postId" IN (${servicePosts}) OR t."commentId" IN (${serviceComments})))`,
    forum_like: `(t."targetType"='post' AND t."targetId" IN (${posts})) OR (t."targetType"='comment' AND t."targetId" IN (${comments})) OR (t."userId"=$1 AND ((t."targetType"='post' AND t."targetId" IN (${servicePosts})) OR (t."targetType"='comment' AND t."targetId" IN (${serviceComments}))))`,
    forum_bookmark: `t."postId" IN (${posts}) OR (t."userId"=$1 AND t."postId" IN (${servicePosts}))`,
    forum_post_like: `t.post_id IN (${posts}) OR (t.user_id=$1 AND t.post_id IN (${servicePosts}))`,
    forum_comment: `t.id IN (${comments})`, forum_category_members: `t.user_id=$1 AND t.forum_category_id IN (${boards})`,
    forum_join_requests: `t.user_id=$1 AND t.forum_category_id IN (${boards})`, forum_post: `t.id IN (${posts})`,
    forum_category_requests: `t.requester_id=$1 AND t.id IN (${boards}) AND t.status NOT IN ('completed','archived')`,
    service_memberships: `t.user_id=$1 AND t.service_key='community'`,
    role_assignments: `t.user_id=$1 AND t.role LIKE 'community:%' AND t.role NOT IN ('community:admin','community:operator')`,
  };
  return { posts, predicates };
}

async function selectDeletionRows(db: Exec, id: string, predicates: Record<Table,string>) {
  // Independent reads share the transaction snapshot; hashing below retains the fixed table order.
  const entries = await Promise.all(tables.map(async table => ({ table,
    rows: await db.query(`SELECT t.id,to_jsonb(t) AS value FROM ${table} t WHERE ${predicates[table]} ORDER BY t.id`, [id]),
  })));
  const selection = {} as Selection;
  const counts: Record<string,number> = {};
  let hasMedia = false;
  for (const {table,rows} of entries) {
    selection[table] = rows.map((row: {id: string}) => row.id);
    counts[table] = rows.length;
    if (['forum_post','forum_comment','forum_category_requests'].includes(table)
      && rows.some((row: {value: unknown}) => /(storage.googleapis.com|\/uploads\/|gs:\/\/)/i.test(JSON.stringify(row.value)))) hasMedia = true;
  }
  return { selection, counts, entries, hasMedia };
}

interface ForeignReference { schema: string; child: string; parent: Table; column: string; columns: number }
const quote = (value: string) => '"' + value.replaceAll('"','""') + '"';
async function foreignReferenceBlocker(db: Exec, schema: string, selection: Selection, fk: ForeignReference): Promise<string | undefined> {
  const parentIds = selection[fk.parent];
  if (!parentIds?.length) return;
  if (fk.columns !== 1) return '복합 연결 데이터의 별도 검토가 필요합니다.';
  const knownChild = fk.schema === schema && tables.includes(fk.child as Table);
  const childIds = knownChild ? selection[fk.child as Table] : [];
  const restriction = knownChild ? 'AND NOT(id=ANY($2::uuid[]))' : 'AND $2::uuid[] IS NOT NULL';
  const [outside] = await db.query(`SELECT count(*)::int AS n FROM ${quote(fk.schema)}.${quote(fk.child)} WHERE ${quote(fk.column)}=ANY($1::uuid[]) ${restriction}`, [parentIds, childIds]);
  if (outside.n) return '삭제 범위 밖의 연결 데이터가 있어 별도 검토가 필요합니다.';
}
async function deletionBoundaryBlockers(db: Exec, kind: CommunityDeletionKind, id: string, posts: string, selection: Selection) {
  const blockers: string[] = [];
  // Organization-owned or media-bearing data needs separate review; never erase shared objects by URL.
  const excluded = await db.query(`SELECT id FROM forum_post WHERE id IN (${posts}) AND (organization_id IS NOT NULL OR is_organization_exclusive=true)`, [id]);
  if (kind === 'members') {
    const organizationActivity = await db.query(`WITH scoped_boards AS (
      SELECT id,organization_id,requester_id FROM forum_category_requests WHERE service_code='community'
    ), organization_posts AS (
      SELECT p.id,p.author_id FROM forum_post p JOIN scoped_boards b ON b.id=p.forum_id
      WHERE b.organization_id IS NOT NULL OR p.organization_id IS NOT NULL OR p.is_organization_exclusive=true
    ), organization_comments AS (
      SELECT c.id,c.author_id FROM forum_comment c WHERE c."postId" IN (SELECT id FROM organization_posts)
    ), activity AS (
      SELECT requester_id AS user_id FROM scoped_boards WHERE organization_id IS NOT NULL
      UNION ALL SELECT author_id FROM organization_posts
      UNION ALL SELECT author_id FROM organization_comments
      UNION ALL SELECT user_id FROM forum_post_like WHERE post_id IN (SELECT id FROM organization_posts)
      UNION ALL SELECT "userId" FROM forum_like WHERE ("targetType"='post' AND "targetId" IN (SELECT id FROM organization_posts))
        OR ("targetType"='comment' AND "targetId" IN (SELECT id FROM organization_comments))
      UNION ALL SELECT "userId" FROM forum_bookmark WHERE "postId" IN (SELECT id FROM organization_posts)
      UNION ALL SELECT "userId" FROM forum_notifications WHERE "postId" IN (SELECT id FROM organization_posts) OR "commentId" IN (SELECT id FROM organization_comments)
      UNION ALL SELECT "actorId" FROM forum_notifications WHERE "postId" IN (SELECT id FROM organization_posts) OR "commentId" IN (SELECT id FROM organization_comments)
      UNION ALL SELECT user_id FROM forum_category_members WHERE forum_category_id IN (SELECT id FROM scoped_boards WHERE organization_id IS NOT NULL)
      UNION ALL SELECT user_id FROM forum_join_requests WHERE forum_category_id IN (SELECT id FROM scoped_boards WHERE organization_id IS NOT NULL)
    ) SELECT 1 FROM activity WHERE user_id=$1 LIMIT 1`, [id]);
    if (organizationActivity.length) blockers.push('조직 귀속 활동의 별도 검토가 필요합니다.');
  }
  if (excluded.length) blockers.push('조직 귀속 콘텐츠의 소유·보존 범위를 먼저 검토해 주세요.');
  // Any FK reference outside the exact deletion selection blocks even ON DELETE CASCADE.
  const references = await db.query(`SELECT ns.nspname AS schema,c.relname AS child,p.relname AS parent,a.attname AS column,array_length(fk.conkey,1) AS columns
    FROM pg_constraint fk JOIN pg_class c ON c.oid=fk.conrelid JOIN pg_namespace ns ON ns.oid=c.relnamespace
    JOIN pg_class p ON p.oid=fk.confrelid JOIN pg_namespace pn ON pn.oid=p.relnamespace
    JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=fk.conkey[1]
    JOIN pg_attribute b ON b.attrelid=p.oid AND b.attnum=fk.confkey[1]
    WHERE fk.contype='f' AND pn.nspname=current_schema() AND p.relname=ANY($1::text[]) AND (b.attname='id' OR array_length(fk.conkey,1)>1)`, [[...tables]]);
  const schema = (await db.query('SELECT current_schema() AS name'))[0].name;
  const referenceReasons = await Promise.all(references.map((fk: ForeignReference) => foreignReferenceBlocker(db, schema, selection, fk)));
  blockers.push(...referenceReasons.filter((reason): reason is string => !!reason));
  return blockers;
}

/** Plan and apply use the same scope, content snapshot and external-reference checks. */
async function deletionSnapshot(db: Exec, actor: string, kind: CommunityDeletionKind, id: string) {
  await requireCommunityManager(db, actor, true, `erase-${kind}`);
  if (!uuid.test(id)) fail(400, 'INVALID_RESOURCE_ID', '대상을 확인해 주세요.');
  const {target,blockers} = kind === 'boards' ? await boardDeletionTarget(db,id) : await memberDeletionTarget(db,actor,id);
  const {posts,predicates} = deletionScope(kind);
  const {selection,counts,entries,hasMedia} = await selectDeletionRows(db,id,predicates);
  if (hasMedia) blockers.push('첨부 자료의 소유·보존 범위를 먼저 검토해 주세요.');
  blockers.push(...await deletionBoundaryBlockers(db,kind,id,posts,selection));
  const reasons = [...new Set(blockers)].sort((a,b) => a.localeCompare(b,'ko'));
  const hash = createHash('sha256').update(JSON.stringify([actor,kind,id,target]));
  for (const {table,rows} of entries) hash.update(JSON.stringify([table,rows]));
  hash.update(JSON.stringify(reasons));
  return { selection, plan: {kind,id,counts,blockers:reasons,digest:hash.digest('hex')} };
}
export async function planCommunityDeletion(db: Exec, actor: string, kind: CommunityDeletionKind, id: string) {
  return (await deletionSnapshot(db, actor, kind, id)).plan;
}
interface CommunityCounters { affected: {id:string}[]; parents: {id:string}[]; commentLikes: {id:string; n:number}[] }
async function captureCommunityCounters(db: Exec, id: string, selection: Selection): Promise<CommunityCounters> {
  const affected = await db.query(`SELECT DISTINCT "postId" AS id FROM forum_comment WHERE id=ANY($1::uuid[])
    UNION SELECT post_id AS id FROM forum_post_like WHERE id=ANY($2::uuid[])
    UNION SELECT "targetId" AS id FROM forum_like WHERE id=ANY($3::uuid[]) AND "targetType"='post'
    UNION SELECT id FROM forum_post WHERE id IN (${servicePosts}) AND last_comment_by=$4`, [selection.forum_comment, selection.forum_post_like, selection.forum_like, id]);
  const parents = await db.query(`SELECT DISTINCT "parentId" AS id FROM forum_comment
    WHERE id=ANY($1::uuid[]) AND "parentId" IS NOT NULL`, [selection.forum_comment]);
  const commentLikes = await db.query(`SELECT "targetId" AS id,count(*)::int AS n FROM forum_like
    WHERE id=ANY($1::uuid[]) AND "targetType"='comment' GROUP BY "targetId"`, [selection.forum_like]);
  return {affected,parents,commentLikes};
}
async function deleteSelectedTable(db: Exec, table: Table, ids: string[]) {
  if (!ids.length) return;
  const removed = await db.query(`DELETE FROM ${table} WHERE id=ANY($1::uuid[]) RETURNING id`, [ids]);
  const removedRows = Array.isArray(removed[0]) ? removed[0] : removed;
  if (removedRows.length !== ids.length) fail(409, 'DELETION_PLAN_CHANGED', '연결 데이터가 변경되었습니다. 삭제 범위를 다시 확인해 주세요.');
}
async function refreshCommunityCounters(db: Exec, counters: CommunityCounters) {
  const {affected,parents,commentLikes} = counters;
  if (affected.length) await db.query(`UPDATE forum_post p SET "commentCount"=(SELECT count(*) FROM forum_comment c WHERE c."postId"=p.id AND c.status='publish'),
    "likeCount"=(SELECT count(*) FROM (
      SELECT l.user_id FROM forum_post_like l WHERE l.post_id=p.id
      UNION SELECT l."userId" FROM forum_like l WHERE l."targetType"='post' AND l."targetId"=p.id
    ) post_likers),
    (last_comment_at,last_comment_by)=(SELECT c.created_at,c.author_id FROM forum_comment c WHERE c."postId"=p.id AND c.status='publish' ORDER BY c.created_at DESC,c.id DESC LIMIT 1)
    WHERE p.id=ANY($1::uuid[])`, [affected.map((p: {id: string}) => p.id)]);
  if (parents.length) await db.query(`UPDATE forum_comment c SET "replyCount"=(SELECT count(*) FROM forum_comment r WHERE r."parentId"=c.id AND r.status='publish')
    WHERE c.id=ANY($1::uuid[]) AND c."postId" IN (${servicePosts})`, [parents.map((c: {id: string}) => c.id)]);
  if (commentLikes.length) await db.query(`UPDATE forum_comment c SET "likeCount"=GREATEST(0,c."likeCount"-delta.n)
    FROM unnest($1::uuid[],$2::int[]) AS delta(id,n) WHERE c.id=delta.id`, [commentLikes.map(c=>c.id),commentLikes.map(c=>c.n)]);
}
export async function applyCommunityDeletion(db: Exec, actor: string, kind: CommunityDeletionKind, id: string, expectedDigest: unknown) {
  if (typeof expectedDigest !== 'string' || !/^[a-f\d]{64}$/.test(expectedDigest)) fail(400, 'DELETION_PLAN_REQUIRED', '삭제 범위를 먼저 확인해 주세요.');
  const {selection,plan} = await deletionSnapshot(db,actor,kind,id);
  if (plan.digest !== expectedDigest) fail(409, 'DELETION_PLAN_CHANGED', '데이터가 변경되었습니다. 삭제 범위를 다시 확인해 주세요.');
  if (plan.blockers.length) fail(409, 'DELETION_BLOCKED', plan.blockers.join(' '));
  const counters = kind === 'members' ? await captureCommunityCounters(db,id,selection) : {affected:[],parents:[],commentLikes:[]};
  // Leaves must be removed before their roots; chain promises to preserve that order.
  await tables.reduce((previous,table) => previous.then(() => deleteSelectedTable(db,table,selection[table])), Promise.resolve());
  await refreshCommunityCounters(db,counters);
  await audit(db,actor,'community:permanent_delete',{kind,targetId:id,counts:plan.counts,digest:plan.digest});
  return {...plan,applied:true};
}
