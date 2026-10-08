import express from 'express';
import request from 'supertest';
import { createServiceForumRouter } from '../routes/forum/service-forum.routes.js';
import { resolveCommunityWorkspace } from '../services/community/community-workspace.service.js';

// Only controllers and token decoding are doubled. The router and its
// community access middleware execute on real HTTP requests.
function mockController() {
  return class {
    constructor() {
      return new Proxy(this, { get: () => (_req: unknown, res: express.Response) => res.json({ reachedController: true }) });
    }
  };
}
jest.mock('../controllers/forum/ForumPostController.js', () => ({ ForumPostController: mockController() }));
jest.mock('../controllers/forum/ForumDirectoryController.js', () => ({ ForumDirectoryController: mockController() }));
jest.mock('../controllers/forum/ForumCommentController.js', () => ({ ForumCommentController: mockController() }));
jest.mock('../controllers/forum/ForumModerationController.js', () => ({ ForumModerationController: mockController() }));
jest.mock('../controllers/forum/ForumMembershipController.js', () => ({ ForumMembershipController: mockController() }));
jest.mock('../services/community/community-workspace.service.js', () => ({ resolveCommunityWorkspace: jest.fn() }));
jest.mock('../middleware/auth.middleware.js', () => ({
  optionalAuth: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (req.headers['x-test-user']) (req as any).user = { id: 'member' };
    next();
  },
  authenticate: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if ((req as any).user) next(); else res.sendStatus(401);
  },
}));

const endpoints = [
  ['get','/stats'], ['get','/categories'], ['get','/categories/popular'], ['get','/categories/board'],
  ['patch','/categories/board/owner'], ['post','/categories/board/delete-request'],
  ['post','/categories/board/join-requests'], ['get','/categories/board/join-requests'],
  ['post','/categories/board/join-requests/member/approve'], ['post','/categories/board/join-requests/member/reject'],
  ['get','/categories/board/members'], ['delete','/categories/board/members/member'], ['get','/categories/board/membership-status'],
] as const;

describe('Static community forum aliases enforce current approval before every controller', () => {
  const app = express().use('/forum', createServiceForumRouter({ context: { serviceCode: 'pharmacy-hub', communityKey: 'pharmacy', scope: 'community' } }));
  beforeEach(() => jest.clearAllMocks());

  it.each(endpoints)('%s %s denies anonymous and withdrawn users, then reaches the controller after approval', async (method, path) => {
    const anonymous = await request(app)[method]('/forum'+path);
    expect(anonymous.status).toBe(401);
    expect(resolveCommunityWorkspace).not.toHaveBeenCalled();
    (resolveCommunityWorkspace as jest.Mock).mockResolvedValue({ allowed: false, reason: 'COMMUNITY_MEMBERSHIP_REQUIRED' });
    expect((await request(app)[method]('/forum'+path).set('x-test-user','member')).status).toBe(403);
    (resolveCommunityWorkspace as jest.Mock).mockResolvedValue({ allowed: true });
    const approved = await request(app)[method]('/forum'+path).set('x-test-user','member');
    expect(approved.status).toBe(200);
    expect(approved.body.reachedController).toBe(true);
  });

  it('a non-community mount still accepts its independently resolved context', async () => {
    const separate = express().use(createServiceForumRouter({ context: { serviceCode: 'other-service' } }));
    expect((await request(separate).get('/stats')).status).toBe(200);
    expect(resolveCommunityWorkspace).not.toHaveBeenCalled();
  });
});
