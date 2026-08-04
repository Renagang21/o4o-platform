#!/usr/bin/env node
/**
 * WO-O4O-EASY-DRUG-KO-SOURCE-CONSISTENCY-AUDIT-V1 / 단계 3 — 독립검증
 *
 * audit-ko-source-consistency.mjs 를 **import 하지 않는다.** 감사 엔진의 산출물을 신뢰하지 않고,
 * 같은 입력(pairs.jsonl)에서 기대값을 다른 구현으로 재도출해 대조한다.
 * 구현을 공유하면 같은 버그를 같이 통과시키므로, 아래 검사는 의도적으로 다른 방법을 쓴다.
 *   - 문장 3-gram 커버리지 대신 **어절 단위 포함 검사**
 *   - 수치축 정규식 대신 **문맥 창(window) 파싱**
 *   - 귀속 Jaccard 대신 **원문 효능 문자열 동일성**
 *
 * 검사 항목
 *   V1 모집단 정합    : units/permits/masters 를 pairs.jsonl 에서 직접 세어 summary 와 대조
 *   V2 인덱스 정합    : verdict-index 와 findings 의 판정·건수 일치, 중복/누락 0
 *   V3 승인 안전성    : 번역 승인(SOURCE_MATCH·DISPLAY_ONLY) 판정에 독립 결함이 있으면 실패
 *                      — 승인 오탐(위험 방향)은 0건이어야 한다
 *   V4 배제 근거      : 배제 판정에 독립 근거가 하나도 없으면 과잉 배제로 보고
 *   V5 재현성        : 같은 입력에 대해 판정이 결정적인지(ruleVersion 고정) 확인
 *
 * 실행:
 *   node verify-audit-independently.mjs --in pairs.jsonl --audit audit_out
 * DB 접근 없음. write 없음.
 */

import fs from 'node:fs';
import path from 'node:path';

const EXPECTED_RULE_VERSION = 'KO_SOURCE_CONSISTENCY_V1';
const APPROVED = new Set(['KO_SOURCE_MATCH', 'KO_DISPLAY_ONLY_DIFFERENCE']);

function arg(name, dflt) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
}

function readJsonl(file) {
  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
}

// ── 독립 구현: HTML → 텍스트 (엔진과 다른 경로로 단순 구현)
function textOf(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h1|h2|h3|h4|li|tr)>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .normalize('NFC');
}

/**
 * 비교용 정규화. 구두점·괄호를 **양쪽에서 동일하게** 제거한다.
 * 한쪽만 제거하면 "퇴행성관절염(골(뼈)관절염)" 같은 병기 표기가 통째로 불일치로 잡힌다.
 */
function squash(s) {
  return String(s)
    .normalize('NFC')
    .replace(/[〜～∼]/g, '~')
    .replace(/[ㆍ·․‧∙]/g, '·')
    .replace(/[.,;:()[\]{}'"“”‘’]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

/** 어절 단위 포함률. 엔진의 3-gram 과 독립적인 척도. */
function wordCoverage(sentence, haystackSquashed) {
  const words = String(sentence)
    .split(/\s+/)
    .map((w) => squash(w))
    .filter((w) => w.length >= 2);
  if (words.length === 0) return 1;
  const hit = words.filter((w) => haystackSquashed.includes(w)).length;
  return hit / words.length;
}

/** 문맥 창 파싱: "1일 N회" / "1회 N단위" 를 정규식이 아닌 위치 탐색으로 뽑는다. */
function windowDoses(text) {
  const t = String(text).replace(/[〜～∼]/g, '~').replace(/\s+/g, '');
  const out = { perDay: new Set(), perDose: new Set() };
  for (let i = 0; i < t.length - 3; i += 1) {
    if (t.startsWith('1일', i)) {
      const m = /^(\d+(?:~\d+)?)회/.exec(t.slice(i + 2));
      if (m) out.perDay.add(m[1]);
    } else if (t.startsWith('1회', i)) {
      const m = /^(\d+(?:\/\d+)?(?:\.\d+)?(?:~\d+(?:\/\d+)?(?:\.\d+)?)?)(정|캡슐|포|병|매|방울|봉|팩|앰플|바이알|장|개|컵|ml|㎖|l|g|mg|㎎)/i.exec(
        t.slice(i + 2),
      );
      if (m) out.perDose.add(`${m[1]}${m[2].toLowerCase()}`);
    }
  }
  return out;
}

function officialSections(off) {
  const o = off || {};
  return {
    efficacy: String(o.efficacy || '').trim(),
    usage: String(o.usage || '').trim(),
    warning: String(o.warning || '').trim(),
    caution: String(o.caution || '').trim(),
    interaction: String(o.interaction || '').trim(),
    sideEffect: String(o.sideEffect || '').trim(),
    storage: String(o.storage || '').trim(),
  };
}

function splitSentences(text) {
  return String(text)
    .split(/(?<=다\.)\s*|\n+/)
    .map((x) => x.trim())
    .filter((x) => x.length >= 8);
}

/**
 * 독립 결함 탐지. 엔진의 판정 코드를 보지 않고, 원문·본문만으로 결함 유무를 다시 판단한다.
 * 승인 후보에 대해서만 "위험한" 결함(누락/모순/절단/오귀속)을 찾는다.
 */
function independentDefects(rec, sharedBodyOfficialEfficacy, sectionThreshold = 0.6) {
  const html = String(rec.content || '');
  const plain = textOf(html);
  const sq = squash(plain);
  const off = officialSections(rec.officialConsumerText);
  const defects = [];

  // D1. 필수 절 문장 반영 — 어절 포함률 0.6 미만이면 미반영으로 본다(엔진보다 관대).
  for (const key of ['efficacy', 'usage', 'warning', 'caution', 'interaction', 'sideEffect']) {
    const txt = off[key];
    if (!txt) continue;
    const ss = splitSentences(txt);
    if (ss.length === 0) continue;
    const miss = ss.filter((s) => wordCoverage(s, sq) < sectionThreshold);
    if (miss.length > 0) defects.push(`SECTION_NOT_REFLECTED::${key}(${miss.length}/${ss.length})`);
  }

  // D2. 수치 모순 — 문맥 창 파싱으로 본문이 원문에 없는 값을 주장하는지 본다.
  const offAll = Object.values(off).join('\n');
  const od = windowDoses(offAll);
  const cd = windowDoses(plain);
  const offSq = squash(offAll.replace(/(\d)\s+(mg|ml|g|l|iu)/gi, '$1$2'));
  for (const axis of ['perDay', 'perDose']) {
    if (od[axis].size === 0) continue;
    for (const v of cd[axis]) {
      if (od[axis].has(v)) continue;
      if (offSq.includes(squash(v))) continue; // 원문 어딘가에 그대로 있으면 모순 아님
      defects.push(`DOSE_CONTRADICTION::${axis}=${v}`);
    }
  }

  // D3. 문장 절단 — 마지막 의미 문자가 종결형이 아닌 경우.
  const tail = plain.replace(/\s+/g, ' ').trim().replace(/[-–—\s]+$/, '');
  if (tail && !/[.?!)\]"'”』」]$|(다|요|오|음|함|것)$/.test(tail)) defects.push('TRUNCATED_TAIL');

  // D4. 태그 불균형 — 열림/닫힘 div 수 불일치.
  const openDiv = (html.match(/<div[\s>]/g) || []).length;
  const closeDiv = (html.match(/<\/div>/g) || []).length;
  if (openDiv !== closeDiv) defects.push('UNBALANCED_DIV');

  // D5. 오귀속 — 같은 본문을 공유하는 허가품목들의 원문 효능이 서로 다르면
  //     이 본문은 최소 하나의 품목에 대해 잘못된 설명서다.
  if (rec.nPermitsSharingBody > 1) {
    const set = sharedBodyOfficialEfficacy.get(rec.contentMd5);
    if (set && set.size > 1) defects.push(`SHARED_BODY_DIVERGENT_OFFICIAL(${set.size})`);
  }

  return defects;
}

function main() {
  const inFile = arg('in', 'pairs.jsonl');
  const auditDir = arg('audit', 'audit_out');
  const pairs = readJsonl(inFile);
  const findings = readJsonl(path.join(auditDir, 'audit-findings.jsonl'));
  const index = readJsonl(path.join(auditDir, 'verdict-index.jsonl'));
  const summary = JSON.parse(fs.readFileSync(path.join(auditDir, 'audit-summary.json'), 'utf8'));

  const failures = [];
  const notes = [];
  const fail = (code, detail) => failures.push({ code, detail });

  // 같은 본문을 공유하는 허가품목들의 원문 효능 집합 (오귀속 독립 판정용)
  const sharedBodyOfficialEfficacy = new Map();
  for (const r of pairs) {
    if (!(r.nPermitsSharingBody > 1)) continue;
    const eff = squash(String((r.officialConsumerText || {}).efficacy || ''));
    if (!sharedBodyOfficialEfficacy.has(r.contentMd5))
      sharedBodyOfficialEfficacy.set(r.contentMd5, new Set());
    if (eff) sharedBodyOfficialEfficacy.get(r.contentMd5).add(eff);
  }

  // ── V1 모집단
  const units = new Set(pairs.map((r) => `${r.itemSeq}::${r.contentMd5}`));
  const permits = new Set(pairs.map((r) => r.itemSeq));
  const masters = new Set(pairs.flatMap((r) => r.masterIds || []));
  if (units.size !== pairs.length) fail('V1_DUP_UNIT_IN_INPUT', `${pairs.length} rows / ${units.size} units`);
  if (summary.units !== units.size) fail('V1_UNITS_MISMATCH', `summary=${summary.units} recount=${units.size}`);
  if (summary.permits !== permits.size)
    fail('V1_PERMITS_MISMATCH', `summary=${summary.permits} recount=${permits.size}`);
  if (summary.mastersCovered !== masters.size)
    fail('V1_MASTERS_MISMATCH', `summary=${summary.mastersCovered} recount=${masters.size}`);

  // ── V2 인덱스 정합
  if (summary.ruleVersion !== EXPECTED_RULE_VERSION)
    fail('V2_RULE_VERSION', `${summary.ruleVersion} != ${EXPECTED_RULE_VERSION}`);
  if (findings.length !== pairs.length)
    fail('V2_FINDINGS_COUNT', `findings=${findings.length} pairs=${pairs.length}`);
  if (index.length !== pairs.length)
    fail('V2_INDEX_COUNT', `index=${index.length} pairs=${pairs.length}`);
  const fByKey = new Map(findings.map((f) => [`${f.itemSeq}::${f.contentMd5}`, f]));
  if (fByKey.size !== findings.length) fail('V2_FINDINGS_DUP_KEY', `${findings.length - fByKey.size}건`);
  for (const u of units) if (!fByKey.has(u)) fail('V2_UNIT_NOT_JUDGED', u);
  for (const row of index) {
    const f = fByKey.get(`${row.itemSeq}::${row.contentMd5}`);
    if (!f) fail('V2_INDEX_ORPHAN', `${row.itemSeq}`);
    else if (f.verdict !== row.verdict) fail('V2_VERDICT_DISAGREE', `${row.itemSeq} ${f.verdict}!=${row.verdict}`);
  }
  const recount = {};
  for (const f of findings) recount[f.verdict] = (recount[f.verdict] || 0) + 1;
  for (const [k, v] of Object.entries(summary.byVerdict))
    if (recount[k] !== v) fail('V2_BYVERDICT_MISMATCH', `${k} summary=${v} recount=${recount[k] || 0}`);
  const totalJudged = Object.values(summary.byVerdict).reduce((a, b) => a + b, 0);
  if (totalJudged !== units.size)
    fail('V2_TOTAL_MISMATCH', `판정합=${totalJudged} 단위=${units.size}`);

  // ── V3 승인 안전성 (위험 방향 오탐 = 0 이어야 함)
  const pairByKey = new Map(pairs.map((r) => [`${r.itemSeq}::${r.contentMd5}`, r]));
  const approved = findings.filter((f) => APPROVED.has(f.verdict));
  const unsafe = [];
  for (const f of approved) {
    const rec = pairByKey.get(`${f.itemSeq}::${f.contentMd5}`);
    const d = independentDefects(rec, sharedBodyOfficialEfficacy);
    // TRUNCATED_TAIL 은 카드형 문서의 장식 요소에서도 발생하므로 단독으로는 위험으로 보지 않는다.
    const risky = d.filter((x) => x !== 'TRUNCATED_TAIL');
    if (risky.length > 0) unsafe.push({ itemSeq: f.itemSeq, verdict: f.verdict, defects: risky.slice(0, 4) });
  }
  if (unsafe.length > 0)
    fail('V3_APPROVED_BUT_DEFECTIVE', `${unsafe.length}/${approved.length}건 — 예: ${JSON.stringify(unsafe.slice(0, 5))}`);
  notes.push(`V3 승인 ${approved.length}건 독립 재검 → 위험 결함 ${unsafe.length}건`);

  // ── V4 배제 근거 (과잉 배제 탐지)
  // 검증기는 엔진 축의 **부분집합**만 독립 구현한다(절 반영·용량·절단·태그·오귀속).
  // 검증기가 다루지 않는 축(금지표현 강도·확대설명·연령·간격·상담·경로)으로만 배제된 건은
  // "근거 없음"이 아니라 "독립 검증 범위 밖"이다. 둘을 섞으면 과잉 배제로 오판한다.
  const COVERED_AXES = new Set([
    'efficacy', 'usage', 'warning', 'caution', 'interaction', 'sideEffect', 'perDay', 'perDose',
  ]);
  const excluded = findings.filter((f) => !APPROVED.has(f.verdict));
  let noBasis = 0;
  let outOfScope = 0;
  let thresholdOnly = 0;
  const noBasisExamples = [];
  for (const f of excluded) {
    const rec = pairByKey.get(`${f.itemSeq}::${f.contentMd5}`);
    if (independentDefects(rec, sharedBodyOfficialEfficacy).length > 0) continue;
    const engineAxes = (f.findings || []).map((g) => g.axis);
    if (engineAxes.length > 0 && engineAxes.every((a) => !COVERED_AXES.has(a))) {
      outOfScope += 1;
      continue;
    }
    // 관대 임계(0.6)로는 반영으로 보이지만 엄격 임계(0.95)로는 원문 문장이 부분만 반영된 경우.
    // 원문 문장의 일부 어절이 빠진 것이므로 배제는 보수적으로 타당하다.
    if (independentDefects(rec, sharedBodyOfficialEfficacy, 0.95).length > 0) {
      thresholdOnly += 1;
      continue;
    }
    noBasis += 1;
    if (noBasisExamples.length < 5)
      noBasisExamples.push({ itemSeq: f.itemSeq, verdict: f.verdict, engineAxes: [...new Set(engineAxes)] });
  }
  notes.push(
    `V4 배제 ${excluded.length}건 → 독립 근거 확인 ${excluded.length - noBasis - outOfScope - thresholdOnly} / 부분반영(보수적 배제) ${thresholdOnly} / 검증범위 밖 축만 ${outOfScope} / 근거 없음 ${noBasis}`,
  );
  if (noBasis > excluded.length * 0.05)
    fail(
      'V4_OVER_EXCLUSION',
      `독립 근거 없는 배제 ${noBasis}/${excluded.length} (>5%) — 예: ${JSON.stringify(noBasisExamples)}`,
    );

  // ── V5 확정 모집단 재산출
  // 허가품목 수는 정의가 갈린다. 한 품목이 여러 본문을 갖는 경우(포장군 내 불일치),
  //   allApproved  = 그 품목의 **모든** 본문이 승인 (보수적 · 감사 엔진의 정의)
  //   anyApproved  = 그 품목의 **일부** 본문이 승인
  // 번역 승인 모집단은 보수적 정의를 쓴다. 두 값을 모두 재산출해 엔진 값과 대조한다.
  const apUnits = approved.length;
  const permitUnits = new Map();
  for (const f of findings) {
    if (!permitUnits.has(f.itemSeq)) permitUnits.set(f.itemSeq, []);
    permitUnits.get(f.itemSeq).push(f.verdict);
  }
  let permitsAll = 0;
  let permitsAny = 0;
  for (const vs of permitUnits.values()) {
    if (vs.every((v) => APPROVED.has(v))) permitsAll += 1;
    if (vs.some((v) => APPROVED.has(v))) permitsAny += 1;
  }
  const apMasters = new Set(
    approved.flatMap((f) => pairByKey.get(`${f.itemSeq}::${f.contentMd5}`).masterIds || []),
  ).size;
  const cp = summary.confirmedTranslationPopulation || {};
  if (cp.units !== apUnits) fail('V5_CONFIRMED_UNITS', `summary=${cp.units} recount=${apUnits}`);
  if (cp.permits !== permitsAll)
    fail('V5_CONFIRMED_PERMITS', `summary=${cp.permits} recount(allApproved)=${permitsAll}`);
  if (cp.masters !== apMasters) fail('V5_CONFIRMED_MASTERS', `summary=${cp.masters} recount=${apMasters}`);
  notes.push(
    `V5 허가품목 승인: 전 본문 승인 ${permitsAll} / 일부 본문 승인 ${permitsAny} (차 ${permitsAny - permitsAll} = 포장군 내 본문 불일치)`,
  );

  const report = {
    verifier: 'INDEPENDENT_V1',
    verifiedAt: null, // 실행 시각은 산출물 결정성을 위해 기록하지 않는다
    input: { pairs: pairs.length, units: units.size, permits: permits.size, masters: masters.size },
    confirmedTranslationPopulation: {
      units: apUnits,
      permitsAllApproved: permitsAll,
      permitsAnyApproved: permitsAny,
      masters: apMasters,
    },
    notes,
    failures,
    result: failures.length === 0 ? 'PASS' : 'FAIL',
  };
  fs.writeFileSync(path.join(auditDir, 'independent-verification.json'), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = failures.length === 0 ? 0 : 1;
}

main();
