/**
 * WO-O4O-EASY-DRUG-EN-FULL-RETRANSLATION-FROM-REBUILT-KO-V1 — 검증기 자기검증 (DB 미접속)
 *
 * 검증기를 믿기 전에 **검증기 자신을 검증한다.** 두 가지를 본다.
 *
 *  A. 프레임 사전 전수 커버리지 — 19,360 master 의 모든 섹션 제목 · 필드 라벨 · 구분 배지 · 푸터가
 *     `en-frame.mjs` 사전에 있는가. 하나라도 빠지면 그 문서는 생산 단계에서 LABEL_UNTRANSLATED 로 막힌다.
 *
 *  B. 돌연변이 주입 — 정상 EN 을 인위적으로 훼손했을 때 검증기가 **실제로 잡는가.**
 *     통과만 확인하는 자기검증은 아무것도 보장하지 않는다. 각 위반 코드마다 잡히는지 개별 확인한다.
 *     정상 EN 은 아직 없으므로, KO 를 프레임 사전으로 기계 변환한 **합성 EN**(본문은 결정적 가짜 번역)을
 *     기준선으로 쓴다. 이 합성물은 검증기 시험용일 뿐 **DB 에 들어가지 않는다.**
 *
 * 산출: results/en-validator-selftest-result.json
 * 사용: node en-validator-selftest.mjs [--sample 300]
 */
import fs from 'node:fs';
import path from 'node:path';
import { validate } from './en-validator.mjs';
import {
  SECTION_TITLE, FIELD_LABEL, BADGE, FOOTER,
  ROUTE_VERB, ROUTE_SECTIONS, STRENGTH_RE, NEGATION_EN,
} from './en-frame.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const RESULTS = path.join(HERE, 'results');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const SAMPLE = parseInt(arg('--sample', '300'), 10);

/* ── A. 프레임 커버리지 ────────────────────────────────────────────── */
function coverage(units) {
  const missHeading = new Map(), missBadge = new Map(), missFooter = new Map();
  const bump = (m, k) => m.set(k, (m.get(k) ?? 0) + 1);
  for (const u of units) {
    for (const s of u.segments) {
      if (s.kind === 'HEADING' && !SECTION_TITLE[s.text] && !FIELD_LABEL[s.text]) bump(missHeading, s.text);
      if (s.kind === 'FIXED_IDENTITY' && s.field === '구분' && !BADGE[s.text]) bump(missBadge, s.text);
      if (s.kind === 'BODY' && s.section === '안내(푸터)' && !FOOTER[s.text]) bump(missFooter, s.text);
    }
  }
  return {
    uncoveredHeadings: Object.fromEntries(missHeading),
    uncoveredBadges: Object.fromEntries(missBadge),
    uncoveredFooters: Object.fromEntries([...missFooter].slice(0, 5)),
    uncoveredFooterTotal: missFooter.size,
    pass: !missHeading.size && !missBadge.size && !missFooter.size,
  };
}

/* ── B. 합성 EN — 검증기 시험 전용. 실제 번역이 아니다. ─────────────── */
/** KO 문장을 "번역된 것처럼" 보이게 만들되, 수치·순서·부정·경로 신호는 보존한다. */
function fakeTranslate(text) {
  let out = text;
  // 부정 표지를 EN 표지로. 순서를 유지해야 문장 단위 검사가 성립한다.
  // NEGATION_KO 의 모든 표지를 덮어야 한다. 하나라도 빠지면 합성 기준선이 NEGATION_WEAKENED 로 떨어지는데,
  // 그것은 검증기 결함이 아니라 이 가짜 번역기의 결함이다 (실제 번역기는 do not 계열로 옮긴다).
  const negMap = [['하지 마십시오', 'do not use'], ['하지 마세요', 'do not use'], ['안 됩니다', 'must not'],
    ['안 되', 'must not'], ['안됩', 'must not'], ['하지 마', 'do not'], ['하지 말', 'do not'], ['말 것', 'do not'],
    ['사용하지', 'do not use'], ['복용하지', 'do not take'], ['투여하지', 'do not administer'],
    ['금지', 'prohibited'], ['금기', 'contraindicated'], ['삼가', 'avoid'], ['절대', 'never'], ['피하', 'avoid'],
    ['중단', 'discontinue'], ['중지', 'stop'], ['않도록', 'do not'], ['없이', 'without'], ['마십시오', 'do not']];
  for (const [k, e] of negMap) out = out.split(k).join(` ${e} `);
  const warnMap = [['경고', 'warning'], ['주의', 'caution'], ['위험', 'danger'], ['심각', 'serious'],
    ['즉시', 'immediately'], ['반드시', 'be sure to']];
  for (const [k, e] of warnMap) out = out.split(k).join(` ${e} `);
  for (const [k, forms] of Object.entries(ROUTE_VERB)) out = out.split(k).join(` ${forms[0]} `);
  // 남은 한글 덩어리는 자리표시자로 바꾼다 (실번역이 아님을 분명히 한다).
  // **공백을 반드시 넣는다.** `5 g씩` → `5 glorem` 이 되면 단위 뒤 로마자 금지 규칙(STRENGTH_RE)에 걸려
  // 합성 기준선이 STRENGTH_SEQUENCE 로 떨어진다 — 검증기 결함이 아니라 이 가짜 번역기의 결함이다.
  out = out.replace(/[가-힣]+/g, ' lorem ');
  out = out.replace(/\s+/g, ' ').trim();
  if (!/[.!?:)\]]$/.test(out)) out += '.';
  return out;
}

function synthesize(ko) {
  return {
    masterId: ko.masterId,
    itemSeq: ko.itemSeq,
    segments: ko.segments.map((s) => {
      if (s.kind === 'FIXED_IDENTITY') {
        return s.field === '구분' ? { ...s, text: BADGE[s.text] ?? s.text } : { ...s }; // 식별값은 원문 유지
      }
      if (s.kind === 'HEADING') return { ...s, text: SECTION_TITLE[s.text] ?? FIELD_LABEL[s.text] ?? s.text };
      if (s.section === '안내(푸터)' && FOOTER[s.text]) return { ...s, text: FOOTER[s.text] };
      return { ...s, text: fakeTranslate(s.text) };
    }),
  };
}

/** 각 돌연변이는 정확히 하나의 위반 코드를 유발해야 한다. */
const MUTATIONS = {
  IDENTITY_ALTERED: (en) => mutate(en, (s) => s.kind === 'FIXED_IDENTITY' && s.field === '제품명', (s) => ({ ...s, text: s.text + ' Tablet' })),
  IDENTITY_ROMANIZED: (en) => mutate(en, (s) => s.kind === 'FIXED_IDENTITY' && s.field === '제품명', (s) => ({ ...s, text: 'Mucodine Capsule 200mg' })),
  LABEL_UNTRANSLATED: (en) => mutate(en, (s) => s.kind === 'HEADING', (s) => ({ ...s, text: '효능·효과' })),
  // 함량 토큰의 **값만** 바꾼다. 복합제에서 성분별 함량이 뒤바뀌는 상황의 대리 시험이다.
  STRENGTH_SEQUENCE: (en) => mutate(en,
    (s) => s.kind === 'BODY' && new RegExp(STRENGTH_RE.source).test(s.text),
    (s) => ({ ...s, text: s.text.replace(new RegExp(STRENGTH_RE.source), (m, num, unit) => `${Number(num.replace(',', '.')) + 7}${unit}`) })),
  NUMBER_ADDED: (en) => mutate(en, (s) => s.kind === 'BODY', (s) => ({ ...s, text: s.text + ' Take 999 mg.' })),
  SENTENCE_COUNT: (en) => ({ ...en, segments: en.segments.filter((s, i) => !(s.kind === 'BODY' && i === en.segments.findIndex((x) => x.kind === 'BODY'))) }),
  // 검증기가 사용 방법 섹션만 보므로 돌연변이도 그 범위로 맞춘다.
  // 다른 섹션까지 훼손하면 "바뀌었지만 검증 대상이 아닌" 변형이 missed 로 잘못 집계된다.
  ROUTE_LOST: (en) => ({ ...en, segments: en.segments.map((s) => s.kind === 'BODY' && ROUTE_SECTIONS.includes(s.section)
    ? { ...s, text: Object.values(ROUTE_VERB).flat().reduce((t, f) => t.replace(new RegExp(f, 'gi'), 'use'), s.text) } : s) }),
  NEGATION_WEAKENED: (en) => ({ ...en, segments: en.segments.map((s) => s.kind === 'BODY'
    ? { ...s, text: NEGATION_EN.reduce((t, f) => t.replace(new RegExp(f, 'gi'), 'may'), s.text) } : s) }),
  TRUNCATED: (en) => mutate(en, (s) => s.kind === 'BODY' && s.text.length > 20, (s) => ({ ...s, text: s.text.slice(0, 15) })),
  HANGUL_LEFTOVER: (en) => mutate(en, (s) => s.kind === 'BODY', (s) => ({ ...s, text: s.text + ' 복용하십시오.' })),
  STRUCTURE_MISMATCH: (en) => ({ ...en, segments: en.segments.slice(0, -1) }),
};
function mutate(en, pred, fn) {
  let done = false;
  return { ...en, segments: en.segments.map((s) => { if (!done && pred(s)) { done = true; return fn(s); } return s; }) };
}

function main() {
  const all = fs.readFileSync(path.join(RESULTS, 'ko-units.jsonl'), 'utf8').split('\n').filter((l) => l.trim());
  const units = all.map((l) => JSON.parse(l));

  const cov = coverage(units);

  // 표본은 결정적으로 고른다 (Math.random 금지 — 재실행 재현성).
  const step = Math.max(1, Math.floor(units.length / SAMPLE));
  const sample = units.filter((_, i) => i % step === 0).slice(0, SAMPLE);

  // B-1. 합성 EN 기준선은 통과해야 한다. 통과하지 못하면 검증기가 과탐지다.
  const baseline = sample.map((ko) => validate(ko, synthesize(ko)));
  const baseFail = baseline.filter((r) => !r.pass);
  const baseCodes = baseFail.reduce((a, r) => { for (const c of r.codes) a[c] = (a[c] ?? 0) + 1; return a; }, {});

  // B-2. 돌연변이는 각각 해당 코드로 잡혀야 한다.
  // 돌연변이가 그 제품에서 **아무것도 바꾸지 못한 경우**(예: 수치가 원래 없는 제품에 수치 삭제)는
  // 미탐지가 아니라 비해당이다. 이를 missed 로 세면 탐지율이 거짓으로 낮아진다.
  const mutationResults = {};
  for (const [code, fn] of Object.entries(MUTATIONS)) {
    let caught = 0, missed = 0, skipped = 0;
    const missedSamples = [];
    for (const ko of sample) {
      const base = synthesize(ko);
      const mut = fn(base);
      if (JSON.stringify(mut) === JSON.stringify(base)) { skipped++; continue; }
      const r = validate(ko, mut);
      // SENTENCE_COUNT 는 구조 검사가 먼저 차단한다 — 차단만 되면 목적은 달성이다.
      const ok = r.codes.includes(code) || (code === 'SENTENCE_COUNT' && r.codes.includes('STRUCTURE_MISMATCH'));
      if (ok) caught++; else { missed++; if (missedSamples.length < 2) missedSamples.push({ masterId: ko.masterId, codes: r.codes }); }
    }
    const applicable = caught + missed;
    mutationResults[code] = {
      applicable, caught, missed, skipped,
      detectionRate: applicable ? +(caught / applicable * 100).toFixed(2) : null,
      ...(missedSamples.length ? { missedSamples } : {}),
    };
  }

  const out = {
    wo: 'WO-O4O-EASY-DRUG-EN-FULL-RETRANSLATION-FROM-REBUILT-KO-V1',
    step: 'en-validator-selftest',
    note: '합성 EN 은 검증기 시험 전용 산출물이며 DB 에 저장하지 않는다.',
    masters: units.length,
    sample: sample.length,
    frameCoverage: cov,
    baseline: {
      pass: baseline.length - baseFail.length,
      fail: baseFail.length,
      failCodes: baseCodes,
      sampleFailures: baseFail.slice(0, 3).map((r) => ({ masterId: r.masterId, violations: r.violations.slice(0, 3) })),
    },
    mutationDetection: mutationResults,
    dbWrites: 0,
  };
  fs.writeFileSync(path.join(RESULTS, 'en-validator-selftest-result.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
}

main();
