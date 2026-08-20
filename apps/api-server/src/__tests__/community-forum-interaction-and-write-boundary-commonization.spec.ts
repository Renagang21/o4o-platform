/**
 * Forum Interaction / Write Boundary Commonization Regression Test
 *
 * WO-O4O-COMMUNITY-FORUM-INTERACTION-AND-WRITE-BOUNDARY-COMMONIZATION-V1 §14
 *
 * 닫으려는 결함 (census 결과):
 *   comment create/update/delete, like/toggleLike, pin/unpin 이 전부 `postId`/`commentId`
 *   단독 조회였다 → 서비스 컨텍스트가 있어도 타 서비스 게시글/댓글에 mutation 이 가능했고,
 *   pin 은 존재 여부가 403(NOT_FORUM_OWNER)로 드러났다. 또 closed forum 판정이 comment
 *   create 에만 있고 post create / like 에는 없어 정책이 비대칭이었다.
 *
 * 검증은 2계층이다.
 *   (A) 동작 — fake repository/AppDataSource 로 컨트롤러를 직접 구동해 cross-service
 *       negative 경로(404/403)와 authorization 순서를 실측한다. DB 불필요.
 *   (B) 정적 회귀 가드 — generic `/api/v1/forum/*` write 분리, 공통 helper 사용,
 *       KPA pin remount 가 소스에서 사라지지 않게 고정한다.
 *
 * 신규 정책을 만들지 않는다. 기존 계약(forumContextMiddleware → resolveCanonicalServiceKey
 * → forum_category_requests.service_code, closed forum membership, author-or-admin)을 검증한다.
 */

import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// Module doubles — entity 그래프/DB 없이 boundary 로직만 구동한다
// ─────────────────────────────────────────────────────────────────────────────

const FakePostStatus = {
  DRAFT: 'draft',
  PUBLISHED: 'publish',
  PENDING: 'pending',
  REJECTED: 'rejected',
  ARCHIVED: 'archived',
} as const;
const FakeCommentStatus = {
  PUBLISHED: 'published',
  PENDING: 'pending',
  DELETED: 'deleted',
} as const;

jest.mock(
  '@o4o/forum-core/entities',
  () => ({
    ForumPost: class ForumPost {},
    ForumPostLike: class ForumPostLike {},
    ForumCategoryRequest: class ForumCategoryRequest {},
    ForumComment: class ForumComment {},
    PostStatus: {
      DRAFT: 'draft',
      PUBLISHED: 'publish',
      PENDING: 'pending',
      REJECTED: 'rejected',
      ARCHIVED: 'archived',
    },
    CommentStatus: { PUBLISHED: 'published', PENDING: 'pending', DELETED: 'deleted' },
  }),
  { virtual: true },
);
jest.mock(
  '@o4o/forum-core',
  () => ({
    normalizeContent: (v: unknown) => v,
    blocksToText: () => '',
    normalizeMetadata: (v: unknown) => v,
  }),
  { virtual: true },
);
jest.mock('../modules/auth/entities/User.js', () => ({ User: class User {} }), { virtual: true });

/** repository / raw query 를 테스트마다 갈아끼우기 위한 가변 상태 */
const state: {
  posts: any[];
  comments: any[];
  forums: any[];
  likes: any[];
  savedPosts: any[];
  savedComments: any[];
  rawQueries: { sql: string; params?: any[] }[];
} = {
  posts: [],
  comments: [],
  forums: [],
  likes: [],
  savedPosts: [],
  savedComments: [],
  rawQueries: [],
};

function resetState() {
  state.posts = [];
  state.comments = [];
  state.forums = [];
  state.likes = [];
  state.savedPosts = [];
  state.savedComments = [];
  state.rawQueries = [];
}

/** forum_category_requests / forum_category_members 를 흉내내는 최소 raw query 라우터 */
function fakeQuery(sql: string, params?: any[]): any[] {
  state.rawQueries.push({ sql, params });
  const s = sql.replace(/\s+/g, ' ').trim();

  // isForumInServiceScope
  if (s.includes('SELECT 1 FROM forum_category_requests')) {
    const [forumId, serviceCode] = params || [];
    return state.forums.some((f) => f.id === forumId && f.service_code === serviceCode) ? [1] : [];
  }
  // checkClosedForumAccess / hasForumModerationOverride / pin ownership
  if (s.includes('FROM forum_category_requests')) {
    const [forumId] = params || [];
    const f = state.forums.find((x) => x.id === forumId);
    return f ? [f] : [];
  }
  if (s.includes('FROM forum_category_members')) {
    const [forumId, userId] = params || [];
    const f = state.forums.find((x) => x.id === forumId);
    const m = (f?.members || []).find((x: any) => x.user_id === userId);
    return m ? [{ role: m.role }] : [];
  }
  if (s.includes('information_schema.tables')) {
    return [{ exists: false }];
  }
  return [];
}

function makeRepo(kind: 'post' | 'comment' | 'like' | 'other') {
  return {
    findOne: jest.fn(async ({ where }: any) => {
      if (kind === 'post') return state.posts.find((p) => p.id === where.id) || null;
      if (kind === 'comment') return state.comments.find((c) => c.id === where.id) || null;
      if (kind === 'like') {
        return (
          state.likes.find((l) => l.postId === where.postId && l.userId === where.userId) || null
        );
      }
      return null;
    }),
    create: jest.fn((v: any) => ({ id: 'new-entity', ...v })),
    save: jest.fn(async (v: any) => {
      if (kind === 'post') state.savedPosts.push({ ...v });
      if (kind === 'comment') state.savedComments.push({ ...v });
      return v;
    }),
    remove: jest.fn(async (v: any) => v),
    update: jest.fn(async () => ({ affected: 1 })),
  };
}

jest.mock('../database/connection.js', () => ({
  AppDataSource: {
    getRepository: (entity: any) => {
      const name = entity?.name || '';
      if (name === 'ForumPost') return makeRepo('post');
      if (name === 'ForumComment') return makeRepo('comment');
      if (name === 'ForumPostLike') return makeRepo('like');
      return makeRepo('other');
    },
    query: jest.fn(async (sql: string, params?: any[]) => fakeQuery(sql, params)),
  },
}));

import { ForumCommentController } from '../controllers/forum/ForumCommentController.js';
import { ForumPostController } from '../controllers/forum/ForumPostController.js';
import type { ForumContext } from '../middleware/forum-context.middleware.js';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const KPA_CTX: ForumContext = { serviceCode: 'kpa', scope: 'community' };

/**
 * forum_category_requests.service_code 는 canonical service key 다.
 * RBAC prefix 'kpa' → canonical 'kpa-society' (resolveCanonicalServiceKey).
 */
const KPA_FORUM = {
  id: 'forum-kpa',
  service_code: 'kpa-society',
  forum_type: 'open',
  requester_id: 'owner-1',
  members: [] as any[],
};
const OTHER_FORUM = {
  id: 'forum-neture',
  service_code: 'neture',
  forum_type: 'open',
  requester_id: 'owner-2',
  members: [] as any[],
};
const CLOSED_KPA_FORUM = {
  id: 'forum-kpa-closed',
  service_code: 'kpa-society',
  forum_type: 'closed',
  requester_id: 'owner-1',
  members: [] as any[],
};

function post(id: string, forumId: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    forumId,
    status: FakePostStatus.PUBLISHED,
    commentCount: 1,
    likeCount: 0,
    isLocked: false,
    allowComments: true,
    isPinned: false,
    authorId: 'author-1',
    ...extra,
  };
}

function makeRes() {
  const out: { status?: number; body?: any } = {};
  const res: any = {
    status(code: number) {
      out.status = code;
      return res;
    },
    json(body: any) {
      out.body = body;
      if (out.status === undefined) out.status = 200;
      return res;
    },
  };
  return { res, out };
}

function makeReq(opts: {
  user?: { id: string; roles?: string[] };
  ctx?: ForumContext;
  params?: Record<string, string>;
  body?: Record<string, unknown>;
}) {
  return {
    user: opts.user,
    forumContext: opts.ctx,
    params: opts.params || {},
    body: opts.body || {},
    query: {},
  } as any;
}

const USER = { id: 'user-1', roles: ['kpa:member'] };

beforeEach(() => {
  resetState();
  state.forums = [KPA_FORUM, OTHER_FORUM, CLOSED_KPA_FORUM].map((f) => ({ ...f, members: [] }));
});

// ─────────────────────────────────────────────────────────────────────────────
// (A-1) Comment create — cross-service negative (§4)
// ─────────────────────────────────────────────────────────────────────────────

describe('Comment create boundary (§4)', () => {
  const controller = new ForumCommentController();

  it('타 서비스 post 에는 댓글을 만들 수 없고 존재도 노출하지 않는다 (404)', async () => {
    state.posts = [post('post-neture', OTHER_FORUM.id)];
    const { res, out } = makeRes();
    await controller.createComment(
      makeReq({ user: USER, ctx: KPA_CTX, body: { postId: 'post-neture', content: 'hi' } }),
      res,
    );
    expect(out.status).toBe(404);
    expect(state.savedComments).toHaveLength(0);
  });

  it('존재하지 않는 post 와 타 서비스 post 의 응답이 구별되지 않는다 (비공개 계약)', async () => {
    state.posts = [post('post-neture', OTHER_FORUM.id)];
    const missing = makeRes();
    await controller.createComment(
      makeReq({ user: USER, ctx: KPA_CTX, body: { postId: 'no-such-post', content: 'hi' } }),
      missing.res,
    );
    const cross = makeRes();
    await controller.createComment(
      makeReq({ user: USER, ctx: KPA_CTX, body: { postId: 'post-neture', content: 'hi' } }),
      cross.res,
    );
    expect(missing.out.status).toBe(cross.out.status);
    expect(missing.out.body).toEqual(cross.out.body);
  });

  it('같은 서비스 open forum 게시글에는 정상 작성된다', async () => {
    state.posts = [post('post-kpa', KPA_FORUM.id)];
    const { res, out } = makeRes();
    await controller.createComment(
      makeReq({ user: USER, ctx: KPA_CTX, body: { postId: 'post-kpa', content: 'hi' } }),
      res,
    );
    expect(out.status).toBe(201);
    expect(state.savedComments).toHaveLength(1);
  });

  it('같은 서비스 closed forum 비회원은 403 CLOSED_FORUM_ACCESS_DENIED', async () => {
    state.posts = [post('post-closed', CLOSED_KPA_FORUM.id)];
    const { res, out } = makeRes();
    await controller.createComment(
      makeReq({ user: USER, ctx: KPA_CTX, body: { postId: 'post-closed', content: 'hi' } }),
      res,
    );
    expect(out.status).toBe(403);
    expect(out.body.code).toBe('CLOSED_FORUM_ACCESS_DENIED');
  });

  it('closed forum 멤버는 작성할 수 있다', async () => {
    state.forums = state.forums.map((f) =>
      f.id === CLOSED_KPA_FORUM.id ? { ...f, members: [{ user_id: USER.id, role: 'member' }] } : f,
    );
    state.posts = [post('post-closed', CLOSED_KPA_FORUM.id)];
    const { res, out } = makeRes();
    await controller.createComment(
      makeReq({ user: USER, ctx: KPA_CTX, body: { postId: 'post-closed', content: 'hi' } }),
      res,
    );
    expect(out.status).toBe(201);
  });

  it('잠긴 게시글 / 댓글 비허용 게시글에는 COMMENTS_DISABLED 로 막는다', async () => {
    state.posts = [post('post-locked', KPA_FORUM.id, { isLocked: true })];
    const locked = makeRes();
    await controller.createComment(
      makeReq({ user: USER, ctx: KPA_CTX, body: { postId: 'post-locked', content: 'hi' } }),
      locked.res,
    );
    expect(locked.out.status).toBe(403);
    expect(locked.out.body.code).toBe('COMMENTS_DISABLED');

    state.posts = [post('post-nocomment', KPA_FORUM.id, { allowComments: false })];
    const disabled = makeRes();
    await controller.createComment(
      makeReq({ user: USER, ctx: KPA_CTX, body: { postId: 'post-nocomment', content: 'hi' } }),
      disabled.res,
    );
    expect(disabled.out.status).toBe(403);
    expect(disabled.out.body.code).toBe('COMMENTS_DISABLED');
  });

  it('대댓글 parentId 는 같은 게시글의 댓글이어야 한다 (타 게시글/타 서비스 parent → 404)', async () => {
    state.posts = [post('post-kpa', KPA_FORUM.id), post('post-neture', OTHER_FORUM.id)];
    state.comments = [
      { id: 'c-other', postId: 'post-neture', authorId: 'user-9', status: FakeCommentStatus.PUBLISHED },
    ];

    const cross = makeRes();
    await controller.createComment(
      makeReq({
        user: USER,
        ctx: KPA_CTX,
        body: { postId: 'post-kpa', content: 'hi', parentId: 'c-other' },
      }),
      cross.res,
    );
    expect(cross.out.status).toBe(404);
    expect(cross.out.body.code).toBe('PARENT_COMMENT_NOT_FOUND');
    expect(state.savedComments).toHaveLength(0);

    const missing = makeRes();
    await controller.createComment(
      makeReq({
        user: USER,
        ctx: KPA_CTX,
        body: { postId: 'post-kpa', content: 'hi', parentId: 'no-such-comment' },
      }),
      missing.res,
    );
    expect(missing.out.status).toBe(404);
    expect(state.savedComments).toHaveLength(0);
  });

  it('같은 게시글의 댓글을 parent 로 하는 대댓글은 생성된다', async () => {
    state.posts = [post('post-kpa', KPA_FORUM.id)];
    state.comments = [
      { id: 'c-same', postId: 'post-kpa', authorId: 'user-9', status: FakeCommentStatus.PUBLISHED },
    ];
    const { res, out } = makeRes();
    await controller.createComment(
      makeReq({
        user: USER,
        ctx: KPA_CTX,
        body: { postId: 'post-kpa', content: 'hi', parentId: 'c-same' },
      }),
      res,
    );
    expect(out.status).toBe(201);
    expect(state.savedComments[0].parentId).toBe('c-same');
  });

  it('archived 게시글은 존재를 노출하지 않는다 (404)', async () => {
    state.posts = [post('post-archived', KPA_FORUM.id, { status: FakePostStatus.ARCHIVED })];
    const { res, out } = makeRes();
    await controller.createComment(
      makeReq({ user: USER, ctx: KPA_CTX, body: { postId: 'post-archived', content: 'hi' } }),
      res,
    );
    expect(out.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// (A-2) Comment update / delete — cross-service negative (§5)
// ─────────────────────────────────────────────────────────────────────────────

describe('Comment update/delete boundary (§5)', () => {
  const controller = new ForumCommentController();

  beforeEach(() => {
    state.posts = [post('post-kpa', KPA_FORUM.id), post('post-neture', OTHER_FORUM.id)];
    state.comments = [
      { id: 'c-kpa', postId: 'post-kpa', authorId: USER.id, status: FakeCommentStatus.PUBLISHED },
      {
        id: 'c-neture',
        postId: 'post-neture',
        authorId: USER.id,
        status: FakeCommentStatus.PUBLISHED,
      },
    ];
  });

  it('타 서비스 comment 수정은 404 (403 으로 존재를 노출하지 않는다)', async () => {
    const { res, out } = makeRes();
    await controller.updateComment(
      makeReq({ user: USER, ctx: KPA_CTX, params: { id: 'c-neture' }, body: { content: 'x' } }),
      res,
    );
    expect(out.status).toBe(404);
    expect(state.savedComments).toHaveLength(0);
  });

  it('타 서비스 comment 삭제는 404 이며 count 도 건드리지 않는다', async () => {
    const { res, out } = makeRes();
    await controller.deleteComment(
      makeReq({ user: USER, ctx: KPA_CTX, params: { id: 'c-neture' } }),
      res,
    );
    expect(out.status).toBe(404);
    expect(state.savedComments).toHaveLength(0);
    expect(state.savedPosts).toHaveLength(0);
  });

  it('같은 서비스 comment 는 작성자 본인이 수정/삭제할 수 있다', async () => {
    const upd = makeRes();
    await controller.updateComment(
      makeReq({ user: USER, ctx: KPA_CTX, params: { id: 'c-kpa' }, body: { content: 'x' } }),
      upd.res,
    );
    expect(upd.out.status).toBe(200);

    const del = makeRes();
    await controller.deleteComment(
      makeReq({ user: USER, ctx: KPA_CTX, params: { id: 'c-kpa' } }),
      del.res,
    );
    expect(del.out.status).toBe(200);
    // soft delete + commentCount 1회 차감
    expect(state.savedPosts).toHaveLength(1);
    expect(state.savedPosts[0].commentCount).toBe(0);
  });

  it('같은 서비스라도 타인 comment 는 403 (경계 통과 후 ownership 판정)', async () => {
    state.comments = [
      {
        id: 'c-kpa',
        postId: 'post-kpa',
        authorId: 'someone-else',
        status: FakeCommentStatus.PUBLISHED,
      },
    ];
    const { res, out } = makeRes();
    await controller.deleteComment(
      makeReq({ user: USER, ctx: KPA_CTX, params: { id: 'c-kpa' } }),
      res,
    );
    expect(out.status).toBe(403);
  });

  it('이미 삭제된 comment 재삭제는 commentCount 를 중복 차감하지 않는다', async () => {
    state.comments = [
      { id: 'c-kpa', postId: 'post-kpa', authorId: USER.id, status: FakeCommentStatus.DELETED },
    ];
    const { res, out } = makeRes();
    await controller.deleteComment(
      makeReq({ user: USER, ctx: KPA_CTX, params: { id: 'c-kpa' } }),
      res,
    );
    expect(out.status).toBe(200);
    expect(state.savedPosts).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// (A-3) Like / toggleLike (§6) + closed forum 대칭 (§7)
// ─────────────────────────────────────────────────────────────────────────────

describe('Like boundary (§6)', () => {
  const controller = new ForumPostController();

  it('타 서비스 post 에는 좋아요를 만들거나 취소할 수 없다 (404)', async () => {
    state.posts = [post('post-neture', OTHER_FORUM.id)];
    const { res, out } = makeRes();
    await controller.toggleLike(
      makeReq({ user: USER, ctx: KPA_CTX, params: { id: 'post-neture' } }),
      res,
    );
    expect(out.status).toBe(404);
    expect(state.savedPosts).toHaveLength(0);
  });

  it('같은 서비스 closed forum 비회원 좋아요는 403 (댓글 정책과 대칭)', async () => {
    state.posts = [post('post-closed', CLOSED_KPA_FORUM.id)];
    const { res, out } = makeRes();
    await controller.toggleLike(
      makeReq({ user: USER, ctx: KPA_CTX, params: { id: 'post-closed' } }),
      res,
    );
    expect(out.status).toBe(403);
    expect(out.body.code).toBe('CLOSED_FORUM_ACCESS_DENIED');
  });

  it('같은 서비스 open forum 좋아요는 정상 동작한다', async () => {
    state.posts = [post('post-kpa', KPA_FORUM.id)];
    const { res, out } = makeRes();
    await controller.toggleLike(
      makeReq({ user: USER, ctx: KPA_CTX, params: { id: 'post-kpa' } }),
      res,
    );
    expect(out.status).toBe(200);
    expect(out.body.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// (A-4) Pin / unpin (§8)
// ─────────────────────────────────────────────────────────────────────────────

describe('Pin boundary (§8)', () => {
  const controller = new ForumPostController();

  it('타 서비스 post pin 은 404 — 이전 403(NOT_FORUM_OWNER) 존재 노출을 막는다', async () => {
    state.posts = [post('post-neture', OTHER_FORUM.id)];
    const { res, out } = makeRes();
    await controller.pinPost(
      makeReq({
        user: { id: 'owner-2', roles: [] },
        ctx: KPA_CTX,
        params: { id: 'post-neture' },
        body: { pin: true },
      }),
      res,
    );
    expect(out.status).toBe(404);
    expect(out.body.code).not.toBe('NOT_FORUM_OWNER');
    expect(state.savedPosts).toHaveLength(0);
  });

  it('같은 서비스라도 소유자가 아니면 403 NOT_FORUM_OWNER', async () => {
    state.posts = [post('post-kpa', KPA_FORUM.id)];
    const { res, out } = makeRes();
    await controller.pinPost(
      makeReq({ user: USER, ctx: KPA_CTX, params: { id: 'post-kpa' }, body: { pin: true } }),
      res,
    );
    expect(out.status).toBe(403);
    expect(out.body.code).toBe('NOT_FORUM_OWNER');
  });

  it('forum owner 는 pin 할 수 있다', async () => {
    state.posts = [post('post-kpa', KPA_FORUM.id)];
    const { res, out } = makeRes();
    await controller.pinPost(
      makeReq({
        user: { id: 'owner-1', roles: [] },
        ctx: KPA_CTX,
        params: { id: 'post-kpa' },
        body: { pin: true },
      }),
      res,
    );
    expect(out.status).toBe(200);
    expect(out.body.data.isPinned).toBe(true);
  });

  it('platform admin 은 moderation override 로 pin 할 수 있다', async () => {
    state.posts = [post('post-kpa', KPA_FORUM.id)];
    const { res, out } = makeRes();
    await controller.pinPost(
      makeReq({
        user: { id: 'admin-1', roles: ['platform:super_admin'] },
        ctx: KPA_CTX,
        params: { id: 'post-kpa' },
        body: { pin: true },
      }),
      res,
    );
    expect(out.status).toBe(200);
  });

  it('타 서비스 operator 는 override 되지 않는다 (cross-service bypass 없음)', async () => {
    state.posts = [post('post-kpa', KPA_FORUM.id)];
    const { res, out } = makeRes();
    await controller.pinPost(
      makeReq({
        user: { id: 'op-neture', roles: ['neture:operator'] },
        ctx: KPA_CTX,
        params: { id: 'post-kpa' },
        body: { pin: true },
      }),
      res,
    );
    expect(out.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// (A-5) Authorization 순서 (§3) — service scope 판정이 ownership 보다 앞선다
// ─────────────────────────────────────────────────────────────────────────────

describe('Authorization order (§3)', () => {
  const controller = new ForumPostController();

  it('타 서비스 post 는 ownership 조회(forum_category_members) 이전에 차단된다', async () => {
    state.posts = [post('post-neture', OTHER_FORUM.id)];
    const { res, out } = makeRes();
    await controller.pinPost(
      makeReq({ user: USER, ctx: KPA_CTX, params: { id: 'post-neture' }, body: { pin: true } }),
      res,
    );
    expect(out.status).toBe(404);
    const memberLookups = state.rawQueries.filter((q) => q.sql.includes('forum_category_members'));
    expect(memberLookups).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// (B) 정적 회귀 가드
// ─────────────────────────────────────────────────────────────────────────────

const SRC = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');

describe('Static regression guards', () => {
  it('interaction 경로는 공통 resolver 를 쓰고 raw 단독 조회로 되돌아가지 않는다', () => {
    const base = read('controllers/forum/ForumControllerBase.ts');
    expect(base).toContain('resolveForumPostInServiceScope');
    expect(base).toContain('resolveForumCommentInServiceScope');
    expect(base).toContain('assertForumWriteAccess');

    const posts = read('controllers/forum/ForumPostController.ts');
    const comments = read('controllers/forum/ForumCommentController.ts');
    // update / delete / pin / like 4경로가 공통 resolver 를 경유한다
    expect((posts.match(/resolveForumPostInServiceScope/g) || []).length).toBeGreaterThanOrEqual(4);
    expect(comments).toContain('resolveForumPostInServiceScope');
    expect(
      (comments.match(/resolveForumCommentInServiceScope/g) || []).length,
    ).toBeGreaterThanOrEqual(2);
  });

  it('generic /api/v1/forum/* write 는 platform admin 전용으로 분리되어 있다', () => {
    const generic = read('routes/forum/forum.routes.ts');
    expect(generic).toContain('requireGenericForumWriteAdmin');
    for (const route of [
      "router.post('/posts'",
      "router.put('/posts/:id'",
      "router.delete('/posts/:id'",
      "router.post('/posts/:id/like'",
      "router.patch('/posts/:id/pin'",
      "router.post('/comments'",
      "router.put('/comments/:id'",
      "router.delete('/comments/:id'",
    ]) {
      const idx = generic.indexOf(route);
      expect(idx).toBeGreaterThan(-1);
      const line = generic.slice(idx, generic.indexOf('\n', idx));
      expect(line).toContain('requireGenericForumWriteAdmin');
    }
  });

  it('KPA forum mount 는 pin route 를 remount 한다 (프런트 계약 정합)', () => {
    const kpa = read('routes/kpa/kpa.routes.ts');
    expect(kpa).toContain("forumRouter.patch('/posts/:id/pin'");
  });

  it('서비스 forum mount 는 forumContextMiddleware 계약을 유지한다', () => {
    const kpa = read('routes/kpa/kpa.routes.ts');
    expect(kpa).toContain('forumContextMiddleware({');
    const serviceForum = read('routes/forum/service-forum.routes.ts');
    expect(serviceForum).toContain('createServiceForumRouter');
  });
});
