/**
 * WO-O4O-EASY-DRUG-EN-FULL-RETRANSLATION-FROM-REBUILT-KO-V1 — 의약품 전용 EN 독립검증기
 *
 * **번역 엔진과 독립이다.** 엔진이 사전이든 LLM 이든, 산출물은 전부 이 게이트를 통과해야 한다.
 * 계약 8: LLM 결과는 초안이며 **검증 실패 결과는 DB 에 저장하지 않는다.**
 *
 * 기준본은 그 master 의 KO canonical 하나뿐이다(계약 3·4). 다른 제품·성분군·ATC 를 참조하지 않는다.
 * 성분·함량의 외부 원장이 존재하지 않으므로(NO_STRUCTURED_INGREDIENT_LEDGER)
 * 모든 검사는 **KO↔EN 보존 대조**로 성립한다 — WO §7-1 참조.
 *
 * 위반 코드 (하나라도 있으면 그 master 는 BLOCK_TRANSLATION_VALIDATION):
 *   STRUCTURE_MISMATCH      태그·class·순서가 KO 와 다름 (renderer family 승계 실패)
 *   SECTION_MISMATCH        섹션 집합·순서 불일치 / 섹션 누락
 *   IDENTITY_ALTERED        제품명·제조사·품목기준코드가 원문 그대로가 아님
 *   IDENTITY_ROMANIZED      식별값 자리에 로마자·추정 영문명이 들어감
 *   LABEL_UNTRANSLATED      섹션 제목·필드 라벨·배지·푸터가 고정 영어 사전과 다름
 *   NUMBER_SEQUENCE         수치+단위 배열이 순서 또는 개수에서 KO 와 다름
 *   NUMBER_ADDED            KO 에 없는 수치가 EN 에 등장
 *   SENTENCE_COUNT          문장 수 불일치 (의료 내용 추가·삭제 의심)
 *                           — 실제로는 STRUCTURE_MISMATCH 가 먼저 걸러낸다(위치 1:1 대응이 깨지므로).
 *                             중복이지만 남겨 둔다: 향후 비위치대응 산출물이 들어와도 문장 증감은 잡혀야 한다.
 *   DOSING_LOST             연령 · 1회량 · 횟수 · 간격 · 기간 값이 EN 에서 소실
 *   ROUTE_LOST              KO 투여 경로에 대응하는 EN 표현 없음
 *   NEGATION_WEAKENED       KO 부정·금기 문장이 EN 에서 부정 표지를 잃음
 *   WARNING_WEAKENED        경고 강도 표지 총량이 KO 보다 감소
 *   TRUNCATED               문장이 종결부호 없이 끊김 (고정 길이 절단)
 *   HANGUL_LEFTOVER         본문(식별값 제외)에 한글이 남음
 *   CROSS_PRODUCT           자기 KO 에 없는 다른 제품 식별값이 EN 에 등장
 *
 * 사용: import { validate } from './en-validator.mjs'
 */
import {
  SECTION_TITLE, FIELD_LABEL, BADGE, FOOTER,
  ROUTE_VERB, NEGATION_KO, NEGATION_EN, WARNING_KO, WARNING_EN, DOSING_KO,
} from './en-frame.mjs';

/** 수치+단위. en-frame 의 DOSING 과 달리 여기서는 **순서 보존**이 목적이라 배열로 뽑는다. */
const NUM_RE = /\d+(?:[.,]\d+)?/g;
const UNIT_ALIAS = new Map(Object.entries({
  '밀리그램': 'mg', '㎎': 'mg', '그램': 'g', '마이크로그램': 'mcg', '㎍': 'mcg',
  '밀리리터': 'ml', '㎖': 'ml', '국제단위': 'iu', 'IU': 'iu',
}));
const HANGUL_RE = /[가-힣]/;

const numbers = (s) => [...String(s).matchAll(NUM_RE)].map((m) => m[0].replace(',', '.').replace(/\.0+$/, ''));
const lower = (s) => String(s).toLowerCase();
const countAny = (s, list) => list.reduce((a, t) => a + (lower(s).split(lower(t)).length - 1), 0);
const hasAny = (s, list) => list.some((t) => lower(s).includes(lower(t)));

/**
 * @param ko  extract-units.mjs 의 KO 단위 { masterId, itemSeq, segments[] }
 * @param en  동일 스키마의 EN 산출물 (구조가 같아야 하므로 segment 배열도 1:1 이어야 한다)
 * @param opts.otherIdentities 다른 master 의 제품명 집합(Set) — 혼입 탐지용. 없으면 해당 검사 생략.
 */
export function validate(ko, en, opts = {}) {
  const v = [];
  const add = (code, detail) => v.push({ code, detail });

  /* 1. 구조 — 슬롯 치환 방식이면 segment 배열이 1:1 로 대응해야 한다. */
  if (ko.segments.length !== en.segments.length) {
    add('STRUCTURE_MISMATCH', `segments ko=${ko.segments.length} en=${en.segments.length}`);
    // 길이가 다르면 위치 대응이 성립하지 않아 이후 검사가 전부 무의미하다. 여기서 끝낸다.
    return { masterId: ko.masterId, itemSeq: ko.itemSeq, pass: false, violations: v, codes: ['STRUCTURE_MISMATCH'] };
  }
  // segment 스키마는 {kind, section, field, text} 다. 텍스트를 뺀 나머지가 전부 일치해야 한다.
  for (let i = 0; i < ko.segments.length; i++) {
    const a = ko.segments[i], b = en.segments[i];
    if (a.kind !== b.kind || (a.field ?? null) !== (b.field ?? null)) {
      add('STRUCTURE_MISMATCH', `#${i} ko=${a.kind}/${a.field} en=${b.kind}/${b.field}`);
    }
  }

  /* 2. 섹션 — 9종 계약. 집합과 순서를 모두 본다.
   *    `section` 은 렌더링되지 않는 **내부 그룹 키**이므로 양쪽 모두 KO 원문으로 남아야 하고,
   *    번역 여부는 실제로 화면에 나가는 **h2 텍스트**로 판정한다. 키를 번역 대상으로 오해하면
   *    정상 산출물이 전건 SECTION_MISMATCH 로 떨어진다. */
  const secKeys = (u) => [...new Set(u.segments.filter((s) => s.kind === 'HEADING' && s.section).map((s) => s.section))];
  const koSec = secKeys(ko), enSec = secKeys(en);
  if (JSON.stringify(koSec) !== JSON.stringify(enSec)) {
    add('SECTION_MISMATCH', `section key expected=${JSON.stringify(koSec)} got=${JSON.stringify(enSec)}`);
  }
  const unknown = koSec.filter((s) => s !== '헤더' && s !== '안내(푸터)' && !SECTION_TITLE[s]);
  if (unknown.length) add('SECTION_MISMATCH', `사전에 없는 KO 섹션: ${unknown.join(', ')}`);

  /* 3. FIXED_IDENTITY — 값은 한국어 원문 그대로, 라벨만 영어. */
  // 제품명·제조사는 헤더와 제품 개요에 **각각** 등장한다. 한 곳만 보면 나머지가 샌다 — 전 위치를 본다.
  const idFields = ['제품명', '제조·수입사', '품목기준코드'];
  for (let i = 0; i < ko.segments.length; i++) {
    const k = ko.segments[i], e = en.segments[i];
    if (k.kind !== 'FIXED_IDENTITY') continue;
    if (k.field === '구분') {
      const want = BADGE[k.text];
      if (!want) add('LABEL_UNTRANSLATED', `미등록 구분 배지: "${k.text}"`);
      else if (e.text !== want) add('LABEL_UNTRANSLATED', `구분 배지 expected="${want}" got="${e.text}"`);
      continue;
    }
    if (!idFields.includes(k.field)) continue;
    if (e.text !== k.text) add('IDENTITY_ALTERED', `#${i} ${k.field}: ko="${k.text}" en="${e.text}"`);
    // 원문에 한글이 있었는데 EN 쪽에서 사라졌으면 로마자·추정 영문명으로 바뀐 것이다.
    if (HANGUL_RE.test(k.text) && !HANGUL_RE.test(e.text)) add('IDENTITY_ROMANIZED', `#${i} ${k.field}: "${e.text}"`);
  }

  /* 4. 라벨 · 푸터 — 고정 사전과 정확히 일치해야 한다. */
  for (let i = 0; i < ko.segments.length; i++) {
    const a = ko.segments[i], b = en.segments[i];
    if (a.kind !== 'HEADING') continue;
    const want = SECTION_TITLE[a.text] ?? FIELD_LABEL[a.text];
    if (want && b.text !== want) add('LABEL_UNTRANSLATED', `heading expected="${want}" got="${b.text}"`);
  }
  for (let i = 0; i < ko.segments.length; i++) {
    const a = ko.segments[i], b = en.segments[i];
    if (a.kind === 'BODY' && FOOTER[a.text] && b.text !== FOOTER[a.text]) {
      add('LABEL_UNTRANSLATED', `footer expected="${FOOTER[a.text]}" got="${b.text}"`);
    }
  }

  /* 5. 본문 — 여기부터가 실제 번역 대상이다. */
  const koBody = ko.segments.filter((s) => s.kind === 'BODY');
  const enBody = en.segments.filter((s) => s.kind === 'BODY');
  if (koBody.length !== enBody.length) add('SENTENCE_COUNT', `ko=${koBody.length} en=${enBody.length}`);

  const koText = koBody.map((s) => s.text).join('\n');
  const enText = enBody.map((s) => s.text).join('\n');

  /* 5-1. 수치 배열 — 순서까지 보존. 복합제 함량 1:1 이 여기서 걸린다. */
  const koNums = numbers(koText), enNums = numbers(enText);
  if (JSON.stringify(koNums) !== JSON.stringify(enNums)) {
    const added = enNums.filter((n) => !koNums.includes(n));
    if (added.length) add('NUMBER_ADDED', `EN 전용 수치: ${[...new Set(added)].slice(0, 8).join(', ')}`);
    add('NUMBER_SEQUENCE', `ko=${koNums.length} en=${enNums.length} 첫 불일치 idx=${koNums.findIndex((n, i) => enNums[i] !== n)}`);
  }

  /* 5-2. 용법 5축 — 값이 EN 에 남아 있는지. 표현은 달라도 숫자는 같아야 한다. */
  for (const [axis, re] of Object.entries(DOSING_KO)) {
    const hits = [...koText.matchAll(new RegExp(re.source, 'g'))].map((m) => m[0]);
    for (const h of hits) {
      const need = numbers(h);
      if (need.length && !need.every((n) => enNums.includes(n))) {
        add('DOSING_LOST', `${axis}: "${h.trim()}" 의 수치 ${need.join('/')} 가 EN 에 없음`);
      }
    }
  }

  /* 5-3. 투여 경로 — 뭉개면 외용제를 삼키는 오역이 된다. */
  for (const [koVerb, enForms] of Object.entries(ROUTE_VERB)) {
    if (koText.includes(koVerb) && !hasAny(enText, enForms)) {
      add('ROUTE_LOST', `"${koVerb}" 대응 표현 없음 (기대: ${enForms.slice(0, 3).join(' / ')})`);
    }
  }

  /* 5-4. 부정 · 금기 — 문장 단위로 본다. 총량 비교는 약화를 놓친다. */
  const n = Math.min(koBody.length, enBody.length);
  for (let i = 0; i < n; i++) {
    if (hasAny(koBody[i].text, NEGATION_KO) && !hasAny(enBody[i].text, NEGATION_EN)) {
      add('NEGATION_WEAKENED', `#${i} "${koBody[i].text.slice(0, 40)}…"`);
    }
  }

  /* 5-5. 경고 강도 — 총량이 줄면 문서 전체의 톤이 내려간 것이다. */
  const koWarn = countAny(koText, WARNING_KO), enWarn = countAny(enText, WARNING_EN);
  if (enWarn < koWarn) add('WARNING_WEAKENED', `ko=${koWarn} en=${enWarn}`);

  /* 5-6. 절단 · 한글 잔존 */
  for (let i = 0; i < enBody.length; i++) {
    const t = enBody[i].text.trim();
    if (t && !/[.!?:)\]]$/.test(t)) add('TRUNCATED', `#${i} "…${t.slice(-40)}"`);
    if (HANGUL_RE.test(t)) add('HANGUL_LEFTOVER', `#${i} "${t.slice(0, 40)}…"`);
  }

  /* 5-7. 제품 간 혼입 — 자기 KO 에 없는 다른 제품 식별값이 EN 에 나타나면 안 된다. */
  if (opts.otherIdentities) {
    const own = new Set(ko.segments.filter((s) => s.kind === 'FIXED_IDENTITY').map((s) => s.text));
    for (const name of opts.otherIdentities) {
      if (!own.has(name) && name.length >= 4 && enText.includes(name)) add('CROSS_PRODUCT', `"${name}"`);
    }
  }

  return {
    masterId: ko.masterId,
    itemSeq: ko.itemSeq,
    pass: v.length === 0,
    violations: v,
    codes: [...new Set(v.map((x) => x.code))],
  };
}
