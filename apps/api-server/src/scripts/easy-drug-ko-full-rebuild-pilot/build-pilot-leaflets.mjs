/**
 * WO-O4O-EASY-DRUG-KO-FULL-REBUILD-PIPELINE-PILOT-VALIDATION-V1 — 단계 5·6·7
 *
 * 파일럿 500 을 e약은요 원문에서 **처음부터** 만들고(구조화 → sd-* 조립),
 * 그 자리에서 **정보 보존 16축**(WO §7)을 대조해 10종 판정을 매긴다.
 *
 * DB 미접근 · 운영 write 0. 입력은 전부 파일이다.
 *
 * 산출:
 *   results/structured.jsonl     9영역 구조화 결과 (항목 텍스트 포함 — 미추적)
 *   results/leaflets.jsonl       신규 KO 설명서 본문 + md5 (미추적)
 *   results/leaflet-ledger.jsonl 본문 없는 원장: md5·길이·영역별 항목 수·판정 (추적)
 *   results/build-report.json    집계 (추적)
 *
 * 사용: node build-pilot-leaflets.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { AREAS, AREA_LABEL, structure, buildHtml, buildSummary, splitItems, PHARM_FOOT_KO } from './pilot-contract.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const RESULTS = path.join(HERE, 'results');
const readJsonl = (p) => fs.readFileSync(p, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
const md5 = (s) => crypto.createHash('md5').update(s, 'utf8').digest('hex');

/** 공백만 무시한 비교 키. 글자·숫자·부정어는 전부 유효 차이로 남긴다. */
const norm = (s) => String(s ?? '').replace(/\s+/g, '');

/** 원문 필드 ↔ 생성 영역 귀속. 이 표를 벗어난 이동이 "섹션 침범"이다. */
const AREA_SOURCE = {
  efficacy: ['efcyQesitm'],
  usage: ['useMethodQesitm'],
  prohibition: ['atpnWarnQesitm', 'atpnQesitm'],
  consult: ['atpnWarnQesitm', 'atpnQesitm'],
  caution: ['atpnWarnQesitm', 'atpnQesitm'],
  sideEffect: ['seQesitm'],
  interaction: ['intrcQesitm'],
  storage: ['depositMethodQesitm'],
};
const ALL_FIELDS = ['efcyQesitm', 'useMethodQesitm', 'atpnWarnQesitm', 'atpnQesitm', 'seQesitm', 'intrcQesitm', 'depositMethodQesitm'];

// ── 16축 토큰 추출기 ────────────────────────────────────────────────────────────
const nums = (s) => (String(s ?? '').match(/\d+(?:[.,]\d+)?/g) ?? []);
const ages = (s) => (String(s ?? '').match(/(?:만\s*)?\d+\s*(?:세|개월|살)|소아|영아|유아|어린이|청소년|성인|고령자|노인|임부|수유부/g) ?? []);
const perDose = (s) => (String(s ?? '').match(/1\s*회\s*\d+(?:[.,~-]\d+)?\s*[가-힣㎎㎖%]*/g) ?? []);
const perDay = (s) => (String(s ?? '').match(/(?:1일|하루)\s*\d+(?:[~-]\d+)?\s*(?:회|번)/g) ?? []);
const interval = (s) => (String(s ?? '').match(/\d+\s*시간\s*(?:마다|이상|간격|을?\s*두고)/g) ?? []);
const duration = (s) => (String(s ?? '').match(/\d+\s*(?:일|주|개월|년)\s*(?:간|이상|이내|동안|넘게|초과)?/g) ?? []);
const routeVerbs = (s) => (String(s ?? '').match(/복용|내복|경구|삼키|삼켜|먹|바르|바릅|발라|도포|붙이|붙입|부착|점안|점적|넣|뿌리|분무|삽입|주입|씹어|물|가글|함수/g) ?? []);
const negations = (s) => (String(s ?? '').match(/마십시오|마시오|마세요|말\s*것|안\s*됩니다|않습니다|않도록|금기|금지|금합니다|삼가|피하십시오|피하시오|없습니다/g) ?? []);
const strongWarn = (s) => (String(s ?? '').match(/절대|반드시|즉시|중대한|치명적|응급|위험/g) ?? []);

const bag = (arr) => arr.reduce((a, t) => { const k = norm(t); a[k] = (a[k] ?? 0) + 1; return a; }, {});
/** a 에 있는데 b 에 부족한 항목. 반대 방향은 호출부에서 뒤집어 부른다. */
const lost = (a, b) => {
  const A = bag(a); const B = bag(b); const out = [];
  for (const k of Object.keys(A)) if ((B[k] ?? 0) < A[k]) out.push(k);
  return out;
};

/** 생성 HTML 에서 사람이 읽는 항목 텍스트를 되꺼낸다. 구조 파서가 아니라 **역추출**이다. */
function extractItems(html) {
  const items = [];
  for (const m of html.matchAll(/<li>([\s\S]*?)<\/li>/g)) items.push(unesc(m[1]));
  for (const m of html.matchAll(/<p class="sd-(?:intro|intake)">([\s\S]*?)<\/p>/g)) {
    for (const part of m[1].split('<br>')) items.push(unesc(part));
  }
  return items.map((s) => s.trim()).filter(Boolean);
}
const unesc = (s) => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&amp;/g, '&');

/** WO §7 판정 10종. 첫 번째로 걸리는 것이 결론이다(가장 무거운 것부터). */
function judge(f) {
  if (f.system.length) return 'HOLD';
  if (f.sourceIncomplete.length) return 'SOURCE_INCOMPLETE';
  if (f.foreign.length) return 'WRONG_ATTRIBUTION';
  if (f.contentLoss.length) return 'CONTENT_LOSS';
  if (f.contentAddition.length) return 'CONTENT_ADDITION';
  if (f.sectionInvasion.length) return 'STRUCTURE_REVIEW';
  if (f.numeric.length) return 'NUMERIC_CONFLICT';
  if (f.route.length) return 'ROUTE_CONFLICT';
  if (f.parse.length) return 'PARSE_REVIEW';
  return 'PILOT_PASS';
}

function main() {
  const pilot = readJsonl(path.join(RESULTS, 'pilot-selection.jsonl'));
  const api = new Map(readJsonl(path.join(RESULTS, 'source-snapshot.jsonl')).map((r) => [r.itemSeq, r]));

  const structuredOut = []; const leafletOut = []; const ledger = [];
  const verdictCount = {}; const axisCount = {};

  for (const p of pilot) {
    const src = api.get(p.itemSeq);
    const findings = {
      system: [], sourceIncomplete: [], foreign: [], contentLoss: [], contentAddition: [],
      sectionInvasion: [], numeric: [], route: [], parse: [],
    };
    if (!src) {
      findings.system.push('API_SOURCE_MISSING');
      ledger.push({ masterId: p.masterId, itemSeq: p.itemSeq, verdict: 'HOLD', findings });
      verdictCount.HOLD = (verdictCount.HOLD ?? 0) + 1;
      continue;
    }

    const st = structure(src, { productName: p.productName, dosageForm: p.dosageForm });
    for (const a of st.anomalies) {
      if (a === 'SAFETY_PARTITION_BROKEN') findings.system.push(a);
      else findings.sourceIncomplete.push(a);
    }

    const html = findings.system.length || findings.sourceIncomplete.length ? '' : buildHtml(st);
    const summary = html ? buildSummary(st) : null;

    if (html) {
      // ── 축 15·16: 섹션 침범 / 다른 제품 혼입 ────────────────────────────────
      const fieldItems = Object.fromEntries(ALL_FIELDS.map((f) => [f, new Set(splitItems(src[f]).map(norm))]));
      const selfAll = new Set(ALL_FIELDS.flatMap((f) => [...fieldItems[f]]));
      for (const area of Object.keys(AREA_SOURCE)) {
        const allowed = new Set(AREA_SOURCE[area].flatMap((f) => [...fieldItems[f]]));
        for (const t of st.areas[area]) {
          const k = norm(t);
          if (!selfAll.has(k)) findings.foreign.push(`${area}:${t.slice(0, 40)}`);
          else if (!allowed.has(k)) findings.sectionInvasion.push(`${area}:${t.slice(0, 40)}`);
        }
      }

      // ── 원문 → 생성본 손실 / 생성본 → 원문 추가 ─────────────────────────────
      const outItems = extractItems(html).map(norm);
      const outSet = new Set(outItems);
      for (const f of ALL_FIELDS) for (const k of fieldItems[f]) if (!outSet.has(k)) findings.contentLoss.push(`${f}:${k.slice(0, 40)}`);
      const allowedExtra = new Set([norm(PHARM_FOOT_KO)]);
      for (const k of outItems) if (!selfAll.has(k) && !allowedExtra.has(k)) findings.contentAddition.push(k.slice(0, 40));

      // ── 축 1~14: 영역별 토큰 보존 ───────────────────────────────────────────
      const areaText = Object.fromEntries(Object.keys(AREA_SOURCE).map((a) => [a, st.areas[a].join('\n')]));
      const safetySrc = `${src.atpnWarnQesitm ?? ''}\n${src.atpnQesitm ?? ''}`;
      const safetyOut = `${areaText.prohibition}\n${areaText.consult}\n${areaText.caution}`;
      const pairs = [
        ['효능', src.efcyQesitm, areaText.efficacy, [nums]],
        ['용법', src.useMethodQesitm, areaText.usage, [nums, ages, perDose, perDay, interval, duration]],
        ['안전', safetySrc, safetyOut, [nums, ages, negations, strongWarn, duration]],
        ['이상반응', src.seQesitm, areaText.sideEffect, [nums, negations]],
        ['상호작용', src.intrcQesitm, areaText.interaction, [nums, negations]],
        ['보관', src.depositMethodQesitm, areaText.storage, [nums]],
      ];
      for (const [label, s, o, fns] of pairs) {
        for (const fn of fns) {
          const l = lost(fn(s), fn(o));
          if (l.length) findings.numeric.push(`${label}:${fn.name}:${l.slice(0, 5).join(',')}`);
        }
      }
      // 축 8: 투여 경로 — 원문 용법의 경로 동사가 하나라도 줄면 ROUTE_CONFLICT
      const rl = lost(routeVerbs(src.useMethodQesitm), routeVerbs(areaText.usage));
      if (rl.length) findings.route.push(`usage:${rl.join(',')}`);
      const rl2 = lost(routeVerbs(safetySrc), routeVerbs(safetyOut));
      if (rl2.length) findings.route.push(`safety:${rl2.join(',')}`);

      // 파싱 품질: 안전 항목이 하나도 안 잡히면 분할이 의심스럽다(내용 문제는 아님)
      if (splitItems(safetySrc).length > 0 && st.safetyItemCount === 0) findings.parse.push('SAFETY_SPLIT_EMPTY');
      if (st.areas.prohibition.length === 0 && /하지\s*마십시오/.test(safetySrc)) findings.parse.push('PROHIBITION_NOT_ISOLATED');
    }

    const verdict = judge(findings);
    verdictCount[verdict] = (verdictCount[verdict] ?? 0) + 1;
    for (const k of Object.keys(findings)) if (findings[k].length) axisCount[k] = (axisCount[k] ?? 0) + 1;

    structuredOut.push({ masterId: p.masterId, itemSeq: p.itemSeq, areas: st.areas });
    if (html) leafletOut.push({ masterId: p.masterId, itemSeq: p.itemSeq, html, summary, md5: md5(html) });
    ledger.push({
      masterId: p.masterId, itemSeq: p.itemSeq, route: p.route,
      newMd5: html ? md5(html) : null, newLen: html.length,
      areaCounts: Object.fromEntries(AREAS.filter((a) => a !== 'overview').map((a) => [a, st.areas[a].length])),
      oldMd5: p.koMd5, oldLen: p.koLen,
      verdict,
      findings: Object.fromEntries(Object.entries(findings).filter(([, v]) => v.length).map(([k, v]) => [k, v.slice(0, 10)])),
    });
  }

  const report = {
    wo: 'WO-O4O-EASY-DRUG-KO-FULL-REBUILD-PIPELINE-PILOT-VALIDATION-V1',
    step: '5-6-7-build-and-preserve',
    pilot: pilot.length,
    built: leafletOut.length,
    verdicts: verdictCount,
    axisHitMasters: axisCount,
    distinctNewMd5: new Set(leafletOut.map((l) => l.md5)).size,
    dbWrites: 0,
    areaLabels: AREA_LABEL,
  };

  fs.writeFileSync(path.join(RESULTS, 'structured.jsonl'), structuredOut.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');
  fs.writeFileSync(path.join(RESULTS, 'leaflets.jsonl'), leafletOut.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');
  fs.writeFileSync(path.join(RESULTS, 'leaflet-ledger.jsonl'), ledger.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');
  fs.writeFileSync(path.join(RESULTS, 'build-report.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}

main();
