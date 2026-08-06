/**
 * WO-O4O-EASY-DRUG-EN-FULL-RETRANSLATION-FROM-REBUILT-KO-V1
 * — 성분·함량 grounding 가용성 감사 + master 별 EN 보존 기대치 산출 (DB 미접속)
 *
 * 사용자 지시: 복합제를 별도 공통 설명서로 만들지 않는다. 생산 단위는 단일제·복합제 모두 master.
 * 복합제에만 추가되는 것은 **검증**뿐 — 모든 성분 존재 / 성분별 함량 1:1 / 성분 순서 / 단일·복합 혼동 0 / 다른 조합 혼입 0.
 *
 * ── 실측된 제약 (이 스크립트가 존재하는 이유) ─────────────────────────────────
 * 위 다섯 규칙을 "외부 성분 원장과 대조" 로 구현할 방법이 **없다.**
 *   · `product_drug_extensions` 177,413행 전체에서
 *     ingredient_summary / active_ingredients / strength / dosage_form = **전건 비어 있음** (atc_code 만 176,962)
 *   · DB 전체에 성분 관련 컬럼은 위 테이블 4개가 전부 (information_schema 전수 검색)
 *   · KO canonical 의 원천인 e약은요 응답 자체에 성분 필드가 없다
 *     (frozen-source-ledger sectionHash = efcy/useMethod/atpnWarn/atpn/intrc/se/depositMethod 7개 + itemName·entpName)
 *   · 그래서 KO canonical 본문에도 성분·함량·제형 섹션이 없다
 *     (FIXED_IDENTITY 필드 = 구분·제품명·제조·수입사·품목기준코드 4종뿐)
 *   · 제품명 괄호에서 성분을 유추하는 방식도 실패한다 — COMBINATION 6 / SINGLE 9,452 / UNRESOLVED 9,902
 *
 * ── 따라서 채택하는 검증 기준 ─────────────────────────────────────────────────
 * 기준본은 **KO canonical 자기 자신**이다. 원칙 1(KO 정보 전부 보존) · 6(의료 정보 추가 금지) 과 같은 방향이고,
 * 없는 원장을 지어내지 않는다. 다섯 규칙은 KO↔EN 대조로 다음과 같이 실행된다.
 *   모든 성분 존재      → KO 에 등장한 성분/제품 식별 토큰이 EN 에 전부 남아 있는가
 *   성분별 함량 1:1     → KO 수치+단위 multiset 이 EN 에서 가감 없이 보존되는가
 *   성분 순서 보존      → KO 등장 순서가 EN 에서 뒤집히지 않는가
 *   단일·복합 혼동 0    → EN 에만 있는 수치·성분 토큰 = 0 (KO 에 없는 것은 무조건 위반)
 *   다른 조합 혼입 0    → EN 이 자기 KO 이외의 어떤 문서에서도 오지 않았음 (master 단위 lineage)
 * 복합제는 이 검사에서 자동으로 더 엄격해진다 — 토큰이 많을수록 보존해야 할 것이 많기 때문이다.
 * 별도 복합제 분기가 필요 없다는 뜻이므로, 여기서는 **분기 대신 master 별 기대치**를 만든다.
 *
 * 산출: results/{en-expectations.jsonl(미추적), combo-census-result.json}
 * 사용: node combo-census.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const RESULTS = path.join(HERE, 'results');

/** 수치+단위. 하나라도 사라지거나 늘면 원칙 2·6 위반이다. 단위는 EN 표기로 정규화해 비교 가능하게 둔다. */
const DOSE_RE = /(\d+(?:[.,]\d+)?)\s*(mg|㎎|밀리그램|g|그램|mcg|㎍|마이크로그램|ml|㎖|밀리리터|l|L|IU|국제단위|단위|%|정|캡슐|포|병|매|방울|회|일|세|개월|주|시간|분)/g;
const UNIT_CANON = new Map(Object.entries({
  '㎎': 'mg', '밀리그램': 'mg', '그램': 'g', '㎍': 'mcg', '마이크로그램': 'mcg',
  '㎖': 'ml', '밀리리터': 'ml', 'L': 'l', '국제단위': 'iu',
}));
/** 순수 수치(단위 없이 연령·횟수로 쓰이는 값)도 보존 대상이다. */
const BARE_NUM_RE = /\d+(?:[.,]\d+)?/g;
const PAREN_RE = /\(([^()]*)\)/g;
/** 괄호 안이지만 성분이 아닌 것 — 수출·군납명 등은 성분 후보에서 뺀다. */
const NON_INGREDIENT = /수출|군납|판매명|포장|색소|향$/;

const canonUnit = (u) => UNIT_CANON.get(u) ?? u.toLowerCase();

export function expectationsFor(unit) {
  const seg = (kind, field) => unit.segments.filter((s) => s.kind === kind && (!field || s.field === field));
  const name = seg('FIXED_IDENTITY', '제품명')[0]?.text ?? '';
  const maker = seg('FIXED_IDENTITY', '제조·수입사')[0]?.text ?? '';
  const code = seg('FIXED_IDENTITY', '품목기준코드')[0]?.text ?? '';
  const bodySegs = unit.segments.filter((s) => s.kind === 'BODY');
  const body = bodySegs.map((s) => s.text).join('\n');

  // 순서를 보존해야 하므로 multiset 이 아니라 **배열**로 뽑는다.
  const doseTokens = [...body.matchAll(DOSE_RE)].map((m) => `${m[1].replace(',', '.')}${canonUnit(m[2])}`);
  const bareNumbers = [...body.matchAll(BARE_NUM_RE)].map((m) => m[0].replace(',', '.'));

  // 성분 후보: 제품명 괄호. 대부분의 제품에서 비어 있고(9,902), 그 자체가 결함이 아니다 —
  // 있는 경우에만 "EN 에 남아 있어야 한다" 는 기대치로 쓴다.
  const parens = [...name.matchAll(PAREN_RE)].map((m) => m[1].trim()).filter((t) => t && !NON_INGREDIENT.test(t));
  const ingredientTokens = parens.length
    ? parens[parens.length - 1].split(/\s*[,·/]\s*/).map((t) => t.trim()).filter(Boolean)
    : [];

  const sections = [...new Set(unit.segments.filter((s) => s.kind === 'HEADING' && s.section).map((s) => s.section))];

  return {
    masterId: unit.masterId,
    itemSeq: unit.itemSeq,
    // 제품 식별 정보는 번역 대상이 아니라 **그대로 옮겨야 하는 값**이다. TM 경유 금지.
    fixedIdentity: { productName: name, manufacturer: maker, itemSeq: code },
    ingredientTokens,
    ingredientCount: ingredientTokens.length,
    // 복합제 여부는 "분기" 가 아니라 검증 난도 라벨일 뿐이다.
    combinationHint: ingredientTokens.length >= 2,
    doseTokens,
    doseTokenCount: doseTokens.length,
    bareNumberCount: bareNumbers.length,
    numberMultiset: bareNumbers.slice().sort().join('|'),
    sections,
    sectionCount: sections.length,
    bodySentences: bodySegs.length,
  };
}

function main() {
  const rows = [];
  const src = fs.readFileSync(path.join(RESULTS, 'ko-units.jsonl'), 'utf8').split('\n').filter((l) => l.trim());
  for (const line of src) rows.push(expectationsFor(JSON.parse(line)));

  const hist = (fn) => rows.reduce((a, r) => { const k = fn(r); a[k] = (a[k] ?? 0) + 1; return a; }, {});
  const q = (arr, p) => arr.slice().sort((a, b) => a - b)[Math.floor(arr.length * p)];
  const doseCounts = rows.map((r) => r.doseTokenCount);
  const numCounts = rows.map((r) => r.bareNumberCount);

  const out = {
    wo: 'WO-O4O-EASY-DRUG-EN-FULL-RETRANSLATION-FROM-REBUILT-KO-V1',
    step: 'combo-census / en-expectations',
    rule: '생산 단위는 단일제·복합제 모두 master. 별도 공통 설명서 없음. 복합제는 검증 강도만 다름.',
    groundingFinding: {
      verdict: 'NO_STRUCTURED_INGREDIENT_LEDGER',
      productDrugExtensionsRows: 177413,
      nonEmpty: { ingredient_summary: 0, active_ingredients: 0, strength: 0, dosage_form: 0, atc_code: 176962 },
      ingredientColumnsInDb: ['product_drug_extensions.(active_ingredients|ingredient_summary|strength|dosage_form)'],
      easyDrugSourceSections: ['efcyQesitm', 'useMethodQesitm', 'atpnWarnQesitm', 'atpnQesitm', 'intrcQesitm', 'seQesitm', 'depositMethodQesitm'],
      koFixedIdentityFields: ['구분', '제품명', '제조·수입사', '품목기준코드'],
      consequence: '성분·함량 검증은 외부 원장 대조가 불가하며 KO↔EN 보존 대조로만 실행 가능',
    },
    masters: rows.length,
    ingredientTokenHistogram: hist((r) => r.ingredientCount),
    combinationHint: rows.filter((r) => r.combinationHint).length,
    doseTokens: {
      total: doseCounts.reduce((a, b) => a + b, 0),
      mastersWithNone: doseCounts.filter((c) => c === 0).length,
      p50: q(doseCounts, 0.5), p95: q(doseCounts, 0.95), max: Math.max(...doseCounts),
    },
    bareNumbers: {
      total: numCounts.reduce((a, b) => a + b, 0),
      mastersWithNone: numCounts.filter((c) => c === 0).length,
      p50: q(numCounts, 0.5), p95: q(numCounts, 0.95), max: Math.max(...numCounts),
    },
    sectionCountHistogram: hist((r) => r.sectionCount),
    dbWrites: 0,
  };

  fs.writeFileSync(path.join(RESULTS, 'en-expectations.jsonl'), rows.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');
  fs.writeFileSync(path.join(RESULTS, 'combo-census-result.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
}

main();
