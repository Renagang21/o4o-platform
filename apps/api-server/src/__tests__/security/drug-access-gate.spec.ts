import type { DataSource } from 'typeorm';
import { isDrugRegulatoryType, assertDrugActionAllowed, assertDrugOfferAllowed, DrugGateErrorCode } from '../../modules/neture/guards/drug-access.guard.js';

const MASTER = '11111111-1111-4111-8111-111111111111';
const ORG = '22222222-2222-4222-8222-222222222222';
function fixture(type: string | null = 'DRUG', enrolled = true, failing = false) {
  const query = jest.fn(async (sql: string) => {
    if (sql.includes('product_masters')) return type == null ? [] : [{ regulatory_type: type }];
    if (sql.includes('organization_service_enrollments')) {
      if (failing) throw new Error('fixture DB unavailable');
      return enrolled ? [{ ok: 1 }] : [];
    }
    throw new Error('Unexpected query (including retired audience policy)');
  });
  return { executor: { query } as unknown as DataSource, query };
}

it.each(['DRUG', '의약품', ' drug '])('recognizes the product master classification %s', type => {
  expect(isDrugRegulatoryType(type)).toBe(true);
});
it.each(['QUASI_DRUG', 'GENERAL', 'MEDICAL_DEVICE'])('keeps non-drug classification %s', type => {
  expect(isDrugRegulatoryType(type)).toBe(false);
});
it.each(['neture', 'kpa-society', 'supplier'])('pharmacy listing in %s requires no audience policy', async serviceKey => {
  const { executor, query } = fixture();
  await expect(assertDrugActionAllowed(executor, { action: 'OPL_CREATE', masterId: MASTER, organizationId: ORG, serviceKey }))
    .resolves.toEqual({ allowed: true, isDrug: true });
  expect(query).toHaveBeenCalledWith(expect.stringContaining("status = 'active'"), [ORG, serviceKey]);
  expect(query.mock.calls.every(([sql]) => !sql.includes('service_audience_policies'))).toBe(true);
});
it.each([{ isPublic: true }, { serviceKeys: ['neture', 'kpa-society'] }, { serviceKeys: [] }])('supplier drug supply uses the regular publication scope: %j', async supply => {
  const { executor, query } = fixture();
  await expect(assertDrugOfferAllowed(executor, { action: 'OFFER_PUBLISH', regulatoryType: 'DRUG', ...supply }))
    .resolves.toEqual({ allowed: true, isDrug: true });
  expect(query).not.toHaveBeenCalled();
});
it.each([false, true])('rejects an absent or unverified organization enrollment (DB failure=%s)', async failing => {
  const { executor } = fixture('DRUG', false, failing);
  await expect(assertDrugActionAllowed(executor, { action: 'OPL_ACTIVATE', masterId: MASTER, serviceKey: 'neture', organizationId: ORG }))
    .resolves.toMatchObject({ allowed: false, code: DrugGateErrorCode.DRUG_ORG_CONTEXT_MISMATCH });
});
it('rejects a missing product and missing service context', async () => {
  await expect(assertDrugOfferAllowed(fixture(null).executor, { action: 'OFFER_PUBLISH', masterId: MASTER }))
    .resolves.toMatchObject({ allowed: false, code: DrugGateErrorCode.DRUG_PRODUCT_UNRESOLVED });
  await expect(assertDrugActionAllowed(fixture().executor, { action: 'OPL_CREATE', masterId: MASTER, organizationId: ORG }))
    .resolves.toMatchObject({ allowed: false, code: DrugGateErrorCode.DRUG_SERVICE_CONTEXT_REQUIRED });
});
it('keeps non-drug behavior without adding an enrollment lookup', async () => {
  const { executor, query } = fixture('GENERAL');
  await expect(assertDrugActionAllowed(executor, { action: 'OPL_CREATE', masterId: MASTER })).resolves.toEqual({ allowed: true, isDrug: false });
  expect(query).toHaveBeenCalledTimes(1);
});
