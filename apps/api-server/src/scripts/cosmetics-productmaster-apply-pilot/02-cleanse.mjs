/**
 * WO-O4O-COSMETICS-DESCRIPTION-AUTHORING-POLICY-AND-PRODUCTMASTER-PILOT-V2 — 단계 2
 * §8 census 오염 제거 + 기존 이름 일치 master 감사 재현
 *
 * 입력 산출물만으로 재현된다(외부 호출 0). 비화장품 의심군을 화장품 apply 대상에서 제외하고,
 * 선행 감사의 "기존 이름 일치 188 → 실질 재사용 0" 결과를 입력 기준으로 다시 유도한다.
 *
 * 판정 규칙 (보수적 — 애매하면 제외하지 않고 CHECK 로 남긴다):
 *   X1 이너뷰티: 카테고리 경로에 '이너뷰티' 가 있으면 화장품이 아니다(먹는 건강기능식품).
 *   X2 생산 단계 NON_COSMETIC_SUSPECT 문제 큐 항목.
 *   X3 기존 master 가 건강기능식품/DRUG 로 확인된 이름 일치 건 — 자동 연결 금지 대상이자
 *      화장품 신규 생성 대상에서도 뺀다(동명이제품일 수 있으므로 CHECK 로 남긴다).
 */
import { readCensus, readGuide, writeOut } from './lib.mjs';

const INNER_BEAUTY = /이너뷰티|건강기능식품|영양제/;

function main() {
  const candidates = readCensus('retail-unique-guide-candidates.json').candidates;
  const guides = readGuide('all-guides-ko.json').guides;
  const issues = readGuide('issue-queue.json').issues;
  const matched = readCensus('productmaster-compare.json').matched;

  const byKey = new Map(candidates.map((c) => [c.key, c]));

  // --- X2: 문제 큐의 비화장품 의심
  const suspectKeys = new Set(issues.filter((i) => i.type === 'NON_COSMETIC_SUSPECT').map((i) => i.key));

  // --- X1: 카테고리 기준 이너뷰티
  const innerKeys = new Set(
    candidates.filter((c) => INNER_BEAUTY.test(c.category ?? '')).map((c) => c.key),
  );

  // --- X3 + 기존 master 감사 (§4 재현)
  const NON_COSMETIC_RT = new Set(['건강기능식품', 'DRUG', 'HEALTH_FUNCTIONAL_FOOD']);
  const matchAudit = matched.map((m) => {
    const cand = byKey.get(m.key);
    const rts = [...new Set(m.masters.map((x) => x.regulatoryType))];
    const inner = innerKeys.has(m.key);
    const allNonCosmetic = m.masters.every((x) => NON_COSMETIC_RT.has(x.regulatoryType));
    let verdict;
    let reason;
    if (inner && allNonCosmetic) {
      verdict = 'NOT_COSMETIC'; // 후보 자체가 화장품이 아니다 — 모집단에서 제외
      reason = '후보가 이너뷰티(건강기능식품)이고 기존 master 도 비화장품';
    } else if (allNonCosmetic) {
      verdict = 'DIFFERENT_PRODUCT_SAME_NAME'; // 동명이제품 — 재사용 금지, 신규 생성도 보류
      reason = `기존 master 규제유형이 비화장품(${rts.join(',')}) — 이름만 같다`;
    } else if (rts.includes('COSMETIC')) {
      verdict = 'SAME_PRODUCT_REUSE';
      reason = '기존 master 가 화장품 — 재사용 후보';
    } else {
      verdict = 'CHECK';
      reason = `판단 불가(규제유형 ${rts.join(',')}) — 자동 연결하지 않는다`;
    }
    return {
      key: m.key,
      brandName: m.brandName,
      canonicalProductName: m.canonicalProductName,
      candidateCategory: cand?.category ?? null,
      candidateSources: cand ? [...new Set(cand.sources.map((s) => s.source))] : [],
      masterCount: m.masters.length,
      masterRegulatoryTypes: rts,
      masters: m.masters,
      verdict,
      reason,
    };
  });

  const matchByVerdict = {};
  for (const a of matchAudit) matchByVerdict[a.verdict] = (matchByVerdict[a.verdict] ?? 0) + 1;

  // 재사용 대상이 아닌 이름 일치 건은 apply 모집단에서 뺀다(오연결 방지, WO §8·§10).
  const excludeMatchKeys = new Set(
    matchAudit.filter((a) => a.verdict !== 'SAME_PRODUCT_REUSE').map((a) => a.key),
  );

  const exclusions = [];
  const kept = [];
  for (const g of guides) {
    const rules = [];
    if (innerKeys.has(g.key)) rules.push('X1_INNER_BEAUTY');
    if (suspectKeys.has(g.key)) rules.push('X2_NON_COSMETIC_SUSPECT');
    if (excludeMatchKeys.has(g.key)) rules.push('X3_EXISTING_NON_COSMETIC_MASTER');
    if (rules.length) {
      exclusions.push({
        key: g.key,
        brandName: g.brandName,
        productName: g.productName,
        classification: g.classification,
        rules,
      });
    } else {
      kept.push(g.key);
    }
  }

  const ruleCounts = {};
  for (const e of exclusions) for (const r of e.rules) ruleCounts[r] = (ruleCounts[r] ?? 0) + 1;

  writeOut('existing-master-match-audit.json', {
    wo: 'WO-O4O-COSMETICS-DESCRIPTION-AUTHORING-POLICY-AND-PRODUCTMASTER-PILOT-V2',
    note: '이름 일치만으로 자동 연결하지 않는다(WO §8). SAME_PRODUCT_REUSE 만 재사용 후보다.',
    matchedKeys: matched.length,
    matchedMasterRows: matched.reduce((n, m) => n + m.masters.length, 0),
    byVerdict: matchByVerdict,
    items: matchAudit,
  });

  writeOut('non-cosmetic-exclusions.json', {
    wo: 'WO-O4O-COSMETICS-DESCRIPTION-AUTHORING-POLICY-AND-PRODUCTMASTER-PILOT-V2',
    rules: {
      X1_INNER_BEAUTY: '카테고리 경로에 이너뷰티/건강기능식품/영양제',
      X2_NON_COSMETIC_SUSPECT: '생산 단계 문제 큐 NON_COSMETIC_SUSPECT',
      X3_EXISTING_NON_COSMETIC_MASTER: '기존 이름 일치 master 가 비화장품 — 동명이제품 위험',
    },
    inputGuides: guides.length,
    excluded: exclusions.length,
    kept: kept.length,
    ruleCounts,
    items: exclusions,
  });

  writeOut('cleansed-population.json', { keys: kept });
  console.log(
    `입력 ${guides.length} / 제외 ${exclusions.length} / 화장품 확정 ${kept.length}\n` +
      `제외 규칙별 ${JSON.stringify(ruleCounts)}\n` +
      `이름 일치 ${matched.length}건 판정 ${JSON.stringify(matchByVerdict)}`,
  );
}

main();
