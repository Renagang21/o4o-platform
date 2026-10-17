import express, { Router, type RequestHandler } from 'express';
import request from 'supertest';
jest.mock('../../database/connection.js', () => ({ AppDataSource: { transaction: jest.fn(async run => run({ query: jest.fn() })) } }));
jest.mock('../../services/forum/ForumRequestService.js', () => ({ forumRequestService: {} }));
jest.mock('../forum/service-forum.routes.js', () => ({ createServiceForumRouter: () => Router() }));
jest.mock('../../services/auth/auth-context.helper.js', () => ({ freshenUserContext: async () => ({ roles: [], memberships: [] }) }));
jest.mock('../../services/community/community-service-membership.js', () => ({ requestCommunityServiceMembership: jest.fn(async () => ({ status: 'pending', requestSubmitted: true })) }));
jest.mock('../../services/community/community-workspace.service.js', () => ({
 listCommunityWorkspaces: jest.fn(async () => [{ communityKey: 'community' }]),
 resolveCommunityWorkspace: jest.fn(async (_exec, _user, key) => key === 'community' ? { communityKey: key, allowed: false, kind: 'independent', communityStatus: 'active', forumStorageCodes: ['community'] } : null),
 createCommunityBoard: jest.fn(),
}));
import { createCommunitiesRoutes } from '../communities.routes.js';
import { requestCommunityServiceMembership } from '../../services/community/community-service-membership.js';
import { PolicyAcceptanceError } from '../../modules/policy-acceptance/policy-acceptance.service.js';
const optionalAuth: RequestHandler = (_req, _res, next) => next();
const authenticate: RequestHandler = (req, res, next) => {
 if (!req.headers['x-test-user']) { res.status(401).json({ code: 'AUTH_REQUIRED' }); return; }
 (req as any).user = { id: 'session-user' }; next();
};
function app() {
 const a = express(); a.use(express.json()); a.use('/communities', createCommunitiesRoutes(optionalAuth, authenticate)); return a;
}
beforeEach(() => jest.clearAllMocks());
it('returns one service rather than the former directory', async () => {
 const res = await request(app()).get('/communities');
 expect(res.status).toBe(200); expect(res.body.data.communities).toEqual([{ communityKey: 'community' }]);
});
it.each(['/requests', '/requests/mine', '/operating', '/admin/communities', '/pharmacy/memberships', '/pharmacy/join', '/pharmacy/leave'])('returns gone for retired entity route %s', async path => {
 const res = await request(app()).post('/communities' + path).send({ userId: 'forged' });
 expect(res.status).toBe(410); expect(res.body.code).toBe('COMMUNITY_ENTITY_RETIRED');
 expect(requestCommunityServiceMembership).not.toHaveBeenCalled();
});
it('requires authentication before service enrollment', async () => {
 expect((await request(app()).post('/communities/join')).status).toBe(401);
 expect(requestCommunityServiceMembership).not.toHaveBeenCalled();
});
it('uses session identity and transactional enrollment', async () => {
 const res = await request(app()).post('/communities/join').set('x-test-user', 'yes').send({ userId: 'forged', policyReferences: [] });
 expect(res.status).toBe(200); expect(res.body.data.status).toBe('pending');
 expect(requestCommunityServiceMembership).toHaveBeenCalledWith(expect.anything(), 'session-user', []);
});
it('preserves policy errors', async () => {
 (requestCommunityServiceMembership as jest.Mock).mockRejectedValueOnce(new PolicyAcceptanceError('ENROLLMENT_POLICY_REQUIRED', 'policy required', 409));
 const res = await request(app()).post('/communities/join').set('x-test-user', 'yes');
 expect(res.status).toBe(409); expect(res.body.code).toBe('ENROLLMENT_POLICY_REQUIRED');
});
it.each(['pharmacy', 'cosmetics', 'o4o-general'])('does not serve retired %s access or public content', async key => {
 expect((await request(app()).get(`/communities/${key}/access`)).status).toBe(404);
 expect((await request(app()).get(`/communities/${key}/public/posts`)).status).toBe(404);
});
