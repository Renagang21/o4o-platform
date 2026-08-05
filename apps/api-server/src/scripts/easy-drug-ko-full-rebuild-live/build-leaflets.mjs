/**
 * WO-O4O-EASY-DRUG-KO-FULL-REBUILD-LIVE-PRODUCTION-V1 — 단계 4·5 전량 파일 생산
 *
 * PRODUCTION_READY 전건을 **자기 itemSeq 의 동결 원문에서만** 만든다.
 * 기존 KO 본문은 입력으로 쓰지 않는다 — 이 스크립트는 기존 KO 를 아예 읽지 않는다.
 *
 * 생산 계약은 파일럿에서 검증된 `pilot-contract.mjs` 를 그대로 쓴다(재검증된 계약을 재작성하지 않는다).
 * 여기서 다시 16축을 대조하고, 걸린 master 는 apply 대상에서 빼서 문제 큐에 넣는다.
 * 개별 실패는 전체를 멈추지 않는다(WO §6).
 *
 * DB 미접근 · write 0. 입력은 전부 파일이다. 같은 입력이면 byte-identical 이다.
 *
 * 산출 (results/):
 *   leaflets.jsonl          masterId · html · summary · contentHash        (미추적 — 대용량)
 *   production-ledger.jsonl 본문 없는 원장: source hash · content hash · 판정 (추적)
 *   problem-queue.jsonl     검증 실패 master                                (추적)
 *   production-summary.json 집계                                            (추적)
 *
 * 사용: node build-leaflets.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { AREAS, structure, buildHtml, buildSummary, splitItems, PHARM_FOOT_KO } from '../easy-drug-ko-full-rebuild-pilot/pilot-contract.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const RESULTS = path.join(HERE, 'results');
const readJsonl = (p) => fs.readFileSync(p, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
const sha256 = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

const norm = (s) => String(s ?? '').replace(/\s+/g, '');

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
const lost = (a, b) => {
  const A = bag(a); const B = bag(b); const out = [];
  for (const k of Object.keys(A)) if ((B[k] ?? 0) < A[k]) out.push(k);
  return out;
};

const unesc = (s) => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&amp;/g, '&');
function extractItems(html) {
  const items = [];
  for (const m of html.matchAll(/<li>([\s\S]*?)<\/li>/g)) items.push(unesc(m[1]));
  for (const m of html.matchAll(/<p class="sd-(?:intro|intake)">([\s\S]*?)<\/p>/g)) {
    for (const part of m[1].split('<br>')) items.push(unesc(part));
  }
  return items.map((s) => s.trim()).filter(Boolean);
}

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
  return 'PRODUCTION_PASS';
}

function main() {
  const population = readJsonl(path.join(RESULTS, 'population.jsonl'));
  const frozen = new Map(readJsonl(path.join(RESULTS, 'frozen-source.jsonl')).map((r) => [r.itemSeq, r]));
  const digest = JSON.parse(fs.readFileSync(path.join(RESULTS, 'source-drift.json'), 'utf8')).frozenSnapshotDigest;

  // 결정적 순서 — dry-run 2회·재실행이 같은 파일을 내려면 순서가 고정이어야 한다.
  const targets = population.filter((p) => p.state === 'PRODUCTION_READY')
    .sort((a, b) => (a.masterId < b.masterId ? -1 : a.masterId > b.masterId ? 1 : 0));

  const leaflets = []; const ledger = []; const problems = [];
  const verdicts = {}; const axisCount = {};
  let htmlBytes = 0;

  for (const p of targets) {
    const src = frozen.get(p.itemSeq);
    const findings = {
      system: [], sourceIncomplete: [], foreign: [], contentLoss: [], contentAddition: [],
      sectionInvasion: [], numeric: [], route: [], parse: [],
    };

    if (!src) findings.system.push('FROZEN_SOURCE_MISSING');
    else if (src.sourceHash !== p.officialSourceHash) findings.system.push('SOURCE_HASH_MISMATCH');

    let html = ''; let summary = null; let st = null;
    if (!findings.system.length) {
      st = structure(src, { productName: p.productName, dosageForm: p.dosageForm, entpName: src.entpName });
      for (const a of st.anomalies) {
        if (a === 'SAFETY_PARTITION_BROKEN') findings.system.push(a);
        else findings.sourceIncomplete.push(a);
      }
      if (!findings.system.length && !findings.sourceIncomplete.length) {
        html = buildHtml(st);
        summary = buildSummary(st);

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

        const outItems = extractItems(html).map(norm);
        const outSet = new Set(outItems);
        for (const f of ALL_FIELDS) for (const k of fieldItems[f]) if (!outSet.has(k)) findings.contentLoss.push(`${f}:${k.slice(0, 40)}`);
        const allowedExtra = new Set([norm(PHARM_FOOT_KO)]);
        for (const k of outItems) if (!selfAll.has(k) && !allowedExtra.has(k)) findings.contentAddition.push(k.slice(0, 40));

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
        const rl = lost(routeVerbs(src.useMethodQesitm), routeVerbs(areaText.usage));
        if (rl.length) findings.route.push(`usage:${rl.join(',')}`);
        const rl2 = lost(routeVerbs(safetySrc), routeVerbs(safetyOut));
        if (rl2.length) findings.route.push(`safety:${rl2.join(',')}`);

        if (splitItems(safetySrc).length > 0 && st.safetyItemCount === 0) findings.parse.push('SAFETY_SPLIT_EMPTY');
        if (st.areas.prohibition.length === 0 && /하지\s*마십시오/.test(safetySrc)) findings.parse.push('PROHIBITION_NOT_ISOLATED');
      }
    }

    const verdict = judge(findings);
    verdicts[verdict] = (verdicts[verdict] ?? 0) + 1;
    for (const k of Object.keys(findings)) if (findings[k].length) axisCount[k] = (axisCount[k] ?? 0) + 1;

    const contentHash = html ? sha256(html) : null;
    if (verdict === 'PRODUCTION_PASS') {
      leaflets.push({
        masterId: p.masterId, itemSeq: p.itemSeq, html, summary, contentHash,
        officialSourceHash: src.sourceHash, sourceCandidateId: p.sourceCandidateId,
      });
      htmlBytes += Buffer.byteLength(html, 'utf8');
    } else {
      problems.push({
        masterId: p.masterId, itemSeq: p.itemSeq, verdict,
        findings: Object.fromEntries(Object.entries(findings).filter(([, v]) => v.length).map(([k, v]) => [k, v.slice(0, 10)])),
      });
    }

    ledger.push({
      masterId: p.masterId, itemSeq: p.itemSeq, verdict,
      officialSourceHash: src ? src.sourceHash : null,
      generatedContentHash: contentHash,
      generatedLength: html.length,
      summaryLength: summary ? summary.length : 0,
      areaCounts: st ? Object.fromEntries(AREAS.filter((a) => a !== 'overview').map((a) => [a, st.areas[a].length])) : null,
      existingKoDescId: p.koDescId, existingKoMd5: p.koMd5, existingKoLen: p.koLen,
      existingKoSourceType: p.koSourceType,
    });
  }

  const summary = {
    wo: 'WO-O4O-EASY-DRUG-KO-FULL-REBUILD-LIVE-PRODUCTION-V1',
    step: '4-5-production',
    frozenSnapshotDigest: digest,
    targets: targets.length,
    built: leaflets.length,
    problemQueue: problems.length,
    verdicts,
    axisHitMasters: axisCount,
    distinctContentHash: new Set(leaflets.map((l) => l.contentHash)).size,
    distinctItemSeq: new Set(leaflets.map((l) => l.itemSeq)).size,
    // 같은 허가품목·같은 원문이면 결정적으로 같은 본문이 나오는 것이 계약(WO §4 허용 항목)
    sameSourceSameOutput: (() => {
      const byHash = new Map();
      for (const l of leaflets) {
        const k = l.officialSourceHash;
        if (!byHash.has(k)) byHash.set(k, new Set());
        byHash.get(k).add(l.contentHash);
      }
      // 제품명이 본문에 들어가므로 같은 원문이라도 제품명이 다르면 본문이 갈린다 — 위반이 아니다.
      return { distinctSourceHash: byHash.size, sourceHashWithMultipleOutputs: [...byHash.values()].filter((s) => s.size > 1).length };
    })(),
    htmlBytes,
    htmlMB: +(htmlBytes / 1024 / 1024).toFixed(1),
    existingKoReadAsInput: false,
    dbWrites: 0,
  };

  fs.writeFileSync(path.join(RESULTS, 'leaflets.jsonl'), leaflets.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');
  fs.writeFileSync(path.join(RESULTS, 'production-ledger.jsonl'), ledger.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');
  fs.writeFileSync(path.join(RESULTS, 'problem-queue.jsonl'), problems.map((r) => JSON.stringify(r)).join('\n') + (problems.length ? '\n' : ''), 'utf8');
  fs.writeFileSync(path.join(RESULTS, 'production-summary.json'), JSON.stringify(summary, null, 2) + '\n', 'utf8');
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
}

main();
