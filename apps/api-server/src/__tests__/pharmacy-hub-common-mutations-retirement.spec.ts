import express from 'express';
import request from 'supertest';

jest.mock('../middleware/auth.middleware.js', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { id: 'legacy-owner', roles: ['pharmacy-hub:store_owner'], memberships: [{ serviceKey: 'pharmacy-hub', status: 'active' }] };
    next();
  },
}));
jest.mock('@o4o/payment-core', () => ({ PaymentCoreService: jest.fn(() => ({})) }), { virtual: true });
jest.mock('../utils/store-owner.utils.js', () => ({
  isStoreOwner: jest.fn(async () => ({ isOwner: true, organizationId: 'legacy-org' })),
}));
jest.mock('../utils/logger.js', () => ({
  __esModule: true, default: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

import { createStoreEntitlementRoutes } from '../modules/store-entitlement/store-entitlement.routes.js';
import { createForeignVisitorPartnerRoutes } from '../modules/foreign-visitor-partner/foreign-visitor-partner.routes.js';
import { createForeignVisitorPartnerQrCodeRoutes } from '../modules/foreign-visitor-partner/foreign-visitor-partner-qr-code.routes.js';
import { ForeignVisitorPartnerQrCodeService } from '../modules/foreign-visitor-partner/foreign-visitor-partner-qr-code.service.js';
import { ForeignVisitorPartnerQrScanEventService } from '../modules/foreign-visitor-partner/foreign-visitor-partner-qr-scan-event.service.js';
import { isStoreOwner } from '../utils/store-owner.utils.js';

const history = [{ id: 'historical-entitlement', serviceKey: 'pharmacy-hub', organizationId: 'legacy-org' }];
let save: jest.Mock;
let find: jest.Mock;
function makeApp() {
  jest.mocked(isStoreOwner).mockClear();
  save = jest.fn();
  find = jest.fn(async () => history);
  const dataSource: any = { getRepository: () => ({ find, save }), query: jest.fn() };
  const app = express();
  app.use(express.json());
  app.use('/entitlements', createStoreEntitlementRoutes(dataSource));
  app.use('/partners', createForeignVisitorPartnerRoutes(dataSource));
  app.use('/visitor', createForeignVisitorPartnerQrCodeRoutes(dataSource));
  return app;
}

it.each([
  ['/entitlements/subscriptions/prepare', { planCode: 'FOREIGN_VISITOR_SALES_SUPPORT', successUrl: 'https://example.test/success', failUrl: 'https://example.test/fail' }],
  ['/entitlements/subscriptions/confirm', { paymentId: 'p', paymentKey: 'key', orderId: 'order' }],
  ['/partners', { partnerType: 'HOTEL', partnerName: 'Legacy partner' }],
  ['/visitor/partners/partner-1/qr-codes', { qrCodeName: 'Legacy QR' }],
])('PH cannot create payment, activate entitlement or create assets through %s', async (url, body) => {
  const res = await request(makeApp()).post(url).send({ ...body, serviceKey: 'pharmacy-hub' });
  expect(res.status).toBe(400);
  expect(res.body.code).toBe('UNKNOWN_SERVICE_KEY');
  expect(isStoreOwner).not.toHaveBeenCalled();
  expect(save).not.toHaveBeenCalled();
});

it('historical entitlement reads remain available without creating records', async () => {
  const res = await request(makeApp()).get('/entitlements?organizationId=legacy-org&serviceKey=pharmacy-hub');
  expect(res.status).toBe(200);
  expect(res.body.data).toEqual(history);
  expect(find).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: 'legacy-org', serviceKey: 'pharmacy-hub' } }));
  expect(save).not.toHaveBeenCalled();
});

it('a remaining PH affiliate QR does not resolve or create a new scan event', async () => {
  const resolve = jest.spyOn(ForeignVisitorPartnerQrCodeService.prototype, 'resolvePublicByShortCode').mockResolvedValue({ serviceKey: 'pharmacy-hub' } as any);
  const scan = jest.spyOn(ForeignVisitorPartnerQrScanEventService.prototype, 'recordScan');
  try {
    const res = await request(makeApp()).get('/visitor/affiliate/legacy-qr/resolve');
    expect(res.status).toBe(404);
    expect(scan).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  } finally {
    resolve.mockRestore();
    scan.mockRestore();
  }
});
