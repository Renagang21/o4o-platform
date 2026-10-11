jest.mock('@o4o/forum-core/entities', () => ({ ForumPost: class {}, ForumComment: class {}, ForumPostLike: class {}, ForumCategoryRequest: class {},
  PostStatus: { PUBLISHED: 'publish' }, PostType: { ANNOUNCEMENT: 'announcement', DISCUSSION: 'discussion' } }), { virtual: true });
jest.mock('@o4o/forum-core', () => ({ blocksToText: () => '', normalizeMetadata: (v: unknown) => v }), { virtual: true });
jest.mock('../modules/auth/entities/User.js', () => ({ User: class {} }));
jest.mock('../database/connection.js', () => ({ AppDataSource: { getRepository: () => ({ createQueryBuilder: () => query }) } }));
import { ForumPostController } from '../controllers/forum/ForumPostController.js';

const rows = [...Array.from({ length: 20 }, (_, n) => ({ id: `pin-${n}`, isPinned: true, type: 'announcement', createdAt: '2020-01-01' })),
  ...Array.from({ length: 7 }, (_, n) => ({ id: `recent-${n}`, isPinned: false, type: 'announcement', createdAt: '2026-10-11' })),
  { id: 'conversation', isPinned: false, type: 'discussion', createdAt: '2026-10-11' }];
let params: Record<string, unknown>;
let limit: number;
const query: any = {
  leftJoinAndSelect: () => query, where: (_sql: string, p?: object) => { Object.assign(params, p); return query; },
  andWhere: (_sql: string, p?: object) => { Object.assign(params, p); return query; },
  orderBy: () => query, addOrderBy: () => query, skip: () => query, take: (n: number) => { limit = n; return query; },
  getManyAndCount: async () => {
    const matches = rows.filter(row => (params.pinnedFilter === undefined || row.isPinned === params.pinnedFilter) &&
      (params.postTypeFilter === undefined || row.type === params.postTypeFilter));
    return [matches.slice(0, limit), matches.length];
  },
};
const response = () => { const res: any = { json: jest.fn(), status: jest.fn() }; res.status.mockReturnValue(res); return res; };
const context = { scope: 'community', forumStorageCodes: ['community:fixture'] };
beforeEach(() => { params = {}; limit = 20; });
it('separately returns old pinned notices and recent announcements beyond twenty pinned entries', async () => {
  const c = new ForumPostController(); const pin = response(); const recent = response();
  await c.listPosts({ query: { isPinned: 'true', limit: '3' }, forumContext: context } as any, pin);
  expect(pin.json.mock.calls[0][0].data.map((p: any) => p.id)).toEqual(['pin-0', 'pin-1', 'pin-2']);
  expect(params.ctxForumCodes).toEqual(context.forumStorageCodes);
  await c.listPosts({ query: { isPinned: 'false', type: 'announcement', limit: '5' }, forumContext: context } as any, recent);
  expect(recent.json.mock.calls[0][0].data.map((p: any) => p.id)).toEqual(['recent-0', 'recent-1', 'recent-2', 'recent-3', 'recent-4']);
});
it.each([{ isPinned: 'yes' }, { isPinned: ['true'] }, { type: 'private' }, { type: ['announcement'] }])('rejects malformed filter %j', async filters => {
  const res = response(); await new ForumPostController().listPosts({ query: filters } as any, res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVALID_POST_FILTER' }));
});
it('preserves the unfiltered existing member list', async () => {
  const res = response(); await new ForumPostController().listPosts({ query: {}, forumContext: context } as any, res);
  expect(res.json.mock.calls[0][0].data).toHaveLength(20);
  expect(params.pinnedFilter).toBeUndefined(); expect(params.postTypeFilter).toBeUndefined();
});
