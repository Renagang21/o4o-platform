/**
 * G-LIQUID 액상(드롭·병) 6규칙 — 페어테스트 + 6건 실측 회귀
 * WO-O4O-HFF-PROBIOTICS-LIQUID-MODEL-PILOT-6-V1
 *
 * 각 규칙: 실제 파일럿 6건 = PASS / 오류 합성 = BLOCKED.
 * 고형 경로(liquidGrounding 없음)는 이전과 동일 — product-description-guard.test.ts 가 담당.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runGuard } from '../product-description-guard.js';
import type { GuardProductInput } from '../product-description-guard.types.js';

// jest 는 apps/api-server 에서 실행 → 저장소 루트 기준 상대경로
const LIQ_JSON = join(process.cwd(), '../../docs/checks/data/product-description-guard/hff-probiotics-liq-cp01.json');
const ITEMS: GuardProductInput[] = JSON.parse(readFileSync(LIQ_JSON, 'utf8'));

const bySlug = (slug: string): GuardProductInput => {
  const it = ITEMS.find((x) => (x as { _slug?: string })._slug === slug);
  if (!it) throw new Error(`fixture 없음: ${slug}`);
  return it;
};
const clone = (x: GuardProductInput): GuardProductInput => JSON.parse(JSON.stringify(x));
const blockedIds = (input: GuardProductInput): string[] =>
  runGuard(input).findings.filter((f) => f.status === 'BLOCKED').map((f) => f.ruleId);

const CHILDLIFE = 'liq-cp01-01-childlife-baby-liquid-probioti';
const YAKULT = 'liq-cp01-06-yakult-premium-light';

describe('G-LIQUID 액상 grounding — 6건 실측 전량 PASS', () => {
  it('6건 모두 로드된다', () => {
    expect(ITEMS.length).toBe(6);
    expect(ITEMS.every((i) => !!i.liquidGrounding)).toBe(true);
  });

  it.each(ITEMS.map((i) => [(i as { _slug?: string })._slug, i] as const))(
    '%s → PASS (BLOCKED 0)',
    (_slug, item) => {
      const r = runGuard(item);
      expect(r.blockedCount).toBe(0);
      expect(r.overallStatus).toBe('PASS');
    },
  );

  it('EN 초안에 표시기준(성상·유통기한·보관) 한글 잔존 0', () => {
    for (const it of ITEMS) {
      // sd-spec 영역의 한글 잔존 검사 — en 초안 전체에 한글 문자가 없어야 함
      expect(it.drafts.en).not.toMatch(/[가-힣]/);
    }
  });
});

describe('G-LIQUID 페어테스트 — 규칙별 정상 PASS / 오류 BLOCKED', () => {
  // ── G-LIQUID-VOLUME-BASIS: 원문에 없는 부피(총용량 혼입) ──
  it('VOLUME-BASIS 정상(0.295ml만) → PASS', () => {
    expect(blockedIds(bySlug(CHILDLIFE))).not.toContain('G-LIQUID-VOLUME-BASIS-001');
  });
  it('VOLUME-BASIS 오류(근거없는 30ml 총용량) → BLOCKED', () => {
    const bad = clone(bySlug(CHILDLIFE));
    bad.drafts.ko = bad.drafts.ko.replace('1일 1회</span>', '1일 1회</span><span class="sd-tag">총용량 30ml</span>');
    expect(blockedIds(bad)).toContain('G-LIQUID-VOLUME-BASIS-001');
  });

  // ── G-LIQUID-PER-UNIT: 병 mL 미표기인데 부피/균수 부기 ──
  it('PER-UNIT 정상(야쿠르트 1병 mL 부기 없음) → PASS', () => {
    expect(blockedIds(bySlug(YAKULT))).not.toContain('G-LIQUID-PER-UNIT-002');
  });
  it('PER-UNIT 오류(1병(100ml) 근거없는 부피) → BLOCKED', () => {
    const bad = clone(bySlug(YAKULT));
    bad.drafts.en = bad.drafts.en.replace('1 bottle (volume not officially stated)', '1 bottle (100 ml)');
    expect(blockedIds(bad)).toContain('G-LIQUID-PER-UNIT-002');
  });

  // ── G-LIQUID-CFU-BASIS: mL 기준 CFU 를 용기당으로 전이 ──
  it('CFU-BASIS 정상(100ml당 100억) → PASS', () => {
    expect(blockedIds(bySlug(YAKULT))).not.toContain('G-LIQUID-CFU-BASIS-003');
  });
  it('CFU-BASIS 오류(bottle 당 CFU 전이) → BLOCKED', () => {
    const bad = clone(bySlug(YAKULT));
    bad.drafts.en = bad.drafts.en.replace('at least 10 billion CFU per 100ml', 'at least 10 billion CFU per bottle');
    expect(blockedIds(bad)).toContain('G-LIQUID-CFU-BASIS-003');
  });

  // ── G-LIQUID-VEHICLE: 원문없는 물 섭취 ──
  it('VEHICLE 정상(야쿠르트 물 없음) → PASS', () => {
    expect(blockedIds(bySlug(YAKULT))).not.toContain('G-LIQUID-VEHICLE-004');
  });
  it('VEHICLE 오류(야쿠르트에 "물과 함께") → BLOCKED', () => {
    const bad = clone(bySlug(YAKULT));
    bad.drafts.ko = bad.drafts.ko.replace('1회 1병</span>', '1회 1병</span><span class="sd-tag">물과 함께</span>');
    expect(blockedIds(bad)).toContain('G-LIQUID-VEHICLE-004');
  });

  // ── G-LIQUID-STORAGE: 원문없는 개봉후/냉장/생존율 ──
  it('STORAGE 정상(야쿠르트 상시냉장, 개봉후 없음) → PASS', () => {
    expect(blockedIds(bySlug(YAKULT))).not.toContain('G-LIQUID-STORAGE-005');
  });
  it('STORAGE 오류(상시냉장 제품에 "개봉 후") → BLOCKED', () => {
    const bad = clone(bySlug(YAKULT));
    bad.drafts.ko = bad.drafts.ko.replace('<b>보관</b> 냉장(0~10℃)', '<b>보관</b> 개봉 후 냉장 보관');
    expect(blockedIds(bad)).toContain('G-LIQUID-STORAGE-005');
  });
  it('STORAGE 오류(근거없는 생존율 주장) → BLOCKED', () => {
    const bad = clone(bySlug(CHILDLIFE));
    bad.drafts.ko = bad.drafts.ko.replace('장 건강에 도움을 줄 수 있는', '장까지 살아 도달하는 생존율이 보장된');
    expect(blockedIds(bad)).toContain('G-LIQUID-STORAGE-005');
  });

  // ── G-LIQUID-BILINGUAL: ko/en 드롭수·부피·CFU 동치 ──
  it('BILINGUAL 정상(ko 10드롭 = en 10 drops) → PASS', () => {
    expect(blockedIds(bySlug(CHILDLIFE))).not.toContain('G-LIQUID-BILINGUAL-006');
  });
  it('BILINGUAL 오류(en 12 drops ≠ ko 10드롭) → BLOCKED', () => {
    const bad = clone(bySlug(CHILDLIFE));
    bad.drafts.en = bad.drafts.en.replace(/10 drops/g, '12 drops');
    expect(blockedIds(bad)).toContain('G-LIQUID-BILINGUAL-006');
  });
});
