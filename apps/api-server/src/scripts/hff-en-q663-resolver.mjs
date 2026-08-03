/**
 * WO-O4O-HFF-EN-INTEGRATED-ISSUE-QUEUE-663-FULL-CLEANUP-V1
 *
 * 통합 문제 큐 663 전용 해석기. 기존 번역 엔진(hff-en-batch-01-translate.mjs)을 감싸며,
 * **새 문장을 만들지 않고** 이미 승인된 자산을 조합해 해석되는 형태만 추가로 해소한다.
 *
 * 추가 규칙 (모두 무-창작 · 조합 전용)
 *   A. AFFIX      — 앞 마커(* ※ -)·뒤 구분자(: ：)를 떼고 조회한 뒤 그대로 다시 붙인다.
 *   B. ENUM_KO    — 공식 열거 마커 (가)(나)(다)… 로 나뉜 각 절이 모두 해석될 때만
 *                   (a)(b)(c)… 로 바꿔 잇는다. 한글 마커를 그대로 두면 EN 슬롯에 한글이 남는다.
 *   C. ENUM_NUM   — 1) 2) 3) / 1. 2. 3. 열거도 같은 방식으로 처리한다.
 *   D. SPLIT_SEP  - / · 로 나뉜 「라벨 : 절」 반복 구조를 각각 해석해 다시 잇는다.
 *   E. ENGLISH_ID — 한글이 없고 이미 영문인 슬롯은 원문을 그대로 EN 으로 쓴다(번역 불필요).
 *   F. AUTHORED   — 위 어느 규칙으로도 조합되지 않는 잔여 문구의 확정 번역 사전.
 *
 * 수치 추출 교정 (§4-3 수치 보존)
 *   기존 추출기는 `1/2만`(조사 '만')을 10,000 으로, `2 grade`의 g 를 그램으로 읽어
 *   실재하지 않는 수치를 만들어냈다. 아래 koNums 는 그 오탐만 제거하며,
 *   실제 용량 수치는 하나도 버리지 않는다(완화가 아니라 교정이다).
 */
import fs from 'node:fs';
import { lookup, norm } from './hff-en-batch-01-translate.mjs';

const D = 'apps/api-server/src/scripts/data';

/* F. 확정 번역 사전 — 라운드 파일이 없으면 빈 객체로 시작한다. */
const AUTHORED = { clause: {}, label: {}, meta: {}, heading: {}, badge: {}, intro: {}, foot: {} };
export const authoredRounds = [];
for (let n = 1; n <= 40; n++) {
  const f = `${D}/hff-en-q663-t${n}-translations-v1.json`;
  if (!fs.existsSync(f)) continue;
  const T = JSON.parse(fs.readFileSync(f, 'utf8'));
  authoredRounds.push(`t${n}`);
  for (const src of [T.clause, T.label, T.meta, T.heading, T.badge, T.intro, T.foot]) {
    for (const [k, v] of Object.entries(src ?? {})) for (const kind of Object.keys(AUTHORED)) AUTHORED[kind][akey(k)] = v;
  }
}
/* 확정 사전 키는 공백·마커에 둔감해야 재현이 안정적이다. */
function akey(s) { return norm(s).replace(/\s+/g, ' ').trim(); }

/* ── 수치 추출 (교정판) ─────────────────────────────────────── */
const UNITS = String.raw`mg|g|㎎|kg|ug|㎍|μg|mcg|IU|kcal|mL|ml|㎖|L|CFU|%`;
const SCALE = String.raw`억|만|천`;
const SCALE_MULT = { e8: 1e8, e4: 1e4, e3: 1e3, e9: 1e9, e6: 1e6 };
/* 배수 접미사는 표기가 달라도 값이 같으면 같은 수치다: `100억CFU` = `10 billion CFU`.
   단위 자체(mg↔g 등)는 환산하지 않는다 — 수치 보존 계약을 완화하지 않기 위함이다. */
const canonUnit = (x) => {
  const t = x.replace(/[,\s]/g, '')
    .replace(/㎎/g, 'mg').replace(/㎍|μg|mcg/g, 'ug').replace(/㎖/g, 'ml')
    .replace(/억/g, 'E8').replace(/만/g, 'E4').replace(/천/g, 'E3')
    .replace(/hundredmillion/gi, 'E8').replace(/tenthousand/gi, 'E4')
    .replace(/billion/gi, 'E9').replace(/million/gi, 'E6').replace(/thousand/gi, 'E3')
    .toLowerCase();
  const m = /^(\d+(?:\.\d+)?)(e[3468]|e9)?(.+)$/.exec(t);
  if (!m) return t;
  return String(Number(m[1]) * (SCALE_MULT[m[2]] ?? 1)) + m[3];
};
/* 단위 뒤에 글자가 이어지면 단위가 아니다: `2 grade` 의 g, `5 Lactobacillus` 의 L */
const UNIT_RE = new RegExp(String.raw`\d+(?:[.,]\d+)*\s*(?:${UNITS})(?![A-Za-z가-힣])`, 'g');
/* 배수 접미사(억·만·천)는 뒤에 실제 단위가 따라올 때만 수치다.
   `1/2만`(=절반'만')·`3만`(단독) 처럼 단위가 없으면 용량이 아니라 조사·수량 표현이다. */
const SCALE_RE = new RegExp(String.raw`\d+(?:[.,]\d+)*\s*(?:${SCALE})\s*(?:${UNITS})`, 'g');
const EN_SCALE = String.raw`hundred million|ten thousand|thousand|billion|million`;
const EN_UNIT_RE = new RegExp(String.raw`\d+(?:[.,]\d+)*\s*(?:(?:${EN_SCALE})\s*)?(?:${UNITS})(?![A-Za-z])|\d+(?:[.,]\d+)*\s*(?:${EN_SCALE})(?![A-Za-z])`, 'g');
/* 범위 표기는 앞쪽 수치가 단위를 생략한다: `150~200mL` / `150–200 mL` → 150mL 과 200mL 둘 다.
   KO·EN 양쪽에 같은 규칙을 적용해야 대조가 성립한다(완화가 아니라 대칭 교정). */
const RANGE_RE = new RegExp(String.raw`(\d+(?:[.,]\d+)*)\s*[~∼〜\-–—]\s*(\d+(?:[.,]\d+)*)\s*(${UNITS})(?![A-Za-z가-힣])`, 'g');
const rangeNums = (t) => [...t.matchAll(RANGE_RE)].map((m) => canonUnit(m[1] + m[3]));

export const koNums = (s) => {
  const t = norm(s);
  return [...(t.match(UNIT_RE) ?? []), ...(t.match(SCALE_RE) ?? []), ...rangeNums(t)].map(canonUnit);
};
export const enNums = (s) => {
  const t = norm(s);
  return [...(t.match(EN_UNIT_RE) ?? []).map(canonUnit), ...rangeNums(t)];
};
/* KO 수치가 EN 에 모두 남아 있는지. 남지 않은 것만 돌려준다. */
export const lostNums = (ko, en) => {
  const eb = new Set(enNums(en));
  return [...new Set(koNums(ko))].filter((x) => !eb.has(x));
};

/* ── 조합 규칙 ───────────────────────────────────────────────── */
const KO_ENUM = /[(（]\s*([가나다라마바사아자차])\s*[)）]/g;
const KO_ENUM_EN = { 가: 'a', 나: 'b', 다: 'c', 라: 'd', 마: 'e', 바: 'f', 사: 'g', 아: 'h', 자: 'i', 차: 'j' };
const NUM_ENUM = /(?:^|\s)([1-9])\s*[).]\s*/g;
/* 제형 용어 — 기존 용어집과 동일한 표기를 쓴다. */
const FORM_EN = { 정제: 'Tablet', 정: 'Tablet', 캡슐: 'Capsule', 과립: 'Granule', 분말: 'Powder', 액상: 'Liquid', 환: 'Pill', 젤리: 'Jelly', 편: 'Piece', 포: 'Stick pack', 스틱: 'Stick', 바: 'Bar', 젤: 'Gel' };
const HANGUL = /[가-힣ㄱ-ㅎㅏ-ㅣ]/;

/** 세그먼트를 마커 위치로 자른다. [{marker, body}] 를 돌려준다. 마커가 0개면 null. */
function splitByMarker(text, re, toEn) {
  const hits = [...text.matchAll(re)];
  if (!hits.length) return null;
  const segs = [];
  const lead = text.slice(0, hits[0].index).trim();
  if (lead) segs.push({ marker: null, body: lead });
  for (let i = 0; i < hits.length; i++) {
    const start = hits[i].index + hits[i][0].length;
    const end = i + 1 < hits.length ? hits[i + 1].index : text.length;
    segs.push({ marker: toEn(hits[i][1]), body: text.slice(start, end).trim() });
  }
  return segs.filter((s) => s.body);
}

/**
 * 슬롯 하나를 해석한다. 성공하면 {en, how}, 실패하면 null.
 * depth 는 무한 재귀 방지용이다.
 */
export function resolve(kind, text, depth = 0) {
  const t = norm(text);
  if (!t) return { en: '', how: 'empty' };
  if (depth > 4) return null;

  /* 0. 확정 번역 사전 (가장 구체적인 근거이므로 먼저 본다) */
  const a = AUTHORED[kind]?.[akey(t)];
  if (a !== undefined) return { en: a, how: 'authored' };

  /* 1. 기존 승인 엔진 */
  const base = lookup(kind, text);
  if (base) return base;

  /* 1'. 제형 일련 라벨 「정제2」 — 제형 용어집 + 숫자. 창작 요소가 없다. */
  const fs2 = t.match(/^(정제|캡슐|과립|분말|액상|환|젤리|편|정|포|스틱|바|젤)\s*(\d+)$/);
  if (fs2) return { en: `${FORM_EN[fs2[1]]} ${fs2[2]}`, how: 'formLabel' };

  /* E. 이미 영문인 슬롯 — 번역 대상이 아니다. 원문을 그대로 쓴다. */
  if (!HANGUL.test(t) && /[A-Za-z]/.test(t)) return { en: t, how: 'englishIdentity' };

  /* A0. 공식 이중언어 표기 「(국문) … , (영문) …」 — 영문면이 곧 공식 EN 이다. */
  const bi = t.match(/[(（]\s*영문\s*[)）]\s*([^()（）]+)$/);
  if (bi && /[A-Za-z]/.test(bi[1]) && !HANGUL.test(bi[1])) {
    return { en: bi[1].replace(/^[,\s]+/, '').trim(), how: 'officialEnglishFace' };
  }
  /* A0'. 언어 태그만 붙은 경우 — 태그를 떼고 본문을 푼다. */
  if (/[(（]\s*(국문|영문)\s*[)）]/.test(t)) {
    const core = t.replace(/[(（]\s*(국문|영문)\s*[)）]/g, ' ').replace(/\s+/g, ' ').trim();
    if (core && core !== t) {
      const r = resolve(kind, core, depth + 1);
      if (r) return { en: r.en, how: `langTag(${r.how})` };
    }
  }

  /* A1. 단일 열거 마커 (가) … — 마커를 (a) 로 바꾸고 본문을 푼다. */
  const one = t.match(/^[(（]\s*([가나다라마바사아자차])\s*[)）]\s*([\s\S]+)$/);
  if (one) {
    const r = resolve(kind, one[2].trim(), depth + 1);
    if (r) return { en: `(${KO_ENUM_EN[one[1]]}) ${r.en}`, how: `enumOne(${r.how})` };
  }

  /* A2. 뒤에 붙은 제형 일련 라벨 「… 정제2」 「… 캡슐3」 — 절과 라벨을 나눠 푼다. */
  const form = t.match(/^([\s\S]+?)\s*((?:정제|캡슐|과립|분말|액상|환|젤리|편|정)\s*\d+)$/);
  if (form) {
    const r = resolve(kind, form[1].trim(), depth + 1);
    const L = resolve('label', form[2].trim(), depth + 1);
    if (r && L) return { en: `${r.en} ${L.en}`, how: `formSerial(${r.how})` };
  }

  /* A3. 공식 등록 표기 — 인정번호·기능성 등급. 기계적 표기 변환이며 창작이 아니다. */
  {
    const tag = t
      .replace(/생리활성기능\s*(\d)\s*등급/g, 'Other function claim, grade $1')
      .replace(/기능성\s*원료\s*인정\s*제?\s*([\d-]+)\s*호/g, 'Approved functional ingredient No. $1')
      .replace(/기능성원료인정제\s*([\d-]+)\s*호/g, 'Approved functional ingredient No. $1')
      .replace(/제\s*([\d-]+)\s*호/g, 'No. $1');
    if (tag !== t) {
      const r = resolve(kind, tag, depth + 1);
      if (r) return { en: r.en, how: `officialTag(${r.how})` };
      if (!HANGUL.test(tag)) return { en: tag, how: 'officialTagIdentity' };
    }
  }

  /* A4. 후미 괄호 라벨 「…절 (비타민B1)」 / 전미 괄호 라벨 「(비오틴) …절」 */
  {
    const tail = t.match(/^([\s\S]+?)\s*[(（]\s*([^()（）]{2,30})\s*[)）]$/);
    if (tail) {
      const R = resolve(kind, tail[1].trim(), depth + 1);
      const L = resolve('label', tail[2].trim(), depth + 1);
      if (R && L && L.en) return { en: `${R.en} (${L.en})`, how: 'parenLabelTail' };
    }
    const head = t.match(/^[(（]\s*([^()（）]{2,30})\s*[)）]\s*([\s\S]+)$/);
    if (head) {
      const L = resolve('label', head[1].trim(), depth + 1);
      const R = resolve(kind, head[2].trim(), depth + 1);
      if (R && L && L.en) return { en: `(${L.en}) ${R.en}`, how: 'parenLabelHead' };
    }
  }

  /* A5. 「라벨-절」 붙임표 결합 (공백 없는 형태) */
  {
    const d = t.match(/^([^-–]{2,30})[-–]([\s\S]{4,})$/);
    if (d) {
      const L = resolve('label', d[1].trim(), depth + 1);
      const R = resolve(kind, d[2].trim(), depth + 1);
      if (L && R && L.en) return { en: `${L.en} - ${R.en}`, how: 'dashLabelClause' };
    }
  }

  /* A. 앞 마커 / 뒤 구분자 분리 */
  const mA = t.match(/^([*※•\-–]\s*)?([\s\S]*?)(\s*[:：])?$/);
  if (mA && (mA[1] || mA[3])) {
    const core = mA[2].trim();
    if (core && core !== t) {
      const r = resolve(kind, core, depth + 1);
      if (r) return { en: `${mA[1] ? `${mA[1].trim()} ` : ''}${r.en}${mA[3] ? ' :' : ''}`, how: `affix(${r.how})` };
    }
  }

  /* B. 공식 한글 열거 마커 (가)(나)(다) */
  const segsK = splitByMarker(t, KO_ENUM, (x) => KO_ENUM_EN[x]);
  if (segsK && segsK.length > 1) {
    const parts = [];
    for (const s of segsK) {
      const r = resolve(kind, s.body, depth + 1);
      if (!r) { parts.length = 0; break; }
      parts.push(s.marker ? `(${s.marker}) ${r.en}` : r.en);
    }
    if (parts.length) return { en: parts.join(' '), how: 'enumKo' };
  }

  /* C. 숫자 열거 1) 2) 3) */
  const segsN = splitByMarker(t, NUM_ENUM, (x) => x);
  if (segsN && segsN.length > 1) {
    const parts = [];
    for (const s of segsN) {
      /* 열거 항목은 절일 수도, 영양소 라벨일 수도 있다. */
      const r = resolve(kind, s.body, depth + 1) ?? resolve('label', s.body, depth + 1);
      if (!r) { parts.length = 0; break; }
      parts.push(s.marker ? `${s.marker}) ${r.en}` : r.en);
    }
    if (parts.length) return { en: parts.join(' '), how: 'enumNum' };
  }

  /* D. ` - ` 로 이어 붙은 「라벨 : 절」 반복 */
  if (/\s[-–]\s/.test(t)) {
    const chunks = t.split(/\s[-–]\s/).map((x) => x.trim()).filter(Boolean);
    if (chunks.length > 1) {
      const parts = [];
      for (const ch of chunks) {
        const r = resolve(kind, ch, depth + 1);
        if (!r) { parts.length = 0; break; }
        parts.push(r.en);
      }
      if (parts.length) return { en: parts.join(' - '), how: 'splitDash' };
    }
  }

  /* D'. 「라벨 : 나머지」 — 라벨은 label 사전, 나머지는 같은 kind 로 푼다. */
  const lc = t.match(/^([^:：]{2,40})[:：]\s*(.+)$/);
  if (lc) {
    const L = resolve('label', lc[1].trim(), depth + 1);
    const C = resolve(kind, lc[2].trim(), depth + 1);
    if (L && C && L.en && C.en) return { en: `${L.en}: ${C.en}`, how: 'labelColon' };
  }

  /* D''. 「절 : 규격」 — 왼쪽이 기능성 절, 오른쪽이 원료·함량 규격인 반대 방향. */
  if (lc) {
    const C = resolve(kind, lc[1].trim(), depth + 1);
    const S = resolve('label', lc[2].trim(), depth + 1);
    if (C && S && C.en && S.en) return { en: `${C.en}: ${S.en}`, how: 'clauseColonSpec' };
  }

  /* G. 영양소 연쇄 「…절 <영양소> : …절 <영양소> :」
     콜론 앞 끝머리가 영양소 라벨이고 그 뒤 절이 해당 영양소의 기능성이다.
     각 조각이 모두 승인 자산으로 풀릴 때만 성립한다. */
  const chain = resolveChain(kind, t, depth);
  if (chain) return chain;

  return null;
}

/** 「…절 <영양소> : …」 반복 구조를 조각별로 해석해 잇는다. 하나라도 실패하면 null. */
function resolveChain(kind, t, depth) {
  if (!/[:：]/.test(t)) return null;
  const parts = t.split(/\s*[:：]\s*/);
  /* 2조각은 D'/D'' 가 이미 다뤘다. 단 마지막이 빈 조각(후미 구분자 손상)이면 여기서 처리한다. */
  if (parts.length < 3 && parts[parts.length - 1].trim()) return null;
  if (parts.length < 2) return null;
  const out = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i].trim();
    if (i === parts.length - 1) {                  // 마지막 조각(없으면 뒤 구분자만 남은 손상)
      if (!p) break;
      const R = resolve(kind, p, depth + 1);
      if (!R) return null;
      out.push(R.en);
      break;
    }
    const toks = p.split(/\s+/).filter(Boolean);
    let hit = null;
    for (let k = 1; k <= Math.min(3, toks.length); k++) {
      const lab = toks.slice(toks.length - k).join(' ').replace(/^\d+\.\s*/, '');
      const L = resolve('label', lab, depth + 1);
      if (L && L.en) { hit = { L, rest: toks.slice(0, toks.length - k).join(' ').replace(/\s*\d+\.$/, '').trim() }; break; }
    }
    if (!hit) return null;
    if (hit.rest) {
      const R = resolve(kind, hit.rest, depth + 1);
      if (!R) return null;
      out.push(R.en);
    }
    out.push(`${hit.L.en}:`);
  }
  const en = out.join(' ').replace(/\s+([:.])/g, '$1').trim();
  return en ? { en, how: 'labelChain' } : null;
}

export const authoredCount = () => Object.keys(AUTHORED.clause).length;
