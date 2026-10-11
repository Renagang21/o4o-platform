import express, { Router } from 'express';
import request from 'supertest';
jest.mock('../database/connection.js', () => ({ AppDataSource: {} }));
jest.mock('../services/funding/funding-access.js', () => ({ resolveFundingAccess: jest.fn() }));
jest.mock('../middleware/auth.middleware.js', () => ({ optionalAuth: (req: any, _res: any, next: any) => { req.user = { id: 'actor' }; next(); } }));
jest.mock('../services/funding/funding-forum-membership.service.js', () => ({ FundingForumMembershipService: class {
  request(...args: any[]) { return membership('request', ...args); }
  review(...args: any[]) { return membership('review', ...args); }
  remove(...args: any[]) { return membership('remove', ...args); }
} }));
jest.mock('../routes/forum/service-forum.routes.js', () => ({ createServiceForumRouter: () => {
  const router = Router({ mergeParams: true });
  router.all('/posts', (req, res) => res.json({ context: req.forumContext, forumId: req.query.forumId }));
  router.all('/categories/:id', (_req, res) => res.json({ success: true }));
  return router;
} }));
import { resolveFundingAccess } from '../services/funding/funding-access.js';
import { createFundingForumRoutes } from '../routes/funding-forum.routes.js';
const ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', BOARD = '11111111-2222-3333-4444-555555555555', REQUEST = '66666666-7777-8888-9999-aaaaaaaaaaaa';
const membership = jest.fn(async () => ({ status: 'approved' }));
const resolver = resolveFundingAccess as jest.Mock;
const app = express(); app.use(express.json()); app.use('/funding/:id/forum', createFundingForumRoutes());
beforeEach(() => { jest.clearAllMocks(); resolver.mockResolvedValue({ trial: { status: 'recruiting' }, forum: { id: BOARD }, creator: false, operator: false, participant: true, canRead: true, canWrite: true }); });
const path = (tail: string) => `/funding/${ID}/forum${tail}`;
it('pins list scope to the server board, including operators without member rows', async () => {
  resolver.mockResolvedValue({ trial: { status: 'recruiting' }, forum: { id: BOARD }, operator: true, canRead: true, canWrite: true });
  const result = await request(app).get(path('/posts?serviceCode=other&role=admin')).expect(200);
  expect(result.body).toMatchObject({ forumId: BOARD, context: { forumStorageCodes: [`funding:${ID}`], communityOperator: true } });
  await request(app).get(path('/posts?forumId=other')).expect(404);
});
it('pending participants can request access but cannot read the forum', async () => {
  resolver.mockResolvedValue({ trial: { status: 'recruiting' }, forum: { id: BOARD }, participant: true, canRead: false, canWrite: false });
  await request(app).get(path('/posts')).expect(403);
  await request(app).post(path(`/categories/${BOARD}/join-requests`)).expect(200);
  expect(membership).toHaveBeenCalledWith('request', ID, BOARD, 'actor');
});
it.each(['approve', 'reject'])('preserves parent funding identity in %s requests', async review => {
  await request(app).post(path(`/categories/${BOARD}/join-requests/${REQUEST}/${review}`)).send({ reviewComment: '검토' }).expect(200);
  expect(membership).toHaveBeenCalledWith('review', ID, BOARD, REQUEST, 'actor', review === 'approve', '검토');
});
it('rejects a board from another project and blocks closed membership writes', async () => {
  await request(app).post(path(`/categories/${REQUEST}/join-requests`)).expect(404);
  resolver.mockResolvedValue({ trial: { status: 'closed' }, forum: { id: BOARD }, creator: true, canRead: true, canWrite: false });
  await request(app).post(path(`/categories/${BOARD}/join-requests`)).expect(403);
  expect(membership).not.toHaveBeenCalled();
});
it.each([{ type: 'announcement' }, { isPinned: true }, { isLocked: false }])('does not let participants spoof notice/moderation fields: %p', async body => {
  await request(app).post(path('/posts')).send(body).expect(403);
});
it('fails closed after account/role revocation and for unrelated users', async () => {
  resolver.mockResolvedValue(null);
  await request(app).get(path('/posts')).expect(403);
  await request(app).post(path(`/categories/${BOARD}/join-requests`)).expect(403);
});
