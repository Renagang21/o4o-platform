import { Router, type RequestHandler } from 'express';
import { AppDataSource } from '../database/connection.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { apiLimiter } from '../middleware/rateLimiter.js';
import type { AuthRequest } from '../types/auth.js';
import { freshenUserContext } from '../services/auth/auth-context.helper.js';
import type { CommunityAccessUser } from '../utils/community-access.resolver.js';
import { PolicyAcceptanceError } from '../modules/policy-acceptance/policy-acceptance.service.js';
import { requestCommunityServiceMembership } from '../services/community/community-service-membership.js';
import { forumRequestService } from '../services/forum/ForumRequestService.js';
import { createServiceForumRouter } from './forum/service-forum.routes.js';
import { createCommunityManagementRoutes } from './community-management.routes.js';
import { createCommunityPublicReadRoutes } from './community-public-read.routes.js';
import { listCommunityWorkspaces, resolveCommunityWorkspace, createCommunityBoard } from '../services/community/community-workspace.service.js';

async function currentCommunityUser(req: AuthRequest): Promise<CommunityAccessUser | null> {
  if (!req.user?.id) return null;
  const fresh = await freshenUserContext(req.user.id);
  return { id: req.user.id, roles: fresh.roles, memberships: fresh.memberships };
}
const bodyOf = (req: { body?: unknown }): Record<string, unknown> => (req.body ?? {}) as Record<string, unknown>;
const trimmed = (v: unknown): string => typeof v === 'string' ? v.trim() : '';

/** One independent community service; business spaces retain their own resolver. */
export function createCommunitiesRoutes(optionalAuth: RequestHandler, authenticate: RequestHandler): Router {
  const router = Router({ mergeParams: true });
  // Retired creation/entity membership APIs stay unavailable, including stale bookmarked mutations.
  router.use((req, res, next) => {
    if (/^\/(requests|operating|admin)(?:\/|$)/.test(req.path) || /^\/[^/]+\/(join|leave|memberships)(?:\/|$)/.test(req.path)) {
      res.status(410).json({ success: false, code: 'COMMUNITY_ENTITY_RETIRED', error: '개별 커뮤니티 개설·가입 기능은 종료되었습니다. 커뮤니티 서비스의 회원 기능을 이용해 주세요.' });
      return;
    }
    next();
  });
  router.use(createCommunityManagementRoutes(authenticate));
  router.use(createCommunityPublicReadRoutes(authenticate, req => currentCommunityUser(req as AuthRequest)));
  router.get('/', optionalAuth, asyncHandler(async (req, res) => {
    res.json({ success: true, data: { communities: await listCommunityWorkspaces(AppDataSource, await currentCommunityUser(req as AuthRequest)) } });
  }));
  router.post('/join', apiLimiter, authenticate, asyncHandler(async (req, res) => {
    try {
      const result = await AppDataSource.transaction(m => requestCommunityServiceMembership(m, (req as AuthRequest).user!.id, req.body?.policyReferences));
      res.json({ success: true, data: result });
    } catch (error) {
      if (!(error instanceof PolicyAcceptanceError)) throw error;
      res.status(error.httpStatus).json({ success: false, code: error.code, error: error.message });
    }
  }));

  // Forum creation requests keep the existing state machine and historical storage codes.
  // Scope is always resolved on the server, never from client serviceCode/organizationId.
  router.all('/:communityKey/board-requests/:requestId?', apiLimiter, authenticate, asyncHandler(async (req, res) => {
    const user = await currentCommunityUser(req as AuthRequest);
    const workspace = await resolveCommunityWorkspace(AppDataSource, user, req.params.communityKey);
    if (!workspace?.allowed) { res.status(403).json({ success: false, code: 'COMMUNITY_ACCESS_REQUIRED' }); return; }
    const reviewer = { id: user!.id!, name: (req as AuthRequest).user?.name, email: (req as AuthRequest).user?.email };
    const body = bodyOf(req);
    let result: any;
    if (req.method === 'GET') {
      if (req.query.review === 'true' && !workspace.canManage) { res.status(403).json({ success: false, code: 'COMMUNITY_OPERATOR_REQUIRED' }); return; }
      const results = await Promise.all(workspace.forumStorageCodes.map(serviceCode =>
        req.query.review === 'true' ? forumRequestService.listByService({ serviceCode, status: 'pending', limit: 100 })
          : forumRequestService.listMy(user!.id!, serviceCode)));
      const failed = results.find(r => 'error' in r);
      if (failed) result = failed;
      else result = { data: results.flatMap(r => 'data' in r ? Array.isArray(r.data) ? r.data : r.data.data ?? [] : []) };
    } else if (req.method === 'POST' && !req.params.requestId) {
      result = await forumRequestService.create(reviewer, {
        serviceCode: workspace.forumStorageCodes[0], name: trimmed(body.name), description: trimmed(body.description),
        reason: trimmed(body.reason), forumType: body.forumType === 'closed' ? 'closed' : 'open',
        tags: Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === 'string') : [],
      });
    } else if (req.method === 'PATCH' && req.params.requestId && workspace.canManage) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.requestId)) {
        res.status(400).json({ success: false, code: 'INVALID_REQUEST_ID' }); return;
      }
      if (!['approve', 'reject', 'revision'].includes(String(body.action))) { res.status(400).json({ success: false, code: 'INVALID_ACTION' }); return; }
      const [row] = await AppDataSource.query('SELECT service_code FROM forum_category_requests WHERE id = $1::uuid AND service_code = ANY($2::text[])', [req.params.requestId, workspace.forumStorageCodes]);
      if (!row) { res.status(404).json({ success: false, code: 'REQUEST_NOT_FOUND' }); return; }
      result = await forumRequestService.review(req.params.requestId, row.service_code, reviewer, { action: body.action as 'approve' | 'reject' | 'revision', reviewComment: trimmed(body.reviewComment) });
    } else { res.status(403).json({ success: false, code: 'COMMUNITY_OPERATOR_REQUIRED' }); return; }
    if ('error' in result) { res.status(result.error.status).json({ success: false, error: result.error.message, code: result.error.code }); return; }
    res.status(req.method === 'POST' ? 201 : 200).json({ success: true, data: result.data });
  }));

  router.post('/:communityKey/boards', apiLimiter, authenticate, asyncHandler(async (req, res) => {
    const user = await currentCommunityUser(req as AuthRequest);
    const board = await AppDataSource.transaction(async (m) => {
      const workspace = await resolveCommunityWorkspace(m, user, req.params.communityKey);
      if (!workspace?.allowed || !workspace.canManage) return null;
      return createCommunityBoard(m, workspace, user!.id!, bodyOf(req));
    }).catch(error => {
      if (error.message === 'INVALID_BOARD_NAME') return 'invalid' as const;
      throw error;
    });
    if (!board) { res.status(403).json({ success: false, code: 'COMMUNITY_OPERATOR_REQUIRED' }); return; }
    if (board === 'invalid') { res.status(400).json({ success: false, code: 'INVALID_BOARD_NAME' }); return; }
    res.status(201).json({ success: true, data: board });
  }));

  router.use('/:communityKey/forum', createServiceForumRouter({
    context: { scope: 'community' },
    resolveContext: async (req, res, next) => {
      try {
        const user = await currentCommunityUser(req as AuthRequest);
        const workspace = await resolveCommunityWorkspace(AppDataSource, user, req.params.communityKey);
        if (!workspace?.allowed) {
          res.status(workspace ? 403 : 404).json({ success: false, code: workspace?.reason ?? 'COMMUNITY_NOT_FOUND' }); return;
        }
        req.forumContext = { communityKey: workspace.communityKey, forumStorageCodes: workspace.forumStorageCodes,
          communityOperator: workspace.canManage, scope: 'community' };
        next();
      } catch (error) { next(error); }
    },
  }));

  router.get(
    '/:communityKey/access',
    optionalAuth,
    asyncHandler(async (req, res) => {
      const user = await currentCommunityUser(req as AuthRequest);
      const communityKey = String(req.params.communityKey ?? '');
      const access = await resolveCommunityWorkspace(AppDataSource, user, communityKey);
      if (!access) {
        res.status(404).json({ success: false, error: 'Community not found', code: 'COMMUNITY_NOT_FOUND' });
        return;
      }
      res.json({ success: true, data: access });
    }),
  );

  return router;
}
