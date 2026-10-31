import { ConsultationContextService } from '../services/consultation-context.js';

const access = () => ({ actorId: 'fixture-actor', organizationId: 'fixture-store', authorize: jest.fn(async () => true) });
it('keeps ordinary conversation and clarification free of product reads', async () => {
  const db = { query: jest.fn() } as any, actor = access();
  const plan = jest.fn().mockResolvedValueOnce({ needsProduct: false, terms: [], clarification: null })
    .mockResolvedValueOnce({ needsProduct: true, terms: [], clarification: '어떤 내용을 확인할까요?' });
  const service = new ConsultationContextService(db, plan);
  expect((await service.search({ question: '안녕하세요' }, actor)).state).toBe('not-needed');
  expect((await service.search({ question: '이전에 말씀한 것과 달라요', context: ['앞선 조건'] }, actor)).state).toBe('clarify');
  expect(db.query).not.toHaveBeenCalled();
  expect(plan.mock.calls[1][0]).toEqual({ question: '이전에 말씀한 것과 달라요', context: ['앞선 조건'] });
});
it('authorizes before planning, ranks within the active store and rechecks before returning', async () => {
  const db = { query: jest.fn(async () => [{ id: 'listing-a', kind: 'listing', name: '현재 매장 상품', location: '', score: 1 }]) } as any;
  const actor = access(), plan = jest.fn(async () => ({ needsProduct: true, terms: ['비타민', '비타민'], clarification: null }));
  const result = await new ConsultationContextService(db, plan).search({ question: '이 조건에 맞는 자료를 찾아주세요' }, actor);
  expect(result.state).toBe('candidates');
  expect(db.query.mock.calls[0][1]).toEqual(['fixture-store', ['비타민']]);
  const sql = db.query.mock.calls[0][0];
  expect(sql).toContain('l.organization_id=$1 AND l.is_active=true');
  expect(sql).toContain("m.status='ACTIVE'");
  expect(sql).toContain('DISTINCT ON (l.master_id)');
  expect(result.candidates[0]).not.toHaveProperty('score');
  expect(actor.authorize).toHaveBeenCalledTimes(3);
});
it('discards a planned or queried result when current access is revoked', async () => {
  const db = { query: jest.fn(async () => []) } as any, actor = access();
  actor.authorize.mockRejectedValueOnce(new Error('revoked'));
  const plan = jest.fn();
  await expect(new ConsultationContextService(db, plan).search({ question: '상담 질문' }, actor)).rejects.toThrow('revoked');
  expect(plan).not.toHaveBeenCalled(); expect(db.query).not.toHaveBeenCalled();
});
it('rejects invented IDs and oversized transient context rather than trusting model output', async () => {
  const db = { query: jest.fn() } as any, plan = jest.fn(async () => ({ needsProduct: true, terms: ['제품'], clarification: null, productId: 'foreign' }));
  const service = new ConsultationContextService(db, plan);
  await expect(service.search({ question: '상품 질문' }, access())).rejects.toThrow();
  await expect(service.search({ question: '질문', context: Array(5).fill('지난 질문') }, access())).rejects.toHaveProperty('httpStatus', 400);
  expect(db.query).not.toHaveBeenCalled();
});
it('rejects a false access decision after planning and before reading products', async () => {
  const actor = access(), query = jest.fn(), plan = jest.fn(async () => ({ needsProduct: true, terms: ['성분'], clarification: null }));
  actor.authorize.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
  await expect(new ConsultationContextService({ query } as any, plan).search({ question: '현재 매장 자료' }, actor)).rejects.toMatchObject({ httpStatus: 403 });
  expect(query).not.toHaveBeenCalled();
});
