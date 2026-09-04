/**
 * WO-O4O-PRODUCTMASTER-MATCHING-RECALL-CLOSURE-FOR-CAFE24-V1
 *
 * BulkMatchService candidate retrieval 사다리 계약.
 *   1. identifier_exact  — 자체상품코드(Cafe24 custom_product_code) → ProductIdentifier 완전일치
 *   2. normalized_exact  — 정규화 상품명 완전일치 (단일이면 확정 / 복수면 사람 확인)
 *   3. containment       — master 정규화명 ⊂ 입력 정규화명 + Dice 유사도
 *
 * DB 없이 dataSource.query 를 스텁한다 (실 DB 재검증은 CHECK 문서의 30건 실측).
 */

import {
  BulkMatchService,
  normalizeKey,
  normalizeName,
  diceSimilarity,
} from '../modules/neture/services/bulk-match.service.js';

interface FakeMaster {
  id: string;
  name: string;
}

function makeService(masters: FakeMaster[], identifiers: Array<{ value: string; masterId: string }> = []) {
  const dataSource = {
    query: async (sql: string, params?: unknown[]) => {
      if (sql.includes('product_identifiers')) {
        const codes = ((params?.[0] as string[]) ?? []).map((c) => c.toUpperCase());
        return identifiers
          .filter((i) => codes.includes(i.value.toUpperCase()))
          .map((i) => ({
            identifier_value: i.value,
            normalized_value: i.value,
            product_master_id: i.masterId,
          }));
      }
      return masters.map((m) => ({
        id: m.id,
        name: m.name,
        regulatory_name: m.name,
        manufacturer_name: '',
        barcode: '',
      }));
    },
  };
  return new BulkMatchService(dataSource as never);
}

describe('normalizeKey', () => {
  it('공백과 특수문자를 모두 제거해 양쪽 비교 키를 만든다', () => {
    expect(normalizeKey('지엠팜 임산부 리포퍼 액상 철분제')).toBe('지엠팜임산부리포퍼액상철분제');
    expect(normalizeKey('[피부생생] 어린콜라겐 비오틴')).toBe('피부생생어린콜라겐비오틴');
    expect(normalizeKey('Rich EDT')).toBe('richedt');
  });

  it('기존 normalizeName 은 공백을 유지한다 (alias 저장 계약 불변)', () => {
    expect(normalizeName('제나 데일리 발효 칼슘365')).toBe('제나 데일리 발효 칼슘365');
  });
});

describe('diceSimilarity', () => {
  it('동일 문자열은 1', () => {
    expect(diceSimilarity('가나다라', '가나다라')).toBe(1);
  });
  it('토큰이 더 붙어도 높은 유사도를 유지한다', () => {
    expect(diceSimilarity(normalizeKey('김 pdrn 하이드로 퍼밍 크림 50ml'), normalizeKey('김 PDRN 하이드로 퍼밍 크림')))
      .toBeGreaterThan(0.7);
  });
  it('무관한 문자열은 낮다', () => {
    expect(diceSimilarity('붕대삼호', '태닝오일')).toBeLessThan(0.3);
  });
});

describe('BulkMatchService 사다리', () => {
  const masters: FakeMaster[] = [
    { id: 'm-id', name: '큐앤큐메딕스패드 표준플러스' },
    { id: 'm-space', name: '지엠팜 임산부 리포퍼 액상 철분제' },
    { id: 'm-contain', name: '김 PDRN 하이드로 퍼밍 크림' },
    { id: 'm-dup-1', name: '인텐시브 크림' },
    { id: 'm-dup-2', name: '인텐시브 크림' },
  ];
  const identifiers = [{ value: '201107409', masterId: 'm-id' }];

  it('자체상품코드가 있으면 식별자 완전일치로 확정한다', async () => {
    const svc = makeService(masters, identifiers);
    const [r] = await svc.matchItems([{ name: '전혀 다른 이름', code: '201107409' }]);
    expect(r.status).toBe('EXACT_MATCH');
    expect(r.matchedBy).toBe('identifier_exact');
    expect(r.master?.id).toBe('m-id');
  });

  it('공백만 다른 상품명을 정규화 완전일치로 확정한다 (기존 ILIKE 비대칭 결함)', async () => {
    const svc = makeService(masters);
    const [r] = await svc.matchItems([{ name: '지엠팜임산부리포퍼액상철분제' }]);
    expect(r.status).toBe('EXACT_MATCH');
    expect(r.matchedBy).toBe('normalized_exact');
    expect(r.master?.id).toBe('m-space');
  });

  it('동명이인은 자동확정하지 않고 후보 전체를 제시한다', async () => {
    const svc = makeService(masters);
    const [r] = await svc.matchItems([{ name: '인텐시브 크림' }]);
    expect(r.status).toBe('SIMILAR_MATCH');
    expect(r.master).toBeUndefined();
    expect(r.candidates?.map((c) => c.id).sort()).toEqual(['m-dup-1', 'm-dup-2']);
  });

  it('입력에 토큰이 더 붙은 경우 포함 검색으로 후보를 회수한다', async () => {
    const svc = makeService(masters);
    const [r] = await svc.matchItems([{ name: '김 PDRN 하이드로 퍼밍 크림 50ml' }]);
    expect(r.status).toBe('SIMILAR_MATCH');
    expect(r.matchedBy).toBe('containment');
    expect(r.candidates?.[0].id).toBe('m-contain');
    expect(r.topScore).toBeGreaterThanOrEqual(0.7);
  });

  it('어느 축에도 걸리지 않으면 NOT_FOUND', async () => {
    const svc = makeService(masters);
    const [r] = await svc.matchItems([{ name: '존재하지 않는 임의 상품명 12345' }]);
    expect(r.status).toBe('NOT_FOUND');
    expect(r.matchedBy).toBe('none');
  });

  it('matchNames 기존 계약은 그대로 동작한다', async () => {
    const svc = makeService(masters);
    const results = await svc.matchNames(['지엠팜임산부리포퍼액상철분제', '인텐시브 크림']);
    expect(results).toHaveLength(2);
    expect(results[0].status).toBe('EXACT_MATCH');
    expect(results[1].status).toBe('SIMILAR_MATCH');
  });
});
