import { SupplierOnboardingService } from '../supplier-onboarding.service.js';
jest.mock('@google-cloud/storage', () => ({ Storage: jest.fn() }));
jest.mock('../../entities/index.js', () => ({ NetureSupplier: class {} }));

const supplier: any = { id: 'supplier', taxInvoiceEmail: 'tax@example.invalid' };
const save = jest.fn(async (value) => value);
const repo = { findOne: jest.fn(async () => supplier), save };
const service = new SupplierOnboardingService({ getRepository: () => repo } as any);
beforeEach(() => { jest.clearAllMocks(); supplier.taxInvoiceEmail = 'tax@example.invalid'; });

it('allows an optional invoice email to be omitted or cleared', async () => {
  expect(await service.updateOnboarding('supplier', {})).toMatchObject({ success: true, data: { taxInvoiceEmail: 'tax@example.invalid' } });
  expect(await service.updateOnboarding('supplier', { taxInvoiceEmail: '' })).toMatchObject({ success: true, data: { taxInvoiceEmail: null } });
});

it('still rejects a malformed nonempty invoice email', async () => {
  expect(await service.updateOnboarding('supplier', { taxInvoiceEmail: 'invalid' })).toEqual({ success: false, error: 'INVALID_TAX_INVOICE_EMAIL' });
  expect(save).not.toHaveBeenCalled();
});
