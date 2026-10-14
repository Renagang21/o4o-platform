jest.mock('../../../../utils/store-owner.utils.js', () => ({
  createRequireStoreOwner: () => (_req: any, _res: any, next: any) => next(),
}));
jest.mock('../../../../services/qr-print.service.js', () => ({}));
jest.mock('../../../../services/qr-flyer.service.js', () => ({}));
jest.mock('../../../../services/store/store-qr.service.js', () => ({
  resolvePublicQrLanding: jest.fn(),
}));

import express from 'express';
import request from 'supertest';
import { createStoreQrLandingController } from '../store-qr-landing.controller.js';
import { resolvePublicQrLanding } from '../../../../services/store/store-qr.service.js';

const resolver = resolvePublicQrLanding as jest.Mock;
function app() {
  const server = express();
  server.use(createStoreQrLandingController({ getRepository: () => ({}) } as any,
    ((_req: any, _res: any, next: any) => next()) as any, 'kpa'));
  return server;
}
beforeEach(() => resolver.mockReset());

test('slug-less HEAD advertises support without resolving a QR', async () => {
  const response = await request(app()).head('/qr/public');
  expect(response.status).toBe(404);
  expect(response.headers['x-qr-read-only-head']).toBe('1');
  expect(resolver).not.toHaveBeenCalled();
});

test('HEAD resolves landing data without a scan while GET still records one', async () => {
  resolver.mockResolvedValue({ ok: true, data: { title: 'test' } });
  const server = app();
  const head = await request(server).head('/qr/public/active');
  expect(head.status).toBe(200);
  expect(head.headers['content-type']).toMatch(/application\/json/);
  expect(head.text).toBeUndefined();
  expect(resolver.mock.calls[0][3].recordScan).toBe(false);
  const get = await request(server).get('/qr/public/active');
  expect(get.body).toEqual({ success: true, data: { title: 'test' } });
  expect(resolver.mock.calls[1][3].recordScan).toBe(true);
});

test('HEAD preserves missing QR failure status instead of accepting SPA HTML', async () => {
  resolver.mockResolvedValue({ ok: false, status: 404, code: 'QR_NOT_FOUND' });
  const response = await request(app()).head('/qr/public/missing');
  expect(response.status).toBe(404);
  expect(resolver.mock.calls[0][3].recordScan).toBe(false);
});
