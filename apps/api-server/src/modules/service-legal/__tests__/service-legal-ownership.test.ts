import express from 'express';
import request from 'supertest';
const query = jest.fn();
jest.mock('../../../database/connection.js', () => ({ AppDataSource: { isInitialized: true, query: (...args: any[]) => query(...args) } }));
import { requireServiceLegalScope } from '../service-legal-scope.js';
function app(service: string, roles: string[], snapshot = 'active', current: string | null = 'active', level: 'admin' | 'operator' = 'admin') {
  query.mockImplementation(async (sql:string) => sql.includes('role_assignments') ? [] : current ? [{status:current}] : []);
  const a = express();
  a.use((req, _res, next) => { (req as any).user = { id: 'fixture', roles, memberships: [{ serviceKey: service, status: snapshot }] }; next(); });
  a.get('/:serviceKey', requireServiceLegalScope(level), (_req, res) => res.json({ success: true }));
  return a;
}
it.each(['supplier', 'community', 'funding'])('%s admin manages only its own service policies', async service => {
  const a = app(service, [`${service}:admin`]);
  expect((await request(a).get(`/${service}`)).status).toBe(200);
  for (const other of ['supplier', 'community', 'funding'].filter(key => key !== service)) expect((await request(a).get(`/${other}`)).status).toBe(403);
});
it.each(['supplier', 'community', 'funding'])('%s operator can read but cannot publish/edit policies', async service => {
  expect((await request(app(service, [`${service}:operator`], 'active', 'active', 'operator')).get(`/${service}`)).status).toBe(200);
  expect((await request(app(service, [`${service}:operator`])).get(`/${service}`)).status).toBe(403);
});
it.each(['pending', 'rejected', 'suspended', 'withdrawn', null])('a stale active snapshot does not override current membership %s', async current => {
  expect((await request(app('supplier', ['supplier:admin'], 'active', current)).get('/supplier')).status).toBe(403);
});
it('Neture admin cannot manage independent supplier policy', async () => {
  expect((await request(app('supplier', ['neture:admin'])).get('/supplier')).status).toBe(403);
});
it('preserves the KPA exclusion from the whole-administrator bypass', async () => {
  expect((await request(app('kpa-society', ['platform:super_admin'], 'suspended', null)).get('/kpa-society')).status).toBe(403);
});
