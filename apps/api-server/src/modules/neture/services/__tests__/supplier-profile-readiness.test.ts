import { contactPhoneWrite, missingProfileFieldsOf, missingSettlementFieldsOf } from '../supplier-profile-readiness.js';

describe('supplier profile readiness (WO-O4O-AUTH-ONBOARDING-UX-CLEANUP-V1)', () => {
  it('lists missing profile fields in a stable order', () => {
    expect(missingProfileFieldsOf({})).toEqual(['representativeName', 'managerName', 'managerPhone']);
    expect(missingProfileFieldsOf({ representativeName: ' 대표 ', managerName: '담당', managerPhone: '010' })).toEqual([]);
    expect(missingProfileFieldsOf({ representativeName: '   ' })).toContain('representativeName');
  });
  it('requires account details and a well-formed invoice email for settlement', () => {
    expect(missingSettlementFieldsOf({})).toEqual(['settlementBankName', 'settlementAccountNumber', 'settlementAccountHolder', 'taxInvoiceEmail']);
    expect(missingSettlementFieldsOf({
      settlementBankName: '은행', settlementAccountNumber: '1', settlementAccountHolder: '예금주', taxInvoiceEmail: 'invalid',
    })).toEqual(['validTaxInvoiceEmail']);
    expect(missingSettlementFieldsOf({
      settlementBankName: '은행', settlementAccountNumber: '1', settlementAccountHolder: '예금주', taxInvoiceEmail: 'tax@example.invalid',
    })).toEqual([]);
  });
  it('normalizes the public phone once for both stores, keeping the previous empty values', () => {
    expect(contactPhoneWrite('02-123-4567')).toEqual({ supplier: '021234567', organization: '021234567' });
    expect(contactPhoneWrite('')).toEqual({ supplier: '', organization: null });
    expect(contactPhoneWrite(null)).toEqual({ supplier: '', organization: null });
  });
});
