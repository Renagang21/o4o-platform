import type { EntityManager } from 'typeorm';
import { resolveCommunityWorkspace, type CommunityWorkspace } from './community-workspace.service.js';
import type { CommunityAccessUser } from '../../utils/community-access.resolver.js';
import { PUBLIC_READ_KEY } from './community-public-read-metadata.js';

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

// This predicate is identical for list and direct UUID/slug detail. No role bypass.
const PUBLIC_POST = `b.service_code = ANY($1::text[])
  AND b.organization_id IS NULL AND b.status = 'completed' AND b.forum_type = 'open'
  AND p.organization_id IS NULL AND p.is_organization_exclusive = false AND p.status = 'publish'
  AND ((b.metadata->'${PUBLIC_READ_KEY}'->>'mode') = 'board'
    OR ((b.metadata->'${PUBLIC_READ_KEY}'->>'mode') = 'selected'
      AND jsonb_typeof(b.metadata->'${PUBLIC_READ_KEY}'->'postIds') = 'array'
      AND (b.metadata->'${PUBLIC_READ_KEY}'->'postIds') ? p.id::text))`;
const PUBLIC_FIELDS = `p.id, p.slug, p.title, p.excerpt, p.type, p."isPinned", p."createdAt",
  b.name AS "boardName"`;
const publicFields = (p: Record<string, unknown>) => ({ id: p.id, slug: p.slug, title: p.title, excerpt: p.excerpt,
  type: p.type, isPinned: p.isPinned, createdAt: p.createdAt, boardName: p.boardName });

export async function listPublicCommunityPosts(exec: Exec, key: string, page: number) {
  const value = await workspace(exec, key, null);
  const items = await exec.query(`SELECT ${PUBLIC_FIELDS}
    FROM forum_post p JOIN forum_category_requests b ON b.id = p.forum_id
    WHERE ${PUBLIC_POST} ORDER BY p."isPinned" DESC, p."createdAt" DESC, p.id
    LIMIT 21 OFFSET $2`, [value.forumStorageCodes, (page - 1) * 20]);
  return { name: value.name, items: items.slice(0, 20).map(publicFields), hasNext: items.length > 20, page };
}

export async function getPublicCommunityPost(exec: Exec, key: string, idOrSlug: string) {
  const value = await workspace(exec, key, null);
  const [post] = await exec.query(`SELECT ${PUBLIC_FIELDS}, p.content
    FROM forum_post p JOIN forum_category_requests b ON b.id = p.forum_id
    WHERE ${PUBLIC_POST} AND ${UUID.test(idOrSlug) ? 'p.id = $2::uuid' : 'p.slug = $2'} LIMIT 1`,
  [value.forumStorageCodes, idOrSlug]);
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
  const posts = await exec.query(`SELECT p.id, p.title, p.forum_id AS "forumId", p."createdAt"
    FROM forum_post p JOIN forum_category_requests b ON b.id = p.forum_id
    WHERE b.service_code = ANY($1::text[]) AND b.status = 'completed' AND b.organization_id IS NULL
      AND p.status = 'publish' AND p.organization_id IS NULL AND p.is_organization_exclusive = false
    ORDER BY p."createdAt" DESC LIMIT 1000`, [value.forumStorageCodes]);
  return { boards, posts };
}

/** Call inside a transaction. Scope and row locks precede any metadata change. */
export async function setCommunityPublicRead(exec: Exec, key: string, user: CommunityAccessUser, boardId: string, input: { mode?: unknown; postIds?: unknown }) {
  if (!UUID.test(boardId)) throw new CommunityPublicReadError(400, 'INVALID_BOARD_ID', '유효한 게시판을 선택해 주세요.');
  const selection = parsePublicReadInput(input);
  const value = await workspace(exec, key, user, true);
  const [board] = await exec.query(`SELECT id, forum_type AS "forumType" FROM forum_category_requests
    WHERE id = $1::uuid AND service_code = ANY($2::text[]) AND status = 'completed'
      AND organization_id IS NULL FOR UPDATE`, [boardId, value.forumStorageCodes]);
  if (!board) throw new CommunityPublicReadError(404, 'BOARD_NOT_FOUND', '게시판을 찾을 수 없습니다.');
  if (board.forumType !== 'open' && selection.mode !== 'private') {
    throw new CommunityPublicReadError(400, 'CLOSED_BOARD_PRIVATE', '폐쇄 게시판은 비로그인 공개할 수 없습니다.');
  }
  if (selection.postIds.length) {
    const valid = await exec.query(`SELECT id FROM forum_post WHERE id = ANY($1::uuid[])
      AND forum_id = $2::uuid AND status = 'publish' AND organization_id IS NULL
      AND is_organization_exclusive = false FOR SHARE`, [selection.postIds, boardId]);
    if (valid.length !== selection.postIds.length) {
      throw new CommunityPublicReadError(400, 'INVALID_PUBLIC_POST_IDS', '게시판 안의 게시된 글만 공개할 수 있습니다.');
    }
  }
  const setting = { ...selection, designatedBy: user.id, designatedAt: new Date().toISOString() };
  await exec.query(`UPDATE forum_category_requests SET metadata =
    jsonb_set(COALESCE(metadata, '{}'::jsonb), '{${PUBLIC_READ_KEY}}', $2::jsonb, true), updated_at = NOW()
    WHERE id = $1::uuid`, [boardId, JSON.stringify(setting)]);
  return selection;
}
