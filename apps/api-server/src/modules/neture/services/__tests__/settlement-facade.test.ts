import type { DataSource } from 'typeorm';
import { NetureSettlementService } from '../neture-settlement.service.js';
import { SupplierSettlementReadService } from '../supplier-settlement-read.service.js';
import { AdminSettlementReadService } from '../admin-settlement-read.service.js';
import { SettlementCommandService } from '../settlement-command.service.js';

jest.mock('../../middleware/supplier-context.resolver.js', () => ({ listSupplierOwnerUserIds: jest.fn() }));
jest.mock('../../../../services/NotificationService.js', () => ({ notificationService: { createNotification: jest.fn() } }));
jest.mock('../../../../utils/logger.js', () => ({
  __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const cases = [
  ['getSupplierSettlements', SupplierSettlementReadService, ['fixture-supplier', { page: 2, limit: 3, status: 'paid' }]],
  ['getSupplierKpi', SupplierSettlementReadService, ['fixture-supplier']],
  ['getSupplierSettlementDetail', SupplierSettlementReadService, ['fixture-settlement', 'fixture-supplier']],
  ['getAdminSettlements', AdminSettlementReadService, [{ page: 2, limit: 3 }]],
  ['getAdminKpi', AdminSettlementReadService, []],
  ['getAdminSettlementDetail', AdminSettlementReadService, ['fixture-settlement']],
  ['calculateSettlements', SettlementCommandService, ['2026-01-01', '2026-01-31']],
  ['cancelSettlement', SettlementCommandService, ['fixture-settlement', 'Fixture reason']],
  ['approveSettlement', SettlementCommandService, ['fixture-settlement', 'Fixture note']],
  ['paySettlement', SettlementCommandService, ['fixture-settlement', undefined]],
] as const;
type Callable = Record<string, (...args: unknown[]) => Promise<unknown>>;

afterEach(() => jest.restoreAllMocks());

it('the existing DataSource constructor stays lazy and public method names stay compatible', () => {
  const query = jest.fn();
  new NetureSettlementService({ query } as unknown as DataSource);
  expect(query).not.toHaveBeenCalled();
  const methods = Object.getOwnPropertyNames(NetureSettlementService.prototype).filter((name) =>
    name !== 'constructor' && typeof Object.getOwnPropertyDescriptor(NetureSettlementService.prototype, name)?.value === 'function',
  );
  expect(methods.sort()).toEqual(cases.map(([name]) => name).sort());
});

it.each(cases)('%s forwards exact arguments/results and reuses its injected DataSource', async (name, owner, args) => {
  const source = { query: jest.fn() } as unknown as DataSource;
  const result = { fixture: true };
  const spy = jest.spyOn(owner.prototype as unknown as Callable, name).mockResolvedValue(result);
  const facade = new NetureSettlementService(source) as unknown as Callable;
  expect(await facade[name](...args)).toBe(result);
  expect(await facade[name](...args)).toBe(result);
  expect(spy.mock.calls).toEqual([args, args]);
  expect(spy.mock.instances[0]).toBe(spy.mock.instances[1]);
  expect((spy.mock.instances[0] as unknown as { dataSource: DataSource }).dataSource).toBe(source);
  expect(source.query).not.toHaveBeenCalled();
});

it.each(cases)('%s propagates the same rejection through the compatibility façade', async (name, owner, args) => {
  const failure = new Error('Fixture delegated failure');
  jest.spyOn(owner.prototype as unknown as Callable, name).mockRejectedValue(failure);
  const facade = new NetureSettlementService({} as DataSource) as unknown as Callable;
  await expect(facade[name](...args)).rejects.toBe(failure);
});
