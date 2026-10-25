import express from 'express';
import request from 'supertest';
import type { DataSource } from 'typeorm';
import { createStoreOverviewAiHandler } from '../routes/o4o-store/controllers/store-overview-ai.controller.js';
import { createSupplierCopilotRouter } from '../modules/neture/controllers/supplier-copilot.controller.js';
import { cooperativeManagementRoutes } from '../modules/neture-pharmacy/cooperative-management.routes.js';
import { resolveApprovedStoreMemberOrganization } from '../utils/store-member-access.js';
import { isStoreOwner } from '../utils/store-owner.utils.js';
import { resolveSupplierForUser } from '../modules/neture/middleware/supplier-context.resolver.js';
import { SupplierCopilotService } from '../modules/neture/services/supplier-copilot.service.js';
import { CooperativeManagementService } from '../modules/neture-pharmacy/services/cooperative-management.service.js';
import { NeturePharmacyError } from '../modules/neture-pharmacy/constants.js';
import { createPolicyExecutor } from '../modules/ai-policy/ai-policy-factory.js';

// Authentication is a fixture; live domain predicates and the actual Core/runtime/HTTP flow are exercised below.
jest.mock('../middleware/auth.middleware.js', () => ({ requireAuth: (req: any, res: any, next: any) => {
  if (!req.headers['x-fixture-actor']) return res.sendStatus(401);
  req.user = { id: 'actor-fixture' }; next();
} }));
jest.mock('../utils/store-member-access.js', () => ({ resolveApprovedStoreMemberOrganization: jest.fn() }));
jest.mock('../utils/store-owner.utils.js', () => ({ isStoreOwner: jest.fn() }));
jest.mock('../utils/supplier.utils.js', () => ({ createRequireSupplier: () => (_req: any, _res: any, next: any) => next() }));
jest.mock('../modules/neture/middleware/neture-identity.middleware.js', () => ({
  createRequireActiveSupplier: () => (req: any, _res: any, next: any) => { req.supplierId = 'supplier-fixture'; next(); },
}));
jest.mock('../modules/neture/middleware/supplier-context.resolver.js', () => ({ readOrganizationContext: () => 'server-context', resolveSupplierForUser: jest.fn() }));
jest.mock('../modules/neture/services/supplier-copilot.service.js');
jest.mock('../modules/neture-pharmacy/services/cooperative-management.service.js');
jest.mock('../modules/ai-policy/ai-policy-factory.js', () => ({ createPolicyExecutor: jest.fn() }));
const coop = '10000000-0000-4000-8000-000000000001';
const query = jest.fn();
const db = { query } as unknown as DataSource;
const execute = jest.fn();
const app = express().use(express.json());
app.post('/store/ai-overview', (req, _res, next) => {
  if (req.headers['x-fixture-actor']) { req.user = { id: 'actor-fixture' } as any; req.organizationId = 'organization-fixture'; }
  next();
}, createStoreOverviewAiHandler(db, 'kpa'));
app.use('/supplier', createSupplierCopilotRouter(db));
app.use('/cooperative', cooperativeManagementRoutes(db));
app.use((_error: unknown, _req: unknown, res: express.Response, next: unknown) => {
  void next;
  res.status(503).json({ success: false, code: 'UNAVAILABLE' });
});
beforeEach(() => {
  jest.clearAllMocks();
  (createPolicyExecutor as jest.Mock).mockReturnValue({ execute });
  execute.mockResolvedValue({ content: JSON.stringify({ summary: '합성 현황', recommendedActions: ['기존 업무 화면에서 확인'], confidenceScore: 0.5, riskLevel: 'low' }), provider: 'gemini', model: 'fixture', requestId: 'fixture', promptTokens: 1, completionTokens: 1 });
  query.mockImplementation(async (sql: string) => sql.includes('cooperative_memberships') ? [{ status: 'active', count: 2 }] : [{ count: 0 }]);
  (resolveApprovedStoreMemberOrganization as jest.Mock).mockResolvedValue('organization-fixture');
  (isStoreOwner as jest.Mock).mockResolvedValue({ isOwner: false });
  (resolveSupplierForUser as jest.Mock).mockResolvedValue({ kind: 'resolved', supplierId: 'supplier-fixture', status: 'ACTIVE' });
  (SupplierCopilotService.prototype.getKpiSummary as jest.Mock).mockResolvedValue({ registeredProducts: 2, activeProducts: 1, storeListings: 0, recentOrders: 0 });
  (CooperativeManagementService.prototype.requireLocal as jest.Mock).mockResolvedValue('operator');
});
it.each(['/store/ai-overview', '/supplier/copilot/ai-overview', `/cooperative/${coop}/ai-overview`])('denies an unauthenticated request to %s before private reads or AI', async path => {
  const response = await request(app).post(path).send({});
  expect([401, 403]).toContain(response.status);
  expect(query).not.toHaveBeenCalled(); expect(execute).not.toHaveBeenCalled();
});
it.each(['/store/ai-overview', '/supplier/copilot/ai-overview', `/cooperative/${coop}/ai-overview`])('rejects client-provided metrics and scope at %s', async path => {
  await request(app).post(path).set('x-fixture-actor', 'present').send({ organizationId: 'other', metrics: { total: 999 } }).expect(400);
  expect(query).not.toHaveBeenCalled(); expect(execute).not.toHaveBeenCalled();
});
it('binds the store to the server-selected organization and current member access', async () => {
  const reply = await request(app).post('/store/ai-overview').set('x-fixture-actor', 'present').send({}).expect(200);
  expect(reply.body.data.organizationId).toBe('organization-fixture');
  expect(reply.headers['cache-control']).toBe('private, no-store');
  expect(resolveApprovedStoreMemberOrganization).toHaveBeenCalledWith(db, 'actor-fixture', 'kpa', 'organization-fixture');
  for (const call of query.mock.calls) expect(call[1]).toEqual(['organization-fixture']);
  expect(execute).toHaveBeenCalledWith('STORE_INSIGHT', expect.any(String), expect.any(String), expect.objectContaining({ userId: 'actor-fixture', serviceKey: 'kpa-society' }));
});
it('does not read another store when membership and ownership do not match', async () => {
  (resolveApprovedStoreMemberOrganization as jest.Mock).mockResolvedValue('other-store');
  (isStoreOwner as jest.Mock).mockResolvedValue({ isOwner: true, organizationId: 'other-store' });
  await request(app).post('/store/ai-overview').set('x-fixture-actor', 'present').send({}).expect(403);
  expect(query).not.toHaveBeenCalled(); expect(execute).not.toHaveBeenCalled();
});
it('refuses a supplier whose current identity or active state changed', async () => {
  (resolveSupplierForUser as jest.Mock).mockResolvedValue({ kind: 'resolved', supplierId: 'supplier-fixture', status: 'SUSPENDED' });
  await request(app).post('/supplier/copilot/ai-overview').set('x-fixture-actor', 'present').send({}).expect(403);
  expect(SupplierCopilotService.prototype.getKpiSummary).not.toHaveBeenCalled(); expect(execute).not.toHaveBeenCalled();
});
it('loads only the supplier selected by the active supplier guard and attributes policy usage', async () => {
  const reply = await request(app).post('/supplier/copilot/ai-overview').set('x-fixture-actor', 'present').send({}).expect(200);
  expect(reply.body.data.supplierId).toBe('supplier-fixture');
  expect(SupplierCopilotService.prototype.getKpiSummary).toHaveBeenCalledWith('supplier-fixture');
  expect(execute).toHaveBeenCalledWith('OPERATOR_INSIGHT', expect.any(String), expect.any(String), expect.objectContaining({ usage: 'supplier.overview', serviceKey: 'supplier', userId: 'actor-fixture' }));
});
it('requires the current local cooperative role before querying aggregate membership data', async () => {
  (CooperativeManagementService.prototype.requireLocal as jest.Mock).mockRejectedValue(new NeturePharmacyError(403, 'ACCESS_DENIED', '접근 불가'));
  await request(app).post(`/cooperative/${coop}/ai-overview`).set('x-fixture-actor', 'present').send({}).expect(403);
  expect(query).not.toHaveBeenCalled(); expect(execute).not.toHaveBeenCalled();
});
it('keeps cooperative aggregate reads scoped and does not fabricate zero after a database failure', async () => {
  const reply = await request(app).post(`/cooperative/${coop}/ai-overview`).set('x-fixture-actor', 'present').send({}).expect(200);
  expect(reply.body.data.cooperativeId).toBe(coop);
  expect(reply.body.data.evidence.metrics.active.value).toBe(2);
  expect(CooperativeManagementService.prototype.requireLocal).toHaveBeenCalledWith(db, 'actor-fixture', coop);
  expect(query).toHaveBeenCalledWith(expect.stringContaining('WHERE cooperative_id=$1'), [coop]);
  query.mockRejectedValue(new Error('fixture-private-detail')); execute.mockClear();
  const failed = await request(app).post(`/cooperative/${coop}/ai-overview`).set('x-fixture-actor', 'present').send({}).expect(503);
  expect(JSON.stringify(failed.body)).not.toContain('fixture-private-detail'); expect(execute).not.toHaveBeenCalled();
});
