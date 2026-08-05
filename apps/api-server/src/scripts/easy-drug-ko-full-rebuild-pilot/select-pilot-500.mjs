/**
 * WO-O4O-EASY-DRUG-KO-FULL-REBUILD-PIPELINE-PILOT-VALIDATION-V1 — 단계 3 파일럿 500 선정
 *
 * "앞번호 500건" 을 금지한다. WO §3 이 요구하는 축을 **먼저 보장**하고, 남은 자리만 채운다.
 *
 * 입력(전부 파일 — DB 미접근):
 *   results/master-census.jsonl                                  단계 2 산출
 *   results/source-snapshot.jsonl                                단계 4 산출 (API 원문)
 *   ../easy-drug-ko-source-consistency-audit/results/verdict-index.jsonl   기존 결함 이력
 *
 * 산출:
 *   results/pilot-selection.jsonl   선정 500 원장 (masterId · itemSeq · 축 태그 · 선정 사유)
 *   results/pilot-selection.json    커버리지 집계
 *
 * 결정성: 순위 키 = sha256(masterId) — 입력이 같으면 항상 같은 500 을 고른다.
 *
 * 사용: node select-pilot-500.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const RESULTS = path.join(HERE, 'results');
const VERDICT_INDEX = path.resolve(HERE, '../easy-drug-ko-source-consistency-audit/results/verdict-index.jsonl');
const TARGET = 500;

const readJsonl = (p) => fs.readFileSync(p, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
const rank = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

/**
 * 투여 경로 분류. **원문 용법 문장 + 제품명 + 제형** 만 본다.
 * 순서는 구체적인 경로부터다 — 외용·경구 어휘는 다른 경로 설명서에도 흔히 섞여 있다.
 * `점이` 단독 매칭은 쓰지 않는다(원문의 "궁금한 **점이**" 에 걸린다 — 선행 트랙 실측 오탐).
 */
const ROUTE_RULES = [
  ['ophthalmic', /점안|안약|눈에|결막낭|안연고/],
  ['otic', /점이액|점이제|귓속|외이도|귀\s*(안|속)에\s*(넣|점적|투여)/],
  ['nasal', /비강|콧속|코\s*(안|속)에|점비|비점막|코에\s*(뿌|분무|넣)/],
  ['vaginal', /질정|질좌제|질\s*(안|내|강)에|질에\s*삽입|질\s*깊숙/],
  ['rectal', /직장|항문|좌약|좌제|관장/],
  ['oromucosal', /구강|입\s*안|입안|함수|가글|양치|설하|잇몸|구내|껌|목에\s*(뿌|분무)|트로키/],
  ['topical', /바르|바릅|발라|도포|피부|외용|붙이|붙입|부착|첩부|환부|국소|문지르|문지릅|스프레이|분무|씻어낸/],
  ['oral', /복용|먹|내복|경구|삼키|삼켜|씹어|물과\s*함께|투여/],
];
function routeOf(rec, m) {
  const hay = `${rec.useMethodQesitm ?? ''} ${rec.itemName ?? ''} ${m.dosageForm ?? ''}`;
  for (const [name, re] of ROUTE_RULES) if (re.test(hay)) return name;
  return 'unclassified';
}

/** WO §3 이 이름으로 요구한 축을 원문에서 그대로 검출한다. 판정이 아니라 **표본 태깅**이다. */
function tagsOf(rec, m, itemMasterCount, verdicts) {
  const use = rec.useMethodQesitm ?? '';
  const all = [rec.efcyQesitm, use, rec.atpnWarnQesitm, rec.atpnQesitm, rec.intrcQesitm, rec.seQesitm]
    .filter(Boolean).join('\n');
  const t = [];
  t.push(`route:${routeOf(rec, m)}`);
  // 성분 단일/복합 — 표준코드 일반명코드 수를 대리 지표로 쓴다(성분 원장이 별도로 없다).
  if ((m.gencodes ?? []).length === 1) t.push('ingredient:single');
  if ((m.gencodes ?? []).length > 1) t.push('ingredient:multi');
  if (/소아|영아|유아|어린이|청소년|만\s*\d+\s*세|\d+\s*개월|\d+\s*세\s*(이상|미만|이하)/.test(all)) t.push('age');
  if (/1회\s*\d|한\s*번에\s*\d|1\s*회\s*[\d가-힣]*\s*(정|캡슐|포|㎖|ml|mg|방울)/.test(use)) t.push('perDose');
  if (/1일\s*\d+\s*(회|번)|하루\s*\d+\s*(회|번)/.test(use)) t.push('perDay');
  if (/간격|\d+\s*시간\s*(마다|이상|간격)|\d+\s*시간을\s*(두고|지나)/.test(use)) t.push('interval');
  if (/\d+\s*(일|주|개월)\s*(간|이상|이내|동안|넘게|초과)|장기간|연용/.test(all)) t.push('duration');
  if (/금기|투여하지\s*마|사용하지\s*마|복용하지\s*마|절대|하지\s*마십시오|않는다|말\s*것/.test(all)) t.push('strongProhibition');
  if ((rec.seQesitm ?? '').length >= 300) t.push('longSideEffect');
  if ((rec.intrcQesitm ?? '').trim()) t.push('hasInteraction');
  if (itemMasterCount >= 2) t.push('multiMaster');
  if (!(rec.efcyQesitm ?? '').trim() || !(use).trim()) t.push('sourceIncomplete');
  for (const v of verdicts) t.push(`history:${v}`);
  if (verdicts.includes('KO_DISPLAY_ONLY_DIFFERENCE')) t.push('history:approvedNormal');
  return t;
}

/** 보장 쿼터. 풀이 쿼터보다 작으면 있는 만큼만 — 없는 축을 억지로 만들지 않는다. */
const QUOTAS = [
  ['route:oral', 60], ['route:topical', 45], ['route:ophthalmic', 25], ['route:otic', 20],
  ['route:nasal', 20], ['route:oromucosal', 25], ['route:vaginal', 20], ['route:rectal', 20],
  ['ingredient:single', 40], ['ingredient:multi', 40],
  ['age', 40], ['perDose', 40], ['perDay', 40], ['interval', 30], ['duration', 30],
  ['strongProhibition', 40], ['longSideEffect', 40], ['hasInteraction', 40],
  ['multiMaster', 40],
  ['history:KO_WRONG_ATTRIBUTION', 15], ['history:KO_CONTRADICTED', 20],
  ['history:KO_MISSING_CONTENT', 40], ['history:KO_EXTRA_CONTENT', 20],
  ['history:KO_STRUCTURE_REMAINING', 15], ['history:approvedNormal', 40],
  ['sourceIncomplete', 5],
];
/** 같은 허가품목이 표본을 잠식하지 않도록 상한. multiMaster 축 확보를 위해 1 이 아니라 3 이다. */
const MAX_PER_ITEMSEQ = 3;

function main() {
  const census = readJsonl(path.join(RESULTS, 'master-census.jsonl'));
  const api = new Map(readJsonl(path.join(RESULTS, 'source-snapshot.jsonl')).map((r) => [r.itemSeq, r]));

  const verdictByItem = new Map();
  for (const v of readJsonl(VERDICT_INDEX)) {
    if (!verdictByItem.has(v.itemSeq)) verdictByItem.set(v.itemSeq, new Set());
    verdictByItem.get(v.itemSeq).add(v.verdict);
  }

  const itemMasterCount = new Map();
  for (const m of census) itemMasterCount.set(m.itemSeq, (itemMasterCount.get(m.itemSeq) ?? 0) + 1);

  const pool = census
    .filter((m) => m.apiFetched && api.has(m.itemSeq))
    .map((m) => {
      const rec = api.get(m.itemSeq);
      const verdicts = [...(verdictByItem.get(m.itemSeq) ?? [])].sort();
      return {
        masterId: m.masterId, itemSeq: m.itemSeq, productName: m.productName,
        itemName: rec.itemName, dosageForm: m.dosageForm,
        gencodeCount: (m.gencodes ?? []).length, classKinds: m.classKinds,
        koDescId: m.koDescId, koMd5: m.koMd5, koLen: m.koLen,
        enCount: m.enCount, zhCount: m.zhCount,
        excluded: m.excluded,
        route: routeOf(rec, m),
        historyVerdicts: verdicts,
        tags: tagsOf(rec, m, itemMasterCount.get(m.itemSeq) ?? 1, verdicts),
        rank: rank(m.masterId),
      };
    })
    // 전문의약품·다중 허가품목 연결은 매장용 설명서 대상이 아니다(선행 트랙과 동일 계약).
    .filter((m) => !m.excluded)
    .sort((a, b) => (a.rank < b.rank ? -1 : 1));

  const selected = new Map();
  const perItem = new Map();
  const reason = new Map();
  const take = (m, why) => {
    if (selected.has(m.masterId)) return false;
    const n = perItem.get(m.itemSeq) ?? 0;
    if (n >= MAX_PER_ITEMSEQ) return false;
    selected.set(m.masterId, m);
    perItem.set(m.itemSeq, n + 1);
    reason.set(m.masterId, why);
    return true;
  };

  // Phase A — 축 보장
  const quotaFilled = {};
  for (const [tag, quota] of QUOTAS) {
    let n = [...selected.values()].filter((m) => m.tags.includes(tag)).length;
    for (const m of pool) {
      if (n >= quota || selected.size >= TARGET) break;
      if (!m.tags.includes(tag)) continue;
      if (take(m, `quota:${tag}`)) n += 1;
    }
    quotaFilled[tag] = n;
  }

  // Phase B — 잔여 자리를 경로 라운드로빈으로 채운다(한 경로 쏠림 방지)
  const routes = [...new Set(pool.map((m) => m.route))].sort();
  let progressed = true;
  while (selected.size < TARGET && progressed) {
    progressed = false;
    for (const r of routes) {
      if (selected.size >= TARGET) break;
      const cand = pool.find((m) => m.route === r && !selected.has(m.masterId)
        && (perItem.get(m.itemSeq) ?? 0) < MAX_PER_ITEMSEQ);
      if (cand && take(cand, `fill:${r}`)) progressed = true;
    }
  }

  const rows = [...selected.values()]
    .map((m) => ({ ...m, selectedBy: reason.get(m.masterId) }))
    .sort((a, b) => (a.rank < b.rank ? -1 : 1));

  const tagCount = {};
  for (const m of rows) for (const t of m.tags) tagCount[t] = (tagCount[t] ?? 0) + 1;
  const poolTagCount = {};
  for (const m of pool) for (const t of m.tags) poolTagCount[t] = (poolTagCount[t] ?? 0) + 1;

  const summary = {
    wo: 'WO-O4O-EASY-DRUG-KO-FULL-REBUILD-PIPELINE-PILOT-VALIDATION-V1',
    step: '3-pilot-selection',
    target: TARGET,
    poolMasters: pool.length,
    poolItemSeq: new Set(pool.map((m) => m.itemSeq)).size,
    selected: rows.length,
    selectedItemSeq: new Set(rows.map((m) => m.itemSeq)).size,
    maxPerItemSeq: MAX_PER_ITEMSEQ,
    quotaFilled,
    coverage: tagCount,
    poolCoverage: poolTagCount,
    unmetQuotas: QUOTAS.filter(([t, q]) => (tagCount[t] ?? 0) < q)
      .map(([t, q]) => ({ tag: t, want: q, got: tagCount[t] ?? 0, poolHas: poolTagCount[t] ?? 0 })),
    routeDistribution: rows.reduce((a, m) => ({ ...a, [m.route]: (a[m.route] ?? 0) + 1 }), {}),
    rankKey: 'sha256(masterId)',
  };

  fs.writeFileSync(path.join(RESULTS, 'pilot-selection.jsonl'), rows.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');
  fs.writeFileSync(path.join(RESULTS, 'pilot-selection.json'), JSON.stringify(summary, null, 2) + '\n', 'utf8');
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
}

main();
