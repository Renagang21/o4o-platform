/**
 * WO-O4O-COSMETICS-INITIAL-CENSUS-AND-GUIDE-PILOT-V0 — 단계 3: 상품명 → 설명서 단위
 *
 * WO §3 기준을 코드로 옮긴다.
 *   같은 설명서 단위: 색상 차이 / 용량 차이 / 1+1·트윈팩·기획세트 / 본품·리필
 *   별도 제품:        제품 핵심명이 다름 / 제품 유형이 다름 / Tone-up·Matte 등 성격이 다름
 *   **애매하면 자동 병합하지 않는다** → 코어명이 완전히 일치할 때만 병합하고,
 *     유사하지만 다른 경우는 issue-queue 에 올려 사람 판단으로 넘긴다.
 *
 * 각 정규화 규칙에는 ID(R01…)를 달아 적용 빈도를 집계한다. 이 빈도가 기준문서 V0 의 근거가 된다.
 *
 * 산출: tmp/cosmetics-pilot/normalized-products.json, issue-queue.json
 */
import { readOut, writeOut } from './lib.mjs';

// 정규화 규칙은 normalize-core.mjs 가 SSOT 다 (기준문서 V0 §3~§4 와 짝을 이룬다).
import { typeFromCategory, detectType, normalize, keyOf } from './normalize-core.mjs';

function loadCandidates() {
  const f = readOut('functional-candidates-500.json').candidates.map((c) => ({ ...c, group: 'functional' }));
  const g = readOut('general-candidates-500.json').candidates.map((c) => ({ ...c, group: 'general' }));
  return [...f, ...g];
}

function main() {
  const all = loadCandidates();
  const targets = all.filter((c) => c.candidateDecision === 'TARGET');

  const ruleCount = {};
  const units = new Map();
  for (const c of targets) {
    const n = normalize(c.sourceProductName, c.brandName);
    for (const id of n.applied) ruleCount[id] = (ruleCount[id] ?? 0) + 1;
    if (!n.core) continue; // 정규화 후 남는 게 없으면 단위를 만들 수 없다 → issue 로 별도 처리
    // 유형은 **판매처 카테고리를 먼저** 쓴다. 이름 키워드는 카테고리가 없을 때의 보조 수단이다.
    const byCat = typeFromCategory(c.raw?.categoryPath);
    const byName = detectType(n.core);
    const { type, keyword } = byCat ?? byName;
    const typeSource = byCat ? 'RETAIL_CATEGORY' : byName.type ? 'NAME_KEYWORD' : null;
    const k = keyOf(c.brandName, n.core);
    if (!units.has(k)) {
      units.set(k, {
        unitKey: k,
        group: c.group,
        brandName: c.brandName,
        canonicalProductName: n.core,
        productType: type,
        typeKeyword: keyword,
        productTypeSource: typeSource,
        variants: [],
        members: [],
        englishProductName: null,
      });
    }
    const u = units.get(k);
    u.variants.push(...n.variants);
    u.englishProductName ??= c.englishProductName ?? null;
    u.members.push({
      source: c.source,
      sourceProductName: c.sourceProductName,
      sourceUrl: c.sourceUrl,
      appliedRules: n.applied,
      variants: n.variants,
      platformCleanName: c.raw?.platformCleanName ?? null,
      capacity: c.raw?.capacity ?? null,
      categoryPath: c.raw?.categoryPath ?? null,
    });
  }
  for (const u of units.values()) u.variants = [...new Set(u.variants)];

  // ── issue-queue: 사람 판단이 필요한 건만 올린다 ─────────────────────────────
  const issues = [];
  for (const c of all) {
    if (c.candidateDecision === 'TARGET') continue;
    issues.push({
      issueType: c.candidateDecision === 'CHECK' ? 'CANDIDATE_CHECK' : 'CANDIDATE_UNCONFIRMED',
      group: c.group,
      sourceProductName: c.sourceProductName,
      brandName: c.brandName ?? null,
      sourceUrl: c.sourceUrl,
      note: c.decisionNote,
    });
  }
  for (const c of targets) {
    const n = normalize(c.sourceProductName, c.brandName);
    if (!n.core) {
      issues.push({
        issueType: 'NORMALIZE_EMPTY_CORE',
        group: c.group,
        sourceProductName: c.sourceProductName,
        brandName: c.brandName ?? null,
        sourceUrl: c.sourceUrl,
        note: '정규화 후 코어명이 비었다 — 규칙이 과하게 제거했을 가능성',
      });
    }
  }
  // 화해가 제공하는 platformCleanName 과 우리 코어명이 다른 건 = 독립 대조 실패 → 사람 확인 대상
  /**
   * 화해 정리명에는 판매명에 없는 자체 메타데이터가 붙는다([SPF50+/PA++++], (리뉴얼)).
   * 이는 우리 정규화의 오차가 아니므로 대조 전에 양쪽에서 동일하게 걷어낸다.
   */
  const stripSourceMeta = (s) =>
    (s ?? '').replace(/\[\s*SPF[^\]]*\]/gi, ' ').replace(/\[\s*PA\+*\s*\]/gi, ' ').replace(/\(\s*리뉴얼\s*\)/g, ' ');
  const norm = (s) => stripSourceMeta(s).replace(/\s+/g, '').toLowerCase();
  /**
   * 화해는 수식어를 뒤 대괄호로 옮기는 자체 표기 관례가 있다("에센셜 마스크 [티트리진정수분]").
   * 단어 배열만 다르고 구성 문자가 같으면 **같은 제품을 다르게 적은 것**이므로 실질 불일치가 아니다.
   */
  const charKey = (s) => [...stripSourceMeta(s).toLowerCase().replace(/[^0-9a-z가-힣]/g, '')].sort().join('');
  let compared = 0;
  let agreed = 0;
  let agreedReordered = 0;
  let agreedVariantSplit = 0;
  for (const u of units.values()) {
    for (const m of u.members) {
      if (!m.platformCleanName) continue;
      compared += 1;
      if (norm(m.platformCleanName) === norm(u.canonicalProductName)) agreed += 1;
      else if (charKey(m.platformCleanName) === charKey(u.canonicalProductName)) {
        agreed += 1;
        agreedReordered += 1;
      }
      // 화해는 색상·호수를 제품명에 남긴다. 우리는 WO §3 대로 variant 로 분리하므로,
      // 분리한 variant 를 되돌려 붙였을 때 일치하면 정보 손실 없는 정상 처리다.
      else if (charKey(m.platformCleanName) === charKey(u.canonicalProductName + (m.variants ?? []).join(''))) {
        agreed += 1;
        agreedVariantSplit += 1;
      } else {
        issues.push({
          issueType: 'NORMALIZE_DISAGREE_WITH_SOURCE',
          group: u.group,
          sourceProductName: m.sourceProductName,
          brandName: u.brandName,
          sourceUrl: m.sourceUrl,
          note: `우리 코어명 "${u.canonicalProductName}" ≠ 화해 정리명 "${m.platformCleanName}"`,
        });
      }
    }
  }
  // 같은 브랜드 안에서 코어명이 서로의 접두인 쌍 = 오병합 위험 지점 → 병합하지 않고 기록만 한다
  const byBrand = new Map();
  for (const u of units.values()) {
    if (!u.brandName) continue;
    const list = byBrand.get(u.brandName) ?? [];
    list.push(u);
    byBrand.set(u.brandName, list);
  }
  for (const list of byBrand.values()) {
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const a = norm(list[i].canonicalProductName);
        const b = norm(list[j].canonicalProductName);
        if (a !== b && (a.startsWith(b) || b.startsWith(a))) {
          issues.push({
            issueType: 'POSSIBLE_SAME_UNIT',
            group: list[i].group,
            brandName: list[i].brandName,
            sourceProductName: `${list[i].canonicalProductName} / ${list[j].canonicalProductName}`,
            sourceUrl: null,
            note: '코어명이 서로의 접두 — 같은 단위일 수 있으나 자동 병합하지 않음',
          });
        }
      }
    }
  }

  const unitList = [...units.values()];
  const merged = unitList.filter((u) => u.members.length > 1);
  const summary = {
    wo: 'WO-O4O-COSMETICS-INITIAL-CENSUS-AND-GUIDE-PILOT-V0',
    rawCandidates: all.length,
    targetCandidates: targets.length,
    guideUnits: unitList.length,
    guideUnitsFunctional: unitList.filter((u) => u.group === 'functional').length,
    guideUnitsGeneral: unitList.filter((u) => u.group === 'general').length,
    mergedUnits: merged.length,
    mergedAwayCount: targets.length - unitList.length,
    unitsWithVariants: unitList.filter((u) => u.variants.length).length,
    unitsWithType: unitList.filter((u) => u.productType).length,
    unitsTypeFromCategory: unitList.filter((u) => u.productTypeSource === 'RETAIL_CATEGORY').length,
    unitsTypeFromName: unitList.filter((u) => u.productTypeSource === 'NAME_KEYWORD').length,
    ruleApplicationCount: ruleCount,
    sourceCleanNameCompared: compared,
    sourceCleanNameAgreed: agreed,
    sourceCleanNameAgreedReordered: agreedReordered,
    sourceCleanNameAgreedVariantSplit: agreedVariantSplit,
    sourceCleanNameAgreementPct: compared ? Math.round((agreed / compared) * 1000) / 10 : null,
    issueCount: issues.length,
    issueByType: issues.reduce((a, i) => ((a[i.issueType] = (a[i.issueType] ?? 0) + 1), a), {}),
  };

  writeOut('normalized-products.json', { meta: summary, units: unitList });
  writeOut('issue-queue.json', { meta: { issueCount: issues.length, byType: summary.issueByType }, issues });
  process.stderr.write(JSON.stringify(summary, null, 2) + '\n');
}

main();
