import express from 'express';
import request from 'supertest';

jest.mock('../../../../utils/store-workspace-access.js', () => ({
  createRequireStoreWorkspaceAccess: () => (req: any, _res: any, next: any) => { req.organizationId = ORG; next(); },
}));
import { createProductMarketingController } from '../product-marketing.controller.js';

const ORG = '11111111-1111-4111-8111-111111111111';
const PRODUCT = '22222222-2222-4222-8222-222222222222';
const ASSET = '33333333-3333-4333-8333-333333333333';

function app(query: jest.Mock) {
  const server = express();
  server.use(express.json());
  server.use(createProductMarketingController({ query } as never, ((_req: any, _res: any, next: any) => next()) as never));
  return server;
}

describe('product marketing links stay within the store', () => {
  it('links only an asset that belongs to the current store', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.startsWith('SELECT 1 FROM store_qr_codes')) return [];
      return [{ id: 'link' }];
    });
    const response = await request(app(query)).post(`/pharmacy/products/${PRODUCT}/marketing`).send({ assetType: 'qr', assetId: ASSET });
    expect(response.status).toBe(404);
    expect(query.mock.calls[0]).toEqual(['SELECT 1 FROM store_qr_codes WHERE id = $1 AND organization_id = $2 LIMIT 1', [ASSET, ORG]]);
    expect(query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO product_marketing_assets'))).toBe(false);
  });

  it('creates the link for an owned library asset and rejects unsupported types or ids', async () => {
    const query = jest.fn(async (sql: string) => (sql.startsWith('SELECT 1 FROM store_execution_assets') ? [{ '?column?': 1 }] : [{ id: 'link' }]));
    expect((await request(app(query)).post(`/pharmacy/products/${PRODUCT}/marketing`).send({ assetType: 'library', assetId: ASSET })).status).toBe(201);
    for (const body of [{ assetType: 'pop', assetId: ASSET }, { assetType: 'qr', assetId: 'nope' }, { assetType: 'qr' }]) {
      expect((await request(app(query)).post(`/pharmacy/products/${PRODUCT}/marketing`).send(body)).status).toBe(400);
    }
  });

  it('reads QR details without passing an unused SQL parameter', async () => {
    const query = jest.fn(async (sql: string) => (sql.includes('FROM product_marketing_assets')
      ? [{ id: 'link', assetType: 'qr', assetId: ASSET }] : []));
    expect((await request(app(query)).get(`/pharmacy/products/${PRODUCT}/marketing`)).status).toBe(200);
    const [sql, params] = query.mock.calls.find(([text]) => String(text).includes('FROM store_qr_codes qr'))!;
    expect(params).toEqual([ORG, ASSET]);
    expect(sql).toContain('qr.id IN ($2)');
  });
});
