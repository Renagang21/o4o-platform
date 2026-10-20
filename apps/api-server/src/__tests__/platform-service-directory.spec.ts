import express from 'express';
import request from 'supertest';
import { createAdminPlatformServicesRoutes } from '../routes/platform-services/admin-platform-services.routes.js';

const legacyList = jest.fn();
jest.mock('../services/platform-service-catalog.service.js', () => ({
  PlatformServiceCatalogService: jest.fn().mockImplementation(() => ({ listServices: (...args: unknown[]) => legacyList(...args) })),
}));
jest.mock('../common/middleware/auth.middleware.js', () => ({
  requireAuth: (req: any, res: any, next: any) => req.headers['x-fixture-role'] ? next() : res.sendStatus(401),
  requireAdmin: (req: any, res: any, next: any) => req.headers['x-fixture-role'] === 'platform:super_admin' ? next() : res.sendStatus(403),
}));
jest.mock('../utils/logger.js', () => ({ __esModule: true, default: { error: jest.fn() } }));
const query = jest.fn();
const app = express().use('/api/v1/admin/platform-services', createAdminPlatformServicesRoutes({ query } as any));
const directory = () => request(app).get('/api/v1/admin/platform-services/directory').set('x-fixture-role', 'platform:super_admin');

beforeEach(() => { query.mockReset().mockResolvedValue([{ key: 'pharmacy', status: 'active' }]); legacyList.mockReset(); });

it('requires platform admin before any directory read', async () => {
  await request(app).get('/api/v1/admin/platform-services/directory').expect(401);
  await request(app).get('/api/v1/admin/platform-services/directory').set('x-fixture-role', 'neture:admin').expect(403);
  expect(query).not.toHaveBeenCalled();
});

it('uses current canonical domains and separates pharmacy from the pharmacist branch', async () => {
  const res = await directory().expect(200);
  expect(res.headers['cache-control']).toBe('private, no-store');
  const rows = res.body.data;
  expect(rows).toHaveLength(15);
  const byId = Object.fromEntries(rows.map((row: any) => [row.id, row]));
  expect(byId.pharmacy).toMatchObject({ name: 'O4O 약국 경영지원', url: 'https://pharmacy.neture.co.kr', state: 'active' });
  expect(byId['kpa-branch']).toMatchObject({ name: '약사회 분회', url: 'https://kpa.neture.co.kr', state: 'configured' });
  expect(byId.carepharm).toMatchObject({ url: 'https://carepharm.neture.co.kr', state: 'missing' });
  expect(byId.megapharm.url).toBe('https://megapharm.neture.co.kr');
  expect(byId.pharmcoop).toMatchObject({ url: 'https://pharmcoop.neture.co.kr', state: 'federation' });
  expect(new Set(rows.map((row: any) => row.id)).size).toBe(rows.length);
  for (const retired of ['k-cosmetics', 'cosmetics', 'kpa', 'kpa-groupbuy', 'pharmacy-hub']) expect(byId[retired]).toBeUndefined();
  expect(JSON.stringify(rows)).not.toMatch(/k-cosmetics\.site|kpa-society\.co\.kr|retail\.neture/);
});

it('reflects business ledger state without treating unknown or absent rows as active', async () => {
  query.mockResolvedValue([{ key: 'pharmacy', status: 'closed' }, { key: 'carepharm', status: 'unexpected' }, { key: 'megapharm', status: 'active' }]);
  const { body } = await directory().expect(200);
  expect(body.data.find((row: any) => row.id === 'pharmacy').state).toBe('closed');
  expect(body.data.find((row: any) => row.id === 'carepharm').state).toBe('unverified');
  expect(body.data.find((row: any) => row.id === 'megapharm').state).toBe('active');
  expect(query).toHaveBeenCalledTimes(1);
  expect(query.mock.calls[0][0]).toMatch(/^SELECT key, status FROM semi_franchises/);
  expect(query.mock.calls[0][1]).toEqual([['pharmacy', 'carepharm', 'megapharm']]);
});

it('keeps workspaces, federation, tools and prepared Partner separate from service membership', async () => {
  const { body } = await directory().expect(200);
  const byId = Object.fromEntries(body.data.map((row: any) => [row.id, row]));
  expect(byId.store).toMatchObject({ group: 'spaces', url: 'https://store.neture.co.kr', state: 'configured' });
  expect(byId['platform-admin']).toMatchObject({ group: 'spaces', url: 'https://admin.neture.co.kr' });
  expect(byId.neture).toMatchObject({ name: 'O4O 대표 홈', group: 'spaces', url: 'https://neture.co.kr' });
  expect(byId.partner).toMatchObject({ state: 'planned', url: 'https://neture.co.kr/services/partner' });
  expect(byId['cafe24-b2b'].url).toBe('https://neture.co.kr/cafe24');
  expect(byId.hospital.url).toBe('https://neture.co.kr/hospital');
  expect(body.data.every((row: any) => new URL(row.url).protocol === 'https:')).toBe(true);
  expect(body.data.some((row: any) => 'userId' in row || 'membership' in row || 'roles' in row)).toBe(false);
});

it('keeps the legacy catalog response contract at GET / unchanged', async () => {
  const oldRows = [{ code: 'k-cosmetics', entryUrl: 'https://legacy.example.invalid', status: 'active' }];
  legacyList.mockResolvedValue(oldRows);
  const res = await request(app).get('/api/v1/admin/platform-services').set('x-fixture-role', 'platform:super_admin').expect(200);
  expect(res.body.data).toEqual(oldRows);
  expect(query).not.toHaveBeenCalled();
});

it('returns a sanitized error when ledger reads fail instead of inventing missing businesses', async () => {
  query.mockRejectedValue(new Error('private-database-fixture-detail'));
  const res = await directory().expect(503);
  expect(res.body).toMatchObject({ success: false, code: 'DIRECTORY_UNAVAILABLE' });
  expect(res.body.data).toBeUndefined();
  expect(JSON.stringify(res.body)).not.toContain('private-database-fixture-detail');
});

it('does not add a directory write endpoint', async () => {
  await request(app).put('/api/v1/admin/platform-services/directory').set('x-fixture-role', 'platform:super_admin').send({ status: 'active' }).expect(404);
  expect(query).not.toHaveBeenCalled();
});
