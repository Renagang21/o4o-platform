import { Router, type RequestHandler } from 'express';
import { AppDataSource } from '../database/connection.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { apiLimiter } from '../middleware/rateLimiter.js';
import type { AuthRequest } from '../types/auth.js';
import { demoAccountService, sendDemoAccountForbidden } from '../services/auth/demo-account.service.js';
import { CommunityManagementError, listManagedCommunityBoards, setCommunityBoardStatus, planCommunityDeletion, applyCommunityDeletion, requireCommunityManager } from '../services/community/community-management.service.js';

/** Independent community only. Business spaces and retired catalog codes cannot enter this mount. */
export function createCommunityManagementRoutes(authenticate: RequestHandler) {
  const router = Router();
  router.use('/community/management', apiLimiter, authenticate);
  router.param('id', (req, res, next, id) => {
    if (!/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(id)) { res.status(400).json({ success:false, code:'INVALID_RESOURCE_ID', error:'대상을 확인해 주세요.' }); return; }
    next();
  });
  const run = (fn: (req: AuthRequest) => Promise<unknown>): RequestHandler => asyncHandler(async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try { res.json({ success: true, data: await fn(req as AuthRequest) }); }
    catch (error) {
      if (sendDemoAccountForbidden(res, error)) return;
      if (error instanceof CommunityManagementError) { res.status(error.status).json({ success: false, code: error.code, error: error.message }); return; }
      if ((error as {code?: string}).code === '40001') { res.status(409).json({success:false,code:'DELETION_PLAN_CHANGED',error:'데이터가 변경되었습니다. 다시 확인해 주세요.'}); return; }
      throw error;
    }
  });
  router.get('/community/management/boards', run(req => listManagedCommunityBoards(AppDataSource, req.user!.id)));
  router.patch('/community/management/boards/:id/status', run(req => AppDataSource.transaction('SERIALIZABLE', m => setCommunityBoardStatus(m, req.user!.id, req.params.id, req.body?.status))));
  for (const kind of ['boards','members'] as const) {
    router.get(`/community/management/${kind}/:id/deletion-plan`, run(req => AppDataSource.transaction('REPEATABLE READ', m => planCommunityDeletion(m, req.user!.id, kind, req.params.id))));
    router.delete(`/community/management/${kind}/:id`, run(req => {
      return AppDataSource.transaction('SERIALIZABLE', async m => {
        await requireCommunityManager(m, req.user!.id, true);
        if (kind === 'members') await demoAccountService.assertNotDemoAccount(req.params.id, m);
        return applyCommunityDeletion(m, req.user!.id, kind, req.params.id, req.body?.expectedDigest);
      });
    }));
  }
  return router;
}
