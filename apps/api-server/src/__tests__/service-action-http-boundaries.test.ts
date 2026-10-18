import express from 'express';
import request from 'supertest';
import { createOperatorProductCleanupController } from '../modules/neture/controllers/operator-product-cleanup.controller.js';
import { createOperatorContactController } from '../modules/neture/controllers/operator-contact.controller.js';
import { createNeturePharmacyRoutes } from '../modules/neture-pharmacy/neture-pharmacy.routes.js';

jest.mock('../middleware/auth.middleware.js', () => ({
  ...jest.requireActual('../common/middleware/auth/authorization.middleware.js'),
  requireAuth: (req: any, res: any, next: any) => req.user ? next() : res.status(401).json({ code: 'UNAUTHORIZED' }),
}));
jest.mock('../database/connection.js', () => ({ AppDataSource: { isInitialized: true } }));
jest.mock('../utils/service-membership.js', () => ({ getServiceMembershipStatusFromDb: jest.fn() }));
jest.mock('../modules/auth/services/role-assignment.service.js', () => ({ roleAssignmentService: { hasAnyRole: jest.fn(async (id: string) => id === 'platform'), getActiveRoles: jest.fn(async () => []) } }));
jest.mock('../services/checkout.service.js', () => ({ checkoutService: {} }));
jest.mock('../routes/kpa/services/event-offer.service.js', () => ({ EventOfferService: class {} }));
jest.mock('../modules/neture-pharmacy/services/pharmacy-store-provisioner.js', () => ({ createPharmacyStoreProvisioner: () => ({}) }));
jest.mock('@o4o/asset-copy-core', () => ({ AssetCopyService: class {} }), { virtual: true });
jest.mock('../modules/neture-pharmacy/services/business-registration-document.service.js', () => ({ BusinessRegistrationDocumentService: class {} }));
import { getServiceMembershipStatusFromDb } from '../utils/service-membership.js';

const query = jest.fn(); const transaction = jest.fn(); const findOne = jest.fn();
const db = { query, transaction, getRepository: () => ({ findOne }) } as any;
function server() {
  const app = express(); app.use(express.json());
  app.use((req: any, _res, next) => {
    if (req.header('x-role')) req.user = { id: req.header('x-role') === 'platform:super_admin' ? 'platform' : 'actor', roles: req.header('x-role').split(','), memberships: [{ serviceKey: 'neture', status: 'active' }] };
    next();
  });
  app.use('/cleanup', createOperatorProductCleanupController(db));
  app.use('/daily', createOperatorContactController(db));
  app.use('/business', createNeturePharmacyRoutes(db)); return app;
}
beforeEach(() => { jest.clearAllMocks(); (getServiceMembershipStatusFromDb as jest.Mock).mockResolvedValue('active'); query.mockResolvedValue([]); });
it.each([
  ['post', '/cleanup/merge-masters'], ['delete', '/cleanup/hard-delete/10000000-0000-4000-8000-000000000001'],
  ['delete', '/cleanup/pending-offers/10000000-0000-4000-8000-000000000001'],
])('%s %s requires this service admin before invoking mutations', async (method, path) => {
  for (const role of ['neture:operator', 'neture:operator,kpa:admin', 'supplier:admin']) {
    const result = await (request(server()) as any)[method](path).set('x-role', role).send({ reason: 'fixture' });
    expect(result.status).toBe(403);
  }
  expect(transaction).not.toHaveBeenCalled();
  expect((await (request(server()) as any)[method](path).set('x-role', 'neture:admin').send({})).status).toBe(400);
});
it('daily product reads and restoration remain operator actions but suspended current membership blocks them', async () => {
  expect((await request(server()).get('/cleanup/duplicate-masters').set('x-role', 'neture:operator')).status).toBe(200);
  transaction.mockImplementation(async run => run({ query: jest.fn(async sql => sql.includes('FOR UPDATE') ? [] : []) }));
  expect((await request(server()).post('/cleanup/restore/10000000-0000-4000-8000-000000000001').set('x-role', 'neture:operator')).status).toBe(404);
  (getServiceMembershipStatusFromDb as jest.Mock).mockResolvedValue('suspended');
  expect((await request(server()).get('/cleanup/duplicate-masters').set('x-role', 'neture:operator')).status).toBe(403);
});
it('contact detail is a daily operator action and excludes security telemetry', async () => {
  findOne.mockResolvedValue({ id: 'fixture', subject: 'Fixture', message: 'Full body', status: 'new', adminNotes: 'Internal', createdAt: new Date(), updatedAt: new Date(), ipAddress: 'secret', userAgent: 'secret', ipHash: 'secret' });
  const response = await request(server()).get('/daily/contact-messages/fixture').set('x-role', 'neture:operator');
  expect(response.status).toBe(200); expect(response.body.data.message).toBe('Full body');
  expect(JSON.stringify(response.body)).not.toContain('secret');
  expect((await request(server()).patch('/daily/contact-messages/fixture').set('x-role', 'neture:operator').send({})).status).toBe(400);
});
it('business configuration is service admin work, separate from platform settings and assigned daily work', async () => {
  const app = server();
  expect((await request(app).get('/business/admin/semi-franchises').set('x-role', 'neture:admin')).status).toBe(200);
  expect((await request(app).get('/business/admin/semi-franchises').set('x-role', 'neture:operator')).status).toBe(403);
  expect((await request(app).get('/business/admin/semi-franchises').set('x-role', 'kpa:admin')).status).toBe(403);
  // Existing platform-wide feature settings do not become service-admin APIs.
  expect((await request(app).get('/business/admin/service-features').set('x-role', 'neture:admin')).status).toBe(403);
  query.mockImplementation(async sql => sql.startsWith('SELECT sf.id, sf.key') ? [{ id: 'business', key: 'fixture', status: 'active' }] : []);
  expect((await request(app).get('/business/operator/semi-franchises/fixture/memberships').set('x-role', 'neture:admin')).status).toBe(403);
  expect(query.mock.calls.some(([sql]) => sql.includes('semi_franchise_operators'))).toBe(true);
});

it('cooperative business API accepts only a live local assignment and never exposes pharmacy memberships', async () => {
  let local = true;
  query.mockImplementation(async sql => {
    if (sql.startsWith('SELECT c.id FROM cooperatives')) return [{ id: 'cooperative' }];
    if (sql.includes('SELECT r.role FROM cooperative_roles')) return local ? [{ role: 'operator' }] : [];
    if (sql.startsWith('SELECT sf.id, sf.key')) return [{ id: 'business', key: 'coop-one', status: 'active' }];
    if (sql.startsWith('SELECT 1 FROM semi_franchises sf WHERE sf.id=$2')) return local ? [{ ok: 1 }] : [];
    return [];
  });
  // Synthetic identity has no Neture or collaborator operator role.
  const app = server();
  expect((await request(app).get('/business/operator/semi-franchises/coop-one/contents').set('x-role', 'neture:user')).status).toBe(200);
  expect((await request(app).get('/business/operator/semi-franchises/coop-one/memberships').set('x-role', 'neture:user')).status).toBe(403);
  local = false;
  expect((await request(app).get('/business/operator/semi-franchises/coop-one/contents').set('x-role', 'neture:pharmcoop_admin')).status).toBe(403);
});
