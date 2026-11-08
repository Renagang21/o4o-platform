/**
 * WO-O4O-COMMUNITY-FORUM-AI-PHASE1-V1: real router, guards and controller on HTTP.
 * The database and model are doubled, so SQL here is asserted, not executed.
 */
import express from 'express';
import request from 'supertest';
import { createServiceForumRouter } from '../routes/forum/service-forum.routes.js';

const dbQuery = jest.fn();
const compose = jest.fn();
const keywords = jest.fn();
const status = jest.fn();
const qbCalls: Array<[string, unknown[]]> = [];
const rawPosts = jest.fn();

function mockController() {
  return class {
    constructor() {
      return new Proxy(this, { get: () => (_req: unknown, res: express.Response) => res.json({ reachedController: true }) });
    }
  };
}
jest.mock('@o4o/forum-core/entities', () => ({
  ForumPost: class ForumPost {}, ForumPostLike: class ForumPostLike {},
  ForumCategoryRequest: class ForumCategoryRequest {}, ForumComment: class ForumComment {},
  PostStatus: { PUBLISHED: 'publish', DRAFT: 'draft' },
}), { virtual: true });
jest.mock('../modules/auth/entities/User.js', () => ({ User: class User {} }));
jest.mock('../controllers/forum/ForumPostController.js', () => ({ ForumPostController: mockController() }));
jest.mock('../controllers/forum/ForumDirectoryController.js', () => ({ ForumDirectoryController: mockController() }));
jest.mock('../controllers/forum/ForumCommentController.js', () => ({ ForumCommentController: mockController() }));
jest.mock('../controllers/forum/ForumModerationController.js', () => ({ ForumModerationController: mockController() }));
jest.mock('../controllers/forum/ForumMembershipController.js', () => ({ ForumMembershipController: mockController() }));
jest.mock('../services/community/community-improvements.js', () => ({ IMPROVEMENT_SLUG: 'o4o-updates-improvements' }));

function queryBuilder() {
  const qb: Record<string, unknown> = {};
  for (const method of ['select', 'addSelect', 'where', 'andWhere', 'orderBy', 'addOrderBy', 'limit']) {
    qb[method] = (...args: unknown[]) => { qbCalls.push([method, args]); return qb; };
  }
  qb.getRawMany = () => rawPosts();
  return qb;
}

jest.mock('../database/connection.js', () => ({
  AppDataSource: {
    query: (...args: unknown[]) => dbQuery(...args),
    getRepository: () => ({ createQueryBuilder: () => queryBuilder(), findOne: jest.fn() }),
  },
}));
jest.mock('../services/community/community-forum-ai.service.js', () => {
  class ForumAiError extends Error {
    constructor(readonly code: string, readonly status: number) { super(code); }
  }
  return {
    ForumAiError,
    getForumAiStatus: (...args: unknown[]) => status(...args),
    requestForumComposeAssist: (...args: unknown[]) => compose(...args),
    requestForumSimilarKeywords: (...args: unknown[]) => keywords(...args),
  };
});
jest.mock('../middleware/auth.middleware.js', () => ({
  optionalAuth: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (req.headers['x-test-user']) (req as any).user = { id: req.headers['x-test-user'], roles: [] };
    next();
  },
  authenticate: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if ((req as any).user) next(); else res.status(401).json({ code: 'AUTH_REQUIRED' });
  },
}));

const OPEN = '11111111-1111-4111-8111-111111111111';
const CLOSED = '22222222-2222-4222-8222-222222222222';
const IMPROVEMENT = '33333333-3333-4333-8333-333333333333';
const FOREIGN = '44444444-4444-4444-8444-444444444444';
const MEMBER = 'closed-member';

const boardRows = [
  { id: OPEN, name: '자유게시판', slug: 'free', description: '', forumType: 'open' },
  { id: CLOSED, name: '비공개방', slug: 'private', description: '', forumType: 'closed' },
  { id: IMPROVEMENT, name: '개선', slug: 'o4o-updates-improvements', description: '', forumType: 'open' },
];

function fakeDb(sql: string, params: unknown[] = []) {
  if (sql.includes('FROM forum_category_requests') && sql.includes('ORDER BY created_at')) {
    // The server-resolved storage codes are the boundary: another community's boards never come back.
    return Promise.resolve((params[0] as string[]).includes('community') ? boardRows : []);
  }
  if (sql.includes('SELECT id, forum_type, requester_id, service_code')) {
    return Promise.resolve(params[0] === CLOSED ? [{ id: CLOSED, forum_type: 'closed', requester_id: 'owner', service_code: 'community' }] : []);
  }
  if (sql.includes('SELECT service_code FROM forum_category_requests')) return Promise.resolve([{ service_code: 'community' }]);
  if (sql.includes('FROM forum_category_members')) return Promise.resolve(params[1] === MEMBER ? [{ role: 'member' }] : []);
  return Promise.resolve([]);
}

jest.mock('../services/community/community-service-operator-access.js', () => ({ hasCommunityServiceOperator: async () => false }));

function mount(forumContext: Record<string, unknown> | null) {
  return express().use(express.json({ limit: '1mb' })).use('/forum', createServiceForumRouter({
    context: { scope: 'community' },
    resolveContext: (req, res, next) => {
      if (!forumContext) { res.status(403).json({ code: 'COMMUNITY_SERVICE_MEMBERSHIP_REQUIRED' }); return; }
      (req as any).forumContext = forumContext;
      next();
    },
  }));
}
const communityContext = { communityKey: 'community', forumStorageCodes: ['community'], scope: 'community' };
const app = mount(communityContext);
const qbText = () => JSON.stringify(qbCalls);

beforeEach(() => {
  jest.clearAllMocks();
  qbCalls.length = 0;
  dbQuery.mockImplementation(fakeDb);
  rawPosts.mockResolvedValue([]);
  status.mockResolvedValue({ available: true, reason: null, dailyLimit: 10, remainingToday: 10 });
  compose.mockResolvedValue({ titles: ['하나', '둘', '셋'], body: null, tags: [], board: null });
});

describe('guards', () => {
  const routes = [
    ['get', '/forum/ai/status'], ['get', '/forum/posts/similar?title=재고 관리'],
    ['post', '/forum/ai/compose-assist'], ['post', '/forum/ai/similar-search'],
  ] as const;

  it.each(routes)('%s %s refuses a visitor without calling AI', async (method, path) => {
    const res = await request(app)[method](encodeURI(path)).send({ title: '재고 관리' });
    expect(res.status).toBe(401);
    expect(compose).not.toHaveBeenCalled();
    expect(keywords).not.toHaveBeenCalled();
    expect(rawPosts).not.toHaveBeenCalled();
  });
  it.each(routes)('%s %s refuses a user the community context rejected', async (method, path) => {
    const res = await request(mount(null))[method](encodeURI(path)).set('x-test-user', 'outsider').send({ title: '재고 관리' });
    expect(res.status).toBe(403);
    expect(compose).not.toHaveBeenCalled();
    expect(rawPosts).not.toHaveBeenCalled();
  });
  it.each(routes)('%s %s is not opened on other forum mounts', async (method, path) => {
    const other = mount({ communityKey: 'business:other', forumStorageCodes: ['sf:other'], scope: 'community' });
    const res = await request(other)[method](encodeURI(path)).set('x-test-user', 'member').send({ title: '재고 관리' });
    expect(compose).not.toHaveBeenCalled();
    expect(keywords).not.toHaveBeenCalled();
    expect(status).not.toHaveBeenCalled();
    expect(rawPosts).not.toHaveBeenCalled();
    expect(res.body?.data?.posts).toBeUndefined();
  });
  it('a serviceKey in the request does not change the scope', async () => {
    await request(app).post('/forum/ai/compose-assist?serviceKey=neture').set('x-test-user', 'author')
      .send({ title: '재고 관리', serviceKey: 'neture', communityKey: 'business:other', forumStorageCodes: ['sf:other'] });
    const boardQuery = dbQuery.mock.calls.find(([sql]) => String(sql).includes('ORDER BY created_at'));
    expect(boardQuery?.[1]).toEqual([['community']]);
  });
});

describe('compose-assist boards', () => {
  const boardsSent = () => (compose.mock.calls[0][1] as Array<{ id: string }>).map((b) => b.id);

  it('passes only boards the author can write: no closed board without membership, no improvement board', async () => {
    const res = await request(app).post('/forum/ai/compose-assist').set('x-test-user', 'author').send({ title: '재고 관리', body: '본문입니다' });
    expect(res.status).toBe(200);
    expect(boardsSent()).toEqual([OPEN]);
    expect(compose.mock.calls[0][2]).toBe('author');
  });
  it('a closed board member gets that board too, through the existing rule', async () => {
    await request(app).post('/forum/ai/compose-assist').set('x-test-user', MEMBER).send({ title: '재고 관리' });
    expect(boardsSent()).toEqual([OPEN, CLOSED]);
  });
  it.each([[CLOSED, 'closed board without membership'], [IMPROVEMENT, 'improvement board'], [FOREIGN, 'other community board']])(
    'rejects forged forumId %s (%s)', async (forumId) => {
      const res = await request(app).post('/forum/ai/compose-assist').set('x-test-user', 'author').send({ title: '재고 관리', forumId });
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORUM_NOT_WRITABLE');
      expect(compose).not.toHaveBeenCalled();
    },
  );
  it('rejects a malformed forumId before any lookup', async () => {
    const res = await request(app).post('/forum/ai/compose-assist').set('x-test-user', 'author').send({ title: '재고 관리', forumId: "x' OR 1=1" });
    expect(res.status).toBe(400);
    expect(compose).not.toHaveBeenCalled();
  });
  it('enforces the length caps without spending AI', async () => {
    for (const body of [{ title: 'a'.repeat(161) }, { title: '제목입니다', body: 'a'.repeat(4001) }]) {
      const res = await request(app).post('/forum/ai/compose-assist').set('x-test-user', 'author').send(body);
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INPUT_TOO_LONG');
    }
    expect(compose).not.toHaveBeenCalled();
  });
  it('reports over-limit as a coded response', async () => {
    const { ForumAiError } = jest.requireMock('../services/community/community-forum-ai.service.js');
    compose.mockRejectedValue(new ForumAiError('AI_DAILY_LIMIT_EXCEEDED', 429));
    const res = await request(app).post('/forum/ai/compose-assist').set('x-test-user', 'author').send({ title: '재고 관리' });
    expect(res.status).toBe(429);
    expect(res.body.code).toBe('AI_DAILY_LIMIT_EXCEEDED');
  });
});

describe('similar posts', () => {
  const search = (user: string, title = '약국 재고 관리') =>
    request(app).get('/forum/posts/similar').query({ title }).set('x-test-user', user);

  it('never calls AI, even with no results or AI switched off', async () => {
    status.mockResolvedValue({ available: false, reason: 'AI_DISABLED', dailyLimit: 0, remainingToday: 0 });
    const res = await search('author');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ source: 'keyword', keywords: ['약국', '재고', '관리'], posts: [], enough: false });
    expect(keywords).not.toHaveBeenCalled();
    expect(compose).not.toHaveBeenCalled();
    expect(status).not.toHaveBeenCalled();
  });
  it('searches published posts on readable boards only, within the community boundary', async () => {
    await search('author');
    const forumIds = qbCalls.find(([method, args]) => method === 'andWhere' && String(args[0]).includes('similarForumIds'))?.[1][1] as { similarForumIds: string[] };
    // The improvement board is readable (not writable); a closed board without membership is neither.
    expect(forumIds.similarForumIds).toEqual([OPEN, IMPROVEMENT]);
    expect(qbCalls.find(([method]) => method === 'where')?.[1]).toEqual(['post.status = :similarStatus', { similarStatus: 'publish' }]);
    expect(qbText()).toContain('_liveCommunityBoard');
    expect(qbText()).toContain('post.organizationId IS NULL');
    expect(qbCalls.find(([method]) => method === 'limit')?.[1]).toEqual([5]);
  });
  it('a closed board member can see that board', async () => {
    await search(MEMBER);
    const forumIds = qbCalls.find(([method, args]) => method === 'andWhere' && String(args[0]).includes('similarForumIds'))?.[1][1] as { similarForumIds: string[] };
    expect(forumIds.similarForumIds).toEqual([OPEN, CLOSED, IMPROVEMENT]);
  });
  it('binds keywords as escaped parameters, never into the SQL text', async () => {
    await search('author', "재고%' OR 1=1 _test");
    expect(qbText()).toContain('similarKeyword0');
    const sqlTexts = qbCalls.flatMap(([method, args]) => (method === 'andWhere' || method === 'addSelect' ? [String(args[0])] : []));
    expect(sqlTexts.join(' ')).not.toContain('재고');
    const params = qbCalls.find(([method, args]) => method === 'andWhere' && String(args[0]).includes('similarKeyword0'))?.[1][1] as Record<string, string>;
    expect(Object.values(params).join(' ')).toContain('%재고%');
  });
  it('returns only the fields the hint needs and resolves the board name', async () => {
    rawPosts.mockResolvedValue([{ id: 'p', title: '재고 글', slug: 's', excerpt: 'e'.repeat(300), forumId: OPEN, createdAt: '2026-11-01', authorId: 'someone', score: 5 }]);
    const res = await search('author');
    expect(res.body.data.posts[0]).toEqual({ id: 'p', title: '재고 글', slug: 's', excerpt: 'e'.repeat(120), forumId: OPEN, forumName: '자유게시판', createdAt: '2026-11-01' });
  });
  it('title with only stop words runs no query', async () => {
    const res = await search('author', '문의 질문');
    expect(res.body.data).toMatchObject({ keywords: [], posts: [] });
    expect(rawPosts).not.toHaveBeenCalled();
  });
  it('over-long title is rejected', async () => {
    expect((await search('author', 'a'.repeat(161))).status).toBe(400);
  });
  it('another community context yields nothing from this one', async () => {
    const res = await request(mount({ communityKey: 'community', forumStorageCodes: [], scope: 'community' }))
      .get('/forum/posts/similar').query({ title: '재고 관리' }).set('x-test-user', 'author');
    expect(res.body.data.posts).toEqual([]);
    expect(rawPosts).not.toHaveBeenCalled();
  });
  it('"더 찾기" searches with AI keywords through the same read filter', async () => {
    keywords.mockResolvedValue(['재고']);
    const res = await request(app).post('/forum/ai/similar-search').set('x-test-user', 'author').send({ title: '재고 관리' });
    expect(res.status).toBe(200);
    expect(res.body.data.source).toBe('ai');
    const forumIds = qbCalls.find(([method, args]) => method === 'andWhere' && String(args[0]).includes('similarForumIds'))?.[1][1] as { similarForumIds: string[] };
    expect(forumIds.similarForumIds).toEqual([OPEN, IMPROVEMENT]);
  });
  it('AI failure on "더 찾기" is a coded response', async () => {
    const { ForumAiError } = jest.requireMock('../services/community/community-forum-ai.service.js');
    keywords.mockRejectedValue(new ForumAiError('AI_DISABLED', 503));
    const res = await request(app).post('/forum/ai/similar-search').set('x-test-user', 'author').send({ title: '재고 관리' });
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('AI_DISABLED');
  });
});

describe('status', () => {
  it('reports AI state for the signed-in author', async () => {
    const res = await request(app).get('/forum/ai/status').set('x-test-user', 'author');
    expect(res.body.data).toEqual({ available: true, reason: null, dailyLimit: 10, remainingToday: 10 });
    expect(status).toHaveBeenCalledWith('author');
  });
});
