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

// WO-O4O-AUTH-ONBOARDING-UX-CLEANUP-V1 T4: 정산 저장과 통신판매업 저장 분리
describe('settlement and mail-order saves are independent', () => {
  afterEach(() => { supplier.mailOrderSalesStatus = undefined; supplier.mailOrderSalesRegistrationNumber = undefined; supplier.settlementBankName = undefined; });
  it('saves settlement fields even when the stored mail-order state lacks a registration number', async () => {
    supplier.mailOrderSalesStatus = 'reported';
    supplier.mailOrderSalesRegistrationNumber = null;
    const result = await service.updateOnboarding('supplier', { settlementBankName: '검증 은행' });
    expect(result).toMatchObject({ success: true, data: { settlementBankName: '검증 은행' } });
  });
  it('still requires a registration number when the mail-order status is submitted as reported', async () => {
    expect(await service.updateOnboarding('supplier', { mailOrderSalesStatus: 'reported', mailOrderSalesRegistrationNumber: '' }))
      .toEqual({ success: false, error: 'MAIL_ORDER_REGISTRATION_NUMBER_REQUIRED' });
  });
  it('reports missing settlement fields from the same rule the server uses', async () => {
    const result: any = await service.updateOnboarding('supplier', {});
    expect(result.data.missingSettlementFields).toEqual(['settlementBankName', 'settlementAccountNumber', 'settlementAccountHolder']);
  });
});
