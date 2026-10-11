import { Router, type Request, type RequestHandler } from 'express';
import { AppDataSource } from '../database/connection.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { apiLimiter } from '../middleware/rateLimiter.js';
import type { CommunityAccessUser } from '../utils/community-access.resolver.js';
import {
  CommunityPublicReadError, listPublicCommunityPosts, getPublicCommunityPost,
  listCommunityPublicReadSettings, setCommunityPublicRead,
} from '../services/community/community-public-read.service.js';

/** Separate guest reads never relax the authenticated forum mount or write guards. */
export function createCommunityPublicReadRoutes(authenticate: RequestHandler, resolveUser: (req: Request) => Promise<CommunityAccessUser | null>) {
  const router = Router({ mergeParams: true });
  const handle = (run: (req: Request) => Promise<unknown>): RequestHandler => asyncHandler(async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try { res.json({ success: true, data: await run(req) }); }
    catch (error) {
      if (!(error instanceof CommunityPublicReadError)) throw error;
      res.status(error.status).json({ success: false, code: error.code, error: error.message });
    }
  });
  router.get('/:communityKey/public/posts', apiLimiter, handle(req => {
    const rawPage = String(req.query.page ?? '1');
    if (!/^\d+$/.test(rawPage) || +rawPage < 1 || +rawPage > 10000) {
      throw new CommunityPublicReadError(400, 'INVALID_PAGE', '유효한 페이지를 선택해 주세요.');
    }
    return listPublicCommunityPosts(AppDataSource, req.params.communityKey, +rawPage);
  }));
  router.get('/:communityKey/public/posts/:id', apiLimiter, handle(req => getPublicCommunityPost(AppDataSource, req.params.communityKey, req.params.id)));
  router.get('/:communityKey/public-read-settings', apiLimiter, authenticate, handle(async req => {
    const user = await resolveUser(req);
    if (!user?.id) throw new CommunityPublicReadError(401, 'AUTH_REQUIRED', '로그인이 필요합니다.');
    return listCommunityPublicReadSettings(AppDataSource, req.params.communityKey, user);
  }));
  router.put('/:communityKey/boards/:boardId/public-read', apiLimiter, authenticate, handle(async req => {
    const user = await resolveUser(req);
    if (!user?.id) throw new CommunityPublicReadError(401, 'AUTH_REQUIRED', '로그인이 필요합니다.');
    return AppDataSource.transaction(m => setCommunityPublicRead(m, req.params.communityKey, user, req.params.boardId, req.body ?? {}));
  }));
  return router;
}
