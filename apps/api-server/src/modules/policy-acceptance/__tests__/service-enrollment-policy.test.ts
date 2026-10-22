import { recordEnrollmentApplication, recordEnrollmentPolicies, getEnrollmentPolicies } from '../service-enrollment-policy.service.js';
const id = '11111111-1111-4111-8111-111111111111';
const doc = { id, slug: 'supplier-service-terms', service_key: 'supplier', document_type: 'terms', version: 2, title: 'Supplier agreement', content: 'Supplier application conditions' };
const privacy = { ...doc, id: '22222222-2222-4222-8222-222222222222', slug: 'supplier-service-privacy', document_type: 'privacy', content: 'Privacy application notice' };
const refs = [{ policyDocumentId: id, version: 2, documentType: 'terms' as const }, { policyDocumentId: privacy.id, version: 2, documentType: 'privacy' as const }];
function harness(documents = [doc, privacy]) {
  const writes: unknown[] = [];
  const query = jest.fn(async (sql: string, params: any[]) => {
    if (/FROM service_policy_documents/.test(sql)) return documents.filter(d => d.document_type === params[1]);
    if (/^INSERT/.test(sql)) writes.push({ sql, params });
    return [];
  }); return { query, writes };
}
it.each(['supplier', 'community', 'funding', 'kpa-society', 'lecture', 'carepharm'])('%s only records published documents for its explicit application', async service => {
  const h = harness([doc, privacy].map(d => ({ ...d, service_key: service, slug: `${service}-service-${d.document_type}` })));
  const policies = await recordEnrollmentPolicies(h, 'user', service, refs);
  expect(policies[0].serviceKey).toBe(service); expect(h.writes).toHaveLength(2);
  await recordEnrollmentApplication(h, 'user', service, { type: 'application', id: 'application-id', resourceId: 'resource' }, policies);
  expect(JSON.parse((h.writes[2] as any).params[2])).toMatchObject({ application: { id: 'application-id', resourceId: 'resource' }, policies });
});
it.each([undefined, [], [{ policyDocumentId: id, version: 2, documentType: 'privacy' }], [{ policyDocumentId: id, version: 2, documentType: 'terms' }, { policyDocumentId: id, version: 2, documentType: 'terms' }]])('rejects omitted/duplicate/wrong-type references before writes: %j', async references => {
  const h = harness(); await expect(recordEnrollmentPolicies(h, 'user', 'supplier', references as any)).rejects.toHaveProperty('code', 'ENROLLMENT_POLICY_REQUIRED'); expect(h.writes).toHaveLength(0);
});
it('rejects a stale policy before storing an application association', async () => {
  const h = harness(); await expect(recordEnrollmentPolicies(h, 'user', 'supplier', [{ ...refs[0], version: 1 }, refs[1]])).rejects.toHaveProperty('code', 'POLICY_VERSION_MISMATCH'); expect(h.writes).toHaveLength(0);
});
it('records a legacy application attempt without fabricating policy agreement', async () => {
  const h = harness([]); expect(await recordEnrollmentPolicies(h, 'user', 'supplier', undefined)).toEqual([]);
  await recordEnrollmentApplication(h, 'user', 'supplier', { type: 'application', id: 'id' }, []); expect(h.writes).toHaveLength(1);
  expect((h.writes[0] as any).sql).toContain('INSERT INTO action_logs');
  expect(JSON.parse((h.writes[0] as any).params[2])).toEqual({ application: { type: 'application', id: 'id' }, policies: [] });
});
it.each(['neture', 'store', 'admin', 'arbitrary'])('does not accept a workspace/common key as an independent application service: %s', async key => {
  const h = harness(); await expect(getEnrollmentPolicies(h, key)).rejects.toHaveProperty('code', 'UNKNOWN_SERVICE'); expect(h.query).not.toHaveBeenCalled();
});

it('does not reinterpret old published integrated terms as a new application policy', async () => { const h = harness([{ ...doc, slug: 'legacy-integrated-terms' }]); expect(await getEnrollmentPolicies(h, 'supplier')).toEqual([]); expect(await recordEnrollmentPolicies(h, 'user', 'supplier', undefined)).toEqual([]); expect(h.writes).toHaveLength(0); });

it.each([{ documents: [doc] }, { documents: [privacy] }, { documents: [doc, { ...privacy, version: 3 }] }])('blocks partial or mismatched policy sets without any evidence: %j', async ({ documents }) => { const h = harness(documents); await expect(recordEnrollmentPolicies(h, 'user', 'supplier', refs)).rejects.toHaveProperty('code', 'POLICY_UNAVAILABLE'); expect(h.writes).toHaveLength(0); });

it('CarePharm does not have a legacy no-policy application fallback', async () => { const h=harness([]);await expect(getEnrollmentPolicies(h, 'carepharm')).rejects.toHaveProperty('code','POLICY_UNAVAILABLE');expect(h.writes).toHaveLength(0); });
