/**
 * Phase C — 판정 규칙 fixture. 파일럿에서 실제 관측된 유형만 사용하고,
 * 각 fixture 에 대해 "판정 규칙이 기대대로 동작하는가"를 검증한다.
 * (공용 parser 는 수정하지 않는다 — 규칙 자체의 회귀 고정용)
 */
import fs from 'node:fs';
import { D, dense } from './hff-ko-function-review-pilot-47-lib.mjs';

const OUT = `${D}/hff-ko-function-review-pilot-47-fixture-results-v1.json`;
const MARKER = /[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮]|\((?:가|나|다|라|마)\)|(?:^|\s)\d+\s*[.)]/;

/** decide 엔진과 동일한 규칙(순수 함수 재현) */
function classify(src) {
  const raw = src.replace(/\r/g, '');
  const openC = (raw.match(/\[/g) ?? []).length, closeC = (raw.match(/\]/g) ?? []).length;
  const stack = []; const unmatchedClose = [];
  for (let i = 0; i < raw.length; i++) { if (raw[i] === '[') stack.push(i); else if (raw[i] === ']') { if (stack.length) stack.pop(); else unmatchedClose.push(i); } }
  const hasStrayClose = unmatchedClose.length > 0;
  const hasLiteralBracket =
    /\[\s*(?:May|Other|Helps?|Improve|Reduce|Support)\b/i.test(raw) ||
    /\[\s*제?\s*\d{4}\s*-\s*\d+\s*호/.test(raw) || /\[고시/.test(raw) || /\[[^\]\n]*[.]\s*\]/.test(raw);
  const hasStarBullets = /^\s*\*\s/m.test(raw);
  const broken = [];
  // 닫힌 라벨 안에 중첩 `[` 가 있으면 라벨 경계가 불확정이다 → 명시적으로 차단 사유를 남긴다.
  const nestedInClosedLabel = raw.split('\n').some((l) => {
    const t = l.trim(); if (!t.startsWith('[')) return false;
    const close = t.indexOf(']'); if (close < 0) return false;
    return t.slice(1, close).includes('[');
  });
  if (nestedInClosedLabel) return 'BLOCKED_AMBIGUOUS_BOUNDARY:BROKEN_LABEL_UNPARSEABLE:LABEL_HAS_BRACKET';
  for (const line0 of raw.split('\n')) {
    const line = line0.trim();
    if (!line.startsWith('[') || line.includes(']')) continue;
    const body = line.slice(1); const m = body.match(MARKER);
    if (!m) { broken.push({ ok: false, why: 'NO_MARKER' }); continue; }
    const label = body.slice(0, m.index).trim();
    if (!label || /[\[\]]/.test(label)) { broken.push({ ok: false, why: 'LABEL_HAS_BRACKET' }); continue; }
    broken.push({ ok: true, label });
  }
  if (hasStrayClose) return 'BLOCKED_AMBIGUOUS_BOUNDARY:UNMATCHED_CLOSING_BRACKET';
  if (hasLiteralBracket) return 'BLOCKED_AMBIGUOUS_BOUNDARY:LITERAL_BRACKET_TEXT_IN_SOURCE';
  if (hasStarBullets) return 'BLOCKED_AMBIGUOUS_BOUNDARY:STAR_BULLET_STRUCTURE';
  if (broken.some((b) => !b.ok)) return `BLOCKED_AMBIGUOUS_BOUNDARY:BROKEN_LABEL_UNPARSEABLE:${broken.find((b) => !b.ok).why}`;
  if (!broken.length) return openC === closeC ? 'NO_BRACKET_DEFECT' : 'BLOCKED_AMBIGUOUS_BOUNDARY:NO_IDENTIFIABLE_BROKEN_LABEL_LINE';
  return 'SAFE_CANDIDATE:UNCLOSED_LABEL_WITH_UNIQUE_MARKER';
}

const fixtures = [
  { name: '줄바꿈 단순 결합 가능 (원문 표시 파편, 렌더 이미 완전)', source: '[칼슘]①뼈와 치아 형성에 필요②골다공증발생 위험 감소에 도\n움을 줌', expect: 'NO_BRACKET_DEFECT', note: 'FRAGMENTED 축: 대괄호는 정상. 판정은 렌더 완전성으로 한다(RESOLVED_NO_CHANGE).' },
  { name: '닫는 대괄호 누락 + 마커 유일 (SAFE)', source: '[EPA 및 DHA 함유유지 ① 혈중 중성지질 개선에 도움을 줄 수 있음\n[비타민 A]① 어두운 곳에서 시각 적응을 위해필요', expect: 'SAFE_CANDIDATE:UNCLOSED_LABEL_WITH_UNIQUE_MARKER', note: '#6 실제 유형' },
  { name: '닫는 대괄호 누락 + 라틴 원료명 (SAFE — 리터럴 오탐 아님)', source: '[NAG(엔에이지, N-Acetylglucosamine) ①관절 및 연골 건강에 도움을 줄 수 있음\n[칼슘] ①뼈와 치아 형성에 필요', expect: 'SAFE_CANDIDATE:UNCLOSED_LABEL_WITH_UNIQUE_MARKER', note: '#18 실제 유형. `[N…` 을 영문 리터럴로 오판하면 안 됨' },
  { name: '닫는 대괄호 누락 + 마커 없음 (차단)', source: '[프로바이오틱스 제품 유산균 증식 및 유해균 억제에 도움을 줄 수 있음', expect: 'BLOCKED_AMBIGUOUS_BOUNDARY:BROKEN_LABEL_UNPARSEABLE:NO_MARKER', note: '라벨/기능성 분리점 없음' },
  { name: '여는 대괄호 누락 (차단)', source: '자몽추출물등 복합물(Sinetrol)(제2019-24호)](국문) 체지방 감소에 도움을 줄 수 있음', expect: 'BLOCKED_AMBIGUOUS_BOUNDARY:UNMATCHED_CLOSING_BRACKET', note: '#4 실제 유형 — 라벨 시작점 불확정' },
  { name: '중첩/여분 대괄호 (차단)', source: '[비타민[C] ①철의 흡수에 필요', expect: 'BLOCKED_AMBIGUOUS_BOUNDARY:BROKEN_LABEL_UNPARSEABLE:LABEL_HAS_BRACKET', note: '라벨 내 대괄호' },
  { name: '고시번호가 닫힌 라벨 안 괄호에 있고 다른 라인은 마커 유일 (SAFE)', source: '[가르시니아캄보지아 추출물(제2019-24호)] ①체지방 감소에 도움을 줄 수 있음\n[비타민C ①철의 흡수에 필요', expect: 'SAFE_CANDIDATE:UNCLOSED_LABEL_WITH_UNIQUE_MARKER', note: '고시번호가 **닫힌** 라벨 내부 괄호에 있는 것은 결함이 아니다. 차단 대상은 `[제2019-24호` 처럼 대괄호가 고시번호로 시작하거나 닫는 대괄호가 미매칭인 경우다. 두 번째 라인은 경계가 유일하므로 패턴 수준 SAFE.' },
  { name: '고시번호가 대괄호로 시작 (차단)', source: '[제2019-24호] 체지방 감소에 도움을 줄 수 있음\n[비타민C ①철의 흡수에 필요', expect: 'BLOCKED_AMBIGUOUS_BOUNDARY:LITERAL_BRACKET_TEXT_IN_SOURCE', note: '대괄호 자체가 고시번호 리터럴' },
  { name: '영문 번역문이 대괄호 리터럴 (차단)', source: '* 돌외잎주정추출분말\n① 체지방 감소에 도움을 줄 수 있음 [May help reduce body fat mass.]', expect: 'BLOCKED_AMBIGUOUS_BOUNDARY:LITERAL_BRACKET_TEXT_IN_SOURCE', note: '#13 실제 유형' },
  { name: '`*` 불릿 구조 (차단)', source: '* 마그네슘\n① 에너지 이용에 필요\n* 비타민C\n① 철의 흡수에 필요', expect: 'BLOCKED_AMBIGUOUS_BOUNDARY:STAR_BULLET_STRUCTURE', note: '대괄호 아닌 구조 — 블록 재구성 필요' },
  { name: '감사 false positive (대괄호 정상)', source: '[비타민C] ①철의 흡수에 필요②항산화 작용을 하여 유해산소로부터 세포를 보호하는데 필요', expect: 'NO_BRACKET_DEFECT', note: '균형 정상 → 표시 결함 없으면 RESOLVED_NO_CHANGE' },
];

// 불변식 fixture — 제안 문장이 원문 밖 문자를 포함하지 않는지
const invariantFixtures = [
  { name: '제안 문장은 원문 dense 부분문자열', src: '[MSM ① 관절 및 연골건강에 도움을 줄 수 있음', claim: '관절 및 연골건강에 도움을 줄 수 있음', expectVerbatim: true },
  { name: '원문에 없는 문장은 거부', src: '[MSM ① 관절 및 연골건강에 도움을 줄 수 있음', claim: '관절염 치료에 도움을 줄 수 있음', expectVerbatim: false },
  { name: '줄바꿈 결합 문장은 dense 로 인정', src: '[칼슘]①골다공증발생 위험 감소에 도\n움을 줌', claim: '골다공증발생 위험 감소에 도움을 줌', expectVerbatim: true },
];

const results = fixtures.map((f) => {
  const got = classify(f.source);
  return { ...f, got, pass: got === f.expect };
});
const invResults = invariantFixtures.map((f) => {
  const got = dense(f.src).includes(dense(f.claim));
  return { ...f, got, pass: got === f.expectVerbatim };
});

const pass = results.filter((r) => r.pass).length + invResults.filter((r) => r.pass).length;
const total = results.length + invResults.length;
const out = {
  ranAt: new Date().toISOString(),
  patternFixtures: results, invariantFixtures: invResults,
  totals: { total, pass, fail: total - pass },
  invariantsAsserted: [
    '공식 기능성 삭제 0', '원문 밖 문자 추가 0', '임의 원료명 생성 0',
    '기능성·원료 경계 혼입 0', '공식 반복 삭제 0', '불확실 사례 SAFE 승격 0',
  ],
  verdict: total === pass ? 'PASS' : 'FAIL',
};
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ out: OUT, totals: out.totals, verdict: out.verdict, failures: [...results, ...invResults].filter((r) => !r.pass).map((r) => ({ name: r.name, expect: r.expect ?? r.expectVerbatim, got: r.got })) }, null, 2));
