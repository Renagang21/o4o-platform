import { recordEnrollmentApplication, recordEnrollmentPolicies, getEnrollmentPolicies } from '../service-enrollment-policy.service.js';
const id = '11111111-1111-4111-8111-111111111111';
const doc = { id, slug: 'supplier-service-terms', service_key: 'supplier', document_type: 'terms', version: 2, title: 'Supplier agreement', content: 'Supplier application conditions' };
function harness(documents = [doc]) {
  const writes: unknown[] = [];
  const query = jest.fn(async (sql: string, params: any[]) => {
    if (/FROM service_policy_documents/.test(sql)) return documents.filter(d => d.document_type === params[1]);
    if (/^INSERT/.test(sql)) writes.push({ sql, params });
    return [];
  }); return { query, writes };
}
it.each(['supplier', 'community', 'funding', 'kpa-society', 'lecture'])('%s only records published documents for its explicit application', async service => {
  const h = harness([{ ...doc, service_key: service, slug: `${service}-service-terms` }]);
  const policies = await recordEnrollmentPolicies(h, 'user', service, [{ policyDocumentId: id, version: 2, documentType: 'terms' }]);
  expect(policies[0].serviceKey).toBe(service); expect(h.writes).toHaveLength(1);
  await recordEnrollmentApplication(h, 'user', service, { type: 'application', id: 'application-id', resourceId: 'resource' }, policies);
  expect(JSON.parse((h.writes[1] as any).params[2])).toMatchObject({ application: { id: 'application-id', resourceId: 'resource' }, policies });
});
it.each([undefined, [], [{ policyDocumentId: id, version: 2, documentType: 'privacy' }], [{ policyDocumentId: id, version: 2, documentType: 'terms' }, { policyDocumentId: id, version: 2, documentType: 'terms' }]])('rejects omitted/duplicate/wrong-type references before writes: %j', async references => {
  const h = harness(); await expect(recordEnrollmentPolicies(h, 'user', 'supplier', references as any)).rejects.toHaveProperty('code', 'ENROLLMENT_POLICY_REQUIRED'); expect(h.writes).toHaveLength(0);
});
it('rejects a stale policy before storing an application association', async () => {
  const h = harness(); await expect(recordEnrollmentPolicies(h, 'user', 'supplier', [{ policyDocumentId: id, version: 1, documentType: 'terms' }])).rejects.toHaveProperty('code', 'POLICY_VERSION_MISMATCH'); expect(h.writes).toHaveLength(0);
});
it('does not fabricate agreement or audit history for legacy applications', async () => {
  const h = harness([]); expect(await recordEnrollmentPolicies(h, 'user', 'supplier', undefined)).toEqual([]);
  await recordEnrollmentApplication(h, 'user', 'supplier', { type: 'application', id: 'id' }, []); expect(h.writes).toHaveLength(0);
});
it.each(['neture', 'store', 'admin', 'arbitrary'])('does not accept a workspace/common key as an independent application service: %s', async key => {
  const h = harness(); await expect(getEnrollmentPolicies(h, key)).rejects.toHaveProperty('code', 'UNKNOWN_SERVICE'); expect(h.query).not.toHaveBeenCalled();
});

it('does not reinterpret old published integrated terms as a new application policy', async () => { const h = harness([{ ...doc, slug: 'legacy-integrated-terms' }]); expect(await getEnrollmentPolicies(h, 'supplier')).toEqual([]); expect(await recordEnrollmentPolicies(h, 'user', 'supplier', undefined)).toEqual([]); expect(h.writes).toHaveLength(0); });
