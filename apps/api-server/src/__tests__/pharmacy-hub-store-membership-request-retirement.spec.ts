import express from 'express';
import request from 'supertest';

jest.mock('../utils/store-owner.utils.js', () => ({
  isStoreOwner: jest.fn(async () => ({ isOwner: true, organizationId: 'legacy-org', memberRole: 'owner' })),
}));
jest.mock('../utils/logger.js', () => ({ __esModule: true, default: { error: jest.fn(), warn: jest.fn() } }));

import { createStoreMembershipRoutes } from '../routes/store/store-membership.routes.js';
import { isStoreOwner } from '../utils/store-owner.utils.js';

let query: jest.Mock;
let phOnlyOrganization = false;
let currentLinkage = false;
function makeApp() {
  query = jest.fn(async (sql: string, params: any[] = []) => {
    if (sql.includes('WHERE EXISTS')) {
      return (phOnlyOrganization && params[1]?.includes('pharmacy-hub'))
        || (currentLinkage && params[1]?.includes('kpa-society')) ? [{ linked: 1 }] : [];
    }
    if (sql.includes('SELECT id FROM users')) return [{ id: 'invitee' }];
    if (sql.includes('SELECT role FROM organization_members')) return [{ role: 'staff' }];
    return [];
  });
  const app = express();
  app.use(express.json());
  app.use('/api/v1/store', createStoreMembershipRoutes({ query } as any, (req: any, _res, next) => {
    req.user = {
      id: 'mixed-owner', roles: ['kpa:store_owner', 'pharmacy-hub:store_owner'],
      memberships: [{ serviceKey: 'kpa-society', status: 'active' }, { serviceKey: 'pharmacy-hub', status: 'active' }],
    };
    next();
  }));
  return app;
}

beforeEach(() => {
  phOnlyOrganization = false;
  currentLinkage = false;
  jest.mocked(isStoreOwner).mockClear();
  jest.mocked(isStoreOwner).mockResolvedValue({ isOwner: true, organizationId: 'legacy-org', memberRole: 'owner' });
});

it.each(['pharmacy-hub', ' pharmacy-hub '])('mixed-service owner cannot invite into an explicitly retired context (%s)', async serviceKey => {
  const res = await request(makeApp()).post('/api/v1/store/members/invite')
    .query({ serviceKey }).set('X-Store-Organization-Id', 'legacy-org').send({ email: 'invitee@example.test' });
  expect(res.status).toBe(410);
  expect(res.body.code).toBe('SERVICE_RETIRED');
  expect(isStoreOwner).not.toHaveBeenCalled();
  expect(query).not.toHaveBeenCalled();
});

it('explicit PH member removal is refused before owner resolution or writes', async () => {
  const res = await request(makeApp()).delete('/api/v1/store/members/invitee?serviceKey=pharmacy-hub')
    .set('X-Store-Organization-Id', 'legacy-org');
  expect(res.status).toBe(410);
  expect(isStoreOwner).not.toHaveBeenCalled();
  expect(query).not.toHaveBeenCalled();
});

it('repeated serviceKey parameters cannot fall back to the unscoped path', async () => {
  const res = await request(makeApp()).post('/api/v1/store/members/invite?serviceKey=kpa&serviceKey=pharmacy-hub')
    .send({ email: 'invitee@example.test' });
  expect(res.status).toBe(410);
  expect(query).not.toHaveBeenCalled();
});

it.each(['/membership', '/members'])('explicit PH reads never resolve as a current unscoped service (%s)', async path => {
  const res = await request(makeApp()).get(`/api/v1/store${path}?serviceKey=pharmacy-hub`);
  expect(res.status).toBe(410);
  expect(isStoreOwner).not.toHaveBeenCalled();
  expect(query).not.toHaveBeenCalled();
});

it.each([undefined, 'kpa'])('current scoped and service-neutral invitations remain available (%s)', async serviceKey => {
  const app = makeApp();
  jest.mocked(isStoreOwner).mockResolvedValue({ isOwner: true, organizationId: 'current-org', memberRole: 'owner' });
  const req = request(app).post('/api/v1/store/members/invite').send({ email: 'invitee@example.test' });
  if (serviceKey) req.query({ serviceKey });
  const res = await req;
  expect(res.status).toBe(200);
  expect(res.body.data.organizationId).toBe('current-org');
  expect(query.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO organization_members'))?.[1]).toEqual(['current-org', 'invitee', 'invited']);
});

it('a mixed-service owner cannot create an unscoped invitation in a PH-only historical organization', async () => {
  phOnlyOrganization = true;
  const res = await request(makeApp()).post('/api/v1/store/members/invite')
    .set('X-Store-Organization-Id', 'legacy-org').send({ email: 'invitee@example.test' });
  expect(res.status).toBe(403);
  expect(query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO organization_members'))).toBe(false);
});

it('a current organization can invite when its PH linkage also remains as history', async () => {
  phOnlyOrganization = true;
  currentLinkage = true;
  const res = await request(makeApp()).post('/api/v1/store/members/invite').send({ email: 'invitee@example.test' });
  expect(res.status).toBe(200);
  expect(query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO organization_members'))).toBe(true);
});
