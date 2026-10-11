import { Router, type RequestHandler } from 'express';
import { AppDataSource } from '../database/connection.js';
import { createServiceForumRouter } from './forum/service-forum.routes.js';
import { resolveFundingAccess } from '../services/funding/funding-access.js';
import { fundingForumCode } from '../services/funding/funding-review.js';
import { optionalAuth } from '../middleware/auth.middleware.js';
import { FundingForumMembershipService } from '../services/funding/funding-forum-membership.service.js';
import { FundingError } from '../services/funding/funding-workspace.service.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function createFundingForumRoutes(): Router {
  const router = Router({ mergeParams: true });
  router.use(optionalAuth);
  const resolve: RequestHandler = async (req, res, next) => {
    try {
      const id = req.params.id;
      if (!UUID.test(id)) { res.status(400).json({ success: false, message: 'Invalid funding ID' }); return; }
      const access = await resolveFundingAccess(AppDataSource, id, (req as any).user?.id);
      if (!access?.forum || (!access.creator && !access.operator && !access.participant)) { res.status(403).json({ success: false, message: '해당 펀딩 참여자만 포럼을 이용할 수 있습니다.' }); return; }
      const category = /^\/categories\/([^/]+)/.exec(req.path)?.[1];
      if (category && !['mine', 'popular'].includes(category) && category !== access.forum.id) { res.status(404).json({ success: false, message: '포럼을 찾을 수 없습니다.' }); return; }
      const isMembershipAction = /^\/categories\/[^/]+\/(join-requests|membership-status)(?:\/|$)/.test(req.path);
      const isMemberManagementRead = req.method === 'GET' && /^\/categories\/[^/]+\/(members|join-requests)$/.test(req.path);
      if (isMemberManagementRead && !access.creator) { res.status(403).json({ success: false, message: '현재 개설자만 포럼 회원 명단을 조회할 수 있습니다.' }); return; }
      if (!access.canRead && !isMembershipAction) { res.status(403).json({ success: false, message: '포럼 이용 승인이 필요합니다.' }); return; }
      if (!['GET', 'HEAD'].includes(req.method) && !access.canWrite && !isMembershipAction) { res.status(403).json({ success: false, message: '종료된 펀딩은 읽기 전용입니다.' }); return; }
      // Membership operations never reopen a closed project.
      if (!['GET', 'HEAD'].includes(req.method) && access.trial.status === 'closed') { res.status(403).json({ success: false, message: '종료된 펀딩은 읽기 전용입니다.' }); return; }
      if (req.method === 'GET' && req.path === '/posts') {
        if (req.query.forumId && req.query.forumId !== access.forum.id) { res.status(404).json({ success: false, message: '포럼을 찾을 수 없습니다.' }); return; }
        req.query.forumId = access.forum.id;
      }
      if (!['GET', 'HEAD'].includes(req.method) && /^\/categories\/.+\/(owner|delete-request)$/.test(req.path)) { res.status(403).json({ success: false, message: '펀딩 포럼 구조는 서비스 운영자가 관리합니다.' }); return; }
      if (!access.creator && !access.operator && !['GET', 'HEAD'].includes(req.method) &&
        (req.body?.type === 'announcement' || req.body?.isPinned !== undefined || req.body?.isLocked !== undefined || req.path.endsWith('/pin'))) {
        res.status(403).json({ success: false, message: '공지·고정 관리는 개설자와 운영자만 가능합니다.' }); return;
      }
      req.forumContext = { forumStorageCodes: [fundingForumCode(id)], communityOperator: access.creator || access.operator, scope: 'community' };
      next();
    } catch (error) { next(error); }
  };
  router.use(resolve);
  const membership = new FundingForumMembershipService(AppDataSource);
  const action = (run: (req: any) => Promise<unknown>): RequestHandler => async (req, res, next) => {
    // Express child route ':forumId' must not overwrite the parent funding ':id'.
    if (!UUID.test(req.params.forumId) || req.params.requestId && !UUID.test(req.params.requestId) || req.params.userId && !UUID.test(req.params.userId)) { res.status(400).json({ success: false, code: 'INVALID_ID', message: 'Invalid ID' }); return; }
    try { res.json({ success: true, data: await run(req) }); }
    catch (error) { if (error instanceof FundingError) res.status(error.status).json({ success: false, code: error.code, error: error.message, message: error.message }); else next(error); }
  };
  router.post('/categories/:forumId/join-requests', action(req => membership.request(req.params.id, req.params.forumId, req.user.id)));
  for (const review of ['approve', 'reject']) router.post(`/categories/:forumId/join-requests/:requestId/${review}`, action(req => membership.review(req.params.id, req.params.forumId, req.params.requestId, req.user.id, review === 'approve', req.body?.reviewComment)));
  router.delete('/categories/:forumId/members/:userId', action(req => membership.remove(req.params.id, req.params.forumId, req.params.userId, req.user.id)));
  router.use(createServiceForumRouter({ context: {}, resolveContext: (_req, _res, next) => next() }));
  return router;
}
