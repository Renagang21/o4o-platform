import type { EntityManager } from 'typeorm';
import { resolveCommunityWorkspace, type CommunityWorkspace } from './community-workspace.service.js';
import type { CommunityAccessUser } from '../../utils/community-access.resolver.js';
import { PUBLIC_READ_KEY, signPublicReadDesignation, hasAuthenticPublicReadDesignation } from './community-public-read-metadata.js';

type Exec = Pick<EntityManager, 'query'>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type PublicReadMode = 'private' | 'board' | 'selected';
export class CommunityPublicReadError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) { super(message); }
}

export function parsePublicReadInput(input: { mode?: unknown; postIds?: unknown }) {
  if (typeof input.mode !== 'string' || !['private', 'board', 'selected'].includes(input.mode)) {
    throw new CommunityPublicReadError(400, 'INVALID_PUBLIC_READ_MODE', '공개 범위를 선택해 주세요.');
  }
  const mode = input.mode as PublicReadMode;
  const ids = input.postIds ?? [];
  if (!Array.isArray(ids) || ids.length > 100 || ids.some(id => typeof id !== 'string' || !UUID.test(id))) {
    throw new CommunityPublicReadError(400, 'INVALID_PUBLIC_POST_IDS', '유효한 게시글을 최대 100개 선택해 주세요.');
  }
  if (mode !== 'selected' && ids.length) {
    throw new CommunityPublicReadError(400, 'INVALID_PUBLIC_POST_IDS', '선택 공개에서만 게시글을 지정할 수 있습니다.');
  }
  return { mode, postIds: [...new Set((ids as string[]).map(id => id.toLowerCase()))] };
}

async function workspace(exec: Exec, key: string, user: CommunityAccessUser | null, manage = false): Promise<CommunityWorkspace> {
  const value = await resolveCommunityWorkspace(exec, user, key);
  if (!value || value.kind !== 'independent' || value.communityStatus !== 'active' || !value.forumStorageCodes.length) {
    throw new CommunityPublicReadError(404, 'COMMUNITY_NOT_FOUND', '커뮤니티를 찾을 수 없습니다.');
  }
  if (manage && (!value.allowed || !value.canManage)) {
    throw new CommunityPublicReadError(403, 'COMMUNITY_OPERATOR_REQUIRED', '해당 커뮤니티 운영자만 공개 범위를 변경할 수 있습니다.');
  }
  return value;
}

async function verifiedPublicBoards(exec: Exec, value: CommunityWorkspace) {
  const rows = await exec.query(`SELECT id, metadata->'${PUBLIC_READ_KEY}' AS "designation"
    FROM forum_category_requests WHERE service_code = ANY($1::text[]) AND organization_id IS NULL
      AND status = 'completed' AND forum_type = 'open'
      AND metadata->'${PUBLIC_READ_KEY}'->>'mode' IN ('board','selected')`, [value.forumStorageCodes]);
  return rows.filter((row: { id: string; designation: unknown }) =>
    hasAuthenticPublicReadDesignation(value.communityKey, row.id, row.designation, process.env.JWT_SECRET))
    .map((row: { id: string }) => row.id);
}

// This predicate is identical for list and direct UUID/slug detail. No role bypass.
const PUBLIC_POST = `b.service_code = ANY($1::text[]) AND b.id = ANY($2::uuid[])
  AND b.organization_id IS NULL AND b.status = 'completed' AND b.forum_type = 'open'
  AND p.organization_id IS NULL AND p.is_organization_exclusive = false AND p.status = 'publish'
  AND ((b.metadata->'${PUBLIC_READ_KEY}'->>'mode') = 'board'
    OR ((b.metadata->'${PUBLIC_READ_KEY}'->>'mode') = 'selected'
      AND jsonb_typeof(b.metadata->'${PUBLIC_READ_KEY}'->'postIds') = 'array'
      AND (b.metadata->'${PUBLIC_READ_KEY}'->'postIds') ? p.id::text))`;
const PUBLIC_FIELDS = `p.id, p.slug, p.title, p.excerpt, p.type, p."isPinned", p.created_at AS "createdAt",
  b.name AS "boardName"`;
const publicFields = (p: Record<string, unknown>) => ({ id: p.id, slug: p.slug, title: p.title, excerpt: p.excerpt,
  type: p.type, isPinned: p.isPinned, createdAt: p.createdAt, boardName: p.boardName });

export async function listPublicCommunityPosts(exec: Exec, key: string, page: number) {
  const value = await workspace(exec, key, null);
  const boardIds = await verifiedPublicBoards(exec, value);
  if (!boardIds.length) return { name: value.name, items: [], hasNext: false, page };
  const items = await exec.query(`SELECT ${PUBLIC_FIELDS}
    FROM forum_post p JOIN forum_category_requests b ON b.id = p.forum_id
    WHERE ${PUBLIC_POST} ORDER BY p."isPinned" DESC, p.created_at DESC, p.id
    LIMIT 21 OFFSET $3`, [value.forumStorageCodes, boardIds, (page - 1) * 20]);
  return { name: value.name, items: items.slice(0, 20).map(publicFields), hasNext: items.length > 20, page };
}

export async function getPublicCommunityPost(exec: Exec, key: string, idOrSlug: string) {
  const value = await workspace(exec, key, null);
  const boardIds = await verifiedPublicBoards(exec, value);
  if (!boardIds.length) throw new CommunityPublicReadError(404, 'PUBLIC_POST_NOT_FOUND', '공개된 게시글을 찾을 수 없습니다.');
  const [post] = await exec.query(`SELECT ${PUBLIC_FIELDS}, p.content
    FROM forum_post p JOIN forum_category_requests b ON b.id = p.forum_id
    WHERE ${PUBLIC_POST} AND ${UUID.test(idOrSlug) ? 'p.id = $3::uuid' : 'p.slug = $3'} LIMIT 1`,
  [value.forumStorageCodes, boardIds, idOrSlug]);
  if (!post) throw new CommunityPublicReadError(404, 'PUBLIC_POST_NOT_FOUND', '공개된 게시글을 찾을 수 없습니다.');
  return { name: value.name, post: { ...publicFields(post), content: post.content } };
}

export async function listCommunityPublicReadSettings(exec: Exec, key: string, user: CommunityAccessUser) {
  const value = await workspace(exec, key, user, true);
  const boards = await exec.query(`SELECT id, name, forum_type AS "forumType",
    COALESCE(metadata->'${PUBLIC_READ_KEY}', '{"mode":"private","postIds":[]}'::jsonb) AS "publicRead"
    FROM forum_category_requests WHERE service_code = ANY($1::text[]) AND organization_id IS NULL
      AND status = 'completed' ORDER BY name, id`, [value.forumStorageCodes]);
  // Bounded chooser per board; no content, author/profile or member data in this response.
  const posts = await exec.query(`SELECT p.id, p.title, b.id AS "forumId", p.created_at AS "createdAt"
    FROM forum_category_requests b
    JOIN LATERAL (
      SELECT id, title, created_at FROM forum_post WHERE forum_id = b.id
        AND status = 'publish' AND organization_id IS NULL AND is_organization_exclusive = false
      ORDER BY created_at DESC, id LIMIT 100
    ) p ON true
    WHERE b.service_code = ANY($1::text[]) AND b.status = 'completed' AND b.organization_id IS NULL
      AND b.forum_type = 'open'
    ORDER BY b.id, p.created_at DESC, p.id`, [value.forumStorageCodes]);
  return { boards: boards.map((board: { id: string; forumType: string; publicRead: unknown }) => ({ ...board,
    publicRead: board.forumType === 'open' && hasAuthenticPublicReadDesignation(value.communityKey, board.id, board.publicRead, process.env.JWT_SECRET)
      ? board.publicRead : { mode: 'private', postIds: [] },
  })), posts };
}

/** Call inside a transaction. Scope and row locks precede any metadata change. */
export async function setCommunityPublicRead(exec: Exec, key: string, user: CommunityAccessUser, boardId: string, input: { mode?: unknown; postIds?: unknown }) {
  if (!UUID.test(boardId)) throw new CommunityPublicReadError(400, 'INVALID_BOARD_ID', '유효한 게시판을 선택해 주세요.');
  const selection = parsePublicReadInput(input);
  const value = await workspace(exec, key, user, true);
  const [board] = await exec.query(`SELECT id, forum_type AS "forumType", metadata->'${PUBLIC_READ_KEY}' AS "publicRead" FROM forum_category_requests
    WHERE id = $1::uuid AND service_code = ANY($2::text[]) AND status = 'completed'
      AND organization_id IS NULL FOR UPDATE`, [boardId, value.forumStorageCodes]);
  if (!board) throw new CommunityPublicReadError(404, 'BOARD_NOT_FOUND', '게시판을 찾을 수 없습니다.');
  if (board.forumType !== 'open' && selection.mode !== 'private') {
    throw new CommunityPublicReadError(400, 'CLOSED_BOARD_PRIVATE', '폐쇄 게시판은 비로그인 공개할 수 없습니다.');
  }
  // A stale retained selection must not prevent withdrawing another post.
  // Only an authentic current designation can supply retained IDs; newly added IDs
  // still require a published, non-organization post in this same board.
  const previous = hasAuthenticPublicReadDesignation(value.communityKey, boardId, board.publicRead, process.env.JWT_SECRET)
    && board.publicRead.mode === 'selected' ? new Set<string>(board.publicRead.postIds) : new Set<string>();
  const addedIds = selection.postIds.filter(id => !previous.has(id));
  if (addedIds.length) {
    const valid = await exec.query(`SELECT id FROM forum_post WHERE id = ANY($1::uuid[])
      AND forum_id = $2::uuid AND status = 'publish' AND organization_id IS NULL
      AND is_organization_exclusive = false FOR SHARE`, [addedIds, boardId]);
    if (valid.length !== addedIds.length) {
      throw new CommunityPublicReadError(400, 'INVALID_PUBLIC_POST_IDS', '게시판 안의 게시된 글만 공개할 수 있습니다.');
    }
  }
  const designation = { ...selection, designatedBy: user.id, designatedAt: new Date().toISOString() };
  // Existing production JWT signing material; no new credential or insecure fallback.
  const signingKey = process.env.JWT_SECRET;
  if (selection.mode !== 'private' && !signingKey?.trim()) {
    throw new CommunityPublicReadError(503, 'PUBLIC_READ_UNAVAILABLE', '공개 설정을 저장할 수 없습니다. 잠시 후 다시 시도해 주세요.');
  }
  const setting = signingKey?.trim() ? signPublicReadDesignation(value.communityKey, boardId, designation, signingKey) : designation;
  await exec.query(`UPDATE forum_category_requests SET metadata =
    jsonb_set(COALESCE(metadata, '{}'::jsonb), '{${PUBLIC_READ_KEY}}', $2::jsonb, true), updated_at = NOW()
    WHERE id = $1::uuid`, [boardId, JSON.stringify(setting)]);
  return selection;
}

/** Home preview keeps pinned slots separate from the ten latest readable posts. */
export async function publicCommunityHomePosts(exec: Exec) {
  const value = await workspace(exec, 'community', null);
  const boardIds = await verifiedPublicBoards(exec, value);
  if (!boardIds.length) return { pinned: [], recent: [] };
  const base = `FROM forum_post p JOIN forum_category_requests b ON b.id=p.forum_id WHERE ${PUBLIC_POST}`;
  const pinned = await exec.query(`SELECT ${PUBLIC_FIELDS} ${base} AND p."isPinned"=true ORDER BY p.updated_at DESC,p.id LIMIT 2`, [value.forumStorageCodes,boardIds]);
  const recent = await exec.query(`SELECT ${PUBLIC_FIELDS} ${base} AND NOT(p.id=ANY($3::uuid[])) ORDER BY p.created_at DESC,p.id LIMIT 10`, [value.forumStorageCodes,boardIds,pinned.map((p:{id:string})=>p.id)]);
  return { pinned:pinned.map(publicFields), recent:recent.map(publicFields) };
}
