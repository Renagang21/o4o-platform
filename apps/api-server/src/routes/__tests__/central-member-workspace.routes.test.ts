import express from 'express';
import request from 'supertest';
const list = jest.fn(), detail = jest.fn(), correct = jest.fn();
jest.mock('../../database/connection.js', () => ({ AppDataSource: {} }));
jest.mock('../../middleware/rateLimiter.js', () => ({ apiLimiter: (_req: any, _res: any, next: any) => next() }));
jest.mock('../../middleware/auth.middleware.js', () => ({ authenticate: (req: any, res: any, next: any) => {
  if (!req.headers['x-user']) return res.sendStatus(401);
  req.user = { id: req.headers['x-user'] }; req.authMethod = req.headers['x-method']; next();
} }));
jest.mock('../../services/admin/central-member-workspace.service.js', () => ({ CentralMemberWorkspaceService: jest.fn().mockImplementation(() => ({ list, detail, correct })) }));
import { pharmacistQualificationsRouter } from '../pharmacist-qualifications.routes.js';
import { OperationError } from '../../services/operations/operation-audit.js';
const app = express(); app.use(express.json()); app.use('/qualifications', pharmacistQualificationsRouter);
const actor = '11111111-1111-4111-8111-111111111111', target = '22222222-2222-4222-8222-222222222222';
const path = `/qualifications/members/${target}`;
const input = { name: '합성 회원', nickname: '', phone: '', reason: '본인 정정 요청 확인', version: '2026-11-01T00:00:00.000001' };
beforeEach(() => { jest.clearAllMocks(); list.mockResolvedValue({ items: [] }); detail.mockResolvedValue({ member: { userId: target } }); correct.mockResolvedValue({ saved: true }); });
it('requires a Google central session for list, detail and profile correction', async () => {
  expect((await request(app).get(path)).status).toBe(401);
  for (const method of ['password', 'kakao']) {
    expect((await request(app).get('/qualifications/members').set('x-user', actor).set('x-method', method)).status).toBe(403);
    expect((await request(app).get(path).set('x-user', actor).set('x-method', method)).status).toBe(403);
    expect((await request(app).patch(path).set('x-user', actor).set('x-method', method).send(input)).status).toBe(403);
  }
  expect(list).not.toHaveBeenCalled(); expect(detail).not.toHaveBeenCalled(); expect(correct).not.toHaveBeenCalled();
});
it('passes bounded task filters and the authenticated actor to the workspace service', async () => {
  const response = await request(app).get('/qualifications/members?task=pharmacies&page=2&q=member').set('x-user', actor).set('x-method', 'google');
  expect(response.status).toBe(200); expect(response.headers['cache-control']).toContain('no-store');
  expect(list).toHaveBeenCalledWith(actor, 'pharmacies', 2, 'member');
  for (const query of ['task=unknown', 'page=0', 'page=NaN', 'scope=all']) expect((await request(app).get(`/qualifications/members?${query}`).set('x-user', actor).set('x-method', 'google')).status).toBe(400);
});
it('rejects privilege/identity fields, missing reasons and stale-version shapes without writing', async () => {
  for (const extra of [{ role: 'platform:super_admin' }, { email: 'other@example.test' }, { licenseNumber: 'fixture' }, { accountStatus: 'approved' }, { reason: '' }, { version: 'invalid' }]) {
    expect((await request(app).patch(path).set('x-user', actor).set('x-method', 'google').send({ ...input, ...extra })).status).toBe(400);
  }
  expect(correct).not.toHaveBeenCalled();
  expect((await request(app).patch(path).set('x-user', actor).set('x-method', 'google').send(input)).status).toBe(200);
  expect(correct).toHaveBeenCalledWith(actor, target, input);
});
it('preserves service authority/conflict errors and redacts unexpected failures', async () => {
  detail.mockRejectedValueOnce(new OperationError(403, 'MEMBER_DIRECTORY_REQUIRED', '위임 필요'));
  expect((await request(app).get(path).set('x-user', actor).set('x-method', 'google')).status).toBe(403);
  correct.mockRejectedValueOnce(new OperationError(409, 'MEMBER_CHANGED', '다시 조회'));
  expect((await request(app).patch(path).set('x-user', actor).set('x-method', 'google').send(input)).status).toBe(409);
  detail.mockRejectedValueOnce(new Error('private database payload'));
  const response = await request(app).get(path).set('x-user', actor).set('x-method', 'google');
  expect(response.status).toBe(503); expect(JSON.stringify(response.body)).not.toContain('private');
});
