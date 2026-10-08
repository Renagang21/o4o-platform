import { eventIndexState } from '../operations/event-index-transition.js';

describe('수동 이벤트 전환의 schema 판정', () => {
  const exec = (predicate: string | null) => ({ query: jest.fn().mockResolvedValue([{ predicate }]) });

  it('전체 인덱스와 PostgreSQL이 표시하는 정본 부분 조건을 구분한다', async () => {
    await expect(eventIndexState(exec(null))).resolves.toBe('phase-one');
    await expect(eventIndexState(exec("((service_key)::text <> 'neture-event-offer'::text)"))).resolves.toBe('phase-two');
  });

  it('이벤트 제외 문자열이 있어도 추가 필터가 있으면 전환된 것으로 인정하지 않는다', async () => {
    await expect(eventIndexState(exec("((service_key)::text <> 'neture-event-offer'::text) AND enabled"))).rejects.toThrow('EVENT_INDEX_UNEXPECTED_PREDICATE');
    await expect(eventIndexState({ query: jest.fn().mockResolvedValue([]) })).rejects.toThrow('EVENT_INDEX_MISSING_OR_INVALID');
  });
});
