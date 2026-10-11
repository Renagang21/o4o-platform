/** Generic reads must hide scoped board names, tags and aggregate counts. */
jest.mock('@o4o/forum-core/entities', () => ({
  ForumPost: class ForumPost {}, ForumComment: class ForumComment {},
  ForumCategoryRequest: class ForumCategoryRequest {}, ForumPostLike: class ForumPostLike {},
  PostStatus: { PUBLISHED: 'publish' }, CommentStatus: { PUBLISHED: 'published' },
}), { virtual: true });
jest.mock('@o4o/forum-core', () => ({ normalizeContent: (v: unknown) => v, blocksToText: () => '', normalizeMetadata: (v: unknown) => v }), { virtual: true });
jest.mock('../modules/auth/entities/User.js', () => ({ User: class User {} }));
jest.mock('../database/connection.js', () => ({ AppDataSource: {
  getRepository: (entity: any) => repository(entity.name),
} }));

import { ForumModerationController } from '../controllers/forum/ForumModerationController.js';
import { ForumPostController } from '../controllers/forum/ForumPostController.js';
import { getRelatedPosts, getTrendingPosts } from '../services/forum/recommendation/recommendation-query.js';

let privateCode = 'sf:private';
const publicRow = { id: 'public', name: 'PUBLIC BOARD', tag: 'public', serviceCode: 'other-public', viewCount: 1, likeCount: 0, commentCount: 0, createdAt: new Date() };
const privateRow = () => ({ ...publicRow, id: 'private', name: 'PRIVATE BOARD', tag: 'secret', serviceCode: privateCode });
class Query {
  clauses: string[] = [];
  parameters: any = {};
  where(sql: string, params?: any) { this.clauses = [sql]; Object.assign(this.parameters, params); return this; }
  andWhere(sql: string, params?: any) { this.clauses.push(sql); Object.assign(this.parameters, params); return this; }
  innerJoin() { return this; }
  orderBy() { return this; }
  take() { return this; }
  limit() { return this; }
  select() { return this; }
  clone() { const q = new Query(); q.clauses = [...this.clauses]; q.parameters = { ...this.parameters }; return q; }
  rows() {
    const sql = this.clauses.join(' ');
    return [publicRow, privateRow()].filter(row => {
      if (sql.includes("NOT LIKE 'sf:%'") && /^(sf|community|funding):/.test(row.serviceCode)) return false;
      if (this.parameters.ctxExcludedCommunityCodes?.includes(row.serviceCode)) return false;
      if (sql.includes('post.id = :postId') && row.id !== this.parameters.postId) return false;
      const codes = this.parameters.ctxForumCodes;
      return !codes || codes.includes(row.serviceCode);
    });
  }
  async getCount() { return this.rows().length; }
  async getMany() { return this.rows(); }
  async getOne() { return this.rows()[0] ?? null; }
  async getRawOne() { return { count: this.rows().length }; }
}
function repository(_entity: string) {
  return {
    createQueryBuilder: () => new Query(), count: async () => 99,
    query: async (sql: string, params: any[]) => {
      const arrays = params.filter(Array.isArray);
      const excluded = sql.includes('NOT (_public.service_code = ANY') ? arrays[0] : [];
      const codes = sql.includes('_svc.service_code = ANY') ? arrays[arrays.length - 1] : undefined;
      return [publicRow, privateRow()].filter(row =>
        !(sql.includes("NOT LIKE 'sf:%'") && /^(sf|community|funding):/.test(row.serviceCode)) && !excluded.includes(row.serviceCode) && (!codes || codes.includes(row.serviceCode)),
      ).map(row => ({ tag: row.tag, count: 1 }));
    },
  };
}
function response() {
  const res: any = { json: jest.fn(), status: jest.fn() };
  res.status.mockReturnValue(res); return res;
}

describe.each(['sf:private', 'community:private', 'funding:private', 'neture', 'kpa-society', 'pharmacy-hub', 'k-cosmetics'])('generic visibility isolation: %s', code => {
  beforeEach(() => { privateCode = code; });
  it('public statistics omit private boards, posts, comments and authors', async () => {
    const res = response();
    await new ForumModerationController().getStats({ forumContext: { excludeScopedCommunities: true } } as any, res);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ success: true, data: {
      totalPosts: 1, totalComments: 1, totalUsers: 1, todayPosts: 1, todayComments: 1,
      activeCategories: [{ name: 'PUBLIC BOARD' }],
    } });
  });
  it('scoped statistics retain only the approved member workspace', async () => {
    const res = response();
    await new ForumModerationController().getStats({ forumContext: { communityKey: 'private', forumStorageCodes: [code], scope: 'community' } } as any, res);
    expect(res.json.mock.calls[0][0].data.activeCategories).toEqual([{ name: 'PRIVATE BOARD' }]);
    expect(res.json.mock.calls[0][0].data.totalComments).toBe(1);
  });
  it('generic tags omit private tags while member-scoped tags retain them', async () => {
    const c = new ForumPostController(); const pub = response(); const member = response();
    await c.getPopularTags({ query: {}, forumContext: { excludeScopedCommunities: true } } as any, pub);
    await c.getPopularTags({ query: {}, forumContext: { forumStorageCodes: [code] } } as any, member);
    expect(pub.json).toHaveBeenCalledWith({ success: true, data: [{ tag: 'public', count: 1 }] });
    expect(member.json).toHaveBeenCalledWith({ success: true, data: [{ tag: 'secret', count: 1 }] });
  });
  it('public recommendations exclude private posts and private related-post seeds', async () => {
    const repo: any = repository('ForumPost');
    const options = { excludeScopedCommunities: true };
    expect((await getTrendingPosts(repo, options)).map(p => p.postId)).toEqual(['public']);
    expect(await getRelatedPosts(repo, 'private', options)).toEqual([]);
  });
});
