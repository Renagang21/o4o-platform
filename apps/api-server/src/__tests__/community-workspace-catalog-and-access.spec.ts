jest.mock('@o4o/forum-core/entities', () => ({
 ForumPost:class{}, ForumPostLike:class{}, ForumCategoryRequest:class{}, ForumComment:class{},
 PostStatus:{DRAFT:'draft',PUBLISHED:'publish',PENDING:'pending',REJECTED:'rejected',ARCHIVED:'archived'},
 CommentStatus:{PUBLISHED:'published',PENDING:'pending',DELETED:'deleted'},
}),{virtual:true});
jest.mock('@o4o/forum-core',()=>({normalizeContent:(v:unknown)=>v,blocksToText:()=>'',normalizeMetadata:(v:unknown)=>v}),{virtual:true});
jest.mock('../database/connection.js',()=>({AppDataSource:{getRepository:()=>({}),query:jest.fn(async()=>[])}}));
import { ForumControllerBase } from '../controllers/forum/ForumControllerBase.js';
import type { ForumContext } from '../middleware/forum-context.middleware.js';
import { communityForumStorageCodes } from '../utils/community-access.resolver.js';
class Boundary extends ForumControllerBase {
 codes(ctx: ForumContext) { return this.getContextForumCodes(ctx); }
 filter(qb: any, ctx: ForumContext) { this.applyForumContextFilter(qb, 'board', ctx); }
}
it('resolves only community-owned service storage and rejects former aliases',()=>{
 const controller=new Boundary();
 expect(controller.codes({communityKey:'community',scope:'community'})).toEqual(['community']);
 for(const key of ['pharmacy','cosmetics','o4o-general','unknown']) expect(communityForumStorageCodes(key)).toEqual([]);
});
it('keeps current and historical member ledgers outside generic forum listings',()=>{
 const controller=new Boundary(); const qb={andWhere:jest.fn().mockReturnThis()};
 controller.filter(qb,{excludeScopedCommunities:true});
 const call=qb.andWhere.mock.calls.find(([sql]:[string])=>sql.includes('ctxExcludedCommunityCodes'));
 expect(call).toBeDefined();
 expect(call[1].ctxExcludedCommunityCodes).toEqual(expect.arrayContaining(['community','neture','kpa-society','pharmacy-hub','k-cosmetics']));
});
