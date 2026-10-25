import type { DataSource } from 'typeorm';
import { generateProductCorrectionDraft, productCorrectionExtension } from '../modules/neture/product-correction/ai-draft.service.js';

const authorize = jest.fn(), batchRead = jest.fn(), execute = jest.fn();
jest.mock('../modules/auth/services/role-assignment.service.js', () => ({ roleAssignmentService: { hasAnyRole: (...args: unknown[]) => authorize(...args) } }));
jest.mock('../modules/neture/product-correction/workspace.service.js', () => ({ ProductCorrectionWorkspace: jest.fn().mockImplementation(() => ({ batch: (...args: unknown[]) => batchRead(...args) })) }));
jest.mock('../modules/ai-policy/ai-policy-factory.js', () => ({ createPolicyExecutor: () => ({ execute: (...args: unknown[]) => execute(...args) }) }));
const product = { id: 'product-fixture', name: '상품 fixture', manufacturerName: null, regulatoryType: 'GENERAL', specification: null, barcode: null, sourceContent: '상품 고유 원문', sourceTruncated: true, fingerprint: 'fingerprint-fixture' };
const batch = { revision: 3, ruleSnapshot: { title: '검토 기준', purpose: 'professional', instructions: '상품 사실과 전문 근거를 구분', language: 'ko' }, items: [{ id: 'task-fixture', product, notes: '검토 메모', sources: '확인되지 않은 출처' }] };
const input = { batchId: 'batch-fixture', taskId: 'task-fixture', revision: 3, actorId: 'actor-fixture' };
beforeEach(() => {
  jest.clearAllMocks(); authorize.mockResolvedValue(true); batchRead.mockResolvedValue(batch);
  execute.mockResolvedValue({ content: JSON.stringify({ content: '검토 초안', missingEvidence: ['전체 원문 확인'] }), provider: 'gemini', model: 'fixture', requestId: 'p', promptTokens: 1, completionTokens: 1 });
});
it('returns an unsaved proposal through the existing product policy with actor attribution', async () => {
  const query = jest.fn(), transaction = jest.fn();
  const result = await generateProductCorrectionDraft({ query, transaction } as unknown as DataSource, input);
  expect(result).toMatchObject({ draft: '검토 초안', taskId: 'task-fixture', batchRevision: 3, sourceFingerprint: 'fingerprint-fixture' });
  expect(execute).toHaveBeenCalledWith('PRODUCT_CONTENT', expect.stringContaining('공식 수정'), expect.stringContaining('상품 고유 원문'), expect.objectContaining({ userId: 'actor-fixture' }));
  expect(query).not.toHaveBeenCalled(); expect(transaction).not.toHaveBeenCalled();
});
it('rejects an unauthorized actor before reading private task data or invoking AI', async () => {
  authorize.mockResolvedValue(false);
  await expect(generateProductCorrectionDraft({} as DataSource, input)).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
  expect(batchRead).not.toHaveBeenCalled(); expect(execute).not.toHaveBeenCalled();
});
it('rejects stale task revisions before paid invocation', async () => {
  await expect(generateProductCorrectionDraft({} as DataSource, { ...input, revision: 2 })).rejects.toMatchObject({ code: 'BATCH_CHANGED' });
  expect(execute).not.toHaveBeenCalled();
});
it('does not retry or save when the task is changed during generation', async () => {
  batchRead.mockResolvedValueOnce(batch).mockResolvedValueOnce({ ...batch, revision: 4 });
  await expect(generateProductCorrectionDraft({} as DataSource, input)).rejects.toMatchObject({ code: 'BATCH_CHANGED' });
  expect(execute).toHaveBeenCalledTimes(1);
});
it('requires explicit missing-evidence structure and a bounded nonempty draft', () => {
  expect(() => productCorrectionExtension.parse('{"content":""}')).toThrow();
  expect(() => productCorrectionExtension.parse('{"content":"draft","missingEvidence":"none"}')).toThrow();
  expect(() => productCorrectionExtension.parse(JSON.stringify({ content: 'x'.repeat(30001), missingEvidence: [] }))).toThrow();
});
