import express from 'express';
import request from 'supertest';
import type { DataSource } from 'typeorm';
import { createStoreHubController } from '../routes/o4o-store/controllers/store-hub.controller.js';
import { requireAuth } from '../common/middleware/auth/authentication.middleware.js';
import { AppDataSource } from '../database/connection.js';
import { verifyAccessToken } from '../utils/token.utils.js';
import { isBrowserSessionLive } from '../services/auth/browser-session.service.js';
import { roleAssignmentService } from '../modules/auth/services/role-assignment.service.js';
import { policyAcceptanceService } from '../modules/policy-acceptance/policy-acceptance.service.js';
import { hasApprovedPharmacist } from '../services/qualifications/pharmacist-qualification.service.js';
import { resolveStoreOrganization } from '../utils/store-organization.resolver.js';
import { createPolicyExecutor } from '../modules/ai-policy/ai-policy-factory.js';

// Keep the actual router, authentication middleware, workspace guards and AI handler.
// Only external identity/storage/provider boundaries use synthetic fixtures.
jest.mock('../utils/token.utils.js', () => ({ verifyAccessToken: jest.fn() }));
jest.mock('../services/auth/browser-session.service.js', () => ({ isBrowserSessionLive: jest.fn() }));
jest.mock('../modules/auth/services/role-assignment.service.js', () => ({ roleAssignmentService: { getRoleNames: jest.fn() } }));
jest.mock('../modules/policy-acceptance/policy-acceptance.service.js', () => ({ policyAcceptanceService: {
  getEnforcedPendingForUser: jest.fn(), getPendingStoreOwnerAgreementsForUser: jest.fn(),
} }));
jest.mock('../services/qualifications/pharmacist-qualification.service.js', () => ({ hasApprovedPharmacist: jest.fn() }));
jest.mock('../utils/store-organization.resolver.js', () => ({
  ...jest.requireActual('../utils/store-organization.resolver.js'), resolveStoreOrganization: jest.fn(),
}));
jest.mock('../modules/ai-policy/ai-policy-factory.js', () => ({ createPolicyExecutor: jest.fn() }));

const actorId = '20000000-0000-4000-8000-000000000001';
const storeId = '30000000-0000-4000-8000-000000000001';
const otherStoreId = '30000000-0000-4000-8000-000000000002';
const endpoint = '/api/v1/kpa/store-hub/ai-overview';
const query = jest.fn();
const findUser = jest.fn();
const execute = jest.fn();
const db = { query } as unknown as DataSource;
const app = express().use(express.json());
app.use('/api/v1/kpa/store-hub', createStoreHubController(db, requireAuth as express.RequestHandler, 'kpa'));
const resolved = { status: 'resolved', organizationId: storeId, memberRole: 'owner', candidateCount: 1 };
const none = { status: 'none', organizationId: null, memberRole: '', candidateCount: 0 };

function authenticated() {
  return request(app).post(endpoint)
    .set('Authorization', 'Bearer synthetic-session')
    .set('x-store-organization-id', storeId);
}
function expectNoOverviewWork() {
  expect(query.mock.calls.filter(([sql]: [string]) => sql.includes('COUNT('))).toEqual([]);
  expect(execute).not.toHaveBeenCalled();
}

beforeEach(() => {
  jest.resetAllMocks();
  (AppDataSource.getRepository as jest.Mock).mockReturnValue({ findOne: findUser });
  findUser.mockResolvedValue({ id: actorId, isActive: true, status: 'approved' });
  (verifyAccessToken as jest.Mock).mockImplementation(token => token === 'synthetic-session'
    ? { userId: actorId, tokenType: 'user', serviceKey: 'neture', authMethod: 'password' } : null);
  (isBrowserSessionLive as jest.Mock).mockResolvedValue(true);
  (roleAssignmentService.getRoleNames as jest.Mock).mockResolvedValue(['neture:store_owner']);
  (policyAcceptanceService.getEnforcedPendingForUser as jest.Mock).mockResolvedValue([]);
  (policyAcceptanceService.getPendingStoreOwnerAgreementsForUser as jest.Mock).mockResolvedValue([]);
  (hasApprovedPharmacist as jest.Mock).mockResolvedValue(true);
  (resolveStoreOrganization as jest.Mock).mockImplementation(async (_db, _actor, _service, preferred) =>
    preferred && preferred !== storeId ? none : resolved);
  // Staff/role/relationship reads are empty for the owner fixture; all actual evidence is store-bound.
  query.mockImplementation(async (sql: string) => sql.includes('COUNT(') ? [{ count: 2 }] : []);
  (createPolicyExecutor as jest.Mock).mockReturnValue({ execute });
  execute.mockResolvedValue({ content: JSON.stringify({ summary: '합성 매장 현황', recommendedActions: ['매장 자료 확인'], confidenceScore: 0.5, riskLevel: 'low' }),
    provider: 'fixture', model: 'fixture', requestId: 'fixture', promptTokens: 1, completionTokens: 1 });
});

it('authenticates the Bearer request through the real router before loading its selected store', async () => {
  const response = await authenticated().send({}).expect(200);
  expect(verifyAccessToken).toHaveBeenCalledWith('synthetic-session');
  expect(findUser).toHaveBeenCalledWith({ where: { id: actorId }, relations: ['linkedAccounts'] });
  expect(response.body.data.organizationId).toBe(storeId);
  expect(response.headers['cache-control']).toBe('private, no-store');
  const evidenceCalls = query.mock.calls.filter(([sql]: [string]) => sql.includes('COUNT('));
  expect(evidenceCalls).toHaveLength(4);
  for (const [, params] of evidenceCalls) expect(params).toEqual([storeId]);
  expect(execute).toHaveBeenCalledTimes(1);
  expect(execute).toHaveBeenCalledWith('STORE_INSIGHT', expect.any(String), expect.any(String), expect.objectContaining({ userId: actorId }));
});

it('keeps approved staff access and rejects the same staff after relationship revocation', async () => {
  (roleAssignmentService.getRoleNames as jest.Mock).mockResolvedValue(['kpa:store_member']);
  (resolveStoreOrganization as jest.Mock).mockResolvedValue(none);
  query.mockImplementation(async (sql: string) => sql.includes('COUNT(') ? [{ count: 2 }] : [{ organization_id: storeId }]);
  await authenticated().send({}).expect(200);
  expect(execute).toHaveBeenCalledTimes(1);
  query.mockClear(); execute.mockClear();
  query.mockImplementation(async () => []);
  await authenticated().send({}).expect(403);
  expectNoOverviewWork();
});

it('rejects a missing token before any private lookup', async () => {
  const response = await request(app).post(endpoint).send({}).expect(401);
  expect(response.body.code).toBe('AUTH_REQUIRED');
  expect(findUser).not.toHaveBeenCalled();
  expect(query).not.toHaveBeenCalled();
  expectNoOverviewWork();
});

it('rejects an invalid or expired token at authentication rather than relying on prefilled req.user', async () => {
  const response = await request(app).post(endpoint).set('Authorization', 'Bearer invalid-fixture').send({}).expect(401);
  expect(response.body.code).toBe('INVALID_TOKEN');
  expect(verifyAccessToken).toHaveBeenCalledWith('invalid-fixture');
  expect(findUser).not.toHaveBeenCalled();
  expect(query).not.toHaveBeenCalled();
  expectNoOverviewWork();
});

it('keeps a revoked browser session blocked before store or AI work', async () => {
  (isBrowserSessionLive as jest.Mock).mockResolvedValue(false);
  const response = await authenticated().send({}).expect(401);
  expect(response.body.code).toBe('SESSION_REVOKED');
  expect(query).not.toHaveBeenCalled();
  expectNoOverviewWork();
});

it('keeps suspended accounts blocked at the central authentication boundary', async () => {
  findUser.mockResolvedValue({ id: actorId, isActive: true, status: 'suspended' });
  const response = await authenticated().send({}).expect(403);
  expect(response.body.code).toBe('ACCOUNT_NOT_ACTIVE');
  expect(query).not.toHaveBeenCalled();
  expectNoOverviewWork();
});

it('preserves required terms acceptance before private store reads', async () => {
  (policyAcceptanceService.getEnforcedPendingForUser as jest.Mock).mockResolvedValue([{ serviceKey: 'neture', version: 'fixture' }]);
  const response = await authenticated().send({}).expect(428);
  expect(response.body.code).toBe('TERMS_ACCEPTANCE_REQUIRED');
  expect(query).not.toHaveBeenCalled();
  expectNoOverviewWork();
});

it('rejects an unauthorized selected store without loading its evidence', async () => {
  await request(app).post(endpoint).set('Authorization', 'Bearer synthetic-session')
    .set('x-store-organization-id', otherStoreId).send({}).expect(403);
  expect(resolveStoreOrganization).toHaveBeenCalledWith(db, actorId, 'kpa', otherStoreId);
  expectNoOverviewWork();
});

it('does not accept a different resolved store as the selected workspace', async () => {
  (resolveStoreOrganization as jest.Mock).mockResolvedValue({ ...resolved, organizationId: otherStoreId });
  const response = await authenticated().send({}).expect(403);
  expect(response.body.code).toBe('STORE_ACCESS_REQUIRED');
  expectNoOverviewWork();
});

it('preserves the pharmacist qualification boundary', async () => {
  (hasApprovedPharmacist as jest.Mock).mockResolvedValue(false);
  const response = await authenticated().send({}).expect(403);
  expect(response.body.code).toBe('PHARMACIST_QUALIFICATION_REQUIRED');
  expectNoOverviewWork();
});

it('preserves the store owner agreement boundary', async () => {
  (policyAcceptanceService.getPendingStoreOwnerAgreementsForUser as jest.Mock).mockResolvedValue([{ serviceKey: 'neture', version: 'fixture' }]);
  const response = await authenticated().send({}).expect(428);
  expect(response.body.code).toBe('STORE_OWNER_AGREEMENT_REQUIRED');
  expectNoOverviewWork();
});

it('rechecks access after the workspace guard before loading private metrics', async () => {
  (resolveStoreOrganization as jest.Mock).mockResolvedValueOnce(resolved).mockResolvedValueOnce(resolved).mockResolvedValue(none);
  const response = await authenticated().send({}).expect(403);
  expect(response.body.errorCode).toBe('ACCESS_DENIED');
  expectNoOverviewWork();
});

it('rejects client-supplied metrics and scope through the actual router', async () => {
  await authenticated().send({ organizationId: otherStoreId, metrics: { products: 999 } }).expect(400);
  expectNoOverviewWork();
});

it('returns provider failure without reporting a successful explanation', async () => {
  execute.mockRejectedValue(new Error('synthetic-provider-failure'));
  const response = await authenticated().send({}).expect(503);
  expect(response.body.success).toBe(false);
  expect(response.body.data).toBeUndefined();
  expect(JSON.stringify(response.body)).not.toContain('synthetic-provider-failure');
});

it('preserves the AI quota denial without returning a successful explanation', async () => {
  execute.mockRejectedValue(new Error('QUOTA_EXCEEDED'));
  const response = await authenticated().send({}).expect(429);
  expect(response.body.errorCode).toBe('QUOTA_EXCEEDED');
  expect(response.body.data).toBeUndefined();
});

it('does not invoke AI when every evidence source is unavailable', async () => {
  query.mockImplementation(async (sql: string) => {
    if (sql.includes('COUNT(')) throw new Error('synthetic-private-query-failure');
    return [];
  });
  const response = await authenticated().send({}).expect(503);
  expect(response.body.errorCode).toBe('METRICS_UNAVAILABLE');
  expect(execute).not.toHaveBeenCalled();
  expect(JSON.stringify(response.body)).not.toContain('synthetic-private-query-failure');
});

it('keeps existing authenticated live-signals GET working without an AI call', async () => {
  const response = await request(app).get('/api/v1/kpa/store-hub/live-signals')
    .set('Authorization', 'Bearer synthetic-session').set('x-store-organization-id', storeId).expect(200);
  expect(response.body.data.newOrders).toBe(2);
  expect(execute).not.toHaveBeenCalled();
  expect(verifyAccessToken).toHaveBeenCalledTimes(1);
  await request(app).get('/api/v1/kpa/store-hub/live-signals').expect(401);
});
