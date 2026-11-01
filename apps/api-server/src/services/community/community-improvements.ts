import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { EntityManager } from 'typeorm';
import type { CommunityAccessUser } from '../../utils/community-access.resolver.js';
import { resolveCommunityWorkspace, createCommunityBoard } from './community-workspace.service.js';
import { requireCommunityManager, CommunityManagementError } from './community-management.service.js';
import { signPublicReadDesignation, hasAuthenticPublicReadDesignation, PUBLIC_READ_KEY } from './community-public-read-metadata.js';
import { centralOperationRoles } from '../admin/central-operation-access.js';
import { centralOperationMenuKeys } from '../admin/central-operation-menu-grants.js';

type Db = Pick<EntityManager, 'query'>;
export const IMPROVEMENT_SLUG = 'o4o-updates-improvements';
export const IMPROVEMENT_KEY = 'o4oImprovementV1';
export const IMPROVEMENT_STATUSES = ['received', 'reviewing', 'needs_info', 'planned', 'completed', 'deferred', 'declined'] as const;
type Status = typeof IMPROVEMENT_STATUSES[number];
type Kind = 'update' | 'bug' | 'suggestion';
interface Reply { text: string; official: boolean; requester?: boolean; state?: Status; updateId?: string; at: string }
interface Entry { kind: Kind; state: Status; body: string; version: number; replies: Reply[] }
interface Row { id: string; title: string; authorId: string; createdAt: string; metadata: Record<string, any> }
const fail = (status: number, code: string, message: string): never => { throw new CommunityManagementError(status, code, message); };
const uuid = /^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
function text(value: unknown, max: number, min = 1) {
  if (typeof value !== 'string' || value.trim().length < min || value.length > max) return fail(400, 'INVALID_IMPROVEMENT_INPUT', '입력 내용과 길이를 확인해 주세요.');
  return value.trim();
}
function forumBody(body: string) {
  // Legacy forum readers interpret paragraph content as HTML; the dedicated surface uses plain text.
  const escaped = body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  return JSON.stringify([{ id: randomUUID(), type: 'paragraph', content: escaped }]);
}
function proof(id: string, value: Entry): string {
  const secret = process.env.JWT_SECRET;
  if (!secret?.trim()) return fail(503, 'IMPROVEMENT_SIGNING_UNAVAILABLE', '공식 포럼 설정을 확인해 주세요.');
  return createHmac('sha256', secret).update('o4o/improvement/v1\0').update(JSON.stringify([id, value.kind, value.state, value.body, value.version, value.replies.map(r => [r.text, r.official, r.requester ?? null, r.state ?? null, r.updateId ?? null, r.at])])).digest('hex');
}
export function improvementMetadata(id: string, value: Entry) { return { [IMPROVEMENT_KEY]: { value, proof: proof(id, value) } }; }
export function readImprovement(row: Row): Entry | null {
  const signed = row.metadata?.[IMPROVEMENT_KEY];
  if (!signed?.value || !Array.isArray(signed.value.replies) || !/^[a-f\d]{64}$/.test(signed.proof ?? '')) return null;
  const expected = Buffer.from(proof(row.id, signed.value), 'hex');
  return timingSafeEqual(expected, Buffer.from(signed.proof, 'hex')) ? signed.value : null;
}
export async function isImprovementBoard(db: Db, id?: string | null) {
  if (!id) return false;
  const [row] = await db.query(`SELECT id FROM forum_category_requests WHERE id=$1 AND service_code='community' AND organization_id IS NULL AND slug=$2`, [id, IMPROVEMENT_SLUG]);
  return !!row;
}
async function board(db: Db, lock = false) {
  const [row] = await db.query(`SELECT id,name,requester_id AS "ownerId",metadata FROM forum_category_requests
    WHERE slug=$1 AND service_code='community' AND organization_id IS NULL AND status='completed' AND forum_type='open' ${lock ? 'FOR UPDATE' : ''}`, [IMPROVEMENT_SLUG]);
  if (!row) return null;
  if (!hasAuthenticPublicReadDesignation('community', row.id, row.metadata?.[PUBLIC_READ_KEY], process.env.JWT_SECRET)) return null;
  return row;
}
async function member(db: Db, user: CommunityAccessUser | null) {
  const space = await resolveCommunityWorkspace(db, user, 'community');
  if (!space?.allowed) return fail(user?.id ? 403 : 401, 'COMMUNITY_ACCESS_REQUIRED', '로그인과 커뮤니티 이용 상태를 확인해 주세요.');
  return space;
}
export async function improvementManager(db: Db, user: CommunityAccessUser | null) {
  if (!user?.id) return false;
  try { await member(db, user); await requireCommunityManager(db, user.id, false, 'forums'); return true; }
  catch (error) { if (error instanceof CommunityManagementError && error.status === 403) return false; throw error; }
}
export async function setupImprovements(db: Db, user: CommunityAccessUser) {
  const space = await member(db, user);
  await requireCommunityManager(db, user.id!, false, 'forums');
  // All setup calls serialize before checking; retry never creates a second official forum.
  await db.query("SELECT pg_advisory_xact_lock(hashtext('o4o/community/improvements'))");
  const existing = await board(db, true);
  if (existing) return { id: existing.id, created: false };
  const [collision] = await db.query('SELECT id FROM forum_category_requests WHERE slug=$1', [IMPROVEMENT_SLUG]);
  if (collision) return fail(409, 'IMPROVEMENT_BOARD_UNAVAILABLE', '기존 공식 포럼의 운영 상태와 공개 설정을 먼저 확인해 주세요.');
  const created = await createCommunityBoard(db, space!, user.id!, { name: 'O4O 업데이트·개선 요청', description: '업데이트 안내, 오류·불편 신고, 기능 개선 제안' });
  const designation = signPublicReadDesignation('community', created.id, { mode: 'board', postIds: [], designatedBy: user.id!, designatedAt: new Date().toISOString() }, process.env.JWT_SECRET!);
  await db.query(`UPDATE forum_category_requests SET slug=$2,metadata=COALESCE(metadata,'{}'::jsonb)||$3::jsonb WHERE id=$1`, [created.id, IMPROVEMENT_SLUG, JSON.stringify({ [PUBLIC_READ_KEY]: designation })]);
  await db.query(`INSERT INTO forum_category_members(forum_category_id,user_id,role) VALUES($1,$2,'owner')`, [created.id, user.id]);
  await audit(db, user.id!, 'improvement.setup', created.id);
  return { id: created.id, created: true };
}
async function audit(db: Db, actor: string, action: string, id: string) {
  await db.query(`INSERT INTO action_logs(service_key,user_id,action_key,source,status,meta) VALUES('community',$1,$2,'manual','success',$3::jsonb)`, [actor, action, JSON.stringify({ postId: id })]);
}
const columns = `p.id,p.title,p.author_id AS "authorId",p.created_at AS "createdAt",p.metadata`;
const published = `p.forum_id=$1 AND p.status='publish' AND p.organization_id IS NULL AND p.is_organization_exclusive=false`;
function publicEntry(row: Row, value: Entry, user: CommunityAccessUser | null) {
  return { id: row.id, title: row.title, createdAt: row.createdAt, ...value, mine: row.authorId === user?.id };
}
export async function listImprovements(db: Db, user: CommunityAccessUser | null, pageInput: unknown, kindInput: unknown, pending = false) {
  // Explicit sanctions apply even to this signed public forum; guests may read its public content.
  if (user?.id) await member(db, user);
  const canManage = await improvementManager(db, user);
  if (pending && !canManage) return fail(403, 'COMMUNITY_OPERATOR_REQUIRED', '담당 운영 권한이 필요합니다.');
  const page = Number(pageInput ?? 1);
  if (!Number.isSafeInteger(page) || page < 1 || page > 10000) return fail(400, 'INVALID_PAGE', '페이지를 확인해 주세요.');
  const kind = kindInput || '';
  if (!['', 'update', 'bug', 'suggestion'].includes(String(kind))) return fail(400, 'INVALID_KIND', '분류를 확인해 주세요.');
  const current = await board(db);
  if (!current) return { ready: false, canManage, items: [], hasMore: false, page };
  const rows: Row[] = await db.query(`SELECT ${columns} FROM forum_post p WHERE ${published}
    AND metadata ? '${IMPROVEMENT_KEY}' AND ($2='' OR metadata->'${IMPROVEMENT_KEY}'->'value'->>'kind'=$2)
    AND (NOT $3 OR (metadata->'${IMPROVEMENT_KEY}'->'value'->>'kind'<>'update' AND metadata->'${IMPROVEMENT_KEY}'->'value'->>'state' IN ('received','reviewing','planned')))
    ORDER BY (metadata->'${IMPROVEMENT_KEY}'->'value'->>'kind'='update') DESC,
      CASE WHEN $3 THEN p.created_at END ASC,p.created_at DESC,p.id DESC LIMIT 21 OFFSET $4`, [current.id, kind, pending, (page - 1) * 20]);
  return { ready: true, canManage, items: rows.slice(0, 20).flatMap(row => { const v = readImprovement(row); return v ? [{ id: row.id, title: row.title, createdAt: row.createdAt, kind: v.kind, state: v.state, version: v.version, mine: row.authorId === user?.id }] : []; }), hasMore: rows.length > 20, page };
}
export async function getImprovement(db: Db, user: CommunityAccessUser | null, id: string) {
  if (!uuid.test(id)) return fail(404, 'IMPROVEMENT_NOT_FOUND', '요청을 찾을 수 없습니다.');
  if (user?.id) await member(db, user);
  const current = await board(db);
  if (!current) return fail(404, 'IMPROVEMENT_NOT_FOUND', '요청을 찾을 수 없습니다.');
  const [row]: Row[] = await db.query(`SELECT ${columns} FROM forum_post p WHERE ${published} AND p.id=$2`, [current.id, id]);
  const value = row && readImprovement(row);
  if (!value) return fail(404, 'IMPROVEMENT_NOT_FOUND', '요청을 찾을 수 없습니다.');
  return { ...publicEntry(row, value, user), canManage: await improvementManager(db, user) };
}
export async function createImprovement(db: Db, user: CommunityAccessUser, input: Record<string, unknown>) {
  await member(db, user);
  const kind = input.kind as Kind;
  if (!['bug', 'suggestion', 'update'].includes(kind)) return fail(400, 'INVALID_KIND', '분류를 선택해 주세요.');
  if (kind === 'update' && !await improvementManager(db, user)) return fail(403, 'COMMUNITY_OPERATOR_REQUIRED', '업데이트 안내는 담당 운영자가 작성합니다.');
  const title = text(input.title, 200), body = text(input.body, 10000, 5);
  const current = await board(db, true);
  if (!current) return fail(409, 'IMPROVEMENT_NOT_READY', '공식 포럼을 먼저 개설해 주세요.');
  const id = input.requestId === undefined ? randomUUID() : String(input.requestId);
  if (!uuid.test(id)) return fail(400, 'INVALID_REQUEST_ID', '요청 식별자를 확인해 주세요.');
  const [prior]: Row[] = await db.query(`SELECT ${columns} FROM forum_post p WHERE p.id=$1`, [id]);
  if (prior) {
    const priorValue = readImprovement(prior);
    if (prior.authorId === user.id && prior.title === title && priorValue?.kind === kind && priorValue.body === body) return { id };
    return fail(409, 'IMPROVEMENT_DUPLICATE_REQUEST', '이 요청은 이미 등록되었습니다. 목록을 확인해 주세요.');
  }
  const value: Entry = { kind, body, state: kind === 'update' ? 'completed' : 'received', version: 1, replies: [] };
  await db.query(`INSERT INTO forum_post(id,forum_id,author_id,title,slug,content,excerpt,type,status,"isPinned","allowComments",metadata,published_at)
    VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8,'publish',$9,false,$10::jsonb,NOW())`,
  [id, current.id, user.id, title, `o4o-improvement-${id}`, forumBody(body), body.slice(0,200), kind === 'update' ? 'announcement' : 'discussion', kind === 'update', JSON.stringify(improvementMetadata(id, value))]);
  await audit(db, user.id!, 'improvement.created', id);
  if (kind !== 'update') await notify(db, user.id!, id, true);
  return { id };
}
export async function replyImprovement(db: Db, user: CommunityAccessUser, id: string, input: Record<string, unknown>, official: boolean) {
  await member(db, user);
  if (!uuid.test(id)) return fail(404, 'IMPROVEMENT_NOT_FOUND', '요청을 찾을 수 없습니다.');
  if (official && !await improvementManager(db, user)) return fail(403, 'COMMUNITY_OPERATOR_REQUIRED', '담당 운영 권한이 필요합니다.');
  const current = await board(db, true);
  if (!current) return fail(404, 'IMPROVEMENT_NOT_FOUND', '요청을 찾을 수 없습니다.');
  const [row]: Row[] = await db.query(`SELECT ${columns} FROM forum_post p WHERE ${published} AND p.id=$2 FOR UPDATE`, [current.id, id]);
  const value = row && readImprovement(row);
  if (!value || value.kind === 'update') return fail(404, 'IMPROVEMENT_NOT_FOUND', '처리할 요청을 찾을 수 없습니다.');
  if (!Number.isSafeInteger(input.version) || input.version !== value.version) return fail(409, 'IMPROVEMENT_CHANGED', '다른 답변이나 상태 변경이 있습니다. 다시 조회해 주세요.');
  const body = text(input.body, 4000);
  if (value.replies.length >= 100) return fail(409, 'IMPROVEMENT_REPLY_LIMIT', '답변 한도에 도달했습니다. 새 문의를 이용해 주세요.');
  const state = official ? input.state as Status : row.authorId === user.id ? 'received' : value.state;
  if (!IMPROVEMENT_STATUSES.includes(state)) return fail(400, 'INVALID_STATE', '처리 상태를 확인해 주세요.');
  let updateId: string | undefined;
  if (official && input.updateUrl) {
    let url: URL;
    try { url = new URL(text(input.updateUrl, 500)); } catch { return fail(400, 'INVALID_UPDATE_LINK', '공식 업데이트 안내 주소를 확인해 주세요.'); }
    const match = /^\/improvements\/([a-f\d-]+)$/.exec(url.pathname);
    if (url.origin !== 'https://community.neture.co.kr' || url.username || url.password || url.search || url.hash || !match || !uuid.test(match[1])) return fail(400, 'INVALID_UPDATE_LINK', '공식 업데이트 안내 주소를 확인해 주세요.');
    const [update]: Row[] = await db.query(`SELECT ${columns} FROM forum_post p WHERE ${published} AND p.id=$2`, [current.id, match[1]]);
    if (!update || readImprovement(update)?.kind !== 'update') return fail(400, 'INVALID_UPDATE_LINK', '이 포럼의 공개 업데이트 안내만 연결할 수 있습니다.');
    updateId = update.id;
  }
  const next: Entry = { ...value, state, version: value.version + 1, replies: [...value.replies, { text: body, official, requester: row.authorId === user.id, ...(official ? { state, ...(updateId ? { updateId } : {}) } : {}), at: new Date().toISOString() }] };
  await db.query(`UPDATE forum_post SET metadata=COALESCE(metadata,'{}'::jsonb)||$2::jsonb,updated_at=NOW() WHERE id=$1`, [id, JSON.stringify(improvementMetadata(id, next))]);
  await audit(db, user.id!, official ? 'improvement.reviewed' : 'improvement.replied', id);
  await notify(db, official ? row.authorId : user.id!, id, !official);
  return { id, version: next.version };
}
async function notify(db: Db, recipientOrActor: string, id: string, reviewers: boolean) {
  const persist = (recipient: string) => db.query(`INSERT INTO notifications("userId","serviceKey",type,title,message,metadata,channel,"isRead") VALUES($1,'community','custom',$2,$3,$4::jsonb,'in_app',false)`,
    [recipient, reviewers ? 'O4O 개선 요청 확인 필요' : 'O4O 개선 요청 답변', '요청의 답변과 처리 상태를 확인해 주세요.', JSON.stringify({ event: reviewers ? 'improvement.requested' : 'improvement.replied', targetUrl: reviewers ? `https://admin.neture.co.kr/operations/community/forums?improvement=${id}` : `https://community.neture.co.kr/improvements/${id}`, ...(reviewers ? { operationMenu: 'community.forums' } : {}) })]);
  if (!reviewers) { await persist(recipientOrActor); return; }
  const recipients: Array<{ id: string }> = await db.query(`SELECT DISTINCT user_id AS id FROM role_assignments WHERE user_id<>$1 AND is_active=true AND role IN ('platform:super_admin','community:admin','community:operator') AND (valid_from IS NULL OR valid_from<=NOW()) AND (valid_until IS NULL OR valid_until>=NOW())`, [recipientOrActor]);
  for (const recipient of recipients) {
    const roles = await centralOperationRoles(db, recipient.id);
    if ((await centralOperationMenuKeys(db, recipient.id, roles)).includes('community.forums') && await improvementManager(db, { id: recipient.id })) await persist(recipient.id);
  }
}

export async function editImprovement(db: Db, user: CommunityAccessUser, id: string, input: Record<string, unknown>) {
  await member(db, user);
  if (!uuid.test(id)) return fail(404, 'IMPROVEMENT_NOT_FOUND', '요청을 찾을 수 없습니다.');
  const current = await board(db, true);
  if (!current) return fail(404, 'IMPROVEMENT_NOT_FOUND', '요청을 찾을 수 없습니다.');
  const [row]: Row[] = await db.query(`SELECT ${columns} FROM forum_post p WHERE ${published} AND p.id=$2 FOR UPDATE`, [current.id, id]);
  const value = row && readImprovement(row);
  if (!value) return fail(404, 'IMPROVEMENT_NOT_FOUND', '요청을 찾을 수 없습니다.');
  if (row.authorId !== user.id) return fail(403, 'IMPROVEMENT_AUTHOR_REQUIRED', '본인 글만 수정할 수 있습니다.');
  if (value.kind === 'update' && !await improvementManager(db, user)) return fail(403, 'COMMUNITY_OPERATOR_REQUIRED', '업데이트 안내는 담당 운영자가 수정합니다.');
  if (input.version !== value.version) return fail(409, 'IMPROVEMENT_CHANGED', '새 답변이나 상태 변경이 있습니다. 다시 조회해 주세요.');
  const title = text(input.title, 200), body = text(input.body, 10000, 5);
  const next: Entry = { ...value, body, state: value.kind === 'update' ? 'completed' : 'received', version: value.version + 1 };
  await db.query(`UPDATE forum_post SET title=$2,content=$3::jsonb,excerpt=$4,metadata=COALESCE(metadata,'{}'::jsonb)||$5::jsonb,updated_at=NOW() WHERE id=$1`,
    [id, title, forumBody(body), body.slice(0,200), JSON.stringify(improvementMetadata(id, next))]);
  await audit(db, user.id!, 'improvement.edited', id);
  if (value.kind !== 'update') await notify(db, user.id!, id, true);
  return { id, version: next.version };
}
