import { Router, type RequestHandler } from 'express';
import type { AuthRequest } from '../types/auth.js';
import { AppDataSource } from '../database/connection.js';
import { apiLimiter } from '../middleware/rateLimiter.js';
import { CommunityManagementError, requireCommunityManager } from '../services/community/community-management.service.js';
import { OperationError } from '../services/operations/operation-audit.js';
import { assertCentralOperationRequest } from '../services/admin/central-operation-menu-grants.js';
import { centralRequestAuthMethod } from '../middleware/central-operation-menu.middleware.js';
import type { CommunityAccessUser } from '../utils/community-access.resolver.js';
import { listImprovements, getImprovement, setupImprovements, createImprovement, replyImprovement, editImprovement } from '../services/community/community-improvements.js';

export function createCommunityImprovementRoutes(optional: RequestHandler, authenticate: RequestHandler, currentUser: (req: AuthRequest) => Promise<CommunityAccessUser | null>) {
  const router = Router();
  const run = (operation: (req: AuthRequest) => Promise<unknown>, status = 200): RequestHandler => async (req, res, next) => {
    res.setHeader('Cache-Control', 'private, no-store');
    try { res.status(status).json({ success: true, data: await operation(req as AuthRequest) }); }
    catch (error) {
      if (error instanceof CommunityManagementError || error instanceof OperationError) res.status(error.status).json({ success: false, code: error.code, error: error.message });
      else next(error);
    }
  };
  const manage = async (req: AuthRequest) => {
    if (!req.user?.id) throw new CommunityManagementError(401, 'AUTH_REQUIRED', '로그인해 주세요.');
    if (centralRequestAuthMethod(req) !== 'google') throw new CommunityManagementError(403, 'GOOGLE_SESSION_REQUIRED', '공식 운영 업무는 Google로 로그인해 주세요.');
    await requireCommunityManager(AppDataSource, req.user!.id, false, 'forums');
    await assertCentralOperationRequest(AppDataSource, req.user!.id, 'community', ['community.forums'], centralRequestAuthMethod(req));
  };
  const prefix = '/community/improvements';
  router.get(prefix, apiLimiter, optional, run(async req => {
    if (req.query.pending === 'true') await manage(req);
    return listImprovements(AppDataSource, await currentUser(req), req.query.page, req.query.kind, req.query.pending === 'true');
  }));
  router.post(`${prefix}/setup`, apiLimiter, authenticate, run(async req => {
    await manage(req);
    return AppDataSource.transaction(async db => setupImprovements(db, (await currentUser(req))!));
  }, 201));
  router.get(`${prefix}/:id`, apiLimiter, optional, run(async req => getImprovement(AppDataSource, await currentUser(req), req.params.id)));
  router.post(prefix, apiLimiter, authenticate, run(async req => {
    if (req.body?.kind === 'update') await manage(req);
    const user = (await currentUser(req))!;
    return AppDataSource.transaction(db => createImprovement(db, user, req.body ?? {}));
  }, 201));
  router.patch(`${prefix}/:id`, apiLimiter, authenticate, run(async req => {
    // Update notices retain the same Google management proof as creation.
    const existing = await getImprovement(AppDataSource, await currentUser(req), req.params.id);
    if (existing.kind === 'update') await manage(req);
    const user = (await currentUser(req))!;
    return AppDataSource.transaction(db => editImprovement(db, user, req.params.id, req.body ?? {}));
  }));
  router.post(`${prefix}/:id/replies`, apiLimiter, authenticate, run(async req => {
    const official = req.body?.official === true;
    if (official) await manage(req);
    const user = (await currentUser(req))!;
    return AppDataSource.transaction(db => replyImprovement(db, user, req.params.id, req.body ?? {}, official));
  }));
  return router;
}
