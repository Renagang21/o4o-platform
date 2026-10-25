import { AiExtensionError } from '@o4o/ai-core';
import { consultationSupportExtension, createConsultationSupportRunner, validateConsultationSupport } from '../services/consultation-support.extension.js';
const execute = jest.fn();
jest.mock('../../ai-policy/ai-policy-factory.js', () => ({ createPolicyExecutor: () => ({ execute: (...args: unknown[]) => execute(...args) }) }));
const sources = [{ id: 'p1', kind: 'product-fact' as const, title: 'Fixture product', text: '함량 100mg 상품 자료' },
  { id: 'r1', kind: 'professional-reference' as const, title: 'Guideline', text: '확인한 전문 참고자료' }];
const brief = () => ({ productFacts: [{ text: '함량 100mg', sourceIds: ['p1'] }], professionalNotes: [{ text: '근거에 따른 확인 사항', sourceIds: ['r1'] }],
  nextQuestion: '현재 확인할 사항이 있습니까?', customerDraft: { text: '상품 설명', sourceIds: ['p1'] } });
const input = { productName: 'Fixture', question: '근거를 확인해 주세요', sources };
beforeEach(() => { jest.clearAllMocks(); execute.mockResolvedValue({ content: JSON.stringify(brief()), model: 'fixture', provider: 'fixture', promptTokens: 10, completionTokens: 4 }); });
it('keeps clinical reference/consumer explanation separate while using the existing policy and actor accounting', async () => {
  const authorize = jest.fn(async () => true);
  const result = await createConsultationSupportRunner({} as any)(input, { actorId: 'actor', organizationId: 'store', authorize });
  expect(result).toEqual(brief()); expect(execute.mock.calls[0][0]).toBe('PRODUCT_CONTENT');
  expect(execute.mock.calls[0][3]).toMatchObject({ userId: 'actor', temperature: 0 });
  expect(authorize).toHaveBeenCalled(); // Core precheck; the domain host rechecks access and source after execution.
});
it.each([{ productFacts: 'bad' }, { nextQuestion: ['many'] }, { customerDraft: { text: '<script>bad</script>', sourceIds: ['p1'] } }])('rejects malformed output without retrying the provider', async patch => {
  execute.mockResolvedValueOnce({ content: JSON.stringify({ ...brief(), ...patch }), model: 'fixture' });
  await expect(createConsultationSupportRunner({} as any)(input, { actorId: 'actor', organizationId: 'store', authorize: async () => true })).rejects.toHaveProperty('httpStatus', 503);
  expect(execute).toHaveBeenCalledTimes(1);
});
it('rejects unknown citations, reference-as-product facts, and invented numeric quantities', () => {
  expect(() => validateConsultationSupport({ ...brief(), productFacts: [{ text: 'invented', sourceIds: ['p9'] }] }, sources)).toThrow('Unknown');
  expect(() => validateConsultationSupport({ ...brief(), productFacts: [{ text: 'reference', sourceIds: ['r1'] }] }, sources)).toThrow('product fact');
  expect(() => validateConsultationSupport({ ...brief(), customerDraft: { text: '함량 100g', sourceIds: ['p1'] } }, sources)).toThrow('quantity');
});
it('rejects denied access before charging and maps quota failures without fallback', async () => {
  const run = createConsultationSupportRunner({} as any);
  await expect(run(input, { actorId: 'actor', organizationId: 'store', authorize: async () => false })).rejects.toHaveProperty('httpStatus', 403);
  expect(execute).not.toHaveBeenCalled();
  execute.mockRejectedValueOnce(new AiExtensionError('QUOTA_EXCEEDED'));
  await expect(run(input, { actorId: 'actor', organizationId: 'store', authorize: async () => true })).rejects.toHaveProperty('httpStatus', 429);
  expect(execute).toHaveBeenCalledTimes(1);
});
it('keeps prompts in the existing runtime only and bounds supplied evidence', () => {
  expect(consultationSupportExtension.prepare(input).userPrompt).toContain('professional-reference');
  expect(() => consultationSupportExtension.prepare({ ...input, sources: [{ ...sources[0], text: 'x'.repeat(5001) }] })).toThrow();
});
