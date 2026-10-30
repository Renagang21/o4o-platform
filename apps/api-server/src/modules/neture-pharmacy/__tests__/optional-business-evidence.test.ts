import { PharmacyMembershipService } from '../services/pharmacy-membership.service.js';
import { assertNetureMainMembershipActive } from '../../neture/services/neture-main-membership.js';

jest.mock('../../neture/services/neture-main-membership.js', () => ({ assertNetureMainMembershipActive: jest.fn() }));
jest.mock('../../policy-acceptance/service-enrollment-policy.service.js', () => ({
  recordEnrollmentPolicies: jest.fn(async () => []), recordEnrollmentApplication: jest.fn(),
}));
jest.mock('../services/pharmacy-store-link.js', () => ({
  createPharmacyStoreOrganization: jest.fn(async () => 'org'), updatePharmacyStoreProfile: jest.fn(),
}));
jest.mock('../../../utils/logger.js', () => ({ __esModule: true, default: { error: jest.fn() } }));

const input = { pharmacyName: '합성 약국', businessNumber: '1234567890', pharmacistLicenseNumber: 'synthetic-license' };
const row = { id: 'application', organization_id: 'org', applicant_user_id: 'user', status: 'pending', pharmacist_license_number: input.pharmacistLicenseNumber };
const provisioner = { activate: jest.fn(), deactivate: jest.fn() };
let query: jest.Mock;
let service: PharmacyMembershipService;
let qualified: boolean;
beforeEach(() => {
  jest.clearAllMocks(); qualified = true;
  query = jest.fn(async (sql: string) => {
    if (sql.includes('FOR UPDATE')) return [row];
    if (sql.includes('kpa_pharmacist_profiles')) return qualified ? [{ id: 'qualification' }] : [];
    if (sql.includes('INSERT INTO neture_pharmacy_memberships')) return [row];
    if (sql.includes('UPDATE neture_pharmacy_memberships')) return [[{ ...row, status: 'active' }], 1];
    return [];
  });
  const db = { transaction: async (run: any) => run({ query }), query };
  service = new PharmacyMembershipService(db as any, provisioner);
});

it('accepts an application with no optional details or file', async () => {
  expect(await service.apply('user', input)).toEqual(row);
  expect(assertNetureMainMembershipActive).toHaveBeenCalledWith(expect.anything(), 'user');
  expect(query.mock.calls.some(([sql]) => sql.includes('kyc_documents'))).toBe(false);
});

it('keeps contact and invoice emails separate in organization metadata', async () => {
  await service.apply('user', { ...input, contactName: '합성 담당자', managerPhone: '01000000000', contactEmail: 'contact@example.invalid', taxInvoiceEmail: 'tax@example.invalid' });
  const write = query.mock.calls.find(([sql]) => sql.includes('UPDATE organizations SET metadata'))!;
  expect(JSON.parse(write[1][2])).toEqual({ contactName: '합성 담당자', managerPhone: '01000000000', contactEmail: 'contact@example.invalid', taxInvoiceEmail: 'tax@example.invalid' });
});

it('rejects a supplied file that is not owned by the applicant', async () => {
  await expect(service.apply('user', { ...input, businessRegistrationDocumentId: '11111111-1111-4111-8111-111111111111' })).rejects.toMatchObject({ code: 'INVALID_DOCUMENT' });
  expect(query).toHaveBeenCalledWith(expect.stringContaining('user_id = $2'), ['11111111-1111-4111-8111-111111111111', 'user']);
  expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO neture_pharmacy_memberships'))).toBe(false);
});

it('rejects malformed optional contact emails', async () => {
  await expect(service.apply('user', { ...input, contactEmail: 'invalid' })).rejects.toMatchObject({ code: 'INVALID_EMAIL' });
  expect(query).not.toHaveBeenCalled();
});

it('approves without evidence when the personal pharmacist qualification is verified', async () => {
  expect(await service.decide('operator', 'application', 'approve')).toMatchObject({ status: 'active' });
  expect(provisioner.activate).toHaveBeenCalled();
  expect(query.mock.calls.some(([sql]) => sql.includes('kyc_documents'))).toBe(false);
});

it('still prevents approval without the matching personal qualification', async () => {
  qualified = false;
  await expect(service.decide('operator', 'application', 'approve')).rejects.toMatchObject({ code: 'PHARMACIST_QUALIFICATION_REQUIRED' });
  expect(provisioner.activate).not.toHaveBeenCalled();
});
