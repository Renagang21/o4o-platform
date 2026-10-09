import express from 'express';
import request from 'supertest';
import type { DataSource } from 'typeorm';

jest.mock('../middleware/auth.middleware.js', () => ({
  authenticate: (req: any, res: any, next: any) => {
    const role = req.headers['x-test-role'];
    if (!role) return res.status(401).json({ code: 'AUTH_REQUIRED' });
    req.user = { id: 'operator', roles: [role], memberships: [{ serviceKey: 'lecture', status: 'active' }] };
    next();
  },
}));
jest.mock('../database/connection.js', () => ({ AppDataSource: { isInitialized: true, query: jest.fn() } }));
import { AppDataSource } from '../database/connection.js';
import { createLegacyEducationRequestController } from '../modules/contact-inquiry/legacy-education-requests.controller.js';

const id = '00000000-0000-0000-0000-000000000001';
const partnerId = '00000000-0000-0000-0000-000000000002';
const otherId = '00000000-0000-0000-0000-000000000003';
let rows: any[];
const matches = (row: any, where: any) => Object.entries(where).every(([key, value]) => row[key] === value);
const repo = {
  findAndCount: jest.fn(async (options: any) => {
    const selected = rows.filter(row => matches(row, options.where));
    return [selected.slice(options.skip, options.skip + options.take), selected.length];
  }),
  findOne: jest.fn(async ({ where }: any) => rows.find(row => matches(row, where)) ?? null),
  update: jest.fn(async (where: any, change: any) => {
    const row = rows.find(row => matches(row, where));
    if (row) Object.assign(row, change);
    return { affected: row ? 1 : 0 };
  }),
};
const app = express();
app.use(express.json());
app.use('/api/v1/admin/services', createLegacyEducationRequestController({ getRepository: () => repo } as unknown as DataSource));
const base = '/api/v1/admin/services/lecture/legacy-education-requests';
const operator = (method: 'get' | 'patch', path: string) => request(app)[method](path).set('x-test-role', 'lecture:operator');

beforeEach(() => {
  jest.clearAllMocks();
  (AppDataSource.query as jest.Mock).mockResolvedValue([{ status: 'active' }]);
  const inquiry = { id, service_key: 'kpa-society', type: 'education', name: 'SYNTHETIC',
    organization_name: null, subject: 'Previous lecture request', status: 'pending',
    email: 'synthetic@example.invalid', phone: null, message: 'Private inquiry message', createdAt: new Date() };
  rows = [inquiry, { ...inquiry, id: partnerId, type: 'partner' }, { ...inquiry, id: otherId, service_key: 'other' }];
});

it('lists only the historical education records and exposes contact details only in the operator detail', async () => {
  const result = await operator('get', base);
  expect(result.status).toBe(200);
  expect(result.body.data.items.map((row: any) => row.id)).toEqual([id]);
  expect(result.body.data.items[0]).not.toHaveProperty('email');
  expect(result.body.data.items[0]).not.toHaveProperty('message');
  const detail = await operator('get', `${base}/${id}`);
  expect(detail.status).toBe(200);
  expect(detail.body.data.message).toBe('Private inquiry message');
});

it('updates the original education record without moving its service ledger or modifying partner inquiries', async () => {
  expect((await operator('patch', `${base}/${id}/status`).send({ status: 'done' })).status).toBe(200);
  expect(rows[0]).toMatchObject({ service_key: 'kpa-society', type: 'education', status: 'done' });
  for (const protectedId of [partnerId, otherId]) {
    expect((await operator('get', `${base}/${protectedId}`)).status).toBe(404);
    expect((await operator('patch', `${base}/${protectedId}/status`).send({ status: 'done' })).status).toBe(404);
  }
  expect(rows.slice(1).map(row => row.status)).toEqual(['pending', 'pending']);
});

it.each(['kpa:operator', 'neture:operator', 'lecture:instructor'])('denies non-Study-operator authority: %s', async role => {
  expect((await request(app).get(base).set('x-test-role', role)).status).toBe(403);
  expect((await request(app).patch(`${base}/${id}/status`).set('x-test-role', role).send({ status: 'done' })).status).toBe(403);
  expect(repo.findAndCount).not.toHaveBeenCalled();
  expect(repo.update).not.toHaveBeenCalled();
});

it('denies an unauthenticated caller and a newly suspended operator despite an active token snapshot', async () => {
  expect((await request(app).get(base)).status).toBe(401);
  (AppDataSource.query as jest.Mock).mockResolvedValue([{ status: 'suspended' }]);
  expect((await operator('get', base)).status).toBe(403);
  expect(repo.findAndCount).not.toHaveBeenCalled();
});

it('rejects other service entry points, invalid ids and invalid status without changing a record', async () => {
  expect((await operator('get', base.replace('/lecture/', '/kpa-society/'))).status).toBe(404);
  expect((await operator('get', `${base}/invalid-id`)).status).toBe(404);
  expect((await operator('patch', `${base}/${id}/status`).send({ status: 'answered' })).status).toBe(400);
  expect(repo.update).not.toHaveBeenCalled();
});

it('bounds pagination and can filter by the historical review status', async () => {
  rows[0].status = 'reviewing';
  const result = await operator('get', `${base}?page=-1&limit=Infinity&status=reviewing`);
  expect(result.status).toBe(200);
  expect(result.body.data.pagination).toMatchObject({ page: 1, limit: 20, total: 1 });
});
