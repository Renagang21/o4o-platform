import { recordPublishedPolicyEvidence, readCurrentPolicyDocument } from '../policy-document-evidence.service.js';
import { computePolicyContentHash } from '../policy-acceptance.service.js';

const id = '11111111-1111-4111-8111-111111111111';
const doc = { id, service_key: 'neture', document_type: 'privacy', version: 2, title: 'Fixture privacy', content: 'Original privacy notice' };
const reference = { policyDocumentId: id, version: 2 };

describe('policy document evidence in caller transaction', () => {
  it.each([undefined, { policyDocumentId: id, version: 0 }, { policyDocumentId: id, version: 1.5 },
    { policyDocumentId: 'invalid', version: 2 }])('rejects malformed reference %j without any DB write', async input => {
    const query = jest.fn();
    await expect(recordPublishedPolicyEvidence({ query }, 'owner', 'neture', 'privacy', input))
      .rejects.toMatchObject({ code: 'POLICY_ACCEPTANCE_REQUIRED', httpStatus: 400 });
    expect(query).not.toHaveBeenCalled();
  });
  it.each([
    [[], 'POLICY_UNAVAILABLE'],
    [[{ ...doc, id: '22222222-2222-4222-8222-222222222222' }], 'POLICY_VERSION_MISMATCH'],
    [[{ ...doc, version: 3 }], 'POLICY_VERSION_MISMATCH'],
    [[{ ...doc, content: '' }], 'POLICY_UNAVAILABLE'],
    [[{ ...doc, content: null }], 'POLICY_UNAVAILABLE'],
    [[{ ...doc, title: ' ' }], 'POLICY_UNAVAILABLE'],
  ])('rejects unavailable/changed policy without inserting evidence', async (rows, code) => {
    const query = jest.fn().mockResolvedValue(rows);
    await expect(recordPublishedPolicyEvidence({ query }, 'owner', 'neture', 'privacy', reference)).rejects.toMatchObject({ code });
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toContain('FOR SHARE');
    expect(query.mock.calls[0][1]).toEqual(['neture', 'privacy']);
  });
  it('records current privacy version/hash as acknowledgement, not agreement or inferred consent', async () => {
    const query = jest.fn().mockResolvedValueOnce([doc]).mockResolvedValueOnce([]);
    const evidence = await recordPublishedPolicyEvidence({ query }, 'owner', 'neture', 'privacy', reference);
    expect(evidence).toMatchObject({ ...reference, contentHash: computePolicyContentHash(doc.content), acceptanceKind: 'acknowledgement' });
    expect(query.mock.calls[1][1]).toEqual(['owner', 'neture', id, 'privacy', 2, evidence.contentHash, 'acknowledgement']);
    expect(query.mock.calls[1][0]).toContain('ON CONFLICT');
  });
  it('keeps service terms agreement distinct from privacy acknowledgement', async () => {
    const query = jest.fn().mockResolvedValueOnce([{ ...doc, document_type: 'terms', service_key: 'supplier' }]).mockResolvedValueOnce([]);
    const evidence = await recordPublishedPolicyEvidence({ query }, 'owner', 'supplier', 'terms', reference);
    expect(evidence.acceptanceKind).toBe('agreement');
    expect(query.mock.calls[1][1][1]).toBe('supplier');
  });
  it('reads only the requested service/type and current published version', async () => {
    const query = jest.fn().mockResolvedValue([doc]);
    await readCurrentPolicyDocument({ query }, 'neture', 'privacy');
    expect(query.mock.calls[0][1]).toEqual(['neture', 'privacy']);
    expect(query.mock.calls[0][0]).toContain("status = 'published'");
    expect(query.mock.calls[0][0]).not.toContain('FOR SHARE');
  });
});
