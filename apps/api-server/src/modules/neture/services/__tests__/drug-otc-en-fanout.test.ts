/**
 * WO-O4O-OTC-EN-GROUP-TO-MASTER-FANOUT-DESIGN-V1
 *
 * "번역은 그룹당 1회 · 저장은 연결 master 전체에 전개" 구조와 안전 조건을 잠근다.
 * 회귀 시 ① 기존 영문을 덮어쓰거나 ② 한 master 가 두 그룹의 영문을 받는다.
 */
import { describe, it, expect } from 'vitest';
import { buildEnFanoutPlan, type EnFanoutRow } from '../../drug-import/drug-otc-en-fanout.js';

const row = (over: Partial<EnFanoutRow>): EnFanoutRow => ({
  candidateId: 'c1',
  groupKey: '세티리진염산염|10밀리그램|정',
  title: '세티리진염산염 10mg 정',
  masterId: 'm1',
  hasEn: false,
  ...over,
});

describe('buildEnFanoutPlan — 번역 단위 / 저장 단위 분리', () => {
  it('번역 단위는 그룹당 1개다 (master 수와 무관)', () => {
    const plan = buildEnFanoutPlan([
      row({ masterId: 'm1' }),
      row({ masterId: 'm2' }),
      row({ masterId: 'm3' }),
    ]);
    expect(plan.translationUnits).toHaveLength(1);
    expect(plan.translationUnits[0].masterCount).toBe(3);
  });

  it('저장 단위는 그룹의 모든 master 로 전개된다', () => {
    const plan = buildEnFanoutPlan([row({ masterId: 'm1' }), row({ masterId: 'm2' })]);
    expect(plan.persistUnits[0].targetMasterIds).toEqual(['m1', 'm2']);
    expect(plan.totals.expectedInsert).toBe(2);
  });

  it('그룹이 여럿이면 각각 번역 1개 · 저장 N개', () => {
    const plan = buildEnFanoutPlan([
      row({ groupKey: 'A', candidateId: 'ca', masterId: 'm1' }),
      row({ groupKey: 'A', candidateId: 'ca', masterId: 'm2' }),
      row({ groupKey: 'B', candidateId: 'cb', masterId: 'm3' }),
    ]);
    expect(plan.totals.groups).toBe(2);
    expect(plan.totals.masters).toBe(3);
    expect(plan.translationUnits).toHaveLength(2);
  });
});

describe('buildEnFanoutPlan — 안전 조건', () => {
  it('기존 영문 보유 master 는 대상에서 제외한다 (덮어쓰지 않는다)', () => {
    const plan = buildEnFanoutPlan([
      row({ masterId: 'm1', hasEn: true }),
      row({ masterId: 'm2', hasEn: false }),
    ]);
    expect(plan.persistUnits[0].targetMasterIds).toEqual(['m2']);
    expect(plan.persistUnits[0].skippedExistingEn).toBe(1);
    expect(plan.totals.existingEn).toBe(1);
    expect(plan.totals.expectedInsert).toBe(1);
  });

  it('전부 기존 영문이면 INSERT 0 (재실행 안전)', () => {
    const plan = buildEnFanoutPlan([
      row({ masterId: 'm1', hasEn: true }),
      row({ masterId: 'm2', hasEn: true }),
    ]);
    expect(plan.totals.expectedInsert).toBe(0);
  });

  it('같은 master 가 여러 그룹에 걸리면 검출한다 (호출부가 전체 중단)', () => {
    const plan = buildEnFanoutPlan([
      row({ groupKey: 'A', candidateId: 'ca', masterId: 'm1' }),
      row({ groupKey: 'B', candidateId: 'cb', masterId: 'm1' }),
    ]);
    expect(plan.crossGroupDuplicateMasters).toEqual(['m1']);
  });

  it('그룹 내 master 중복은 제거한다', () => {
    const plan = buildEnFanoutPlan([row({ masterId: 'm1' }), row({ masterId: 'm1' })]);
    expect(plan.persistUnits[0].targetMasterIds).toEqual(['m1']);
    expect(plan.persistUnits[0].totalMasters).toBe(1);
  });

  it('UPDATE 는 언제나 0이다', () => {
    const plan = buildEnFanoutPlan([row({ masterId: 'm1', hasEn: true }), row({ masterId: 'm2' })]);
    expect(plan.totals.expectedUpdate).toBe(0);
  });

  it('masters = expectedInsert + existingEn (누락·중복 없음)', () => {
    const plan = buildEnFanoutPlan([
      row({ masterId: 'm1', hasEn: true }),
      row({ masterId: 'm2' }),
      row({ groupKey: 'B', candidateId: 'cb', masterId: 'm3' }),
    ]);
    expect(plan.totals.masters).toBe(plan.totals.expectedInsert + plan.totals.existingEn);
  });
});
