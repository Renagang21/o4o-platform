/**
 * WO-O4O-OTC-SINGLE-GROUP-EXPANSION-APPLY-PATH-V1
 *
 * 정책 A 안전 조건을 잠근다: 기존 SPD 보유 master 는 절대 대상이 아니고(UPDATE 0),
 * 같은 master 가 두 번 대상이 되지 않는다(master 당 canonical 1개 계약).
 */
import { describe, it, expect } from 'vitest';
import {
  selectPromotionTargets,
  findCrossGroupDuplicateMasters,
  type ExpandedMasterRow,
} from '../../drug-import/drug-otc-single-group-expansion.js';

const row = (over: Partial<ExpandedMasterRow>): ExpandedMasterRow => ({
  gk: '트리메부틴말레산염|200밀리그램|정',
  candidateId: 'c1',
  title: '트리메부틴말레산염 200mg 정',
  verdict: 'INSERT_auto',
  masterId: 'm1',
  hasCanonical: false,
  hasAnySpd: false,
  hasOtcPromotion: false,
  ...over,
});

describe('selectPromotionTargets — 정책 A (설명 전무 master 만)', () => {
  it('SPD 가 전혀 없는 master 만 대상이다', () => {
    const [t] = selectPromotionTargets([
      row({ masterId: 'm1', hasAnySpd: false }),
      row({ masterId: 'm2', hasAnySpd: true, hasCanonical: true }),
    ]);
    expect(t.masterIds).toEqual(['m1']);
    expect(t.expandedMasters).toBe(2);
    expect(t.excludedExistingCanonical).toBe(1);
  });

  it('기존 canonical 보유 master 는 대상에서 제외된다 (UPDATE 0 보장)', () => {
    const [t] = selectPromotionTargets([
      row({ masterId: 'm1', hasAnySpd: true, hasCanonical: true }),
      row({ masterId: 'm2', hasAnySpd: true, hasCanonical: true }),
    ]);
    expect(t.masterIds).toEqual([]);
    expect(t.excludedExistingCanonical).toBe(2);
  });

  it('canonical 이 아니어도 SPD 가 있으면 제외한다 (candidate·hidden 보호)', () => {
    const [t] = selectPromotionTargets([row({ masterId: 'm1', hasAnySpd: true, hasCanonical: false })]);
    expect(t.masterIds).toEqual([]);
  });

  it('같은 그룹 내 master 중복은 제거한다', () => {
    const [t] = selectPromotionTargets([row({ masterId: 'm1' }), row({ masterId: 'm1' })]);
    expect(t.masterIds).toEqual(['m1']);
  });

  it('그룹별로 분리 집계한다', () => {
    const ts = selectPromotionTargets([
      row({ gk: 'A', candidateId: 'ca', masterId: 'm1' }),
      row({ gk: 'B', candidateId: 'cb', masterId: 'm2' }),
    ]);
    expect(ts).toHaveLength(2);
    expect(ts.map((t) => t.masterIds)).toEqual([['m1'], ['m2']]);
  });

  it('이미 승격된 master 를 계측한다', () => {
    const [t] = selectPromotionTargets([
      row({ masterId: 'm1', hasAnySpd: true, hasOtcPromotion: true }),
    ]);
    expect(t.alreadyPromoted).toBe(1);
    expect(t.masterIds).toEqual([]);
  });

  it('지원하지 않는 정책은 거부한다', () => {
    expect(() => selectPromotionTargets([], 'X' as never)).toThrow();
  });
});

describe('findCrossGroupDuplicateMasters — master 당 canonical 1개 계약', () => {
  it('두 그룹이 같은 master 를 노리면 검출한다', () => {
    const ts = selectPromotionTargets([
      row({ gk: 'A', candidateId: 'ca', masterId: 'm1' }),
      row({ gk: 'B', candidateId: 'cb', masterId: 'm1' }),
    ]);
    expect(findCrossGroupDuplicateMasters(ts)).toEqual(['m1']);
  });

  it('겹치지 않으면 빈 배열', () => {
    const ts = selectPromotionTargets([
      row({ gk: 'A', candidateId: 'ca', masterId: 'm1' }),
      row({ gk: 'B', candidateId: 'cb', masterId: 'm2' }),
    ]);
    expect(findCrossGroupDuplicateMasters(ts)).toEqual([]);
  });
});
