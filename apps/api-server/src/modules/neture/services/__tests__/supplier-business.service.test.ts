import { AppDataSource } from '../../../../database/connection.js';
import { NetureSupplierBusinessService, SupplierProfileFieldUnsupportedError } from '../supplier-business.service.js';
import { NetureSupplierService, SupplierProfileFieldUnsupportedError as LegacyProfileError } from '../supplier.service.js';
import { SupplierStatus } from '../../entities/index.js';

jest.mock('../../../../database/connection.js', () => ({
  AppDataSource: { getRepository: jest.fn(), query: jest.fn(), transaction: jest.fn() },
}));
jest.mock('../../entities/index.js', () => ({
  NetureSupplier: class NetureSupplier {},
  SupplierStatus: { ACTIVE: 'ACTIVE', PENDING: 'PENDING' },
  ContactVisibility: { PUBLIC: 'PUBLIC', PRIVATE: 'PRIVATE', PARTNERS: 'PARTNERS' },
}));
jest.mock('../../../../utils/logger.js', () => ({
  __esModule: true, default: { error: jest.fn(), warn: jest.fn() },
}));

// The facade's unrelated lifecycle dependencies never run in these profile tests.
jest.mock('../../middleware/supplier-context.resolver.js', () => ({}));
jest.mock('../../../auth/services/role-assignment.service.js', () => ({}));
jest.mock('../neture-main-membership.js', () => ({}));
jest.mock('../../../organization/services/organization-ops.service.js', () => ({}));
jest.mock('../../../../services/NotificationService.js', () => ({}));
jest.mock('../../../../services/auth/demo-account.service.js', () => ({}));

const org = {
  name: 'Fixture organization', business_number: 'fixture-number', address: 'Fixture address',
  address_detail: { zipCode: 'fixture-postal', baseAddress: 'Fixture address', detailAddress: 'Fixture detail' },
  metadata: { otherService: { retained: true }, businessProfile: { businessEntityType: 'fixture-type', businessStartDate: '2000-01-01', retained: true } },
};

describe('supplier business profile behavior', () => {
  const findOne = jest.fn();
  const save = jest.fn();
  const txQuery = jest.fn();
  const manager = { query: txQuery, getRepository: jest.fn(() => ({ save })) };
  let service: NetureSupplierBusinessService;
  let supplier: Record<string, unknown>;

  beforeEach(() => {
    jest.clearAllMocks();
    supplier = {
      id: 'fixture-supplier', organizationId: 'fixture-org', status: SupplierStatus.ACTIVE,
      representativeName: 'Fixture representative', managerName: '', managerPhone: '',
      minOrderAmount: 500, minOrderSurcharge: 20,
    };
    findOne.mockResolvedValue(supplier);
    (AppDataSource.getRepository as jest.Mock).mockReturnValue({ findOne });
    (AppDataSource.query as jest.Mock).mockResolvedValue([org]);
    (AppDataSource.transaction as jest.Mock).mockImplementation(async (callback) => callback(manager));
    txQuery.mockImplementation(async (sql: string) => sql.startsWith('SELECT') ? [org] : []);
    save.mockResolvedValue(supplier);
    service = new NetureSupplierBusinessService();
  });

  it('preserves the controller error class identity through the old import path', () => {
    expect(LegacyProfileError).toBe(SupplierProfileFieldUnsupportedError);
  });

  it('the existing facade delegates reads and updates without changing responses', async () => {
    const facade = new NetureSupplierService();
    expect(await facade.getSupplierProfile('fixture-supplier')).toEqual(await service.getSupplierProfile('fixture-supplier'));
    expect(await facade.getSupplierOrderCondition('fixture-supplier')).toEqual(await service.getSupplierOrderCondition('fixture-supplier'));
    expect(await facade.updateSupplierProfile('fixture-supplier', { managerName: 'Updated fixture' })).toMatchObject({ managerName: 'Updated fixture' });
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('reads canonical organization fields and preserves completion compatibility aliases', async () => {
    const result = await service.getSupplierProfile('fixture-supplier');
    expect(result).toMatchObject({ name: org.name, businessNumber: org.business_number, businessEntityType: 'fixture-type', businessStartDate: '2000-01-01', businessZipCode: 'fixture-postal', profileComplete: false, activationReady: false, _prefilled: false });
    expect(result?.missingProfileFields).toEqual(['managerName', 'managerPhone']);
    expect(result?.missingActivationFields).toEqual(result?.missingProfileFields);
  });

  it.each(['getSupplierProfile', 'getSupplierOrderCondition'] as const)('%s returns null without reading an organization when supplier is absent', async (method) => {
    findOne.mockResolvedValue(null);
    expect(await service[method]('missing')).toBeNull();
    expect(AppDataSource.query).not.toHaveBeenCalled();
  });

  it('order conditions require an active supplier and keep zero amounts', async () => {
    supplier.minOrderAmount = 0;
    expect(await service.getSupplierOrderCondition('fixture-supplier')).toMatchObject({ supplierName: org.name, minOrderAmount: 0, minOrderSurcharge: 20 });
    expect(findOne).toHaveBeenCalledWith({ where: { id: 'fixture-supplier', status: SupplierStatus.ACTIVE } });
  });

  it('stores private manager email separately from public contact and invoice email', async () => {
    await service.updateSupplierProfile('fixture-supplier', { managerEmail: ' person@example.invalid ' });
    const write = txQuery.mock.calls.find(([sql]) => sql.startsWith('UPDATE organizations'));
    expect(write![1]).toContainEqual(expect.stringContaining('"managerEmail":"person@example.invalid"'));
    expect(supplier.contactEmail).not.toBe('person@example.invalid');
    expect(supplier.taxInvoiceEmail).not.toBe('person@example.invalid');
  });

  it('rejects malformed manager email before writing', async () => {
    await expect(service.updateSupplierProfile('fixture-supplier', { managerEmail: 'bad email' })).rejects.toMatchObject({ name: 'SupplierProfileEmailInvalidError' });
    expect(AppDataSource.transaction).not.toHaveBeenCalled();
  });

  it('updates the canonical organization name in the profile transaction', async () => {
    (AppDataSource.query as jest.Mock).mockResolvedValue([{ ...org, name: 'Renamed fixture' }]);
    const result = await service.updateSupplierProfile('fixture-supplier', { name: '  Renamed fixture  ' });
    expect(txQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE organizations SET name = $1'),
      ['Renamed fixture', 'fixture-org'],
    );
    expect(save).toHaveBeenCalledWith(supplier);
    expect(supplier).not.toHaveProperty('name');
    expect(result).toMatchObject({ name: 'Renamed fixture' });
    expect(await service.getSupplierProfile('fixture-supplier')).toMatchObject({ name: 'Renamed fixture' });
  });

  it.each(['', '   ', 'x'.repeat(256), null, 42, {}, []])('rejects invalid business name %p before writes', async (name) => {
    await expect(service.updateSupplierProfile('fixture-supplier', { name } as any))
      .rejects.toMatchObject({ name: 'SupplierProfileNameInvalidError' });
    expect(AppDataSource.transaction).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  it('rejects a name change when there is no canonical organization', async () => {
    supplier.organizationId = null;
    await expect(service.updateSupplierProfile('fixture-supplier', { name: 'Renamed fixture' }))
      .rejects.toMatchObject({ fields: ['name'] });
    expect(AppDataSource.transaction).not.toHaveBeenCalled();
  });

  it.each(['individual', 'corporation'])('accepts an explicit %s classification', async (businessEntityType) => {
    await service.updateSupplierProfile('fixture-supplier', { businessEntityType });
    const update = txQuery.mock.calls.find(([sql]) => sql.startsWith('UPDATE organizations'));
    expect(update).toBeDefined();
    expect(update![1]).toContainEqual(expect.stringContaining(`"businessEntityType":"${businessEntityType}"`));
  });

  it.each(['simple_taxpayer', 'general_taxpayer', 'tax_exempt', 'non_profit', 'other', '', null, 42, {}])(
    'rejects classification %p before any profile writes', async (businessEntityType) => {
      await expect(service.updateSupplierProfile('fixture-supplier', { businessEntityType } as any))
        .rejects.toMatchObject({ name: 'SupplierProfileEntityTypeInvalidError' });
      expect(AppDataSource.transaction).not.toHaveBeenCalled();
      expect(save).not.toHaveBeenCalled();
    },
  );

  it('merges address and business metadata using the same transaction before supplier save', async () => {
    const result = await service.updateSupplierProfile('fixture-supplier', { businessZipCode: 'changed-postal', businessEntityType: 'corporation', managerPhone: '010-0000-0000' });
    const update = txQuery.mock.calls.find(([sql]) => sql.startsWith('UPDATE organizations'));
    expect(update).toBeDefined();
    const jsonValues = update![1].filter((value: unknown) => typeof value === 'string' && value.startsWith('{')).map((value: string) => JSON.parse(value));
    expect(jsonValues).toContainEqual({ zipCode: 'changed-postal', baseAddress: 'Fixture address', detailAddress: 'Fixture detail' });
    expect(jsonValues).toContainEqual({ otherService: { retained: true }, businessProfile: { businessEntityType: 'corporation', businessStartDate: '2000-01-01', retained: true } });
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ managerPhone: '01000000000' }));
    expect(txQuery.mock.invocationCallOrder.at(-1)).toBeLessThan(save.mock.invocationCallOrder[0]);
    expect(AppDataSource.transaction).toHaveBeenCalledTimes(1);
    expect(result?.managerPhone).toBe('01000000000');
  });

  it.each(['read', 'update'] as const)('%s keeps the contact and order condition response fields after sharing their projection', async (mode) => {
    Object.assign(supplier, {
      contactEmail: 'fixture-email', contactPhone: 'fixture-phone', contactWebsite: 'fixture-site', contactKakao: 'fixture-channel',
      contactEmailVisibility: 'PRIVATE', contactPhoneVisibility: 'PUBLIC', contactWebsiteVisibility: 'PARTNERS', contactKakaoVisibility: 'PRIVATE',
      orderConditionNote: 'fixture condition',
    });
    const result = mode === 'read'
      ? await service.getSupplierProfile('fixture-supplier')
      : await service.updateSupplierProfile('fixture-supplier', {});
    expect(result).toMatchObject({
      contactEmail: 'fixture-email', contactPhone: 'fixture-phone', contactWebsite: 'fixture-site', contactKakao: 'fixture-channel',
      contactEmailVisibility: 'PRIVATE', contactPhoneVisibility: 'PUBLIC', contactWebsiteVisibility: 'PARTNERS', contactKakaoVisibility: 'PRIVATE',
      minOrderAmount: 500, minOrderSurcharge: 20, orderConditionNote: 'fixture condition',
    });
    expect(Object.keys(result!)).not.toContain('contactAndOrderProfile');
  });

  it('normalizes supplied order/shipping values and retains omitted fields', async () => {
    await service.updateSupplierProfile('fixture-supplier', { minOrderAmount: 0, orderConditionNote: '  fixture  ', baseShippingFee: 0, freeShippingThreshold: -1, averageDispatchDays: null, shippingIsland: '  island  ' });
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ minOrderAmount: null, minOrderSurcharge: 20, orderConditionNote: 'fixture', baseShippingFee: 0, freeShippingThreshold: null, averageDispatchDays: null, shippingIsland: 'island' }));
    expect(txQuery).not.toHaveBeenCalled();
  });

  it('rejects business metadata with no canonical organization before starting a transaction', async () => {
    supplier.organizationId = null;
    await expect(service.updateSupplierProfile('fixture-supplier', { businessEntityType: 'individual' })).rejects.toMatchObject({ name: 'SupplierProfileFieldUnsupportedError', fields: ['businessEntityType'] });
    expect(AppDataSource.transaction).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
    expect(new SupplierProfileFieldUnsupportedError(['businessStartDate'])).toBeInstanceOf(Error);
  });

  it('propagates organization write failure without saving the supplier', async () => {
    const failure = new Error('fixture organization write failed');
    txQuery.mockRejectedValue(failure);
    await expect(service.updateSupplierProfile('fixture-supplier', { businessNumber: 'changed' })).rejects.toBe(failure);
    expect(save).not.toHaveBeenCalled();
  });

  it('propagates supplier save failure so the transaction caller can roll back both writes', async () => {
    const failure = new Error('fixture supplier save failed');
    save.mockRejectedValue(failure);
    await expect(service.updateSupplierProfile('fixture-supplier', { businessNumber: 'changed' })).rejects.toBe(failure);
    expect(txQuery).toHaveBeenCalledWith(expect.stringContaining('UPDATE organizations'), expect.any(Array));
  });

  it('returns null without writes for an absent supplier update', async () => {
    findOne.mockResolvedValue(null);
    expect(await service.updateSupplierProfile('missing', { managerName: 'fixture' })).toBeNull();
    expect(AppDataSource.transaction).not.toHaveBeenCalled();
  });

  it('retains graceful organization read failure behavior', async () => {
    (AppDataSource.query as jest.Mock).mockRejectedValue(new Error('fixture unavailable'));
    expect(await service.getSupplierProfile('fixture-supplier')).toMatchObject({ name: '', businessNumber: null });
  });
});
