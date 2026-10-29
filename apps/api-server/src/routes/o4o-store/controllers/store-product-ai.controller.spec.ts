import express from 'express';
import request from 'supertest';
import * as XLSX from 'xlsx';
import { registerStoreProductAiRoutes } from './store-product-ai.controller.js';
jest.mock('../../../middleware/auth.middleware.js', () => ({ requireAuth: (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.headers['x-fixture-auth'] !== 'allowed') { res.sendStatus(401); return; } next();
} }));
jest.mock('../../../middleware/rateLimiter.js', () => ({ apiLimiter: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next() }));
function fixture() {
  const app = express(), router = express.Router(), query = jest.fn(async () => []);
  app.use(express.json());
  registerStoreProductAiRoutes(router, { query } as never, (req, res, next) => {
    if (req.headers['x-store-organization-id'] !== 'fixture') { res.sendStatus(403); return; }
    (req as express.Request & { organizationId: string }).organizationId = 'fixture'; next();
  });
  app.use(router); return { app, query };
}
describe('registered product AI route authorization', () => {
  it('rejects unauthenticated and wrong-store reads before any data access', async () => {
    const f = fixture(), path = '/ai-context/00000000-0000-4000-8000-000000000001';
    expect((await request(f.app).get(path)).status).toBe(401);
    expect((await request(f.app).get(path).set('x-fixture-auth', 'allowed')).status).toBe(403);
    expect(f.query).not.toHaveBeenCalled();
    const response = await request(f.app).get(path).set('x-fixture-auth', 'allowed').set('x-store-organization-id', 'fixture');
    expect(response.status).toBe(404); expect(response.body.code).toBe('REGISTERED_PRODUCT_REQUIRED');
    expect(f.query.mock.calls[0]).toContainEqual(['00000000-0000-4000-8000-000000000001', 'fixture']);
  });
  it('parses actual XLSX headers without storing POS rows and rejects forged organization input', async () => {
    const f = fixture(), book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([['상품명','가격'], ['SECRET POS ROW','SECRET PRICE']]));
    const file = XLSX.write(book, { type: 'buffer', bookType: 'xlsx' });
    const req = () => request(f.app).post('/ai-context/import-preview').set('x-fixture-auth', 'allowed').set('x-store-organization-id', 'fixture');
    const response = await req().attach('file', file, 'products.xlsx');
    expect(response.status).toBe(200); expect(response.body.data.rows).toEqual([]);
    expect(JSON.stringify(response.body)).not.toContain('SECRET'); expect(f.query).not.toHaveBeenCalled();
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect((await req().field('organizationId','forged').attach('file',file,'products.xlsx')).status).toBe(400);
    expect((await req().attach('file',file,'products.html')).status).toBe(400);
  });
});
