/**
 * WO-O4O-NETURE-HOME-SERVICE-NEWS-FORUM-V1
 *
 * `GET /neture/home/news` 계약 고정:
 *   - 포럼은 slug 상수(환경변수 덮어쓰기 가능)로 확정하고 neture · completed · open 만 허용
 *   - 글은 status='publish' · organization_id IS NULL 만, COALESCE(published_at, created_at) DESC
 *   - limit 기본 5 · 최대 10 · 잘못된 값은 기본값
 *   - 포럼이 없으면 { forum: null, posts: [] } (오류가 아니라 "소식 없음")
 */

import {
  createNetureHomeNewsController,
  parseHomeNewsLimit,
  resolveNetureServiceNewsForumSlug,
  NETURE_SERVICE_NEWS_FORUM_SLUG_DEFAULT,
} from '../neture-home-news.controller.js';

type Call = { sql: string; params: any[] };

function makeHarness(options: { forum?: { id: string; slug: string; name: string } | null; posts?: any[] } = {}) {
  const calls: Call[] = [];
  const dataSource: any = {
    query: async (sql: string, params: any[] = []) => {
      const n = String(sql).replace(/\s+/g, ' ').trim();
      calls.push({ sql: n, params });
      if (/FROM forum_category_requests/i.test(n)) return options.forum ? [options.forum] : [];
      if (/FROM forum_post/i.test(n)) return options.posts ?? [];
      return [];
    },
  };
  const router: any = createNetureHomeNewsController(dataSource);
  const layer = router.stack.find((l: any) => l.route?.path === '/news' && l.route?.methods?.get);
  const stack = layer.route.stack;
  return { handler: stack[stack.length - 1].handle, calls };
}

// asyncHandler 는 promise 를 돌려주지 않으므로 응답이 끝날 때까지 이벤트 루프를 비운다
const flush = () => new Promise((r) => setImmediate(r));

function makeRes() {
  const res: any = { statusCode: 200 };
  res.status = jest.fn((c: number) => { res.statusCode = c; return res; });
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const FORUM = { id: 'f0000000-0000-4000-8000-000000000001', slug: NETURE_SERVICE_NEWS_FORUM_SLUG_DEFAULT, name: 'O4O 서비스 소식' };

describe('parseHomeNewsLimit', () => {
  it('기본 5 · 최대 10 · 잘못된 값은 기본값', () => {
    expect(parseHomeNewsLimit(undefined)).toBe(5);
    expect(parseHomeNewsLimit('abc')).toBe(5);
    expect(parseHomeNewsLimit('0')).toBe(5);
    expect(parseHomeNewsLimit('3')).toBe(3);
    expect(parseHomeNewsLimit('50')).toBe(10);
  });
});

describe('resolveNetureServiceNewsForumSlug', () => {
  const prev = process.env.NETURE_SERVICE_NEWS_FORUM_SLUG;
  afterEach(() => {
    if (prev === undefined) delete process.env.NETURE_SERVICE_NEWS_FORUM_SLUG;
    else process.env.NETURE_SERVICE_NEWS_FORUM_SLUG = prev;
  });
  it('환경변수가 없으면 기본 slug', () => {
    delete process.env.NETURE_SERVICE_NEWS_FORUM_SLUG;
    expect(resolveNetureServiceNewsForumSlug()).toBe(NETURE_SERVICE_NEWS_FORUM_SLUG_DEFAULT);
  });
  it('환경변수가 있으면 그것을 쓴다', () => {
    process.env.NETURE_SERVICE_NEWS_FORUM_SLUG = 'other-slug';
    expect(resolveNetureServiceNewsForumSlug()).toBe('other-slug');
  });
});

describe('GET /neture/home/news', () => {
  it('포럼을 slug 로 확정하고 neture · completed · open 조건을 건다', async () => {
    const { handler, calls } = makeHarness({ forum: FORUM, posts: [] });
    const res = makeRes();
    handler({ query: {} } as any, res, jest.fn());
    await flush();
    const forumCall = calls.find((c) => /FROM forum_category_requests/i.test(c.sql))!;
    expect(forumCall.params).toEqual([NETURE_SERVICE_NEWS_FORUM_SLUG_DEFAULT]);
    expect(forumCall.sql).toMatch(/slug = \$1/);
    expect(forumCall.sql).toMatch(/service_code = 'neture'/);
    expect(forumCall.sql).toMatch(/status = 'completed'/);
    expect(forumCall.sql).toMatch(/forum_type = 'open'/);
  });

  it('글은 publish · organization_id IS NULL 만, 게시일 내림차순, limit 바인딩', async () => {
    const { handler, calls } = makeHarness({
      forum: FORUM,
      posts: [
        { id: 'p1', slug: 'p-1', title: '첫 글', tags: ['사용법'], published_at: '2026-09-15T01:00:00.000Z' },
        { id: 'p2', slug: 'p-2', title: '둘째 글', tags: null, published_at: new Date('2026-09-14T01:00:00.000Z') },
      ],
    });
    const res = makeRes();
    const next = jest.fn();
    handler({ query: { limit: '3' } } as any, res, next);
    await flush();
    expect(next).not.toHaveBeenCalled();
    const postCall = calls.find((c) => /FROM forum_post/i.test(c.sql))!;
    expect(postCall.params).toEqual([FORUM.id, 3]);
    expect(postCall.sql).toMatch(/status = 'publish'/);
    expect(postCall.sql).toMatch(/organization_id IS NULL/);
    expect(postCall.sql).toMatch(/ORDER BY COALESCE\(published_at, created_at\) DESC/);
    expect(postCall.sql).not.toMatch(/is_pinned/);

    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.data.forum).toEqual(FORUM);
    expect(body.data.posts).toEqual([
      { id: 'p1', slug: 'p-1', title: '첫 글', tags: ['사용법'], publishedAt: '2026-09-15T01:00:00.000Z' },
      { id: 'p2', slug: 'p-2', title: '둘째 글', tags: [], publishedAt: '2026-09-14T01:00:00.000Z' },
    ]);
  });

  it('소식 포럼이 없거나 공개 상태가 아니면 forum:null · posts:[] (200)', async () => {
    const { handler, calls } = makeHarness({ forum: null });
    const res = makeRes();
    handler({ query: {} } as any, res, jest.fn());
    await flush();
    expect(res.statusCode).toBe(200);
    expect(res.json.mock.calls[0][0]).toEqual({ success: true, data: { forum: null, posts: [] } });
    expect(calls.some((c) => /FROM forum_post/i.test(c.sql))).toBe(false);
  });
});
