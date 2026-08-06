/**
 * WO-O4O-EASY-DRUG-EN-FULL-RETRANSLATION-FROM-REBUILT-KO-V1 — 5단계 소규모 대표 표본 계약 검증 (DB 미접속)
 *
 * 전량 생산기를 만들기 **전에** 확인할 것은 두 가지다.
 *   1. 계약(FIXED_IDENTITY · 고정 프레임 · 9섹션)이 실제 번역문으로 **표현 가능한가.**
 *   2. 독립검증기가 **자연스러운 정상 번역을 통과시키는가.** 자기검증(합성 EN)은 이걸 증명하지 못한다.
 *      합성 EN 은 검증기가 기대하는 형태로 만들어졌으므로 통과가 당연하다. 실제 번역문은 다르다.
 *      여기서 나오는 실패는 대부분 **검증기 규칙이 과도한 것**이며, 그것이 이 단계의 산출물이다.
 *
 * 표본: 투여경로 10종 + 섹션수 최소/최대 + 수치 최다 = 13 master (결정적 선정)
 * 입력: results/ko-units.jsonl · results/sample-en-translations.json
 * 산출: results/en-sample-contract-check-result.json
 * 사용: node en-sample-contract-check.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { validate } from './en-validator.mjs';
import { SECTION_TITLE, FIELD_LABEL, BADGE, FOOTER } from './en-frame.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const RESULTS = path.join(HERE, 'results');

const draft = JSON.parse(fs.readFileSync(path.join(RESULTS, 'sample-en-translations.json'), 'utf8'));
const targets = new Set(Object.keys(draft).filter((k) => !k.startsWith('_')));

const units = new Map();
for (const line of fs.readFileSync(path.join(RESULTS, 'ko-units.jsonl'), 'utf8').split('\n')) {
  if (!line.trim()) continue;
  const u = JSON.parse(line);
  if (targets.has(u.masterId)) units.set(u.masterId, u);
}

/** KO 단위 + 본문 번역 배열 → EN 단위. 고정 프레임은 사전이 결정한다(번역 대상 아님). */
function assemble(ko, bodies) {
  let cursor = 0;
  const segments = ko.segments.map((s) => {
    if (s.kind === 'FIXED_IDENTITY') {
      return s.field === '구분' ? { ...s, text: BADGE[s.text] ?? s.text } : { ...s };
    }
    if (s.kind === 'HEADING') return { ...s, text: SECTION_TITLE[s.text] ?? FIELD_LABEL[s.text] ?? s.text };
    if (FOOTER[s.text]) return { ...s, text: FOOTER[s.text] };
    return { ...s, text: bodies[cursor++] };
  });
  return { unit: { masterId: ko.masterId, itemSeq: ko.itemSeq, segments }, consumed: cursor };
}

const results = [];
const codeTally = {};
for (const [masterId, bodies] of Object.entries(draft)) {
  if (masterId.startsWith('_')) continue;
  const ko = units.get(masterId);
  if (!ko) { results.push({ masterId, error: 'KO_UNIT_NOT_FOUND' }); continue; }
  const need = ko.segments.filter((s) => s.kind === 'BODY' && !FOOTER[s.text]).length;
  if (need !== bodies.length) { results.push({ masterId, error: `BODY_COUNT ko=${need} draft=${bodies.length}` }); continue; }

  const { unit, consumed } = assemble(ko, bodies);
  if (consumed !== bodies.length) { results.push({ masterId, error: `CONSUMED ${consumed}/${bodies.length}` }); continue; }

  const r = validate(ko, unit);
  for (const c of r.codes) codeTally[c] = (codeTally[c] ?? 0) + 1;
  results.push({
    masterId,
    itemSeq: r.itemSeq,
    productName: ko.segments.find((s) => s.field === '제품명')?.text,
    pass: r.pass,
    codes: r.codes,
    violations: r.violations,
  });
}

const out = {
  wo: 'WO-O4O-EASY-DRUG-EN-FULL-RETRANSLATION-FROM-REBUILT-KO-V1',
  step: 'en-sample-contract-check',
  note: '표본 EN 초안은 계약 시험 전용이며 DB 에 저장하지 않는다.',
  samples: results.length,
  pass: results.filter((r) => r.pass).length,
  fail: results.filter((r) => r.pass === false).length,
  errors: results.filter((r) => r.error).length,
  codeTally,
  results,
  dbWrites: 0,
};
fs.writeFileSync(path.join(RESULTS, 'en-sample-contract-check-result.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');
process.stdout.write(JSON.stringify({ ...out, results: undefined }, null, 2) + '\n');
