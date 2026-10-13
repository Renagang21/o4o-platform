import express from 'express';
import request from 'supertest';
import type { DataSource } from 'typeorm';
import { SettlementOrderConflictError } from '../../services/settlement-order-conflict.error.js';

const mockUpdate = jest.fn();
const mockCalculate = jest.fn();
jest.mock('../../../../middleware/auth.middleware.js', () => ({ requireAuth: (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.headers['x-test-user']) return res.status(401).json({ error: 'UNAUTHORIZED' });
  next();
} }));
jest.mock('../../middleware/neture-identity.middleware.js', () => ({
  createRequireActiveSupplier: () => (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.headers['x-test-active'] !== 'true') return res.status(403).json({ error: 'SUPPLIER_NOT_ACTIVE' });
    (req as express.Request & { supplierId: string }).supplierId = 'fixture-supplier'; next();
  },
  createRequireLinkedSupplier: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));
jest.mock('../../../../middleware/neture-scope.middleware.js', () => ({ requireNetureScope: () => (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.headers['x-test-admin'] !== 'true') return res.status(403).json({ error: 'FORBIDDEN' });
  next();
} }));
jest.mock('../../services/inventory.service.js', () => ({ InventoryService: jest.fn().mockImplementation(() => ({ updateInventory: mockUpdate })) }));
jest.mock('../../services/neture-settlement.service.js', () => ({ NetureSettlementService: jest.fn().mockImplementation(() => ({ calculateSettlements: mockCalculate })) }));
jest.mock('../../../../utils/logger.js', () => ({ __esModule: true, default: { error: jest.fn(), warn: jest.fn(), info: jest.fn() } }));
import { createInventoryController } from '../inventory.controller.js';
import { createAdminSettlementController } from '../admin-settlement.controller.js';

const app = express(); app.use(express.json());
app.use('/supplier', createInventoryController({} as DataSource));
app.use('/admin', createAdminSettlementController({} as DataSource));
const inventory = '/supplier/inventory/fixture-offer';
const calculate = '/admin/settlements/calculate';
const period = { period_start: '2026-01-01', period_end: '2026-01-31' };
const version = 'a'.repeat(32);
const supplier = () => request(app).patch(inventory).set('x-test-user', 'fixture-user').set('x-test-active', 'true');
const admin = () => request(app).post(calculate).set('x-test-user', 'fixture-user').set('x-test-admin', 'true');
beforeEach(() => { mockUpdate.mockReset(); mockCalculate.mockReset(); });
describe('write conflict HTTP contracts (authentication/identity stubs)', () => {
  it('still requires authentication and active supplier before any inventory write', async () => {
    expect((await request(app).patch(inventory).send({ stock_quantity: 5 })).status).toBe(401);
    expect((await request(app).patch(inventory).set('x-test-user','fixture-user').send({ stock_quantity: 5 })).status).toBe(403);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
  it.each([null, 1, '', 'short', 'A'.repeat(32)])('rejects malformed optional version %j before writes', async (expected_version) => {
    const response = await supplier().send({ stock_quantity: 5, expected_version });
    expect(response.status).toBe(400); expect(response.body.error).toBe('INVALID_INVENTORY_VERSION');
    expect(mockUpdate).not.toHaveBeenCalled();
  });
  it('uses middleware supplier context and returns a stale snapshot as 409', async () => {
    mockUpdate.mockResolvedValue('INVENTORY_CONFLICT');
    const response = await supplier().send({ supplierId: 'foreign-context', stock_quantity: 5, expected_version: version });
    expect(response.status).toBe(409); expect(response.body.error).toBe('INVENTORY_CONFLICT');
    expect(mockUpdate).toHaveBeenCalledWith('fixture-offer','fixture-supplier',expect.objectContaining({ stock_quantity: 5, expected_version: version }));
  });
  it.each([[null,404,'NOT_FOUND'],['NO_UPDATES',400,'NO_UPDATES']] as const)('preserves %s response', async (result, status, error) => {
    mockUpdate.mockResolvedValue(result);
    const response = await supplier().send({}); expect(response.status).toBe(status); expect(response.body.error).toBe(error);
  });
  it('retains successful versionless writes for legacy clients', async () => {
    mockUpdate.mockResolvedValue({ stock_quantity: 5, inventory_version: version });
    const response = await supplier().send({ stock_quantity: 5 });
    expect(response.status).toBe(200); expect(response.body).toMatchObject({success:true,data:{stock_quantity:5,inventory_version:version}});
  });
  it('still requires admin scope before calculating settlements', async () => {
    expect((await request(app).post(calculate).send(period)).status).toBe(401);
    expect((await request(app).post(calculate).set('x-test-user','fixture-user').send(period)).status).toBe(403);
    expect(mockCalculate).not.toHaveBeenCalled();
  });
  it('returns supplier link conflict without raw order IDs or an internal-error response', async () => {
    mockCalculate.mockRejectedValue(new SettlementOrderConflictError(2));
    const response = await admin().send(period);
    expect(response.status).toBe(409);
    expect(response.body).toEqual({success:false,error:'SETTLEMENT_ORDER_SUPPLIER_CONFLICT',message:expect.stringContaining('공급자에 중복 연결')});
  });
  it('preserves database-unique conflicts and genuine internal failure responses', async () => {
    mockCalculate.mockRejectedValueOnce({code:'23505'}).mockRejectedValueOnce(new Error('Fixture unavailable'));
    expect((await admin().send(period)).body.error).toBe('DUPLICATE_SETTLEMENT');
    const response = await admin().send(period); expect(response.status).toBe(500); expect(response.body.error).toBe('INTERNAL_ERROR');
  });
});
